import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Download,
  Heart,
  Pause,
  Play,
  RotateCw,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SHAPES, type PieceId } from "@/lib/game/tetromino";
import { useGameUI, type NextPreview, type OrderUI } from "@/lib/game/store";

export function Overlay({ onPlayEntry }: { onPlayEntry: () => void }) {
  const mode = useGameUI((s) => s.mode);
  const height = useGameUI((s) => s.height);
  const best = useGameUI((s) => s.best);
  const combo = useGameUI((s) => s.combo);
  const next = useGameUI((s) => s.next);
  const muted = useGameUI((s) => s.muted);
  const hearts = useGameUI((s) => s.hearts);
  const toast = useGameUI((s) => s.toast);
  const sleepy = useGameUI((s) => s.sleepy);
  const crushing = useGameUI((s) => s.crushing);
  const stars = useGameUI((s) => s.stars);
  const order = useGameUI((s) => s.order);
  const windWarn = useGameUI((s) => s.windWarn);
  const windDir = useGameUI((s) => s.windDir);
  const api = useGameUI((s) => s.api);
  const booting = !api;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col">
      <Hud
        height={height}
        best={best}
        combo={combo}
        next={next}
        mode={mode}
        hearts={hearts}
        stars={stars}
        order={order}
        sleepy={sleepy}
        windWarn={windWarn}
        windDir={windDir}
      />

      {mode === "playing" && toast && (
        <div className="absolute top-24 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-ink/90 px-3 py-1.5 text-sm font-semibold text-paper shadow-soft">
          {toast}
        </div>
      )}

      {mode === "playing" && crushing && (
        <div className="absolute top-36 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-rose px-3 py-1.5 text-sm font-bold tracking-wide text-rose-fg shadow-soft">
          One more hit and Nimbo falls asleep!
        </div>
      )}

      <div className="absolute top-3 right-3 z-10 pointer-events-auto flex gap-2">
        {mode === "playing" && (
          <IconBtn label="Paused" onClick={() => api?.pause()}>
            <Pause className="size-4" strokeWidth={2.2} />
          </IconBtn>
        )}
        <IconBtn
          label={muted ? "Sound on" : "Sound off"}
          onClick={() => api?.setMuted(!muted)}
        >
          {muted ? <VolumeX className="size-4" strokeWidth={2.2} /> : <Volume2 className="size-4" strokeWidth={2.2} />}
        </IconBtn>
      </div>

      {(mode === "title" || booting) && <TitleCard booting={booting} onPlayEntry={onPlayEntry} />}
      {mode === "paused" && <PauseCard />}
      {mode === "over" && <OverCard height={height} best={best} stars={stars} />}

      {mode === "playing" && (
        <div className="mt-auto md:hidden">
          <TouchBar />
        </div>
      )}
    </div>
  );
}

