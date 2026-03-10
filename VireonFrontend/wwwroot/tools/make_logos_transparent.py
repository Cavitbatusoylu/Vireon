import os
from pathlib import Path

from rembg import remove


def process_logo(input_path: Path, output_path: Path) -> None:
    with open(input_path, "rb") as i:
        data = i.read()
    result = remove(data)
    with open(output_path, "wb") as o:
        o.write(result)
    print(f"Processed {input_path.name} -> {output_path.name}")


def main() -> None:
    images_dir = (Path(__file__).resolve().parent.parent / "images").resolve()
    logos = [
        ("vireon-logo.png", "vireon-logo-transparent-new.png"),
        ("vireon-logo-transparent.png", "vireon-logo-new.png"),
    ]
    for src, dst in logos:
        process_logo(images_dir / src, images_dir / dst)
    print("All done")


if __name__ == "__main__":
    main()

