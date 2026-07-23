#!/usr/bin/env python3
"""Install every valid Skill from a specified directory into a Codex home."""

from __future__ import annotations

import argparse
import shutil
import sys
import tempfile
from pathlib import Path
from typing import NamedTuple, Sequence


class InstallError(RuntimeError):
    """Raised when the Skill installation cannot complete safely."""


class InstallItem(NamedTuple):
    source: Path
    destination: Path


def _path_exists(path: Path) -> bool:
    return path.exists() or path.is_symlink()


def _remove_path(path: Path) -> None:
    if path.is_symlink() or path.is_file():
        path.unlink()
    elif path.is_dir():
        shutil.rmtree(path)


def _validate_source(skill: Path) -> None:
    if skill.is_symlink():
        raise InstallError(f"Skill source must not be a symlink: {skill}")
    for path in skill.rglob("*"):
        if path.is_symlink():
            raise InstallError(f"Skill source contains a symlink: {path}")


def _build_items(skills_source: Path, codex_home: Path) -> tuple[InstallItem, ...]:
    skills_source = skills_source.expanduser().resolve()
    if not skills_source.is_dir():
        raise InstallError(f"skills source is not a directory: {skills_source}")

    items: list[InstallItem] = []
    for candidate in sorted(skills_source.iterdir(), key=lambda path: path.name.casefold()):
        if not candidate.is_dir() or not (candidate / "SKILL.md").is_file():
            continue
        _validate_source(candidate)
        items.append(InstallItem(candidate, codex_home / "skills" / candidate.name))

    if not items:
        raise InstallError(f"no child directories containing SKILL.md: {skills_source}")
    return tuple(items)


def _format_plan(items: Sequence[InstallItem], *, dry_run: bool) -> str:
    heading = "DRY RUN - no files will be changed" if dry_run else "Installation plan"
    lines = [heading]
    for item in items:
        action = "OVERWRITE" if _path_exists(item.destination) else "CREATE"
        lines.append(f"  {action}: {item.destination}")
    return "\n".join(lines)


def _rollback(
    installed: Sequence[Path], backups: Sequence[tuple[Path, Path]]
) -> list[str]:
    errors: list[str] = []
    for destination in reversed(installed):
        try:
            _remove_path(destination)
        except OSError as error:
            errors.append(f"remove {destination}: {error}")
    for destination, backup in reversed(backups):
        try:
            destination.parent.mkdir(parents=True, exist_ok=True)
            backup.replace(destination)
        except OSError as error:
            errors.append(f"restore {destination}: {error}")
    return errors


def install(
    skills_source: Path,
    codex_home: Path,
    *,
    dry_run: bool = False,
) -> tuple[Path, ...]:
    """Transactionally install direct child Skill directories."""
    codex_home = codex_home.expanduser().resolve()
    items = _build_items(skills_source, codex_home)
    print(_format_plan(items, dry_run=dry_run))
    destinations = tuple(item.destination for item in items)
    if dry_run:
        return destinations

    codex_home.parent.mkdir(parents=True, exist_ok=True)
    transaction = tempfile.TemporaryDirectory(
        prefix=".codex-skill-install-", dir=codex_home.parent
    )
    transaction_root = Path(transaction.name)
    payload_root = transaction_root / "payload"
    backup_root = transaction_root / "backup"
    installed: list[Path] = []
    backups: list[tuple[Path, Path]] = []

    try:
        for item in items:
            staged = payload_root / item.source.name
            shutil.copytree(
                item.source,
                staged,
                ignore=shutil.ignore_patterns("__pycache__", "*.pyc"),
            )

        (codex_home / "skills").mkdir(parents=True, exist_ok=True)
        for item in items:
            staged = payload_root / item.source.name
            destination = item.destination
            if _path_exists(destination):
                backup = backup_root / item.source.name
                backup.parent.mkdir(parents=True, exist_ok=True)
                destination.replace(backup)
                backups.append((destination, backup))
            staged.replace(destination)
            installed.append(destination)
    except Exception as error:
        rollback_errors = _rollback(installed, backups)
        transaction.cleanup()
        if rollback_errors:
            details = "; ".join(rollback_errors)
            raise InstallError(
                f"installation failed ({error}); rollback was incomplete: {details}"
            ) from error
        raise InstallError(f"installation failed ({error}); changes were rolled back") from error
    else:
        transaction.cleanup()

    print(f"Installed {len(destinations)} Skills into {codex_home / 'skills'}")
    return destinations


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Install direct child Skill directories into a Codex home."
    )
    parser.add_argument(
        "skills_source",
        type=Path,
        help="directory whose direct child Skill folders contain SKILL.md",
    )
    parser.add_argument(
        "--codex-home",
        type=Path,
        default=Path.home() / ".codex",
        help="Codex home directory (default: ~/.codex)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="show create/overwrite actions without changing files",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        install(args.skills_source, args.codex_home, dry_run=args.dry_run)
    except InstallError as error:
        print(f"error: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
