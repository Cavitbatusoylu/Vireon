from pathlib import Path


def main() -> None:
    """
    Legacy helper for older template folders.
    If you still have a TemplateMo HTML that references light/dark logos, this removes
    `vireon-logo-light.png` <img> tags and strips `logo-dark` class occurrences.
    """

    target_html = Path(__file__).resolve().parent.parent / "index.html"
    if not target_html.exists():
        raise FileNotFoundError(f"Target HTML not found: {target_html}")

    html = target_html.read_text(encoding="utf-8")

    # Remove logo-light img tags (full line versions)
    import re

    html = re.sub(r'\s*<img src="images/vireon-logo-light\.png"[^>]*>', "", html)

    # Remove logo-dark class from remaining images
    html = html.replace(" logo-dark", "")

    target_html.write_text(html, encoding="utf-8")
    print("Done! Removed all light logo references and logo-dark classes.")


if __name__ == "__main__":
    main()

