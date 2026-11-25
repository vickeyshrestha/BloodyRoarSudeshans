"""Process JPG fighter sprites into trimmed, transparent RGBA PNGs.

- Scans assets/sprites/ for .jpg/.jpeg files
- Performs 4-connected edge flood-fill from borders to remove near-white background
  (R > 235, G > 235, B > 235) while preserving interior white details (eyes, tusks, wraps)
- Applies slight anti-aliased edge feathering on boundary pixels
- Trims transparent padding so feet sit flush at the bottom edge
- Downscales oversized sprites to max 560px height for fast web loading
- Overwrites existing .png files and moves raw .jpg/.jpeg files to assets/sprites/raw_jpg/
"""

from collections import deque
from pathlib import Path
import shutil
import numpy as np
from PIL import Image

SPRITES_DIR = Path(__file__).resolve().parent.parent / "assets" / "sprites"
RAW_DIR = SPRITES_DIR / "raw_jpg"
WHITE_THRESH = 235
FEATHER_THRESH = 205
MAX_HEIGHT = 560


def remove_white_bg_floodfill(img: Image.Image) -> Image.Image:
    rgba = np.array(img.convert("RGBA"), dtype=np.uint8)
    h, w, _ = rgba.shape
    rgb = rgba[:, :, :3]

    is_near_white = (
        (rgb[:, :, 0] > WHITE_THRESH)
        & (rgb[:, :, 1] > WHITE_THRESH)
        & (rgb[:, :, 2] > WHITE_THRESH)
    )

    visited = np.zeros((h, w), dtype=bool)
    bg_mask = np.zeros((h, w), dtype=bool)
    q = deque()

    # Seed from all 4 image borders
    for x in range(w):
        if is_near_white[0, x]:
            visited[0, x] = True
            q.append((0, x))
        if is_near_white[h - 1, x] and not visited[h - 1, x]:
            visited[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if is_near_white[y, 0] and not visited[y, 0]:
            visited[y, 0] = True
            q.append((y, 0))
        if is_near_white[y, w - 1] and not visited[y, w - 1]:
            visited[y, w - 1] = True
            q.append((y, w - 1))

    # 4-connected BFS flood fill
    while q:
        cy, cx = q.popleft()
        bg_mask[cy, cx] = True
        if cy > 0 and not visited[cy - 1, cx] and is_near_white[cy - 1, cx]:
            visited[cy - 1, cx] = True
            q.append((cy - 1, cx))
        if cy + 1 < h and not visited[cy + 1, cx] and is_near_white[cy + 1, cx]:
            visited[cy + 1, cx] = True
            q.append((cy + 1, cx))
        if cx > 0 and not visited[cy, cx - 1] and is_near_white[cy, cx - 1]:
            visited[cy, cx - 1] = True
            q.append((cy, cx - 1))
        if cx + 1 < w and not visited[cy, cx + 1] and is_near_white[cy, cx + 1]:
            visited[cy, cx + 1] = True
            q.append((cy, cx + 1))

    # Zero out background alpha
    rgba[bg_mask, 3] = 0

    # Slight anti-aliased edge feathering for pixels adjacent to bg_mask
    adj_bg = np.zeros((h, w), dtype=bool)
    adj_bg[1:, :] |= bg_mask[:-1, :]
    adj_bg[:-1, :] |= bg_mask[1:, :]
    adj_bg[:, 1:] |= bg_mask[:, :-1]
    adj_bg[:, :-1] |= bg_mask[:, 1:]

    edge_candidates = (~bg_mask) & adj_bg
    min_ch = rgb.min(axis=2)
    feather_mask = edge_candidates & (min_ch > FEATHER_THRESH)
    if np.any(feather_mask):
        # Map min_ch in [205..255] -> alpha [220..40]
        t = np.clip((255.0 - min_ch[feather_mask]) / (255.0 - FEATHER_THRESH), 0.12, 1.0)
        rgba[feather_mask, 3] = (t * 240).astype(np.uint8)

    return Image.fromarray(rgba, mode="RGBA")


def trim_and_align_bottom(img: Image.Image) -> Image.Image:
    alpha = np.array(img)[:, :, 3]
    ys, xs = np.where(alpha > 12)
    if len(ys) == 0 or len(xs) == 0:
        return img
    top = max(0, int(ys.min()) - 2)
    bottom = min(img.height, int(ys.max()) + 1)  # Flush at feet
    left = max(0, int(xs.min()) - 2)
    right = min(img.width, int(xs.max()) + 3)
    cropped = img.crop((left, top, right, bottom))

    if cropped.height > MAX_HEIGHT:
        ratio = MAX_HEIGHT / cropped.height
        new_w = max(1, int(round(cropped.width * ratio)))
        cropped = cropped.resize((new_w, MAX_HEIGHT), Image.Resampling.LANCZOS)
    return cropped


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    jpg_files = sorted(
        [p for p in SPRITES_DIR.iterdir() if p.is_file() and p.suffix.lower() in (".jpg", ".jpeg")]
    )
    if not jpg_files:
        print("No .jpg/.jpeg files found in", SPRITES_DIR)
        return

    for jpg_path in jpg_files:
        out_png = SPRITES_DIR / f"{jpg_path.stem}.png"
        with Image.open(jpg_path) as im:
            clean = remove_white_bg_floodfill(im)
            trimmed = trim_and_align_bottom(clean)
            trimmed.save(out_png, format="PNG", optimize=True)
        shutil.move(str(jpg_path), str(RAW_DIR / jpg_path.name))
        print(f"Processed {jpg_path.name} -> {out_png.name} ({trimmed.width}x{trimmed.height})")


if __name__ == "__main__":
    main()
