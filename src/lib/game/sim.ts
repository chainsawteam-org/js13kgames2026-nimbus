import {
  COLS,
  PIECE_COLORS,
  PIECE_IDS,
  RAINBOW,
  START_COL,
  cellKey,
  cellsOf,
  kicksFor,
  parseKey,
  spawnX,
  shuffleBag,
  type PieceId,
  type Rot,
} from "./tetromino";

export type Mode = "title" | "playing" | "paused" | "over";

export const THORN_COLOR = 0x8c4d5e;
export const MATCH = 5;
export const MAX_HEARTS = 3;

export interface Cell {
  color: number;
  prism: boolean;
  thorn: boolean;
  spring: boolean;
}

export interface Active {
  id: PieceId;
  x: number;
  y: number;
  rot: Rot;
  prism: boolean;
  thorn: boolean;
}

export interface Hop {
  x: number;
  y: number;
}

export interface DewStar {
  x: number;
  y: number;
  t: number;
}

export interface ColorOrder {
  id: PieceId;
  t: number;
  maxT: number;
}

export interface Event {
  kind:
    | "lock"
    | "move"
    | "rotate"
    | "hard"
    | "hop"
    | "land"
    | "combo"
    | "over"
    | "prism"
    | "crush"
    | "clear"
    | "burst"
    | "gust"
    | "hurt"
    | "star"
    | "topple"
    | "order"
    | "orderFail"
    | "pop";
  x?: number;
  y?: number;
  n?: number;
  cells?: [number, number][];
}

export class Sim {
  board = new Map<string, Cell>();
  active: Active | null = null;
  bag: PieceId[] = [];
  queue: { id: PieceId; prism: boolean; thorn: boolean }[] = [];
  unicorn = { x: START_COL, y: 0, visX: START_COL, visY: 0, maxY: 0 };
  path: Hop[] = [];
  hopFrom: Hop | null = null;
  hopTo: Hop | null = null;
  hopT = 0;
  hopDur = 0.34;
  hopArc = 0.72;
  idleT = 0;

  fogY = -5.5;
  mode: Mode = "title";
  combo = 0;
  height = 0;
  fallT = 0;
  lockT = 0;
  lockResets = 0;
  grounded = false;
  fallY = 0;
  events: Event[] = [];
  hearts = MAX_HEARTS;
  invuln = 0;
  windDir = 0;
  windWarn = 0;
  windCD = 6.5;
  sleepy = false;
  sleepyT = 0;
  lastClimbY = 0;
  toast = "";
  toastT = 0;
  stars: DewStar[] = [];
  starGot = 0;
  starCD = 3.5;
  order: ColorOrder | null = null;
  orderCD = 6;
  lockedN = 0;
  clearDebt = 0;
  hinted = false;
  popping: { cells: [number, number][]; t: number; dur: number; full: boolean; matchedOrder: boolean } | null = null;
  private lockBefore = 0;
  private popChain = 0;

  reset(kind: "title" | "play") {
    this.board.clear();
    this.active = null;
    this.bag = [];
    this.queue = [];
    this.path = [];
    this.hopFrom = null;
    this.hopTo = null;
    this.hopT = 0;
    this.hopArc = 0.72;
    this.idleT = 0;
    this.combo = 0;
    this.height = 0;
    this.fallT = 0;
    this.lockT = 0;
    this.lockResets = 0;
    this.grounded = false;
    this.fallY = 0;
    this.events.length = 0;
    this.unicorn = { x: START_COL, y: 0, visX: START_COL, visY: 0, maxY: 0 };
    this.fogY = -4.8;
    this.hearts = MAX_HEARTS;
    this.invuln = 0;
    this.windDir = 0;
    this.windWarn = 0;
    this.windCD = 7 + Math.random() * 3;
    this.sleepy = false;
    this.sleepyT = 0;
    this.lastClimbY = 0;
    this.toast = "";
    this.toastT = 0;
    this.stars = [];
    this.starGot = 0;
    this.starCD = 4.2;
    this.order = null;
    this.orderCD = 8;
    this.lockedN = 0;
    this.clearDebt = 0;
    this.hinted = false;
    this.popping = null;
    this.lockBefore = 0;
    this.popChain = 0;

    if (kind === "title") {
      this.mode = "title";
      this.seedDemo();
      this.unicorn.x = 1;
      this.unicorn.y = 0;
      this.unicorn.visX = 1;
      this.unicorn.visY = 0;
      this.repath();
    } else {
      this.mode = "playing";
      this.fillQueue();
      this.spawn();
      this.say("Build a staircase");
    }
  }

