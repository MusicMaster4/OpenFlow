from pathlib import Path
import sys

try:
    from PIL import Image
except ModuleNotFoundError as error:
    raise SystemExit(
        "Pillow is required to generate the Windows app icon. "
        "Install the Python build dependencies in .venv before packaging."
    ) from error


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE_ICON = PROJECT_ROOT / "src" / "assets" / "openflow.png"
WINDOWS_ICON = PROJECT_ROOT / "src" / "assets" / "openflow.ico"
ICO_SIZES = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)]


def main() -> int:
    if not SOURCE_ICON.exists():
        print(f"Source icon not found: {SOURCE_ICON}", file=sys.stderr)
        return 1

    with Image.open(SOURCE_ICON) as image:
        icon = image.convert("RGBA")
        if min(icon.size) < 256:
            print(
                f"Source icon must be at least 256x256, got {icon.size[0]}x{icon.size[1]}",
                file=sys.stderr,
            )
            return 1

        WINDOWS_ICON.parent.mkdir(parents=True, exist_ok=True)
        icon.save(WINDOWS_ICON, format="ICO", sizes=ICO_SIZES)

    print(
        f"Generated {WINDOWS_ICON.relative_to(PROJECT_ROOT)} "
        f"with sizes: {', '.join(f'{w}x{h}' for w, h in ICO_SIZES)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
