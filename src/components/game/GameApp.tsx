import { memo, useEffect, useRef, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { Overlay } from "./Overlay";

export function GameApp() {
  const [entry, setEntry] = useState(true);
  if (entry) return <EntryFrame onBack={() => setEntry(false)} />;
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-paper">
      <GameCanvas />
      <Overlay onPlayEntry={() => setEntry(true)} />
    </main>
  );
}

function EntryFrame({ onBack }: { onBack: () => void }) {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-paper">
      <iframe
        title="Nimbo js13k"
        src="/entry/index.html"
        className="absolute inset-x-0 top-0 h-[calc(100%-48px)] w-full border-0"
        allow="autoplay"
      />
      <div className="pointer-events-none absolute bottom-1 left-3 z-20 flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="pointer-events-auto flex h-11 items-center gap-2 rounded-lg bg-surface/90 px-3 text-sm font-semibold text-ink shadow-soft backdrop-blur-sm"
        >
          <ArrowLeft className="size-4" strokeWidth={2.2} />
          Original studio
        </button>
        <a
          href="/nimbo.zip"
          download="nimbo.zip"
          className="pointer-events-auto flex h-11 items-center gap-2 rounded-lg bg-ink px-3 text-sm font-semibold text-paper shadow-soft"
        >
          <Download className="size-4" strokeWidth={2.2} />
          Download ZIP
        </a>
      </div>
    </main>
  );
}

const GameCanvas = memo(function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let game: { dispose: () => void; start: () => void } | null = null;
    let cancelled = false;
    void import("@/lib/game/engine").then(({ NimboGame }) => {
      if (cancelled || !canvas.isConnected) return;
      game = new NimboGame(canvas);
      game.start();
    });
    return () => {
      cancelled = true;
      game?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block h-full w-full touch-none"
      aria-label="Nimbo, cloud climbing studio"
    />
  );
});
