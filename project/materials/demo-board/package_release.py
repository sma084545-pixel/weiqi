#!/usr/bin/env python3
"""Create the T18 material delta and a reproducible T01+T18 full archive."""

from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parents[1]


def digest(path: Path) -> str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""): h.update(chunk)
    return h.hexdigest()


def all_files(root: Path):
    for p in sorted(root.rglob("*")):
        if p.is_file() and p.name not in {".DS_Store","artifact-manifest.json"} and "__pycache__" not in p.parts:
            yield p


def build_manifest() -> Path:
    entries=[]
    for p in all_files(HERE):
        entries.append({"path":str(p.relative_to(PROJECT)),"bytes":p.stat().st_size,"sha256":digest(p)})
    payload={
        "schemaVersion":1,"id":"T18-ARTIFACT-MANIFEST","revision":1,
        "rulesetId":"GO-CLUB-AREA-1","taskId":"T18","baseVersion":"0.2.0",
        "resultVersion":"0.2.0+t18.1","files":entries
    }
    out=HERE/"artifact-manifest.json"
    out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    return out


def add(z: zipfile.ZipFile, path: Path, arc: Path) -> None:
    info=zipfile.ZipInfo.from_file(path,str(arc)); info.date_time=(2026,9,6,21,0,0)
    with path.open("rb") as f: z.writestr(info,f.read(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)


def main():
    ap=argparse.ArgumentParser(); ap.add_argument("output_dir",type=Path); args=ap.parse_args()
    args.output_dir.mkdir(parents=True,exist_ok=True)
    build_manifest()
    delta=args.output_dir/"go-club-T18-0.2.0-plus-t18.1-materials.zip"
    full=args.output_dir/"go-club-T01-0.2.0-plus-T18-t18.1-full.zip"
    handoff=PROJECT/"handoff"/"T18.md"
    with zipfile.ZipFile(delta,"w") as z:
        for p in all_files(HERE): add(z,p,Path("go-club")/p.relative_to(PROJECT))
        add(z,HERE/"artifact-manifest.json",Path("go-club/materials/demo-board/artifact-manifest.json"))
        add(z,handoff,Path("go-club/handoff/T18.md"))
    with zipfile.ZipFile(full,"w") as z:
        for p in sorted(PROJECT.rglob("*")):
            if p.is_file() and p.name != ".DS_Store" and "__pycache__" not in p.parts:
                add(z,p,Path("go-club")/p.relative_to(PROJECT))
    outputs=[]
    for p in (delta,full): outputs.append({"file":p.name,"bytes":p.stat().st_size,"sha256":digest(p)})
    delivery={
        "schemaVersion":1,"id":"T18-DELIVERY-MANIFEST","revision":1,
        "rulesetId":"GO-CLUB-AREA-1","taskId":"T18","baseVersion":"0.2.0",
        "resultVersion":"0.2.0+t18.1",
        "baselineArchiveSha256":"03949f1f8c645832c7a93d0307cc770acaaf4a9692ea61d46a6d87408c37ba73",
        "archives":outputs,
        "integration":"Copy only go-club/materials/demo-board and go-club/handoff/T18.md into a current mainline; do not overwrite newer program files with the full reproduction archive."
    }
    manifest=args.output_dir/"delivery-manifest.json"; manifest.write_text(json.dumps(delivery,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    sums=args.output_dir/"SHA256SUMS.txt"; sums.write_text("".join(f"{x['sha256']}  {x['file']}\n" for x in outputs)+f"{digest(manifest)}  {manifest.name}\n",encoding="utf-8")
    print(json.dumps(delivery,ensure_ascii=False,indent=2))


if __name__=="__main__": main()