function Hud({
  height,
  best,
  combo,
  next,
  mode,
  hearts,
  stars,
  order,
  sleepy,
  windWarn,
  windDir,
}: {
  height: number;
  best: number;
  combo: number;
  next: NextPreview[];
  mode: string;
  hearts: number;
  stars: number;
  order: OrderUI | null;
  sleepy: boolean;
  windWarn: boolean;
  windDir: number;
}) {
  if (mode === "title") return null;
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2 sm:px-6">
      <div className="rounded-xl bg-surface/80 px-3 py-2 shadow-soft backdrop-blur-sm">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">height</p>
        <p className="font-display text-2xl font-medium leading-tight tabular-nums text-ink">
          {height}
          <span className="ml-1 font-sans text-sm font-semibold text-muted">m</span>
        </p>
        <p className="text-xs font-semibold text-muted tabular-nums">best {best}</p>
        <div className="mt-1.5 flex gap-1" aria-label={`${hearts} hearts`}>
          {Array.from({ length: 3 }, (_, i) => (
            <Heart
              key={i}
              className={cn("size-3.5", i < hearts ? "fill-rose text-rose" : "text-border")}
              strokeWidth={2.2}
            />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-col items-center gap-1.5">
        {windWarn && (
          <div className="rounded-lg bg-ink px-2.5 py-1 text-xs font-bold tracking-wide text-paper">
            wind {windDir > 0 ? "→" : "←"}
          </div>
        )}
        {sleepy && !windWarn && (
          <div className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold tracking-wide text-muted">
            Nimbo is yawning
          </div>
        )}
      </div>
      <div className="flex items-start gap-2">
        {stars > 0 && (
          <div className="rounded-lg bg-surface/80 px-2.5 py-1.5 shadow-soft backdrop-blur-sm">
            <p className="flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
              <Sparkles className="size-3" strokeWidth={2.4} />
              {stars}
            </p>
          </div>
        )}
        {combo > 1 && mode === "playing" && (
          <div className="rounded-lg bg-rose px-2.5 py-1.5 text-rose-fg shadow-soft">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em]">combo</p>
            <p className="font-display text-lg leading-none tabular-nums">×{combo}</p>
          </div>
        )}
        {order && mode === "playing" && <OrderChip order={order} />}
        <div className="rounded-xl bg-surface/80 px-3 py-2 shadow-soft backdrop-blur-sm">
          <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">next</p>
          <div className="flex gap-2">
            {next.slice(0, 3).map((p, i) => (
              <MiniPiece key={`${p.id}-${i}`} id={p.id} prism={p.prism} thorn={p.thorn} dim={i > 0} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderChip({ order }: { order: OrderUI }) {
  const pct = Math.max(0, Math.min(100, (order.t / order.maxT) * 100));
  return (
    <div className="w-20 rounded-lg bg-surface/80 px-2 py-1.5 shadow-soft backdrop-blur-sm">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted">match 5</p>
      <div className="mt-1 flex items-center gap-1.5">
        <span className={cn("size-3.5 rounded-sm", COLOR_CLASS[order.id])} />
        <span className="text-xs font-bold tabular-nums text-ink">{Math.ceil(order.t)}s</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-rose" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniPiece({ id, prism, thorn, dim }: { id: PieceId; prism?: boolean; thorn?: boolean; dim?: boolean }) {
  const cells = SHAPES[id][0]!;
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const set = new Set(cells.map(([x, y]) => `${x},${y}`));
  const color = thorn ? "bg-muted" : prism ? "bg-rose" : COLOR_CLASS[id];
  return (
    <div
      className={cn("grid gap-[2px]", dim && "opacity-45")}
      style={{ gridTemplateColumns: `repeat(${w}, 7px)`, gridTemplateRows: `repeat(${h}, 7px)` }}
    >
      {Array.from({ length: h * w }, (_, i) => {
        const x = minX + (i % w);
        const y = maxY - Math.floor(i / w);
        const on = set.has(`${x},${y}`);
        return <span key={i} className={cn("rounded-[2px]", on ? color : "bg-transparent")} />;
      })}
    </div>
  );
}

const COLOR_CLASS: Record<PieceId, string> = {
  I: "bg-piece-i",
  O: "bg-piece-o",
  T: "bg-piece-t",
  S: "bg-piece-s",
  Z: "bg-piece-z",
  J: "bg-piece-j",
  L: "bg-piece-l",
};

function TitleCard({ booting, onPlayEntry }: { booting: boolean; onPlayEntry: () => void }) {
  const api = useGameUI((s) => s.api);
  const [zip, setZip] = useState<{ kb: number; bytes: number; ok: boolean } | null>(null);
  useEffect(() => {
    void fetch("/entry/size.json")
      .then((r) => r.json())
      .then(setZip);
  }, []);
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-end justify-center px-5 pb-10 sm:items-center sm:pb-0">
      <div className="w-full max-w-md rounded-xl bg-surface/80 px-6 py-7 shadow-soft backdrop-blur-md sm:px-8">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted">js13k · unicorns & rainbows</p>
        <h1 className="font-display mt-2 text-5xl font-medium italic leading-[0.95] tracking-[-0.03em] text-ink sm:text-6xl">
          Nimbo
        </h1>
        <p className="mt-3 max-w-sm text-pretty text-base leading-snug text-muted">
          The original studio: build cloud staircases, collect stars, and complete color orders.
          Keep Nimbo safe from falling pieces and the rising fog.
        </p>
        <ol className="mt-5 space-y-1.5 text-sm text-ink/80">
          <li className="flex gap-2"><span className="w-4 font-semibold text-rose">1</span>The pink ring marks the next hop. Build a step there.</li>
          <li className="flex gap-2"><span className="w-4 font-semibold text-rose">2</span>Keep falling pieces away from Nimbo.</li>
          <li className="flex gap-2"><span className="w-4 font-semibold text-rose">3</span>Five matching clouds sparkle and clear together.</li>
          <li className="flex gap-2"><span className="w-4 font-semibold text-rose">4</span>Tall towers need support or they collapse.</li>
          <li className="flex gap-2"><span className="w-4 font-semibold text-rose">5</span>Collect stars and complete color orders before time runs out.</li>
        </ol>
        <button
          type="button"
          disabled={booting || !api}
          onClick={() => api?.play()}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink text-paper font-semibold tracking-wide transition-transform enabled:hover:scale-[0.99] enabled:active:scale-[0.98] disabled:opacity-50"
        >
          <Play className="size-4 fill-current" strokeWidth={2} />
          {booting ? "Preparing the sky…" : "Climb"}
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPlayEntry}
            className="flex h-11 items-center justify-center rounded-lg border border-border bg-surface text-sm font-semibold text-ink"
          >
            Competition game
          </button>
          <a
            href="/nimbo.zip"
            download="nimbo.zip"
            className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-sm font-semibold text-ink"
          >
            <Download className="size-3.5" strokeWidth={2.2} />
            {zip ? `${zip.kb} KB` : "zip"}
          </a>
        </div>
        <p className="mt-3 text-center text-xs font-semibold text-muted tabular-nums">
          {zip
            ? zip.ok
              ? `competition ZIP ${zip.kb} KB / 13 KB`
              : `ZIP exceeds the limit (${zip.kb} KB)`
            : "A little cloud strategy"}
        </p>
        <p className="mt-4 hidden text-center text-[0.7rem] tracking-wide text-muted sm:block">
          A D move · W rotate · S soft drop · Space drop
        </p>
      </div>
    </div>
  );
}

function PauseCard() {
  const api = useGameUI((s) => s.api);
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-ink/20 px-5">
      <div className="w-full max-w-sm rounded-xl bg-surface px-6 py-7 shadow-soft">
        <h2 className="font-display text-3xl italic">Paused</h2>
        <p className="mt-2 text-sm text-muted">Nimbo and the fog are taking a breath.</p>
        <button
          type="button"
          onClick={() => api?.resume()}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink text-paper font-semibold"
        >
          <Play className="size-4 fill-current" />
          Resume
        </button>
      </div>
    </div>
  );
}

function OverCard({ height, best, stars }: { height: number; best: number; stars: number }) {
  const api = useGameUI((s) => s.api);
  const record = height >= best && height > 0;
  return (
    <div className="pointer-events-auto absolute inset-0 flex items-end justify-center bg-ink/15 px-5 pb-10 sm:items-center sm:pb-0">
      <div className="w-full max-w-sm rounded-xl bg-surface px-6 py-7 shadow-soft">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">the fog caught up</p>
        <h2 className="font-display mt-1 text-3xl italic leading-tight">Nimbo fell asleep</h2>
        <p className="mt-4 font-display text-5xl tabular-nums leading-none">
          {height}
          <span className="ml-2 font-sans text-base font-semibold text-muted">metres</span>
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-muted">
          <Cloud className="size-3.5" strokeWidth={2.2} />
          {record ? "new personal best" : `best ${best} m`}
          {stars > 0 && (
            <>
              <span className="text-border">·</span>
              <Sparkles className="size-3.5" strokeWidth={2.2} />
              {stars}
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => api?.retry()}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink text-paper font-semibold"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function TouchBar() {
  const api = useGameUI((s) => s.api);
  return (
    <div className="pointer-events-auto mt-auto flex items-end justify-between gap-3 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
      <div className="flex gap-2">
        <HoldBtn label="Move left" onHold={(h) => api?.setHold("left", h)}>
          <ChevronLeft className="size-6" strokeWidth={2.2} />
        </HoldBtn>
        <HoldBtn label="Move right" onHold={(h) => api?.setHold("right", h)}>
          <ChevronRight className="size-6" strokeWidth={2.2} />
        </HoldBtn>
      </div>
      <div className="flex gap-2">
        <TapBtn label="Rotate" onTap={() => api?.rotate(1)}>
          <RotateCw className="size-5" strokeWidth={2.2} />
        </TapBtn>
        <HoldBtn label="Soft drop" onHold={(h) => api?.setHold("soft", h)}>
          <ChevronDown className="size-6" strokeWidth={2.2} />
        </HoldBtn>
        <TapBtn label="Hard drop" onTap={() => api?.hardDrop()} accent>
          <span className="text-xs font-bold tracking-wide">DROP</span>
        </TapBtn>
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-lg bg-surface/85 text-ink shadow-soft backdrop-blur-sm"
    >
      {children}
    </button>
  );
}

function TapBtn({
  label,
  onTap,
  children,
  accent,
}: {
  label: string;
  onTap: () => void;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onTap();
      }}
      className={cn(
        "flex h-14 min-w-14 items-center justify-center rounded-lg px-3 shadow-soft",
        accent ? "bg-ink text-paper" : "bg-surface/90 text-ink backdrop-blur-sm",
      )}
    >
      {children}
    </button>
  );
}

function HoldBtn({
  label,
  onHold,
  children,
}: {
  label: string;
  onHold: (held: boolean) => void;
  children: ReactNode;
}) {
  const [held, setHeld] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        setHeld(true);
        onHold(true);
      }}
      onPointerUp={() => {
        setHeld(false);
        onHold(false);
      }}
      onPointerCancel={() => {
        setHeld(false);
        onHold(false);
      }}
      className={cn(
        "flex size-14 items-center justify-center rounded-lg bg-surface/90 text-ink shadow-soft backdrop-blur-sm",
        held && "scale-[0.97] bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