  private seedDemo() {
    const steps: [number, number, PieceId][] = [
      [1, 0, "J"],
      [2, 0, "J"],
      [2, 1, "T"],
      [3, 1, "T"],
      [3, 2, "S"],
      [4, 2, "S"],
      [4, 3, "L"],
      [5, 3, "L"],
      [5, 4, "I"],
      [4, 4, "Z"],
      [3, 5, "T"],
      [2, 5, "J"],
      [2, 6, "I"],
      [3, 7, "O"],
      [4, 7, "O"],
      [5, 8, "L"],
      [4, 8, "L"],
    ];
    for (const [x, y, id] of steps) {
      this.place(x, y, PIECE_COLORS[id], y > 7, false, y > 7);
    }
  }

  private fillQueue() {
    while (this.queue.length < 5) {
      if (this.bag.length === 0) this.bag = shuffleBag();
      const id = this.bag.pop()!;
      const prism = Math.random() < 0.11;
      this.queue.push({ id, prism, thorn: false });
    }
  }

  private spawn() {
    this.fillQueue();
    const next = this.queue.shift()!;
    this.fillQueue();
    const y = this.maxOccupiedY() + 4;
    const piece: Active = {
      id: next.id,
      x: spawnX(next.id),
      y,
      rot: 0,
      prism: next.prism,
      thorn: next.thorn,
    };
    if (!this.fits(piece)) {
      piece.y += 2;
    }
    this.active = piece;
    this.fallT = 0;
    this.lockT = 0;
    this.lockResets = 0;
    this.grounded = false;
    if (this.lockedN === 0) this.nudgeSpawnOffUnicorn();
  }

  private nudgeSpawnOffUnicorn() {
    const p = this.active;
    if (!p) return;
    const ok = (x: number, rot: Rot) => {
      const sx = p.x;
      const sr = p.rot;
      p.x = x;
      p.rot = rot;
      if (!this.fits(p) || this.coversUnicorn(cellsOf(p.id, p.rot, p.x, this.ghostY()))) {
        p.x = sx;
        p.rot = sr;
        return false;
      }
      return true;
    };
    if (ok(p.x, p.rot)) return;
    for (const rot of [0, 1, 2, 3] as Rot[]) {
      for (let x = -2; x < COLS; x++) {
        if (ok(x, rot)) return;
      }
    }
  }

  maxOccupiedY(): number {
    let m = 0;
    for (const k of this.board.keys()) {
      const y = parseKey(k)[1];
      if (y > m) m = y;
    }
    return m;
  }

  private place(x: number, y: number, color: number, prism: boolean, thorn: boolean, spring: boolean) {
    this.board.set(cellKey(x, y), { color, prism, thorn, spring });
  }

  fits(p: Active, dx = 0, dy = 0, rot: Rot = p.rot): boolean {
    for (const [x, y] of cellsOf(p.id, rot, p.x + dx, p.y + dy)) {
      if (x < 0 || x >= COLS || y < 0) return false;
      if (this.board.has(cellKey(x, y))) return false;
    }
    return true;
  }

  cells(p: Active = this.active!): [number, number][] {
    return cellsOf(p.id, p.rot, p.x, p.y);
  }

  ghostY(): number {
    const p = this.active;
    if (!p) return 0;
    let dy = 0;
    while (this.fits(p, 0, dy - 1)) dy--;
    return p.y + dy;
  }

  crushing(): boolean {
    const p = this.active;
    if (!p || this.mode !== "playing") return false;
    const gy = this.ghostY();
    return this.coversUnicorn(cellsOf(p.id, p.rot, p.x, gy));
  }

  crushingStar(): boolean {
    const p = this.active;
    if (!p || this.mode !== "playing" || this.stars.length === 0) return false;
    const gy = this.ghostY();
    for (const [x, y] of cellsOf(p.id, p.rot, p.x, gy)) {
      if (this.stars.some((s) => s.x === x && s.y === y)) return true;
    }
    return false;
  }

