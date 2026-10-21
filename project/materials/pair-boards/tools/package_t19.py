#!/usr/bin/env python3
"""Create T19 file manifest, incremental archive, full baseline archive, and checksums."""

from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[3]
MATERIALS = PROJECT / "materials" / "pair-boards"
DELIVERY = MATERIALS / "delivery"
MANIFEST = MATERIALS / "FILE_MANIFEST.json"
HANDOFF = PROJECT / "handoff" / "T19.md"
VERSION = "0.2.0-t19.1"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def relative_project_files():
    files = []
    for path in MATERIALS.rglob("*"):
        if not path.is_file():
            continue
        if DELIVERY in path.parents or path == MANIFEST:
            continue
        files.append(path)
    files.append(HANDOFF)
    return sorted(files, key=lambda p: p.relative_to(PROJECT).as_posix())


def write_manifest():
    files = relative_project_files()
    data = {
        "schemaVersion": 1,
        "id": "T19-FILE-MANIFEST",
        "revision": 1,
        "rulesetId": "GO-CLUB-AREA-1",
        "baseVersion": "0.2.0",
        "resultVersion": VERSION,
        "selfHashExcluded": True,
        "fileCount": len(files),
        "files": [
            {
                "path": path.relative_to(PROJECT).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
            for path in files
        ],
    }
    MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def zip_paths(output: Path, files: list[Path]):
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in sorted(files, key=lambda p: p.relative_to(PROJECT).as_posix()):
            arcname = Path("go-club") / path.relative_to(PROJECT)
            zf.write(path, arcname.as_posix())
    with zipfile.ZipFile(output) as zf:
        bad = zf.testzip()
        if bad:
            raise RuntimeError(f"ZIP integrity failure: {bad}")


def full_project_files():
    files = []
    for path in PROJECT.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(PROJECT)
        parts = rel.parts
        if "node_modules" in parts or ".git" in parts or ".pnpm-store" in parts:
            continue
        if len(parts) >= 3 and parts[:3] == ("materials", "pair-boards", "delivery"):
            continue
        if path.name == ".DS_Store":
            continue
        files.append(path)
    return files


def main():
    DELIVERY.mkdir(parents=True, exist_ok=True)
    write_manifest()

    incremental = DELIVERY / f"T19-pair-boards-{VERSION}-materials.zip"
    full = DELIVERY / f"go-club-T19-{VERSION}-full.zip"
    zip_paths(incremental, relative_project_files() + [MANIFEST])
    zip_paths(full, full_project_files())

    archives = [incremental, full]
    checksum_lines = [f"{sha256(path)}  {path.name}" for path in archives]
    (DELIVERY / "SHA256SUMS.txt").write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")
    delivery_manifest = {
        "schemaVersion": 1,
        "id": "T19-DELIVERY-MANIFEST",
        "revision": 1,
        "rulesetId": "GO-CLUB-AREA-1",
        "baseVersion": "0.2.0",
        "resultVersion": VERSION,
        "archives": [
            {
                "file": path.name,
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
                "zipIntegrity": "pass",
                "purpose": "selective T19 materials and handoff" if path == incremental else "reproducible full 0.2.0 baseline plus T19 branch",
            }
            for path in archives
        ],
        "mergeWarning": "Do not overwrite a newer mainline with the full archive; selectively merge materials/pair-boards and handoff/T19.md.",
    }
    (DELIVERY / "delivery-manifest.json").write_text(
        json.dumps(delivery_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Manifest files: {json.loads(MANIFEST.read_text(encoding='utf-8'))['fileCount']}")
    for path in archives:
        print(path.name, path.stat().st_size, sha256(path))


if __name__ == "__main__":
    main()
