"""Genera seis PNG y sus .patt sin dependencias externas.

Formato ARToolKit: cuatro giros antihorarios, tres canales BGR, matrices 16x16.
Referencia: AR.js three.js/examples/marker-training/threex-arpatternfile.js.
Los marcadores usan un interior del 50% del cuadrado negro y margen blanco.
"""
from pathlib import Path
import struct
import zlib
import math

ROOT = Path(__file__).resolve().parents[1]


def blank():
    return [[255] * 16 for _ in range(16)]


def rect(grid, x, y, width, height, value=0):
    for row in range(y, min(16, y + height)):
        for col in range(x, min(16, x + width)):
            grid[row][col] = value


def circle(grid, cx, cy, outer, inner=0):
    for y in range(16):
        for x in range(16):
            distance = math.hypot(x - cx, y - cy)
            if inner <= distance <= outer:
                grid[y][x] = 0


def rotate(grid):
    return [list(row) for row in zip(*grid)][::-1]


def patterns():
    key = blank()
    circle(key, 5, 5, 4, 2)
    rect(key, 4, 8, 3, 7)
    rect(key, 7, 11, 4, 2)
    rect(key, 7, 14, 3, 1)

    clock = blank()
    circle(clock, 7.5, 7.5, 7, 5)
    rect(clock, 7, 3, 2, 6)
    rect(clock, 3, 7, 5, 2)
    rect(clock, 12, 1, 3, 3)

    door = blank()
    rect(door, 2, 1, 12, 14)
    rect(door, 5, 4, 6, 11, 255)
    rect(door, 8, 9, 3, 2)
    rect(door, 1, 13, 4, 2)

    archive = blank()
    rect(archive, 1, 2, 10, 3)
    rect(archive, 4, 7, 11, 3)
    rect(archive, 1, 12, 8, 3)
    rect(archive, 12, 1, 3, 3)

    balance = blank()
    rect(balance, 2, 3, 12, 2)
    rect(balance, 7, 3, 2, 11)
    rect(balance, 3, 13, 10, 2)
    rect(balance, 2, 5, 1, 3)
    rect(balance, 1, 8, 4, 3)
    rect(balance, 13, 5, 1, 2)
    rect(balance, 11, 7, 4, 2)

    guardian = blank()
    for y in range(2, 14):
        for x in range(2, 14):
            if abs(x - 7.5) + abs(y - 7.5) <= 6:
                guardian[y][x] = 0
    rect(guardian, 8, 5, 5, 4, 255)
    rect(guardian, 1, 1, 4, 3)
    rect(guardian, 12, 12, 3, 3)
    rect(guardian, 12, 1, 2, 2)
    return [key, clock, door, archive, balance, guardian]


def png(grid):
    # 800 px. Borde negro: x/y 80..719. Interior: 240..559.
    width = 800
    raw = bytearray()
    for y in range(width):
        raw.append(0)
        for x in range(width):
            value = 255
            if 80 <= x < 720 and 80 <= y < 720:
                value = 0
            if 240 <= x < 560 and 240 <= y < 560:
                value = grid[(y - 240) // 20][(x - 240) // 20]
            raw.append(value)
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, width, 8, 0, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')


def generate():
    for i, grid in enumerate(patterns(), 1):
        orientations = []
        current = grid
        for _ in range(4):
            orientations.append('\n'.join(' '.join(f'{value:3}' for value in row) for _channel in range(3) for row in current))
            current = rotate(current)
        (ROOT / 'assets/patterns' / f'pista-{i}.patt').write_text('\n\n'.join(orientations) + '\n')
        (ROOT / 'markers' / f'pista-{i}.png').write_bytes(png(grid))
    print('Generados seis marcadores PNG y seis patrones ARToolKit correspondientes.')


if __name__ == '__main__':
    generate()