  /** Cells that would pop if the falling piece locked on its ghost. Needs five of a color. */
  previewClear(): [number, number][] {
    const p = this.active;
    if (!p || this.mode !== "playing") return [];
    const gy = this.ghostY();
    const added = cellsOf(p.id, p.rot, p.x, gy);
    const extra = new Map<string, number>();
    added.forEach(([x, y], i) => {
      extra.set(
        cellKey(x, y),
        p.thorn ? THORN_COLOR : p.prism ? RAINBOW[i % RAINBOW.length]! : PIECE_COLORS[p.id],
      );
    });
    const has = (x: number, y: number) => extra.has(cellKey(x, y)) || this.board.has(cellKey(x, y));
    const colorAt = (x: number, y: number): number | null => {
      const k = cellKey(x, y);
      if (extra.has(k)) return p.thorn ? null : extra.get(k)!;
      const c = this.board.get(k);
      if (!c || c.thorn) return null;
      return c.color;
    };
    const maxY = Math.max(this.maxOccupiedY(), ...added.map((c) => c[1]));
    return [...this.collectKills(has, colorAt, maxY)].map(parseKey);
  }

  move(dx: number): boolean {
    if (this.mode !== "playing" || !this.active) return false;
    const kicks: [number, number][] = [
      [dx, 0],
      [dx, 1],
      [dx, -1],
      [dx, 2],
      [dx, -2],
    ];
    for (const [kx, ky] of kicks) {
      if (!this.fits(this.active, kx, ky)) continue;
      this.active.x += kx;
      this.active.y += ky;
      this.onShift();
      this.events.push({ kind: "move" });
      return true;
    }
    return false;
  }

  rotate(dir: 1 | -1): boolean {
    if (this.mode !== "playing" || !this.active) return false;
    const p = this.active;
    const from = p.rot;
    const to = ((from + dir + 4) % 4) as Rot;
    const extra: [number, number][] = [
      [-2, 0], [2, 0], [-3, 0], [3, 0], [0, 1], [-2, 1], [2, 1], [-1, 1], [1, 1],
    ];
    const tries = [...kicksFor(p.id, from, to), ...extra];
    for (const [kx, ky] of tries) {
      if (this.fits(p, kx, ky, to)) {
        p.x += kx;
        p.y += ky;
        p.rot = to;
        this.onShift();
        this.events.push({ kind: "rotate" });
        return true;
      }
    }
    return false;
  }

  hardDrop(): number {
    if (this.mode !== "playing" || !this.active) return 0;
    let n = 0;
    while (this.fits(this.active, 0, -1)) {
      this.active.y--;
      n++;
    }
    this.events.push({ kind: "hard", n });
    this.lockPiece();
    return n;
  }

  private onShift() {
    if (!this.active) return;
    const grounded = !this.fits(this.active, 0, -1);
    if (grounded) {
      this.lockT = 0;
      this.lockResets = Math.min(this.lockResets + 1, 15);
    }
    this.grounded = grounded;
  }

  private lockPiece() {
    const p = this.active;
    if (!p) return;
    const before = this.maxReachableY();
    const cells = this.cells(p);
    if (this.coversUnicorn(cells)) {
      cells.forEach(([x, y], i) => {
        const color = p.thorn ? THORN_COLOR : p.prism ? RAINBOW[i % RAINBOW.length]! : PIECE_COLORS[p.id];
        this.place(x, y, color, p.prism, p.thorn, p.prism);
      });
      this.active = null;
      this.events.push({ kind: "crush", x: this.unicorn.x, y: this.unicorn.y });
      this.events.push({ kind: "lock", x: this.unicorn.x, y: this.unicorn.y });
      this.say("Nimbo was hit!");
      this.die();
      return;
    }

    const crushedStars = this.stars.filter((s) => cells.some(([x, y]) => x === s.x && y === s.y));
    if (crushedStars.length) {
      this.stars = this.stars.filter((s) => !crushedStars.includes(s));
      this.hurt(1);
      this.events.push({ kind: "crush", x: crushedStars[0]!.x, y: crushedStars[0]!.y });
      this.say("The star was crushed!");
      if (this.mode === "over") return;
    }

    cells.forEach(([x, y], i) => {
      const color = p.thorn ? THORN_COLOR : p.prism ? RAINBOW[i % RAINBOW.length]! : PIECE_COLORS[p.id];
      this.place(x, y, color, p.prism, p.thorn, p.prism);
    });
    const cy = cells.reduce((s, c) => s + c[1], 0) / cells.length;
    const cx = cells.reduce((s, c) => s + c[0], 0) / cells.length;
    this.events.push({ kind: "lock", x: cx, y: cy });
    if (p.prism) {
      this.fogY -= 2.2;
      this.clearDebt = Math.max(0, this.clearDebt - 4);
      this.events.push({ kind: "prism", x: cx, y: cy });
    }
    this.active = null;
    this.lockedN += 1;
    this.lockBefore = before;
    this.popChain = 0;
    if (!this.beginPop()) this.finishLock();
  }

