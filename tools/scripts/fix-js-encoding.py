#!/usr/bin/env python3
"""Fix mojibake in split vireon JS modules."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "src" / "Vireon.PresentationLayer" / "wwwroot" / "js"
SKIP = {"vireon.backup.js"}

REPLACEMENTS = [
    ("â‚º", "\u20ba"),
    ("â‚¬", "\u20ac"),
    ("Â£", "\u00a3"),
    ("â†’", "\u2192"),
    ("â€”", "\u2014"),
    ("â€¦", "\u2026"),
    ("âœ“", "\u2713"),
    ("âœ•", "\u2715"),
    ("âš ", "\u26a0"),
    ("â„¹", "\u2139"),
    ("Ã—", "\u00d7"),
    ("Ã‡", "\u00c7"),
    ("Ã§", "\u00e7"),
    ("Ã–", "\u00d6"),
    ("Ã¶", "\u00f6"),
    ("Ãœ", "\u00dc"),
    ("Ã¼", "\u00fc"),
    ("Ä°ÅŸ", "\u0130\u015f"),
    ("Ä°", "\u0130"),
    ("Ä±", "\u0131"),
    ("ÄŸ", "\u011f"),
    ("Äž", "\u011e"),
    ("ÅŸ", "\u015f"),
    ("Åž", "\u015e"),
]


def fix_mojibake(text: str) -> str:
    prev = None
    while prev != text:
        prev = text
        try:
            text = text.encode("latin-1").decode("utf-8")
        except (UnicodeDecodeError, UnicodeEncodeError):
            break
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    return text


def main() -> None:
    for path in sorted(ROOT.glob("vireon-*.js")):
        if path.name in SKIP:
            continue
        raw = path.read_text(encoding="utf-8")
        fixed = fix_mojibake(raw)
        if fixed != raw:
            path.write_text(fixed, encoding="utf-8", newline="\n")
            print(f"patched: {path.name}")


if __name__ == "__main__":
    main()
