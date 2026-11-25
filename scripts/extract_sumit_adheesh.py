"""Extract 16 individual transparent PNG sprites for Sumit and Adheesh from the 4x4 sheet."""

from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image

SHEET_PATH = Path(
    r"C:\Users\logon\.gemini\antigravity\brain\00097b95-e73f-49bb-84f1-ec96d7462531\.user_uploaded\media_1795650457344_a80060e2.jpg"
)
SPRITES_DIR = Path(__file__).resolve().parent.parent / "assets" / "sprites"

GRID_NAMES = [
    ["sumit_human", "sumit_human_walk", "sumit_human_punch", "sumit_human_kick"],
    ["sumit_beast", "sumit_beast_walk", "sumit_beast_punch", "sumit_beast_kick"],
    ["adheesh_human", "adheesh_human_walk", "adheesh_human_punch", "adheesh_human_kick"],
    ["adheesh_beast", "adheesh_beast_walk", "adheesh_beast_punch", "adheesh_beast_kick"],
]


def remove_checkerboard_bg(img: Image.Image) -> Image.Image:
    rgba = np.array(img.convert("RGBA"), dtype=np.uint8)
    h, w, _ = rgba.shape
    rgb = rgba[:, :, :3].astype(np.int16)
    min_ch = rgb.min(axis=2)
    max_ch = rgb.max(axis=2)

    # Checkerboard cells are neutral light gray / white (min > 178, low saturation < 24)
    is_bg_color = (min_ch > 178) & ((max_ch - min_ch) < 24)

    visited = np.zeros((h, w), dtype=bool)
    bg_mask = np.zeros((h, w), dtype=bool)
    q = deque()

    for x in range(w):
        if is_bg_color[0, x]:
            visited[0, x] = True
            q.append((0, x))
        if is_bg_color[h - 1, x] and not visited[h - 1, x]:
            visited[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if is_bg_color[y, 0] and not visited[y, 0]:
            visited[y, 0] = True
            q.append((y, 0))
        if is_bg_color[y, w - 1] and not visited[y, w - 1]:
            visited[y, w - 1] = True
            q.append((y, w - 1))

    while q:
        cy, cx = q.popleft()
        bg_mask[cy, cx] = True
        if cy > 0 and not visited[cy - 1, cx] and is_bg_color[cy - 1, cx]:
            visited[cy - 1, cx] = True
            q.append((cy - 1, cx))
        if cy + 1 < h and not visited[cy + 1, cx] and is_bg_color[cy + 1, cx]:
            visited[cy + 1, cx] = True
            q.append((cy + 1, cx))
        if cx > 0 and not visited[cy, cx - 1] and is_bg_color[cy, cx - 1]:
            visited[cy, cx - 1] = True
            q.append((cy, cx - 1))
        if cx + 1 < w and not visited[cy, cx + 1] and is_bg_color[cy, cx + 1]:
            visited[cy, cx + 1] = True
            q.append((cy, cx + 1))

    # Also remove enclosed checkerboard pockets >= 45 px
    pocket_cand = is_bg_color & (~bg_mask)
    pvis = np.zeros((h, w), dtype=bool)
    ys, xs = np.where(pocket_cand)
    for sy, sx in zip(ys.tolist(), xs.tolist()):
        if pvis[sy, sx]:
            continue
        comp = []
        pq = deque([(sy, sx)])
        pvis[sy, sx] = True
        while pq:
            cy, cx = pq.popleft()
            comp.append((cy, cx))
            if cy > 0 and not pvis[cy - 1, cx] and pocket_cand[cy - 1, cx]:
                pvis[cy - 1, cx] = True
                pq.append((cy - 1, cx))
            if cy + 1 < h and not pvis[cy + 1, cx] and pocket_cand[cy + 1, cx]:
                pvis[cy + 1, cx] = True
                pq.append((cy + 1, cx))
            if cx > 0 and not pvis[cy, cx - 1] and pocket_cand[cy, cx - 1]:
                pvis[cy, cx - 1] = True
                pq.append((cy, cx - 1))
            if cx + 1 < w and not pvis[cy, cx + 1] and pocket_cand[cy, cx + 1]:
                pvis[cy, cx + 1] = True
                pq.append((cy, cx + 1))
        if len(comp) >= 45:
            for cy, cx in comp:
                bg_mask[cy, cx] = True

    rgba[bg_mask, 3] = 0
    return Image.fromarray(rgba, mode="RGBA")


def extract_largest_component(img: Image.Image) -> Image.Image:
    """For multi-frame *_walk cells, isolate the single largest walk pose."""
    rgba = np.array(img)
    h, w, _ = rgba.shape
    opaque = rgba[:, :, 3] > 20
    vis = np.zeros((h, w), dtype=bool)
    best_comp = []

    ys, xs = np.where(opaque)
    for sy, sx in zip(ys.tolist(), xs.tolist()):
        if vis[sy, sx]:
            continue
        comp = []
        q = deque([(sy, sx)])
        vis[sy, sx] = True
        while q:
            cy, cx = q.popleft()
            comp.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and not vis[ny, nx] and opaque[ny, nx]:
                        vis[ny, nx] = True
                        q.append((ny, nx))
        if len(comp) > len(best_comp):
            best_comp = comp

    if not best_comp:
        return img
    keep = np.zeros((h, w), dtype=bool)
    for cy, cx in best_comp:
        keep[cy, cx] = True
    rgba[~keep, 3] = 0
    return Image.fromarray(rgba, mode="RGBA")


def trim_and_normalize(img: Image.Image) -> Image.Image:
    alpha = np.array(img)[:, :, 3]
    ys, xs = np.where(alpha > 15)
    if len(ys) == 0 or len(xs) == 0:
        return img
    top = max(0, int(ys.min()) - 1)
    bottom = min(img.height, int(ys.max()) + 1)  # Flush at feet
    left = max(0, int(xs.min()) - 1)
    right = min(img.width, int(xs.max()) + 2)
    cropped = img.crop((left, top, right, bottom))

    target_h = 560
    ratio = target_h / max(1, cropped.height)
    new_w = max(1, int(round(cropped.width * ratio)))
    return cropped.resize((new_w, target_h), Image.Resampling.LANCZOS)


def main():
    SPRITES_DIR.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SHEET_PATH).convert("RGB")
    cell_w = sheet.width / 4.0
    cell_h = sheet.height / 4.0

    for r in range(4):
        for c in range(4):
            name = GRID_NAMES[r][c]
            x0 = int(round(c * cell_w)) + 10
            y0 = int(round(r * cell_h)) + 6
            x1 = int(round((c + 1) * cell_w)) - 10
            y1 = int(round((r + 1) * cell_h)) - 62  # Exclude text label below frame
            cell = sheet.crop((x0, y0, x1, y1))
            clean = remove_checkerboard_bg(cell)
            if name.endswith("_walk"):
                clean = extract_largest_component(clean)
            final = trim_and_normalize(clean)
            out_path = SPRITES_DIR / f"{name}.png"
            final.save(out_path, format="PNG", optimize=True)
            print(f"Saved {out_path.name} ({final.width}x{final.height})")


if __name__ == "__main__":
    main()