  private hurt(n: number, force = false) {
    if (!force && this.invuln > 0) return;
    this.hearts = Math.max(0, this.hearts - n);
    this.invuln = 1.15;
    this.combo = 0;
    this.events.push({ kind: "hurt", n: this.hearts });
    if (this.hearts <= 0) this.die();
  }

  private say(msg: string) {
    this.toast = msg;
    this.toastT = 1.85;
  }

  private collectKills(
    has: (x: number, y: number) => boolean,
    colorAt: (x: number, y: number) => number | null,
    maxY: number,
  ): Set<string> {
    const kill = new Set<string>();
    for (let y = 0; y <= maxY; y++) {
      let filled = 0;
      for (let x = 0; x < COLS; x++) if (has(x, y)) filled++;
      if (filled === COLS) {
        for (let x = 0; x < COLS; x++) kill.add(cellKey(x, y));
      }
      let run = 1;
      for (let x = 1; x < COLS; x++) {
        const a = colorAt(x - 1, y);
        const b = colorAt(x, y);
        if (a != null && a === b) run++;
        else run = 1;
        if (run >= MATCH) {
          for (let i = 0; i < run; i++) kill.add(cellKey(x - i, y));
        }
      }
    }
    for (let x = 0; x < COLS; x++) {
      let run = 1;
      for (let y = 1; y <= maxY; y++) {
        const a = colorAt(x, y - 1);
        const b = colorAt(x, y);
        if (a != null && a === b) run++;
        else run = 1;
        if (run >= MATCH) {
          for (let i = 0; i < run; i++) kill.add(cellKey(x, y - i));
        }
      }
    }
    return kill;
  }

  poppingOf(x: number, y: number): boolean {
    return !!this.popping?.cells.some(([cx, cy]) => cx === x && cy === y);
  }

  private beginPop(): boolean {
    const maxY = this.maxOccupiedY();
    const has = (x: number, y: number) => this.board.has(cellKey(x, y));
    const colorAt = (x: number, y: number): number | null => {
      const c = this.board.get(cellKey(x, y));
      if (!c || c.thorn) return null;
      return c.color;
    };
    const kill = this.collectKills(has, colorAt, maxY);
    if (kill.size === 0) return false;
    const cells = [...kill].map(parseKey);
    const full = cells.some(([, y]) => {
      let n = 0;
      for (let x = 0; x < COLS; x++) if (kill.has(cellKey(x, y))) n++;
      return n === COLS;
    });
    let matchedOrder = false;
    if (this.order) {
      const want = PIECE_COLORS[this.order.id];
      let n = 0;
      for (const k of kill) {
        const c = this.board.get(k);
        if (c && c.color === want) n++;
      }
      if (n >= MATCH) matchedOrder = true;
    }
    const cx = cells.reduce((s, c) => s + c[0], 0) / cells.length;
    const cy = cells.reduce((s, c) => s + c[1], 0) / cells.length;
    this.popping = { cells, t: 0, dur: 0.55, full, matchedOrder };
    this.popChain += 1;
    this.events.push({ kind: "pop", x: cx, y: cy, n: cells.length, cells });
    this.say(full ? "Full row" : "Five matched!");
    return true;
  }

  private tickPop(dt: number) {
    if (!this.popping) return;
    this.popping.t += dt;
    if (this.popping.t < this.popping.dur) return;
    const { cells, full, matchedOrder } = this.popping;
    this.popping = null;
    for (const [x, y] of cells) {
      this.board.delete(cellKey(x, y));
      this.stars = this.stars.filter((s) => !(s.x === x && s.y === y));
    }
    this.fogY -= full ? 2.4 : 1.35;
    this.clearDebt = 0;
    this.events.push({ kind: full ? "clear" : "burst", n: cells.length, cells });
    if (matchedOrder) this.completeOrder();
    this.gravity();
    if (this.mode === "over") return;
    if (this.beginPop()) return;
    this.finishLock();
  }

