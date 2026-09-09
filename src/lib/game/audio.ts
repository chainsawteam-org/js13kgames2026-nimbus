type Bus = {
  ctx: AudioContext;
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
};

const F = 174.61;
const A = 220.0;
const C = 261.63;
const D = 293.66;
const E = 329.63;
const G = 196.0;
const F5 = 349.23;
const A5 = 440.0;
const C5 = 523.25;

/** Rainbow scale: C D E G A B C — candy, not a generic fanfare. */
const RAIN_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 987.77, 1046.5];

export class CozyAudio {
  private bus: Bus | null = null;
  private muted = false;
  private musicOn = false;
  private nextNote = 0;
  private step = 0;
  private pad: OscillatorNode | null = null;
  private padGain: GainNode | null = null;
  private popLift = 0;

  unlock() {
    if (!this.bus) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor({ latencyHint: "interactive" });
      const master = ctx.createGain();
      const music = ctx.createGain();
      const sfx = ctx.createGain();
      master.gain.value = 0.7;
      music.gain.value = 0.22;
      sfx.gain.value = 0.45;
      music.connect(master);
      sfx.connect(master);
      master.connect(ctx.destination);
      this.bus = { ctx, master, music, sfx };
    }
    if (this.bus.ctx.state === "suspended") void this.bus.ctx.resume();
    this.startMusic();
  }

  resume() {
    if (this.bus && this.bus.ctx.state === "suspended") void this.bus.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.bus) return;
    const t = this.bus.ctx.currentTime;
    this.bus.master.gain.setTargetAtTime(muted ? 0 : 0.7, t, 0.04);
  }

  tick() {
    if (!this.bus || this.muted || !this.musicOn) return;
    const { ctx } = this.bus;
    const now = ctx.currentTime;
    const stepDur = 0.42;
    while (this.nextNote < now + 1.2) {
      const seq = MELODY[this.step % MELODY.length]!;
      if (seq > 0) this.tone(seq, this.nextNote, 0.34, 0.07, "sine", true);
      if (this.step % 4 === 0) {
        const bass = BASS[Math.floor(this.step / 4) % BASS.length]!;
        this.tone(bass, this.nextNote, 0.7, 0.05, "triangle", true);
      }
      this.nextNote += stepDur;
      this.step++;
    }
  }

  blip(kind: "move" | "rotate" | "lock" | "hop" | "land" | "hard" | "combo" | "over" | "prism" | "start" | "crush" | "clear" | "burst" | "gust" | "hurt" | "star" | "topple" | "order" | "orderFail" | "pop") {
    if (!this.bus || this.muted) return;
    const t = this.bus.ctx.currentTime;
    switch (kind) {
      case "move":
        this.tone(880, t, 0.05, 0.04, "sine", false);
        break;
      case "rotate":
        this.tone(640, t, 0.07, 0.05, "triangle", false);
        this.tone(960, t + 0.04, 0.06, 0.04, "sine", false);
        break;
      case "lock":
        this.popLift = 0;
        this.noise(t, 0.08, 0.08);
        this.tone(180, t, 0.16, 0.12, "sine", false);
        break;
      case "hop":
        this.tone(520, t, 0.08, 0.06, "sine", false);
        break;
      case "land":
        this.tone(240, t, 0.1, 0.07, "triangle", false);
        break;
      case "hard":
        this.tone(140, t, 0.12, 0.1, "sine", false);
        this.noise(t, 0.06, 0.06);
        break;
      case "combo":
        this.popLift = 0;
        this.tone(C5, t, 0.1, 0.06, "sine", false);
        this.tone(A5, t + 0.08, 0.12, 0.06, "sine", false);
        break;
      case "prism":
        this.tone(F5, t, 0.12, 0.06, "sine", false);
        this.tone(A5, t + 0.07, 0.12, 0.05, "sine", false);
        this.tone(C5 * 1.5, t + 0.14, 0.18, 0.05, "sine", false);
        break;
      case "over":
        this.tone(A, t, 0.25, 0.1, "sine", false);
        this.tone(F, t + 0.18, 0.3, 0.1, "sine", false);
        this.tone(D / 2, t + 0.4, 0.5, 0.12, "triangle", false);
        break;
      case "start":
        this.tone(F, t, 0.16, 0.07, "sine", false);
        this.tone(A, t + 0.08, 0.16, 0.07, "sine", false);
        this.tone(C, t + 0.16, 0.22, 0.08, "sine", false);
        break;
      case "crush":
        this.tone(110, t, 0.18, 0.14, "sine", false);
        this.noise(t, 0.12, 0.1);
        break;
      case "hurt":
        this.tone(196, t, 0.12, 0.1, "triangle", false);
        this.tone(147, t + 0.08, 0.16, 0.08, "sine", false);
        break;
      case "pop":
        this.playRainbow(t);
        break;
      case "clear":
        this.playPoof(t, true);
        break;
      case "burst":
        this.playPoof(t, false);
        break;
      case "gust":
        this.noise(t, 0.18, 0.07);
        this.tone(330, t, 0.2, 0.04, "sine", false);
        break;
      case "star":
        this.tone(C5, t, 0.1, 0.07, "sine", false);
        this.tone(A5, t + 0.06, 0.12, 0.06, "sine", false);
        this.tone(C5 * 1.5, t + 0.12, 0.16, 0.05, "triangle", false);
        break;
      case "topple":
        this.noise(t, 0.14, 0.1);
        this.tone(130, t, 0.18, 0.1, "sine", false);
        break;
      case "order":
        this.tone(E, t, 0.1, 0.06, "sine", false);
        this.tone(A5, t + 0.08, 0.14, 0.06, "sine", false);
        this.tone(C5 * 1.5, t + 0.16, 0.18, 0.05, "sine", false);
        break;
      case "orderFail":
        this.tone(196, t, 0.16, 0.08, "triangle", false);
        this.tone(147, t + 0.1, 0.22, 0.08, "sine", false);
        break;
    }
  }

  /** Tiny random ping while cubes shimmer, before they vanish. */
  sparkle() {
    if (!this.bus || this.muted) return;
    const t = this.bus.ctx.currentTime;
    const f = 1280 + Math.random() * 980;
    this.tone(f, t, 0.05, 0.02, "sine", false, Math.random() * 1.5 - 0.75);
    this.tone(f * 1.5, t + 0.012, 0.035, 0.01, "triangle", false, Math.random() * 1.4 - 0.7);
  }

  private playRainbow(t: number) {
    if (!this.bus) return;
    const lift = 2 ** (Math.min(this.popLift, 6) / 12);
    this.popLift += 1;
    const music = this.bus.music.gain;
    music.setTargetAtTime(0.1, t, 0.05);
    music.setTargetAtTime(0.22, t + 0.55, 0.14);
    this.glide(380 * lift, 1720 * lift, t, 0.44, 0.032);
    this.dust(t, 0.18, 0.055, 4200, "highpass");
    RAIN_NOTES.forEach((f, i) => {
      const pan = -0.72 + (i / 6) * 1.44;
      const when = t + i * 0.052;
      this.tone(f * lift, when, 0.2, 0.05, "triangle", false, pan);
      this.tone(f * lift * 2.01, when + 0.018, 0.1, 0.022, "sine", false, pan);
    });
    this.tone(1568 * lift, t + 0.4, 0.06, 0.028, "sine", false, 0.35);
    this.tone(1865 * lift, t + 0.47, 0.05, 0.022, "sine", false, -0.25);
  }

  private playPoof(t: number, full: boolean) {
    this.dust(t, full ? 0.18 : 0.12, full ? 0.08 : 0.055, 2600, "highpass");
    this.glide(full ? 1400 : 1180, 420, t, 0.2, 0.03);
    this.tone(full ? 1318 : 1175, t, 0.16, 0.048, "sine", false, -0.2);
    this.tone(full ? 1568 : 1397, t + 0.05, 0.22, 0.04, "triangle", false, 0.25);
  }

  private startMusic() {
    if (!this.bus || this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.nextNote = this.bus.ctx.currentTime + 0.05;
    const { ctx, music } = this.bus;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = F;
    g.gain.value = 0.04;
    osc.connect(g);
    g.connect(music);
    osc.start();
    this.pad = osc;
    this.padGain = g;
  }

  private tone(
    freq: number,
    when: number,
    dur: number,
    gain: number,
    type: OscillatorType,
    music: boolean,
    pan = 0,
  ) {
    if (!this.bus) return;
    const { ctx, music: mBus, sfx } = this.bus;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    let panNode: StereoPannerNode | null = null;
    if (!music && pan !== 0) {
      panNode = ctx.createStereoPanner();
      panNode.pan.setValueAtTime(pan, when);
      g.connect(panNode);
      panNode.connect(sfx);
    } else {
      g.connect(music ? mBus : sfx);
    }
    osc.start(when);
    osc.stop(when + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
      panNode?.disconnect();
    };
  }

  private glide(from: number, to: number, when: number, dur: number, gain: number) {
    if (!this.bus) return;
    const { ctx, sfx } = this.bus;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(Math.max(40, from), when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(sfx);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  private noise(when: number, dur: number, gain: number) {
    this.dust(when, dur, gain, 900, "lowpass");
  }

  private dust(when: number, dur: number, gain: number, cutoff: number, kind: BiquadFilterType) {
    if (!this.bus) return;
    const { ctx, sfx } = this.bus;
    const n = 0.18 * ctx.sampleRate;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = kind;
    f.frequency.setValueAtTime(cutoff, when);
    src.buffer = buf;
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f);
    f.connect(g);
    g.connect(sfx);
    src.start(when);
    src.stop(when + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }

  dispose() {
    this.pad?.stop();
    this.pad = null;
    this.padGain = null;
    void this.bus?.ctx.close();
    this.bus = null;
    this.musicOn = false;
  }
}

const MELODY = [F5, 0, A, C, D, 0, A, G, F5, C, D, A, G, A, F, 0, A5, 0, C, E, D, C, A, 0];
const BASS = [F, D / 2, G / 1, C / 2];
