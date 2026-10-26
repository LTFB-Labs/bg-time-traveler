# Draws the map's relief layer, img/terrain.webp: ink mountains, hills, forests and reeds from the hand-made symbol sheet
# learning-materials/maps/terrain-symbols.jpg, placed on the real ground of the whole map and drawn into one transparent image in the
# map's units. js/map.js lays it over the border fills, faint and blended like printed ink.
# Where each kind stands comes from real elevation (AWS Terrain Tiles, credited in CREDITS.md): big peaks on the high
# massifs, medium peaks on high ranges, hills on the lower mountain ground. There is no forest data, so forests grow in
# random patches at the heights they like; the seed is fixed, so every run draws the same layer.
# Needs Python 3 with Pillow, numpy and scipy (see README). Run from tools/: npm run terrain
import json
import math
import os
import re
import time
import urllib.error
import urllib.request

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SHEET = os.path.join(ROOT, 'learning-materials/maps/terrain-symbols.jpg')
OUT = os.path.join(ROOT, 'img/terrain.webp')
TILES = os.path.join(ROOT, 'tools/terrain-tiles')
SCALE = 2  # image pixels per map unit: about one screen pixel per pixel at the lesson zoom on a Retina screen
ZOOM = 7  # elevation tile zoom: about 1 km per pixel
GRID = 2.5  # map units between the spots tried

# the sheet's symbols by number in reading order, with their height in map units (1 unit is about 1.1 km); symbols 7 to 9,
# the small peaks, are not used: lower mountains are drawn as hills, so the big chains stand out
SYMBOLS = {
    'large': [(1, 14.5), (2, 13.5), (3, 13.5)],
    'medium': [(4, 10.5), (5, 10.5), (6, 10)],
    'hill': [(10, 4.5), (11, 4), (12, 4.8)],
    'leafy': [(13, 4), (14, 4), (15, 3)],
    'fir': [(16, 4.5), (17, 5), (18, 3.6)],
    'reed': [(19, 3.5)],
    'grass': [(20, 3)],
}
ORDER = ['large', 'medium', 'hill', 'fir', 'leafy', 'reed', 'grass']
# the share of suitable spots tried for each kind, and how much room each kind keeps around it: peaks keep the most,
# so a range is a light row of peaks, not a packed field
DENSITY = {'large': 1, 'medium': 1, 'hill': 1, 'fir': .18, 'leafy': .18, 'reed': .5, 'grass': .03}
ROOM = {'large': 1.5, 'medium': 1.5, 'hill': 1.7, 'fir': 1, 'leafy': 1, 'reed': 1, 'grass': 1}
INK = np.array([122, 97, 66], float)  # the brown of the map's old mountain humps
WHITE = np.array([255, 255, 255], float)  # the inside of a symbol; under multiply, white shows the map
TREES = range(13, 19)
TREE_INK = np.array([88, 102, 52], float)
TREE_FILL = np.array([222, 236, 196], float)

rng = np.random.default_rng(7)


def main():
    geo = load_geo()
    sprites = cut_symbols(SHEET)
    placed = place(geo, sprites)
    draw(placed, geo, sprites).save(OUT, 'WEBP', lossless=True, quality=100, method=6)
    counts = {k: sum(1 for p in placed if p[0] == k) for k in ORDER}
    print(f'{len(placed)} symbols {counts} -> {os.path.relpath(OUT, ROOT)}')


def load_geo():
    text = open(os.path.join(ROOT, 'geo.js')).read()
    geo, _ = json.JSONDecoder().raw_decode(text[text.index('{'):])
    return geo