  private finishLock() {
    const fell = this.collapseSpires();
    this.settleStars();
    this.repath();
    const after = this.maxReachableY();
    if (after > this.lockBefore || this.popChain > 0) {
      this.combo += 1;
      this.events.push({ kind: "combo", n: this.combo, y: after });
      if (this.combo >= 2) this.fogY -= Math.min(1.1, 0.28 * this.combo);
    } else {
      this.combo = 0;
      if (after <= this.unicorn.y && !this.hinted) {
        this.hinted = true;
        this.say("Nimbo needs smaller steps");
      } else if (after <= this.unicorn.y) {
        this.say("Build a connecting step");
      }
    }
    this.popChain = 0;
    if (fell && this.mode !== "over") this.repath();
    if (this.mode === "over") return;
    this.maybeSpawnStar();
    this.spawn();
  }

  private completeOrder() {
    if (!this.order) return;
    this.fogY -= 2.1;
    this.hearts = Math.min(MAX_HEARTS, this.hearts + (this.hearts < MAX_HEARTS ? 1 : 0));
    this.events.push({ kind: "order" });
    this.say("Order complete");
    this.order = null;
    this.orderCD = 5 + Math.random() * 3;
  }

  private gravity() {
    const floor = Math.max(0, Math.floor(this.fogY - 1));
    const maxY = this.maxOccupiedY();
    for (let x = 0; x < COLS; x++) {
      for (let y = floor; y <= maxY + 2; y++) {
        const k = cellKey(x, y);
        const c = this.board.get(k);
        if (!c) continue;
        let ny = y;
        while (ny - 1 >= floor && !this.board.has(cellKey(x, ny - 1))) ny--;
        if (ny === y) continue;
        this.board.delete(k);
        this.board.set(cellKey(x, ny), c);
        if (this.unicorn.x === x && this.unicorn.y === y) {
          this.unicorn.y = ny;
          this.unicorn.visY = ny;
        }
        for (const s of this.stars) {
          if (s.x === x && s.y === y) s.y = ny;
        }
      }
    }
    if (!this.walkable(this.unicorn.x, this.unicorn.y)) {
      const stand = this.nearestStand();
      this.unicorn.x = stand.x;
      this.unicorn.y = stand.y;
      this.unicorn.visX = stand.x;
      this.unicorn.visY = stand.y;
    }
    this.path = [];
    this.hopFrom = this.hopTo = null;
  }

  private collapseSpires(): boolean {
    let any = false;
    for (let pass = 0; pass < 6; pass++) {
      const h = this.columnTops();
      let changed = false;
      for (let x = 0; x < COLS; x++) {
        const left = x > 0 ? h[x - 1]! : h[x]!;
        const right = x < COLS - 1 ? h[x + 1]! : h[x]!;
        const neigh = x === 0 ? right : x === COLS - 1 ? left : Math.max(left, right);
        const limit = Math.max(0, neigh + 2);
        if (h[x]! > limit && h[x]! > 0) {
          const y = h[x]!;
          this.board.delete(cellKey(x, y));
          this.stars = this.stars.filter((s) => !(s.x === x && s.y === y));
          this.events.push({ kind: "topple", x, y });
          changed = true;
          any = true;
        }
      }
      if (!changed) break;
    }
    if (any) {
      this.say("The tower collapsed");
      this.gravity();
    }
    return any;
  }

  private columnTops(): number[] {
    const h = Array.from({ length: COLS }, () => -1);
    for (const k of this.board.keys()) {
      const [x, y] = parseKey(k);
      if (y > h[x]!) h[x] = y;
    }
    return h;
  }

  occupy(x: number, y: number): boolean {
    return this.board.has(cellKey(x, y));
  }

  /** Cells Nimbo actually occupies: the cloud she's on, the air above her, and where she's mid-hop. */
  private unicornVolume(): Hop[] {
    const spots: Hop[] = [
      { x: this.unicorn.x, y: this.unicorn.y },
      { x: this.unicorn.x, y: this.unicorn.y + 1 },
    ];
    if (this.hopTo) {
      spots.push({ x: this.hopTo.x, y: this.hopTo.y }, { x: this.hopTo.x, y: this.hopTo.y + 1 });
    }
    const vx = Math.round(this.unicorn.visX);
    const vy = Math.round(this.unicorn.visY);
    spots.push({ x: vx, y: vy }, { x: vx, y: vy + 1 });
    return spots;
  }

