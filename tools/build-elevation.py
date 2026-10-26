# Draws the map's height tint, img/elevation.webp: two soft brown steps, the ground above 700 m and the ground above 1500 m,
# with no outlines, and the open sea a shade deeper blue, fading in from about 100 m down to 600 m below the surface; one
# transparent image in the map's units. js/map.js lays it over the relief symbols, blended like ink, so a kid sees where the
# mountains rise and where the sea gets deep without reading a legend.
# The heights are the same Terrain Tiles as tools/build-terrain.py's (credited in CREDITS.md) and come from its helpers.
# Needs Python 3 with Pillow, numpy and scipy (see README). Run from tools/: npm run elevation
import importlib.util
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('terrain', os.path.join(HERE, 'build-terrain.py'))
terrain = importlib.util.module_from_spec(spec)
spec.loader.exec_module(terrain)

OUT = os.path.join(terrain.ROOT, 'img/elevation.webp')
STEPS = [(700, (176, 122, 60, 35)), (1500, (122, 74, 30, 60))]  # metres and the colour above them, the higher one on top
CALM = 3  # the heights are smoothed over this many map units, so the steps are calm shapes, not pixel noise
DEEP = (200, 220, 228)  # the deep sea's tint; multiplied into the map's sea blue it darkens it
DEEP_FROM, DEEP_TO, DEEP_ALPHA = 100, 600, 190  # metres below the surface where the tint starts and is full, and its full alpha
SEA_CALM = 8  # the sea floor is smoothed wider, so the deep water has a soft edge


def main():
    geo = terrain.load_geo()
    W, H = geo['W'], geo['H']
    xs, ys = np.arange(W) + .5, np.arange(H) + .5
    lon = xs / (geo['cx'] * geo['k']) + geo['lon0']
    lat = geo['lat1'] - ys / geo['k']
    grid, tx0, ty0 = terrain.elevation_grid(lon.min(), lon.max(), lat.min(), lat.max())
    tx, _ = terrain.tile_xy(lon, lat[0])
    _, ty = terrain.tile_xy(lon[0], lat)
    gi = np.clip(((ty - ty0) * 256).astype(int), 0, grid.shape[0] - 1)
    gj = np.clip(((tx - tx0) * 256).astype(int), 0, grid.shape[1] - 1)
    raw = Image.fromarray(grid[gi[:, None], gj[None, :]].astype(np.float32), 'F')
    elev = np.asarray(raw.resize((W // CALM, H // CALM), Image.BILINEAR).resize((W, H), Image.BICUBIC))
    floor = np.asarray(raw.resize((W // SEA_CALM, H // SEA_CALM), Image.BILINEAR).resize((W, H), Image.BICUBIC))
    out = np.zeros((H, W, 4), np.uint8)
    deep = (np.clip((-floor - DEEP_FROM) / (DEEP_TO - DEEP_FROM), 0, 1) * DEEP_ALPHA).astype(np.uint8)
    out[..., :3] = DEEP
    out[..., 3] = deep
    for metres, colour in STEPS:
        out[elev > metres] = colour
    Image.fromarray(out, 'RGBA').save(OUT, 'WEBP', lossless=True, quality=100, method=6)
    shares = ', '.join([f'{(elev > m).mean():.1%} above {m} m' for m, _ in STEPS] + [f'{(deep > 0).mean():.1%} deep sea'])
    print(f'{shares} -> {os.path.relpath(OUT, terrain.ROOT)}')


if __name__ == '__main__':
    main()