# ---------- symbols ----------
# the sheet is black ink on a flat green background with white inside each symbol; the green goes, the ink turns map
# brown (olive for trees) and the white stays white (pale green for trees)
def cut_symbols(sheet):
    px = np.asarray(Image.open(sheet).convert('RGB')).astype(float)
    greenness = px[..., 1] - np.maximum(px[..., 0], px[..., 2])
    background = np.median(px[greenness > 150], axis=0)
    alpha = np.clip(1 - (greenness - 40) / 140, 0, 1)
    # the colour under the green: take the background's share out of each edge pixel
    a = np.maximum(alpha, 1e-3)[..., None]
    light = np.clip((np.clip((px - (1 - a) * background) / a, 0, 255).mean(axis=2) - 40) / 170, 0, 1)[..., None]
    plain = INK * (1 - light) + WHITE * light
    tree = TREE_INK * (1 - light) + TREE_FILL * light
    # one symbol is one blob of the mask, joined over small gaps so a grass tuft stays whole; reading order is rows by the
    # bottom edge, then left to right
    labels, _ = ndimage.label(ndimage.binary_dilation(alpha > .5, iterations=6))
    boxes = [b for b in ndimage.find_objects(labels) if (b[0].stop - b[0].start) * (b[1].stop - b[1].start) > 900]
    boxes.sort(key=lambda b: (round(b[0].stop / 150), b[1].start))
    sprites = {}
    for n, (ys, xs) in enumerate(boxes, 1):
        ys, xs = slice(max(ys.start - 2, 0), ys.stop + 2), slice(max(xs.start - 2, 0), xs.stop + 2)
        colour = tree if n in TREES else plain
        sprites[n] = Image.fromarray(np.dstack([colour[ys, xs], alpha[ys, xs] * 255]).astype(np.uint8))
    return sprites