  coversUnicorn(cells: [number, number][]): boolean {
    const body = this.unicornVolume();
    return cells.some(([x, y]) => body.some((b) => b.x === x && b.y === y));
  }

  /** Remaining hops, including the one in the air. Used to draw the trail. */
  peekPath(): Hop[] {
    const hops: Hop[] = [];
    if (this.hopTo) hops.push(this.hopTo);
    hops.push(...this.path);
    return hops;
  }

  private walkable(x: number, y: number): boolean {
    if (y === 0 && x >= 0 && x < COLS) return true;
    const c = this.board.get(cellKey(x, y));
    return !!c && !c.thorn;
  }

  /**
   * Nimbo only steps to a neighboring cloud: sideways or one-up diagonal.
   * Straight-up walls are illegal unless the cloud is a spring (prism).
   */
  private neighbors(x: number, y: number): Hop[] {
    const here = this.board.get(cellKey(x, y));
    const maxUp = here?.spring ? 2 : 1;
    const out: Hop[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= maxUp; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (dx === 0 && dy > 0 && !here?.spring) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= COLS || ny < 0) continue;
        if (this.walkable(nx, ny)) out.push({ x: nx, y: ny });
      }
    }
    return out;
  }

  private maxReachableY(): number {
    return this.reachable().best.y;
  }

  private reachable(): { best: Hop; parent: Map<string, string> } {
    const start = cellKey(this.unicorn.x, this.unicorn.y);
    const parent = new Map<string, string>();
    const seen = new Set<string>([start]);
    const q: Hop[] = [{ x: this.unicorn.x, y: this.unicorn.y }];
    let best: Hop = q[0]!;
    let bestScore = this.scoreHop(best);
    let qi = 0;
    while (qi < q.length) {
      const cur = q[qi++]!;
      const s = this.scoreHop(cur);
      if (s > bestScore) {
        best = cur;
        bestScore = s;
      }
      for (const n of this.neighbors(cur.x, cur.y)) {
        const k = cellKey(n.x, n.y);
        if (seen.has(k)) continue;
        seen.add(k);
        parent.set(k, cellKey(cur.x, cur.y));
        q.push(n);
      }
    }
    return { best, parent };
  }

  private scoreHop(h: Hop): number {
    const star = this.stars.some((s) => s.x === h.x && s.y === h.y) ? 6 : 0;
    return h.y * 10 + star - Math.abs(h.x - (COLS - 1) / 2) * 0.08;
  }

  repath() {
    if (!this.walkable(this.unicorn.x, this.unicorn.y)) {
      const stand = this.nearestStand();
      this.unicorn.x = stand.x;
      this.unicorn.y = stand.y;
    }
    const { best, parent } = this.reachable();
    const hops: Hop[] = [];
    let k = cellKey(best.x, best.y);
    const start = cellKey(this.unicorn.x, this.unicorn.y);
    while (k !== start) {
      const [x, y] = parseKey(k);
      hops.push({ x, y });
      const p = parent.get(k);
      if (!p) break;
      k = p;
    }
    hops.reverse();
    this.path = hops;
  }

  private nearestStand(): Hop {
    let best: Hop = { x: START_COL, y: 0 };
    let bestD = Infinity;
    for (const key of this.board.keys()) {
      const [x, y] = parseKey(key);
      const cell = this.board.get(key);
      if (cell?.thorn) continue;
      const d = Math.abs(x - this.unicorn.x) + Math.abs(y - this.unicorn.y) * 1.5;
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    }
    return best;
  }

  private fallInterval(): number {
    return Math.max(0.11, 0.82 - this.height * 0.018);
  }

  tick(dt: number, hold: { left: boolean; right: boolean; soft: boolean }) {
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.toast = "";
    }
    if (this.invuln > 0) this.invuln -= dt;

    if (this.mode === "paused" || this.mode === "over") {
      if (this.mode === "over") this.tickFall(dt);
      return;
    }

    if (this.mode === "playing") {
      this.tickPop(dt);
      if (!this.popping) this.tickPiece(dt, hold.soft);
      this.tickWind(dt);
      this.tickStars(dt);
      this.tickOrder(dt);
      this.clearDebt += dt;
      const rise =
        (0.22 + this.height * 0.0075 + Math.min(0.18, this.clearDebt * 0.012)) *
        (this.sleepy ? 2.2 : 1);
      this.fogY += rise * dt;
      if (this.fogY > this.unicorn.y - 0.12) {
        this.die();
        return;
      }
      if (this.unicorn.y > this.lastClimbY) {
        this.lastClimbY = this.unicorn.y;
        this.sleepyT = 0;
        this.sleepy = false;
      } else {
        this.sleepyT += dt;
        const next = this.sleepyT > 5.5;
        if (next && !this.sleepy) this.say("Nimbo is getting sleepy…");
        this.sleepy = next;
      }
    }

    this.tickUnicorn(dt);
    this.cullFog();
  }

  private tickStars(dt: number) {
    this.starCD -= dt;
    for (const s of this.stars) s.t -= dt;
    const expired = this.stars.filter((s) => s.t <= 0);
    if (expired.length) {
      this.stars = this.stars.filter((s) => s.t > 0);
      this.sleepyT += 2.4;
      this.say("A star faded");
    }
    if (this.starCD <= 0 && this.stars.length < 2 && this.lockedN >= 2) {
      this.maybeSpawnStar();
    }
  }

  private maybeSpawnStar() {
    if (this.mode !== "playing" || this.stars.length >= 2 || this.lockedN < 3) return;
    const ux = this.unicorn.x;
    const uy = this.unicorn.y;
    const candidates: Hop[] = [];
    for (const k of this.board.keys()) {
      const [x, y] = parseKey(k);
      const cell = this.board.get(k);
      if (!cell || cell.thorn) continue;
      if (y <= uy) continue;
      if (x === ux && y === uy) continue;
      if (this.stars.some((s) => s.x === x && s.y === y)) continue;
      candidates.push({ x, y });
    }
    if (candidates.length === 0) {
      this.starCD = 2.5;
      return;
    }
    const pick = candidates[(Math.random() * candidates.length) | 0]!;
    this.stars.push({ x: pick.x, y: pick.y, t: 14 });
    this.starCD = 7 + Math.random() * 4;
    this.say("A new star");
    this.repath();
  }

  private settleStars() {
    const keep: DewStar[] = [];
    for (const s of this.stars) {
      let y = s.y;
      while (y > 0 && !this.occupy(s.x, y)) y--;
      if (this.occupy(s.x, y) && !this.board.get(cellKey(s.x, y))?.thorn) {
        keep.push({ ...s, y });
      }
    }
    this.stars = keep;
  }

  private tickOrder(dt: number) {
    if (this.order) {
      this.order.t -= dt;
      if (this.order.t <= 0) {
        this.events.push({ kind: "orderFail" });
        this.fogY += 1.35;
        this.say("Order expired");
        this.order = null;
        this.orderCD = 4.5;
      }
      return;
    }
    this.orderCD -= dt;
    if (this.orderCD <= 0 && this.lockedN >= 3) {
      const id = PIECE_IDS[(Math.random() * PIECE_IDS.length) | 0]!;
      const maxT = Math.max(11, 20 - this.height * 0.22);
      this.order = { id, t: maxT, maxT };
      this.say(`5 ${ORDER_NAME[id]}`);
    }
  }

  private tickWind(dt: number) {
    if (this.windWarn > 0) {
      this.windWarn -= dt;
      if (this.windWarn <= 0) {
        const dir = this.windDir;
        this.windDir = 0;
        if (this.active && this.fits(this.active, dir, 0)) {
          this.active.x += dir;
          this.onShift();
          this.events.push({ kind: "gust", n: dir });
          this.say(dir > 0 ? "Wind →" : "Wind ←");
        }
      }
      return;
    }
    this.windCD -= dt;
    if (this.windCD <= 0) {
      this.windDir = Math.random() < 0.5 ? -1 : 1;
      this.windWarn = 1.2;
      this.windCD = 7 + Math.random() * 4;
      this.say(this.windDir > 0 ? "Wind approaching →" : "Wind approaching ←");
    }
  }

  private tickPiece(dt: number, soft: boolean) {
    const p = this.active;
    if (!p) return;
    const interval = soft ? 0.045 : this.fallInterval();
    this.fallT += dt;
    while (this.fallT >= interval) {
      this.fallT -= interval;
      if (this.fits(p, 0, -1)) {
        p.y -= 1;
        this.grounded = false;
        this.lockT = 0;
      } else {
        this.grounded = true;
        break;
      }
    }
    this.grounded = !this.fits(p, 0, -1);
    if (this.grounded) {
      this.lockT += dt;
      if (this.lockT >= 0.5 || this.lockResets >= 15) this.lockPiece();
    } else {
      this.lockT = 0;
    }
  }

  private tickUnicorn(dt: number) {
    if (this.hopTo) {
      this.hopT += dt;
      const t = Math.min(1, this.hopT / this.hopDur);
      const a = easeOut(t);
      const from = this.hopFrom!;
      const to = this.hopTo;
      this.unicorn.visX = from.x + (to.x - from.x) * a;
      const base = from.y + (to.y - from.y) * a;
      this.unicorn.visY = base + Math.sin(t * Math.PI) * this.hopArc;
      if (t >= 1) {
        this.unicorn.x = to.x;
        this.unicorn.y = to.y;
        this.unicorn.visX = to.x;
        this.unicorn.visY = to.y;
        this.hopFrom = null;
        this.hopTo = null;
        this.hopArc = 0.72;
        this.events.push({ kind: "land", x: to.x, y: to.y });
        const got = this.stars.find((s) => s.x === to.x && s.y === to.y);
        if (got && this.mode === "playing") {
          this.stars = this.stars.filter((s) => s !== got);
          this.starGot += 1;
          this.fogY -= 1.8;
          this.clearDebt = Math.max(0, this.clearDebt - 5);
          if (this.hearts < MAX_HEARTS) this.hearts += 1;
          this.events.push({ kind: "star", x: to.x, y: to.y, n: this.starGot });
          this.say("Star collected!");
          this.repath();
        }
        if (to.y > this.unicorn.maxY) {
          this.unicorn.maxY = to.y;
          this.height = to.y;
        }
      }
      return;
    }

    if (this.path.length > 0) {
      const next = this.path.shift()!;
      this.hopFrom = { x: this.unicorn.x, y: this.unicorn.y };
      this.hopTo = next;
      this.hopT = 0;
      this.hopDur = 0.28 + Math.abs(next.y - this.unicorn.y) * 0.05;
      this.hopArc = 0.72;
      this.events.push({ kind: "hop", x: next.x, y: next.y });
      return;
    }

    this.idleT += dt;
    this.unicorn.visY = this.unicorn.y + Math.sin(this.idleT * 2.2) * 0.04;
    if (this.mode === "title" && this.idleT > 3.2) {
      this.unicorn.x = 1;
      this.unicorn.y = 0;
      this.unicorn.visX = 1;
      this.unicorn.visY = 0;
      this.repath();
      this.idleT = 0;
    }
  }

  private tickFall(dt: number) {
    if (this.fallY >= 1.85) return;
    this.fallY += dt;
    const t = Math.min(1, this.fallY / 1.85);
    const ease = t * t;
    this.unicorn.visY = this.unicorn.y - ease * 11;
    this.unicorn.visX = this.unicorn.x + Math.sin(this.fallY * 7) * (0.2 + t * 0.7);
  }

  private cullFog() {
    const cut = Math.floor(this.fogY - 2);
    if (cut < 0) return;
    for (const k of [...this.board.keys()]) {
      if (parseKey(k)[1] < cut) this.board.delete(k);
    }
    this.stars = this.stars.filter((s) => s.y >= cut);
    if (this.unicorn.y < cut && this.mode === "playing") this.die();
  }

  private die() {
    this.mode = "over";
    this.active = null;
    this.hopFrom = null;
    this.hopTo = null;
    this.path = [];
    this.unicorn.x = this.unicorn.visX;
    this.unicorn.y = this.unicorn.visY;
    this.events.push({ kind: "over", y: this.height });
  }

  nextPreview() {
    return this.queue.slice(0, 3);
  }
}

const ORDER_NAME: Record<PieceId, string> = {
  I: "mint",
  O: "yellow",
  T: "lilac",
  S: "peach",
  Z: "pink",
  J: "blue",
  L: "rose",
};

function easeOut(t: number) {
  return 1 - (1 - t) * (1 - t);
}
