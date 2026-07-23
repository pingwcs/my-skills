#!/usr/bin/env python3
"""Download bounded, same-origin Gitea issue attachments with a host token."""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, unquote, urlencode, urljoin, urlparse, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


MAX_ATTACHMENTS = 20
MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024
MAX_TOTAL_BYTES = 100 * 1024 * 1024
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tif", ".tiff"}
LOG_EXTENSIONS = {".log", ".txt", ".out", ".trace"}
ATTACHMENT_MARKERS = ("/attachments/", "/uploads/")
URL_PATTERNS = (
    re.compile(r"!?\[[^\]]*\]\(\s*<?([^\s)>]+)", re.IGNORECASE),
    re.compile(r"<(https?://[^>\s]+)>", re.IGNORECASE),
    re.compile(r"(?:src|href)=[\"']([^\"']+)[\"']", re.IGNORECASE),
    re.compile(r"(?<![\w\"'=])(https?://[^\s<>)\]]+)", re.IGNORECASE),
)
MIME_EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
    "text/plain": ".txt",
}


class AttachmentError(RuntimeError):
    """A safe attachment collection failure."""


class AttachmentLimit(AttachmentError):
    """An attachment skipped because a hard resource limit was reached."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True, help="Gitea HTTPS origin")
    parser.add_argument("--issue-json", required=True, type=Path)
    parser.add_argument("--comments-json", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def origin(url: str) -> tuple[str, str, int | None]:
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    port = parsed.port
    if (scheme == "http" and port == 80) or (scheme == "https" and port == 443):
        port = None
    return scheme, (parsed.hostname or "").lower(), port


def redacted_url(url: str) -> str:
    parsed = urlsplit(url)
    query = urlencode(
        [(key, "[REDACTED]") for key, _ in parse_qsl(parsed.query, keep_blank_values=True)]
    )
    hostname = parsed.hostname or ""
    if ":" in hostname and not hostname.startswith("["):
        hostname = f"[{hostname}]"
    port = f":{parsed.port}" if parsed.port else ""
    return urlunsplit(
        (parsed.scheme, f"{hostname}{port}" if parsed.netloc else "", parsed.path, query, "")
    )


def read_json(path: Path, expected: type) -> Any:
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AttachmentError(f"could not read {path}: {exc}") from exc
    if not isinstance(payload, expected):
        raise AttachmentError(f"{path} must contain a JSON {expected.__name__}")
    return payload


def iter_urls(body: str) -> Iterable[str]:
    seen: set[str] = set()
    for pattern in URL_PATTERNS:
        for match in pattern.finditer(body or ""):
            candidate = match.group(1).strip().rstrip(".,;:")
            if candidate and candidate not in seen:
                seen.add(candidate)
                yield candidate


def category(path_or_url: str, content_type: str = "") -> str:
    suffix = Path(unquote(urlparse(path_or_url).path)).suffix.lower()
    mime = content_type.split(";", 1)[0].strip().lower()
    if suffix in IMAGE_EXTENSIONS or mime.startswith("image/"):
        return "image"
    if suffix in LOG_EXTENSIONS or mime.startswith("text/"):
        return "log"
    return "other"


def is_candidate(url: str) -> bool:
    path = urlparse(url).path.lower()
    return any(marker in path for marker in ATTACHMENT_MARKERS)


def safe_name(url: str, headers: Any, index: int, preferred: str) -> str:
    filename = preferred or Path(unquote(urlparse(url).path)).name or f"attachment-{index:03d}"
    filename = re.sub(r"[^A-Za-z0-9._-]+", "-", filename).strip(".-")
    filename = filename or f"attachment-{index:03d}"
    content_type = headers.get_content_type() if hasattr(headers, "get_content_type") else ""
    if not Path(filename).suffix:
        filename += MIME_EXTENSIONS.get(content_type) or mimetypes.guess_extension(content_type) or ""
    return filename[:180]


def unique_path(directory: Path, filename: str) -> Path:
    candidate = directory / filename
    counter = 2
    while candidate.exists():
        candidate = directory / f"{Path(filename).stem}-{counter}{Path(filename).suffix}"
        counter += 1
    return candidate


class SameOriginRedirect(HTTPRedirectHandler):
    def __init__(self, allowed_origin: tuple[str, str, int | None], token: str) -> None:
        super().__init__()
        self.allowed_origin = allowed_origin
        self.token = token

    def redirect_request(
        self,
        req: Request,
        fp: Any,
        code: int,
        msg: str,
        headers: Any,
        newurl: str,
    ) -> Request | None:
        resolved = urljoin(req.full_url, newurl)
        if origin(resolved) != self.allowed_origin:
            raise HTTPError(resolved, 403, "redirect target origin is not allowed", headers, fp)
        redirected = super().redirect_request(req, fp, code, msg, headers, resolved)
        if redirected is not None:
            redirected.add_unredirected_header("Authorization", f"token {self.token}")
        return redirected


def download(
    url: str,
    destination: Path,
    token: str,
    index: int,
    allowed_origin: tuple[str, str, int | None],
    preferred: str,
    remaining_total: int,
) -> dict[str, Any]:
    if origin(url) != allowed_origin:
        raise AttachmentError("attachment origin does not match the Gitea origin")
    request = Request(
        url,
        headers={
            "Accept": "*/*",
            "Authorization": f"token {token}",
            "User-Agent": "gitea-issue-scope/1",
        },
    )
    opener = build_opener(SameOriginRedirect(allowed_origin, token))
    limit = min(MAX_ATTACHMENT_BYTES, remaining_total)
    try:
        with opener.open(request, timeout=45) as response:
            declared = response.headers.get("Content-Length")
            if declared and int(declared) > limit:
                raise AttachmentLimit(f"attachment exceeds remaining limit of {limit} bytes")
            filename = safe_name(response.geturl(), response.headers, index, preferred)
            target = unique_path(destination, filename)
            digest = hashlib.sha256()
            size = 0
            try:
                with target.open("wb") as output:
                    while chunk := response.read(64 * 1024):
                        size += len(chunk)
                        if size > limit:
                            raise AttachmentLimit(
                                f"attachment exceeds remaining limit of {limit} bytes"
                            )
                        digest.update(chunk)
                        output.write(chunk)
            except Exception:
                target.unlink(missing_ok=True)
                raise
            content_type = response.headers.get("Content-Type", "application/octet-stream")
            return {
                "status": "downloaded",
                "local_path": str(target),
                "content_type": content_type,
                "size": size,
                "sha256": digest.hexdigest(),
                "category": category(filename, content_type),
            }
    except HTTPError as exc:
        raise AttachmentError(f"HTTP {exc.code}") from exc
    except (URLError, TimeoutError, OSError, ValueError) as exc:
        raise AttachmentError(str(exc)) from exc


def candidate_sources(
    issue: dict[str, Any], comments: list[Any]
) -> Iterable[tuple[str, Any, str, list[Any]]]:
    yield (
        "issue",
        issue.get("number") or issue.get("index"),
        str(issue.get("body") or ""),
        list(issue.get("assets") or []),
    )
    for comment in comments:
        if isinstance(comment, dict):
            yield (
                "comment",
                comment.get("id"),
                str(comment.get("body") or ""),
                list(comment.get("assets") or []),
            )


def collect_candidates(
    base_url: str, issue: dict[str, Any], comments: list[Any]
) -> list[tuple[str, Any, str, dict[str, Any] | None]]:
    candidates: list[tuple[str, Any, str, dict[str, Any] | None]] = []
    seen: set[str] = set()
    for source_kind, source_id, body, assets in candidate_sources(issue, comments):
        raw_candidates: list[tuple[str, dict[str, Any] | None]] = []
        for asset in assets:
            if isinstance(asset, dict) and (
                asset.get("browser_download_url") or asset.get("url")
            ):
                raw_candidates.append(
                    (str(asset.get("browser_download_url") or asset.get("url")), asset)
                )
        raw_candidates.extend((url, None) for url in iter_urls(body))
        for raw_url, asset in raw_candidates:
            resolved = urljoin(f"{base_url}/", raw_url)
            if resolved in seen or (asset is None and not is_candidate(resolved)):
                continue
            seen.add(resolved)
            candidates.append((source_kind, source_id, resolved, asset))
    return candidates


def write_manifest(
    output: Path,
    base_url: str,
    issue_number: Any,
    records: list[dict[str, Any]],
    warnings: list[str],
) -> Path:
    manifest = {
        "schema_version": 3,
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "source": {"base_url": base_url, "issue": issue_number},
        "credential": {
            "source": "host environment GITEA_ACCESS_TOKEN",
            "token_exposed": False,
        },
        "limits": {
            "max_attachments": MAX_ATTACHMENTS,
            "max_attachment_bytes": MAX_ATTACHMENT_BYTES,
            "max_total_bytes": MAX_TOTAL_BYTES,
        },
        "attachments": records,
        "warnings": warnings,
    }
    path = output / "manifest.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def main() -> int:
    args = parse_args()
    base_url = args.base_url.rstrip("/")
    parsed = urlparse(base_url)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
        print("--base-url must be an absolute HTTPS URL without embedded credentials", file=sys.stderr)
        return 2

    try:
        issue = read_json(args.issue_json, dict)
        comments = read_json(args.comments_json, list)
        base_origin = origin(base_url)
        candidates = collect_candidates(base_url, issue, comments)
    except (AttachmentError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    output = args.output.resolve()
    attachments_dir = output / "attachments"
    attachments_dir.mkdir(parents=True, exist_ok=True)
    records: list[dict[str, Any]] = []
    warnings: list[str] = []
    token = os.environ.get("GITEA_ACCESS_TOKEN", "")
    total = 0

    for index, (source_kind, source_id, resolved, asset) in enumerate(candidates, start=1):
        record: dict[str, Any] = {
            "source_kind": source_kind,
            "source_id": source_id,
            "url": redacted_url(resolved),
            "category": category(str((asset or {}).get("name") or resolved)),
        }
        if index > MAX_ATTACHMENTS:
            record.update(status="skipped", reason=f"candidate limit is {MAX_ATTACHMENTS}")
        elif not token:
            record.update(status="blocked", reason="GITEA_ACCESS_TOKEN is not set")
        elif total >= MAX_TOTAL_BYTES:
            record.update(status="skipped", reason=f"total limit is {MAX_TOTAL_BYTES} bytes")
        else:
            try:
                result = download(
                    resolved,
                    attachments_dir,
                    token,
                    index,
                    base_origin,
                    str((asset or {}).get("name") or ""),
                    MAX_TOTAL_BYTES - total,
                )
                total += int(result["size"])
                result["local_path"] = str(Path(result["local_path"]).relative_to(output))
                record.update(result)
            except AttachmentLimit as exc:
                record.update(status="skipped", reason=str(exc))
            except (AttachmentError, ValueError) as exc:
                record.update(status="error", reason=str(exc))
        if record["status"] != "downloaded":
            warnings.append(f"{record['url']}: {record.get('reason', 'not downloaded')}")
        records.append(record)

    manifest = write_manifest(
        output,
        base_url,
        issue.get("number") or issue.get("index"),
        records,
        warnings,
    )
    downloaded = sum(1 for item in records if item.get("status") == "downloaded")
    print(f"Collected {downloaded} of {len(records)} attachment candidates")
    print(manifest)
    if candidates and not token:
        return 1
    return 0 if not warnings else 3


if __name__ == "__main__":
    raise SystemExit(main())