# ---------- placing ----------
def place(geo, sprites):
    xs, ys = spots(geo)
    lon, lat = xs / (geo['cx'] * geo['k']) + geo['lon0'], geo['lat1'] - ys / geo['k']
    elev, relief = ground(lon, lat)
    land = land_mask(geo)
    on_land = land[np.clip(ys.astype(int), 0, geo['H'] - 1), np.clip(xs.astype(int), 0, geo['W'] - 1)]
    zone = zones(elev, relief, lon, lat, xs.shape)
    placed, buckets = [], {}
    for kind in ORDER:
        idx = np.argwhere(zone[kind] & on_land)
        idx = idx[rng.random(len(idx)) < DENSITY[kind]]
        if kind in ('large', 'medium', 'hill'):
            idx = idx[np.argsort(-elev[idx[:, 0], idx[:, 1]])]  # the highest spots first, so peaks sit on the summits
        else:
            rng.shuffle(idx)
        for i, j in idx:
            num, height = SYMBOLS[kind][rng.integers(len(SYMBOLS[kind]))]
            height *= rng.uniform(.88, 1.12)
            width = height * sprites[num].width / sprites[num].height
            x, y = xs[i, j], ys[i, j]
            if not stands_on_land(land, x, y, width) or is_crowded(buckets, x, y, width, height, ROOM[kind]):
                continue
            symbol = (kind, num, x, y, width, height)
            placed.append(symbol)
            buckets.setdefault((int(x // 40), int(y // 40)), []).append(symbol)
    placed.sort(key=lambda s: s[3])  # lower symbols are drawn later, so they stand in front
    return placed


# a jittered grid over the whole map
def spots(geo):
    xs, ys = np.meshgrid(np.arange(0, geo['W'], GRID), np.arange(0, geo['H'], GRID))
    return xs + rng.uniform(-GRID / 2, GRID / 2, xs.shape), ys + rng.uniform(-GRID / 2, GRID / 2, ys.shape)


# the elevation of each spot, taken as the highest ground within about 3 km so a ridge stays one unbroken chain, and its
# relief: the rise from the lowest to the highest ground within about 15 km
def ground(lon, lat):
    grid, tx0, ty0 = elevation_grid(lon.min(), lon.max(), lat.min(), lat.max())
    ridge = ndimage.maximum_filter(grid, 3)
    relief = ndimage.maximum_filter(grid, 15) - ndimage.minimum_filter(grid, 15)
    tx, ty = tile_xy(lon, lat)
    gi = np.clip(((ty - ty0) * 256).astype(int), 0, grid.shape[0] - 1)
    gj = np.clip(((tx - tx0) * 256).astype(int), 0, grid.shape[1] - 1)
    return ridge[gi, gj], relief[gi, gj]


def elevation_grid(lon_a, lon_b, lat_a, lat_b):
    x0, y0 = (int(v) for v in tile_xy(lon_a, lat_b))
    x1, y1 = (int(v) for v in tile_xy(lon_b, lat_a))
    os.makedirs(TILES, exist_ok=True)
    rows = []
    for ty in range(y0, y1 + 1):
        rows.append(np.hstack([elevation_tile(tx, ty) for tx in range(x0, x1 + 1)]))
    return np.vstack(rows), x0, y0


def tile_xy(lon, lat):
    n = 2 ** ZOOM
    return (lon + 180) / 360 * n, (1 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2 * n


# one Terrarium tile: the height in metres is red * 256 + green + blue / 256 - 32768
def elevation_tile(tx, ty):
    path = os.path.join(TILES, f'{ZOOM}_{tx}_{ty}.png')
    if not os.path.exists(path):
        download(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{ZOOM}/{tx}/{ty}.png', path)
    px = np.asarray(Image.open(path).convert('RGB')).astype(float)
    return px[..., 0] * 256 + px[..., 1] + px[..., 2] / 256 - 32768


# the tile service now and then answers 503 when busy; it is asked again after a short wait
def download(url, path):
    for attempt in range(4):
        try:
            urllib.request.urlretrieve(url, path)
            return
        except urllib.error.HTTPError as e:
            if e.code != 503 or attempt == 3:
                raise
            time.sleep(2 ** attempt)


def land_mask(geo):
    mask = Image.new('L', (geo['W'], geo['H']), 0)
    draw = ImageDraw.Draw(mask)
    for sub in re.findall(r'M[^M]+', geo['land']):
        points = [tuple(map(float, p)) for p in re.findall(r'(-?[\d.]+)[ ,](-?[\d.]+)', sub)]
        if len(points) > 2:
            draw.polygon(points, fill=255)
    return np.asarray(mask) > 0


# where each kind may stand: a spot may suit several kinds, and the kinds are placed in ORDER
def zones(elev, relief, lon, lat, shape):
    delta = (lon > 28.6) & (lon < 29.75) & (lat > 44.75) & (lat < 45.45) & (elev < 12)
    return {
        'large': (elev > 2200) & (relief > 850),
        'medium': (elev > 1800) & (relief > 750),
        'hill': (elev > 1000) & (relief > 450),
        'fir': (elev > 900) & (elev <= 1600) & (relief > 300) & patches(shape, 8, .3),
        'leafy': (elev > 200) & (elev <= 800) & (relief > 150) & patches(shape, 12, .14),
        'reed': delta,
        'grass': (elev > 0) & (elev < 120) & (relief < 90) & patches(shape, 30, .3) & ~delta,
    }


# smooth random blobs covering about share of the map: forests and meadows grow in patches, not evenly
def patches(shape, cell, share):
    coarse = rng.random((shape[0] // cell + 2, shape[1] // cell + 2))
    field = ndimage.zoom(coarse, cell, order=3)[:shape[0], :shape[1]]
    return field > np.quantile(field, 1 - share)


def stands_on_land(land, x, y, width):
    row = min(int(y), land.shape[0] - 1)
    return land[row, min(int(x + width / 2), land.shape[1] - 1)] and land[row, max(int(x - width / 2), 0)]


# an ellipse around each base: neighbours may overlap a little, like the peaks of a drawn range
def is_crowded(buckets, x, y, width, height, room):
    bx, by = int(x // 40), int(y // 40)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for _, _, ox, oy, ow, oh in buckets.get((bx + dx, by + dy), ()):
                if ((x - ox) / (room * .42 * (width + ow))) ** 2 + ((y - oy) / (room * .34 * (height + oh))) ** 2 < 1:
                    return True
    return False


# ---------- drawing ----------
def draw(placed, geo, sprites):
    canvas = Image.new('RGBA', (round(geo['W'] * SCALE), round(geo['H'] * SCALE)), (0, 0, 0, 0))
    resized = {}
    for _, num, x, y, width, height in placed:
        size = (max(1, round(width * SCALE)), max(1, round(height * SCALE)))
        if (num, size) not in resized:
            resized[(num, size)] = sprites[num].resize(size, Image.LANCZOS)
        canvas.alpha_composite(resized[(num, size)], (round((x - width / 2) * SCALE), round((y - height) * SCALE)))
    return canvas


if __name__ == '__main__':
    main()
