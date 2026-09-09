export const COLS = 10;
export const START_COL = 1;

export type PieceId = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type Rot = 0 | 1 | 2 | 3;

export const PIECE_IDS: PieceId[] = ["I", "O", "T", "S", "Z", "J", "L"];

/** Saturated guideline-adjacent hues so each tetromino reads at a glance. */
export const PIECE_COLORS: Record<PieceId, number> = {
  I: 0x1cf0b4,
  O: 0xffd000,
  T: 0xb44aff,
  S: 0xff4e12,
  Z: 0xff2468,
  J: 0x1a90ff,
  L: 0xff3dad,
};

export const RAINBOW = [0xff2468, 0xff4e12, 0xffd000, 0x1cf0b4, 0x1a90ff, 0xb44aff, 0xff3dad];

/** Four rotation states, y-up, relative cells. */
export const SHAPES: Record<PieceId, [number, number][][]> = {
  I: [
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 1], [2, 1], [1, 2], [2, 2]],
    [[1, 1], [2, 1], [1, 2], [2, 2]],
    [[1, 1], [2, 1], [1, 2], [2, 2]],
    [[1, 1], [2, 1], [1, 2], [2, 2]],
  ],
  T: [
    [[1, 2], [0, 1], [1, 1], [2, 1]],
    [[1, 2], [1, 1], [2, 1], [1, 0]],
    [[0, 1], [1, 1], [2, 1], [1, 0]],
    [[1, 2], [0, 1], [1, 1], [1, 0]],
  ],
  S: [
    [[1, 2], [2, 2], [0, 1], [1, 1]],
    [[1, 2], [1, 1], [2, 1], [2, 0]],
    [[1, 1], [2, 1], [0, 0], [1, 0]],
    [[0, 2], [0, 1], [1, 1], [1, 0]],
  ],
  Z: [
    [[0, 2], [1, 2], [1, 1], [2, 1]],
    [[2, 2], [1, 1], [2, 1], [1, 0]],
    [[0, 1], [1, 1], [1, 0], [2, 0]],
    [[1, 2], [0, 1], [1, 1], [0, 0]],
  ],
  J: [
    [[0, 2], [0, 1], [1, 1], [2, 1]],
    [[1, 2], [2, 2], [1, 1], [1, 0]],
    [[0, 1], [1, 1], [2, 1], [2, 0]],
    [[1, 2], [1, 1], [0, 0], [1, 0]],
  ],
  L: [
    [[2, 2], [0, 1], [1, 1], [2, 1]],
    [[1, 2], [1, 1], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1], [0, 0]],
    [[0, 2], [1, 2], [1, 1], [1, 0]],
  ],
};

const KICKS_JLSTZ: Record<string, [number, number][]> = {
  "0-1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1-0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1-2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2-1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2-3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3-2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3-0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0-3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const KICKS_I: Record<string, [number, number][]> = {
  "0-1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1-0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1-2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2-1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2-3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3-2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3-0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "0-3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

export function kicksFor(id: PieceId, from: Rot, to: Rot): [number, number][] {
  if (id === "O") return [[0, 0]];
  const table = id === "I" ? KICKS_I : KICKS_JLSTZ;
  return table[`${from}-${to}`] ?? [[0, 0]];
}

export function cellsOf(id: PieceId, rot: Rot, x: number, y: number): [number, number][] {
  return SHAPES[id][rot].map(([cx, cy]) => [cx + x, cy + y]);
}

/** Centered in a 10-wide well. Horizontal I occupies 3–6, leaving col 1 free for Nimbo. */
export function spawnX(id: PieceId): number {
  if (id === "I" || id === "O") return Math.floor((COLS - 4) / 2);
  return Math.floor((COLS - 3) / 2);
}

export function shuffleBag(): PieceId[] {
  const bag = PIECE_IDS.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = bag[i]!;
    bag[i] = bag[j]!;
    bag[j] = tmp;
  }
  return bag;
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseKey(k: string): [number, number] {
  const i = k.indexOf(",");
  return [Number(k.slice(0, i)), Number(k.slice(i + 1))];
}
