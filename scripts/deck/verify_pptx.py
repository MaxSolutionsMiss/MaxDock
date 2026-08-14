#!/usr/bin/env python3
"""Check a .pptx for the structural faults PowerPoint refuses to open.

The XSD says some children appear at most once, and some ids must be unique.
python-pptx will happily write a second one, LibreOffice and python-pptx will
both still read the result, and PowerPoint will then decline the whole file
with "found a problem with content". This catches that before it ships.

Run:  python3 scripts/deck/verify_pptx.py docs/deck/MaxDock_introduction_v7.pptx
"""
import collections
import re
import sys
import zipfile

from defusedxml import minidom

P = "http://schemas.openxmlformats.org/presentationml/2006/main"
SINGLETONS = ("bg", "spTree")          # at most one of each, per cSld


def check(path):
    faults = []
    with zipfile.ZipFile(path) as z:
        broken = z.testzip()
        if broken:
            return [f"corrupt entry in the archive: {broken}"]

        parts = set(z.namelist())
        slides = sorted((n for n in parts
                         if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)),
                        key=lambda n: int(re.search(r"\d+", n[16:]).group()))

        for name in slides:
            xml = z.read(name)
            try:
                dom = minidom.parseString(xml)
            except Exception as exc:                      # noqa: BLE001
                faults.append(f"{name}: will not parse — {exc}")
                continue

            csld = dom.getElementsByTagNameNS(P, "cSld")
            if len(csld) != 1:
                faults.append(f"{name}: {len(csld)} <p:cSld>, expected 1")
                continue
            for tag in SINGLETONS:
                found = [n for n in csld[0].childNodes
                         if n.nodeType == n.ELEMENT_NODE
                         and n.localName == tag and n.namespaceURI == P]
                if len(found) > 1:
                    faults.append(f"{name}: {len(found)} <p:{tag}>, "
                                  f"the schema allows one")

            ids = [n.getAttribute("id")
                   for n in dom.getElementsByTagNameNS(P, "cNvPr")]
            dupes = [i for i, n in collections.Counter(ids).items() if n > 1]
            if dupes:
                faults.append(f"{name}: shape ids used twice: "
                              f"{', '.join(sorted(dupes))}")

            rels = f"ppt/slides/_rels/{name.split('/')[-1]}.rels"
            if rels in parts:
                declared = set(re.findall(rb'Id="([^"]+)"', z.read(rels)))
                used = set(re.findall(rb'r:(?:embed|id|link)="([^"]+)"', xml))
                missing = used - declared
                if missing:
                    faults.append(f"{name}: references relationships that do "
                                  f"not exist: "
                                  f"{', '.join(sorted(m.decode() for m in missing))}")

        for required in ("[Content_Types].xml", "ppt/presentation.xml",
                         "_rels/.rels"):
            if required not in parts:
                faults.append(f"missing {required}")

    return faults


def main():
    path = sys.argv[1]
    faults = check(path)
    if faults:
        print(f"FAILED — {path}")
        for fault in faults:
            print(f"  {fault}")
        raise SystemExit(1)
    print(f"structure ok — {path}")


if __name__ == "__main__":
    main()
