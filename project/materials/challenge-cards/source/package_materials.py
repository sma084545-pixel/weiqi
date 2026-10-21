#!/usr/bin/env python3
"""Create and verify the T21 material-only increment ZIP."""

from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
MATERIAL = HERE.parent
PROJECT = MATERIAL.parent.parent
HANDOFF = PROJECT / "handoff" / "T21.md"
OUTPUT = MATERIAL / "output" / "T21-0.15.1-t21.1-MATERIALS.zip"


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def dump(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def payload_files() -> list[Path]:
    skip = {
        OUTPUT.resolve(),
        (MATERIAL / "FILE_MANIFEST.json").resolve(),
        (MATERIAL / "SHA256SUMS.txt").resolve(),
        (MATERIAL / "validation" / "PACKAGE-CHECKS.json").resolve(),
        (MATERIAL / "validation" / "PACKAGE_PAYLOAD_MANIFEST.json").resolve(),
    }
    files = []
    for path in MATERIAL.rglob("*"):
        if not path.is_file() or path.resolve() in skip or "rendered" in path.parts:
            continue
        files.append(path)
    return sorted(files)


def main() -> None:
    payload = payload_files()
    entries = [
        {
            "path": "materials/challenge-cards/" + p.relative_to(MATERIAL).as_posix(),
            "bytes": p.stat().st_size,
            "sha256": sha(p),
        }
        for p in payload
    ]
    entries.append({"path": "handoff/T21.md", "bytes": HANDOFF.stat().st_size, "sha256": sha(HANDOFF)})
    payload_manifest = {
        "schemaVersion": 1,
        "id": "T21-PACKAGE-PAYLOAD",
        "revision": 1,
        "rulesetId": "GO-CLUB-AREA-1",
        "baseVersion": "0.15.1",
        "resultVersion": "0.15.1-t21.1",
        "files": entries,
    }
    manifest_path = MATERIAL / "validation" / "PACKAGE_PAYLOAD_MANIFEST.json"
    dump(manifest_path, payload_manifest)
    payload.append(manifest_path)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    if OUTPUT.exists():
        OUTPUT.unlink()
    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in payload:
            arc = "materials/challenge-cards/" + path.relative_to(MATERIAL).as_posix()
            zf.write(path, arc)
        zf.write(HANDOFF, "handoff/T21.md")

    with zipfile.ZipFile(OUTPUT, "r") as zf:
        bad = zf.testzip()
        names = zf.namelist()
        if bad:
            raise SystemExit(f"ZIP CRC failure: {bad}")
        required = {
            "materials/challenge-cards/output/T21_challenge_cards_front_A4.pdf",
            "materials/challenge-cards/output/T21_challenge_cards_back_A4.pdf",
            "materials/challenge-cards/output/T21_teacher_answer_book.pdf",
            "materials/challenge-cards/CARD_INDEX.json",
            "handoff/T21.md",
        }
        missing = sorted(required - set(names))
        if missing:
            raise SystemExit("Missing package entries: " + ", ".join(missing))

    package_checks = {
        "schemaVersion": 1,
        "id": "T21-PACKAGE-CHECKS",
        "revision": 1,
        "rulesetId": "GO-CLUB-AREA-1",
        "status": "passed",
        "zip": OUTPUT.relative_to(MATERIAL).as_posix(),
        "zipBytes": OUTPUT.stat().st_size,
        "zipSha256": sha(OUTPUT),
        "entryCount": len(names),
        "crc": "passed",
        "requiredEntries": "passed",
        "scope": "materials/challenge-cards plus handoff/T21.md only; no src, schemas, content, lockfiles, README or CHANGELOG",
    }
    dump(MATERIAL / "validation" / "PACKAGE-CHECKS.json", package_checks)

    manifest_entries = []
    for path in sorted(MATERIAL.rglob("*")):
        if not path.is_file() or path.name in {"FILE_MANIFEST.json", "SHA256SUMS.txt"} or "rendered" in path.parts:
            continue
        manifest_entries.append({"path": path.relative_to(MATERIAL).as_posix(), "bytes": path.stat().st_size, "sha256": sha(path)})
    full_manifest = {
        "schemaVersion": 1,
        "id": "T21-FILE-MANIFEST",
        "revision": 1,
        "rulesetId": "GO-CLUB-AREA-1",
        "resultVersion": "0.15.1-t21.1",
        "excludes": ["validation/rendered/*.png (reproducible intermediates; records and contact sheets retained)"],
        "files": manifest_entries,
    }
    dump(MATERIAL / "FILE_MANIFEST.json", full_manifest)
    (MATERIAL / "SHA256SUMS.txt").write_text("\n".join(f"{x['sha256']}  {x['path']}" for x in manifest_entries) + "\n", encoding="utf-8")
    print(f"Packaged {len(names)} entries; CRC passed; SHA-256 {package_checks['zipSha256']}")


if __name__ == "__main__":
    main()
