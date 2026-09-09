import { create } from "zustand";
import type { PieceId } from "./tetromino";

export type GameMode = "title" | "playing" | "paused" | "over";

export interface NextPreview {
  id: PieceId;
  prism: boolean;
  thorn?: boolean;
}

export interface OrderUI {
  id: PieceId;
  t: number;
  maxT: number;
}

export interface GameAPI {
  play: () => void;
  resume: () => void;
  pause: () => void;
  retry: () => void;
  move: (dx: number) => void;
  rotate: (dir: 1 | -1) => void;
  hardDrop: () => void;
  setHold: (action: "left" | "right" | "soft", held: boolean) => void;
  setMuted: (muted: boolean) => void;
}

export interface GameUI {
  mode: GameMode;
  height: number;
  best: number;
  combo: number;
  next: NextPreview[];
  muted: boolean;
  hearts: number;
  windDir: number;
  windWarn: boolean;
  toast: string;
  sleepy: boolean;
  crushing: boolean;
  stars: number;
  order: OrderUI | null;
  api: GameAPI | null;
  setApi: (api: GameAPI | null) => void;
  patch: (partial: Partial<Omit<GameUI, "setApi" | "patch" | "api">>) => void;
}

const BEST_KEY = "nimbo-best-v1";

export function readBest(): number {
  try {
    const n = Number(localStorage.getItem(BEST_KEY) ?? "0");
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function writeBest(n: number) {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* ignore */
  }
}

export const useGameUI = create<GameUI>((set) => ({
  mode: "title",
  height: 0,
  best: 0,
  combo: 0,
  next: [],
  muted: false,
  hearts: 3,
  windDir: 0,
  windWarn: false,
  toast: "",
  sleepy: false,
  crushing: false,
  stars: 0,
  order: null,
  api: null,
  setApi: (api) => set({ api }),
  patch: (partial) => set(partial),
}));
