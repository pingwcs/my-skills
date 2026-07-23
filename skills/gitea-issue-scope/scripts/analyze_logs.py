#!/usr/bin/env python3
"""Extract, redact, and group high-signal failures from downloaded text logs."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


LOG_EXTENSIONS = {".log", ".txt", ".out", ".trace"}
SEVERITIES = (
    ("fatal", re.compile(r"\b(fatal|critical|panic|segmentation fault|out of memory|oomkilled)\b", re.I)),
    ("error", re.compile(r"\b(error|exception|traceback|failed|failure|unhandled|caused by)\b", re.I)),
    ("warning", re.compile(r"\b(warn|warning|retry|degraded|timeout)\b", re.I)),
)
EXCEPTION = re.compile(r"\b([A-Za-z_$][\w.$]*(?:Exception|Error|Failure|Panic))\b")
TIMESTAMPS = (
    re.compile(r"\b\d{4}-\d{2}-\d{2}[T ][0-2]\d:[0-5]\d:[0-5]\d(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b"),
    re.compile(r"\b\d{4}/\d{2}/\d{2}[ T][0-2]\d:[0-5]\d:[0-5]\d(?:[.,]\d+)?\b"),
)
REDACTIONS = (
    (re.compile(r"(?i)\b(authorization\s*:\s*(?:bearer|token)\s+)[^\s,;]+"), r"\1[REDACTED]"),
    (re.compile(r"(?i)\b(password|passwd|secret|token|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)\b(\s*[:=]\s*)[^\s,;]+"), r"\1\2[REDACTED]"),
    (re.compile(r"\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\b"), "[REDACTED_JWT]"),
    (re.compile(r"(?i)(https?://)[^/@:\s]+:[^/@\s]+@"), r"\1[REDACTED]@"),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", type=Path)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--max-bytes", type=int, default=5 * 1024 * 1024)
    parser.add_argument("--context-lines", type=int, default=2)
    parser.add_argument("--max-findings", type=int, default=200)
    return parser.parse_args()


def redact(text: str) -> str:
    for pattern, replacement in REDACTIONS:
        text = pattern.sub(replacement, text)
    return text


def decode(data: bytes) -> tuple[str, str]:
    if data.startswith((b"\xff\xfe", b"\xfe\xff")):
        return data.decode("utf-16", errors="replace"), "utf-16"
    for encoding in ("utf-8-sig", "gb18030", "cp1252"):
        try:
            return data.decode(encoding), encoding
        except UnicodeDecodeError:
            pass
    return data.decode("utf-8", errors="replace"), "utf-8-replacement"


def expand(paths: Iterable[Path]) -> list[Path]:
    found: dict[Path, None] = {}
    for raw in paths:
        path = raw.resolve()
        candidates = path.rglob("*") if path.is_dir() else [path]
        for candidate in candidates:
            if candidate.is_file() and candidate.suffix.lower() in LOG_EXTENSIONS:
                found[candidate] = None
    return sorted(found)


def manifest_paths(path: Path) -> list[Path]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    root = path.resolve().parent
    return [
        root / item["local_path"]
        for item in payload.get("attachments", [])
        if item.get("status") == "downloaded"
        and item.get("category") == "log"
        and item.get("local_path")
    ]


def severity(line: str) -> str | None:
    return next((name for name, pattern in SEVERITIES if pattern.search(line)), None)


def timestamp(line: str) -> str | None:
    for pattern in TIMESTAMPS:
        if match := pattern.search(line):
            return match.group(0)
    return None


def fingerprint(line: str) -> str:
    normalized = redact(line.strip().lower())
    for pattern in TIMESTAMPS:
        normalized = pattern.sub("<timestamp>", normalized)
    normalized = re.sub(r"\b[0-9a-f]{8}-[0-9a-f-]{27,}\b|\b0x[0-9a-f]+\b|\b\d+\b", "<n>", normalized)
    return hashlib.sha256(re.sub(r"\s+", " ", normalized).encode()).hexdigest()[:16]


def analyze(
    path: Path, maximum: int, context_lines: int, max_findings: int
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    raw = path.read_bytes()
    text, encoding = decode(raw[:maximum])
    lines = text.splitlines()
    metadata = {
        "path": str(path),
        "size": len(raw),
        "bytes_analyzed": min(len(raw), maximum),
        "encoding": encoding,
        "truncated": len(raw) > maximum,
        "line_count_analyzed": len(lines),
    }
    findings: list[dict[str, Any]] = []
    for index, line in enumerate(lines):
        level = severity(line)
        if not level:
            continue
        start = max(0, index - context_lines)
        end = min(len(lines), index + context_lines + 1)
        match = EXCEPTION.search(line)
        findings.append(
            {
                "fingerprint": fingerprint(line),
                "severity": level,
                "exception": match.group(1) if match else None,
                "timestamp": timestamp(line),
                "path": str(path),
                "line": index + 1,
                "message": redact(line.strip())[:2000],
                "context": [redact(item)[:2000] for item in lines[start:end]],
            }
        )
        if len(findings) >= max_findings:
            metadata["findings_truncated"] = True
            break
    return metadata, findings


def grouped(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for finding in findings:
        key = finding["fingerprint"]
        if key not in result:
            result[key] = {
                **finding,
                "count": 1,
                "occurrences": [{"path": finding["path"], "line": finding["line"]}],
            }
        else:
            result[key]["count"] += 1
            if len(result[key]["occurrences"]) < 10:
                result[key]["occurrences"].append(
                    {"path": finding["path"], "line": finding["line"]}
                )
    rank = {"fatal": 0, "error": 1, "warning": 2}
    return sorted(
        result.values(),
        key=lambda item: (rank[item["severity"]], -item["count"], item["path"], item["line"]),
    )


def main() -> int:
    args = parse_args()
    if not args.paths and not args.manifest:
        print("provide paths or --manifest", file=sys.stderr)
        return 2
    if args.max_bytes < 1 or args.context_lines < 0 or args.max_findings < 1:
        print("analysis limits are invalid", file=sys.stderr)
        return 2
    try:
        paths = list(args.paths) + (manifest_paths(args.manifest) if args.manifest else [])
        files = expand(paths)
    except (OSError, json.JSONDecodeError, KeyError, TypeError) as exc:
        print(f"could not resolve inputs: {exc}", file=sys.stderr)
        return 1
    if not files:
        print("no supported log files found", file=sys.stderr)
        return 1

    file_reports: list[dict[str, Any]] = []
    findings: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    for path in files:
        try:
            metadata, extracted = analyze(
                path, args.max_bytes, args.context_lines, args.max_findings
            )
            file_reports.append(metadata)
            findings.extend(extracted)
        except OSError as exc:
            errors.append({"path": str(path), "error": str(exc)})
    counts = Counter(item["severity"] for item in findings)
    report = {
        "schema_version": 2,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "files": len(file_reports),
            "raw_findings": len(findings),
            "grouped_findings": len({item["fingerprint"] for item in findings}),
            "severity_counts": dict(counts),
            "truncated_files": sum(1 for item in file_reports if item["truncated"]),
            "errors": len(errors),
        },
        "files": file_reports,
        "findings": grouped(findings),
        "errors": errors,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(args.output)
    return 0 if not errors else 3


if __name__ == "__main__":
    raise SystemExit(main())
