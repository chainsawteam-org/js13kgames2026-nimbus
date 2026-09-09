import * as THREE from "three";
import { Sim, MATCH, type Active, type Event } from "./sim";
import { COLS, PIECE_COLORS, RAINBOW, parseKey } from "./tetromino";
import {
  createClouds,
  createRainbow,
  createSky,
  createStarGeometry,
  createUnicorn,
  discTexture,
  makePuffGeometry,
  worldX,
} from "./meshes";
import { CozyAudio } from "./audio";
import { readBest, writeBest, useGameUI, type GameAPI } from "./store";

const MAX_BLOCKS = 640;
const MAX_DOTS = 96;
const MAX_GLOW = 64;
const FIXED = 1 / 60;
/** Raise cubes so their bottoms rest on the shelf, not inside it. */
const PUFF_SIT = 0.05;

export class NimboGame {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private sim = new Sim();
  private audio = new CozyAudio();
  private puffGeo = makePuffGeometry();
  private puffMat = new THREE.MeshStandardMaterial({
    roughness: 0.36,
    metalness: 0.06,
    fog: false,
    emissive: 0x222222,
    emissiveIntensity: 0.22,
  });
  private locked: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private activeMeshes: THREE.Mesh[] = [];
  private ghostDots: THREE.InstancedMesh;
  private glowMesh: THREE.InstancedMesh;
  private flashes: { x: number; y: number; t: number }[] = [];
  private sparkAcc = 0;
  private dotGeo: THREE.BufferGeometry;
  private unicorn: THREE.Group;
  private sky: THREE.Mesh;
  private rainbow: THREE.Mesh;
  private clouds: THREE.InstancedMesh;
  private spark: THREE.Points;
  private sparkVel: Float32Array;
  private blob: THREE.Mesh;
  private well: THREE.LineSegments;
  private starMesh: THREE.InstancedMesh;
  private starGeo: THREE.BufferGeometry;
  private pathMesh: THREE.InstancedMesh;
  private nextPad: THREE.Mesh;
  private overCamY: number | null = null;
  private camDist = 15;
  private camY = 4;
  private trauma = 0;
  private acc = 0;
  private last = 0;
  private hold = { left: false, right: false, soft: false };
  private das = 0;
  private dasDir = 0;
  private keys = new Set<string>();
  private reduced = false;
  private disposed = false;
  private canvas: HTMLCanvasElement;
  private unsub: Array<() => void> = [];
  private squash = 1;
  private facing = 1;
  private particleAge = 0;
  private skyCol = new THREE.Color();
  private duskCol = new THREE.Color(0xc9c0f0);
  private dawnCol = new THREE.Color(0xf4c9de);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setClearColor(0xffd6e8, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 520 ? 1.4 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 160);

    const hemi = new THREE.HemisphereLight(0xfff6fb, 0xffdcc8, 0.42);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(5, 12, 9);
    this.scene.add(dir);
    const fill = new THREE.DirectionalLight(0xffe9f4, 0.45);
    fill.position.set(-6, 5, 8);
    this.scene.add(fill);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.42));

    this.locked = new THREE.InstancedMesh(this.puffGeo, this.puffMat, MAX_BLOCKS);
    this.locked.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.locked.frustumCulled = false;
    const ic = new Float32Array(MAX_BLOCKS * 3);
    this.locked.instanceColor = new THREE.InstancedBufferAttribute(ic, 3);
    this.scene.add(this.locked);

    const ghostDotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      fog: false,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    this.dotGeo = new THREE.SphereGeometry(0.1, 8, 6);
    this.ghostDots = new THREE.InstancedMesh(this.dotGeo, ghostDotMat, MAX_DOTS);
    this.ghostDots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.ghostDots.frustumCulled = false;
    this.ghostDots.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_DOTS * 3), 3);
    this.scene.add(this.ghostDots);

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      fog: false,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glowMesh = new THREE.InstancedMesh(this.puffGeo, glowMat, MAX_GLOW);
    this.glowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.glowMesh.frustumCulled = false;
    this.glowMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_GLOW * 3), 3);
    this.scene.add(this.glowMesh);

    const activeMat = new THREE.MeshStandardMaterial({
      color: 0xa8e6cf,
      emissive: 0xa8e6cf,
      emissiveIntensity: 0.4,
      roughness: 0.36,
      metalness: 0.06,
      fog: false,
    });
    for (let i = 0; i < 4; i++) {
      const a = new THREE.Mesh(this.puffGeo, activeMat.clone());
      a.visible = false;
      this.scene.add(a);
      this.activeMeshes.push(a);
    }

    this.unicorn = createUnicorn();
    this.scene.add(this.unicorn);
    this.sky = createSky();
    this.scene.add(this.sky);
    this.rainbow = createRainbow();
    this.scene.add(this.rainbow);
    this.clouds = createClouds();
    this.scene.add(this.clouds);

    const sparkGeo = new THREE.BufferGeometry();
    const n = 220;
    const pos = new Float32Array(n * 3);
    const cols = new Float32Array(n * 3);
    this.sparkVel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3 + 1] = -40;
      cols[i * 3] = 1;
      cols[i * 3 + 1] = 0.85;
      cols[i * 3 + 2] = 0.92;
    }
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    sparkGeo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    this.spark = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({
        size: 0.42,
        map: discTexture(),
        transparent: true,
        depthWrite: false,
        vertexColors: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.spark);

    const blobMat = new THREE.MeshBasicMaterial({ color: 0x3d2c3a, transparent: true, opacity: 0.12, depthWrite: false });
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), blobMat);
    this.blob.rotation.x = -Math.PI / 2;
    this.scene.add(this.blob);

    this.well = this.makeWell();
    this.scene.add(this.well);

    this.starGeo = createStarGeometry();
    const starMat = new THREE.MeshLambertMaterial({
      color: 0xffe08a,
      emissive: 0xffb347,
      emissiveIntensity: 0.45,
    });
    this.starMesh = new THREE.InstancedMesh(this.starGeo, starMat, 4);
    this.starMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.starMesh.frustumCulled = false;
    this.scene.add(this.starMesh);

    const pathGeo = new THREE.TorusGeometry(0.4, 0.07, 8, 28);
    const pathMat = new THREE.MeshBasicMaterial({
      color: 0xffd6e8,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.pathMesh = new THREE.InstancedMesh(pathGeo, pathMat, 24);
    this.pathMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pathMesh.frustumCulled = false;
    const pc = new Float32Array(24 * 3);
    this.pathMesh.instanceColor = new THREE.InstancedBufferAttribute(pc, 3);
    this.scene.add(this.pathMesh);

    this.nextPad = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.09, 8, 32),
      new THREE.MeshBasicMaterial({
        color: 0xe07a93,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    );
    this.nextPad.rotation.x = -Math.PI / 2;
    this.nextPad.visible = false;
    this.scene.add(this.nextPad);

    const fogPlane = new THREE.Mesh(
      new THREE.BoxGeometry(32, 8, 18),
      new THREE.MeshBasicMaterial({
        color: 0xc9a8e8,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    );
    fogPlane.name = "mist";
    this.scene.add(fogPlane);

    const ground = new THREE.Mesh(
      new THREE.SphereGeometry(4.6, 16, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd4e6, roughness: 0.7, metalness: 0, fog: false }),
    );
    ground.scale.set(2.7, 0.14, 2.4);
    ground.position.set(0, -2.45, 0);
    this.scene.add(ground);

    const shelf = new THREE.Mesh(
      new THREE.CylinderGeometry(6.2, 6.6, 0.18, 32),
      new THREE.MeshStandardMaterial({ color: 0xffe6f2, roughness: 0.5, metalness: 0.02, fog: false }),
    );
    shelf.position.set(0, -0.52, 0);
    this.scene.add(shelf);

    const lip = new THREE.Mesh(
      new THREE.TorusGeometry(6.15, 0.08, 8, 40),
      new THREE.MeshStandardMaterial({ color: 0xffc2d8, roughness: 0.45, metalness: 0.04, fog: false }),
    );
    lip.rotation.x = Math.PI / 2;
    lip.position.set(0, -0.42, 0);
    this.scene.add(lip);

    this.sim.reset("title");
    this.syncLocked();
    this.bind();
    this.resize();
    this.publish();
    useGameUI.getState().setApi(this.api());
    useGameUI.getState().patch({ best: readBest(), muted: false, mode: "title" });

    const ro = new ResizeObserver(() => this.resize());
    ro.observe(this.canvas.parentElement ?? this.canvas);
    this.unsub.push(() => ro.disconnect());
  }

  private makeWell(): THREE.LineSegments {
    const left = worldX(0, COLS) - 0.62;
    const right = worldX(COLS - 1, COLS) + 0.62;
    const pts = [left, -2.6, 0, left, 90, 0, right, -2.6, 0, right, 90, 0];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 });
    return new THREE.LineSegments(geo, mat);
  }

  private api(): GameAPI {
    return {
      play: () => this.play(),
      resume: () => this.resume(),
      pause: () => this.pause(),
      retry: () => this.play(),
      move: (dx) => {
        if (this.sim.move(dx)) this.audio.blip("move");
      },
      rotate: (dir) => {
        if (this.sim.rotate(dir)) this.audio.blip("rotate");
      },
      hardDrop: () => {
        const n = this.sim.hardDrop();
        if (n >= 0) this.audio.blip("hard");
        this.trauma = Math.min(1, this.trauma + 0.28);
        this.handleEvents(this.sim.events);
        this.syncLocked();
        this.publish();
      },
      setHold: (action, held) => {
        this.hold[action] = held;
        if (!held && ((action === "left" && this.dasDir === -1) || (action === "right" && this.dasDir === 1))) {
          this.dasDir = 0;
        }
        if (held && (action === "left" || action === "right")) {
          const dir = action === "left" ? -1 : 1;
          this.sim.move(dir);
          this.das = 0.11;
          this.dasDir = dir;
          this.audio.blip("move");
        }
      },
      setMuted: (muted) => {
        this.audio.setMuted(muted);
        useGameUI.getState().patch({ muted });
      },
    };
  }

  private play() {
    this.audio.unlock();
    this.audio.blip("start");
    this.sim.reset("play");
    this.camY = 3;
    this.camDist = 15;
    this.overCamY = null;
    this.trauma = 0;
    this.squash = 1;
    this.syncLocked();
    this.publish();
  }

  private pause() {
    if (this.sim.mode !== "playing") return;
    this.sim.mode = "paused";
    this.publish();
  }

  private resume() {
    if (this.sim.mode !== "paused") return;
    this.sim.mode = "playing";
    this.audio.unlock();
    this.publish();
  }

  start() {
    this.resize();
    this.last = performance.now();
    this.draw(0);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setAnimationLoop(this.loop);
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    const delta = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.acc += delta;
    this.pollGamepad();
    this.stepDas(delta);
    let steps = 0;
    while (this.acc >= FIXED && steps < 5) {
      this.sim.tick(FIXED, this.hold);
      this.handleEvents(this.sim.events);
      this.acc -= FIXED;
      steps++;
    }
    this.audio.tick();
    this.draw(delta);
    this.renderer.render(this.scene, this.camera);
  };

  private stepDas(dt: number) {
    if (this.sim.mode !== "playing") return;
    if (this.hold.left && !this.hold.right) {
      if (this.dasDir !== -1) {
        this.dasDir = -1;
        this.das = 0.11;
      } else {
        this.das -= dt;
        if (this.das <= 0) {
          this.sim.move(-1);
          this.das = 0.032;
        }
      }
    } else if (this.hold.right && !this.hold.left) {
      if (this.dasDir !== 1) {
        this.dasDir = 1;
        this.das = 0.11;
      } else {
        this.das -= dt;
        if (this.das <= 0) {
          this.sim.move(1);
          this.das = 0.032;
        }
      }
    } else {
      this.dasDir = 0;
    }
  }

  private handleEvents(events: Event[]) {
    let locked = false;
    for (const e of events) {
      switch (e.kind) {
        case "lock":
          locked = true;
          this.audio.blip("lock");
          this.trauma = Math.min(1, this.trauma + 0.22);
          if (e.x != null && e.y != null) this.burst(e.x, e.y, 18);
          break;
        case "move":
          break;
        case "rotate":
          break;
        case "hard":
          locked = true;
          break;
        case "hop":
          this.audio.blip("hop");
          break;
        case "land":
          this.audio.blip("land");
          this.squash = 0.72;
          break;
        case "combo":
          this.audio.blip("combo");
          break;
        case "prism":
          this.audio.blip("prism");
          this.trauma = Math.min(1, this.trauma + 0.18);
          break;
        case "crush":
          locked = true;
          this.audio.blip("crush");
          this.trauma = Math.min(1, this.trauma + 0.45);
          if (e.x != null && e.y != null) this.burst(e.x, e.y, 18);
          break;
        case "hurt":
          this.audio.blip("hurt");
          this.trauma = Math.min(1, this.trauma + 0.32);
          break;
        case "pop":
          locked = true;
          this.audio.blip("pop");
          this.trauma = Math.min(1, this.trauma + 0.2);
          this.spawnFlash(e);
          if (e.cells) {
            for (const [x, y] of e.cells) this.burst(x, y, 14);
          } else if (e.x != null && e.y != null) this.burst(e.x, e.y, 18);
          break;
        case "clear":
          locked = true;
          this.audio.blip("clear");
          this.trauma = Math.min(1, this.trauma + 0.28);
          this.spawnFlash(e);
          if (e.cells) {
            for (const [x, y] of e.cells) this.burst(x, y, 16);
          } else if (e.x != null && e.y != null) this.burst(e.x, e.y, 18);
          break;
        case "burst":
          locked = true;
          this.audio.blip("burst");
          this.spawnFlash(e);
          if (e.cells) {
            for (const [x, y] of e.cells) this.burst(x, y, 16);
          } else if (e.x != null && e.y != null) this.burst(e.x, e.y, 18);
          break;
        case "gust":
          this.audio.blip("gust");
          break;
        case "star":
          this.audio.blip("star");
          this.trauma = Math.min(1, this.trauma + 0.16);
          if (e.x != null && e.y != null) this.burst(e.x, e.y, 18);
          break;
        case "topple":
          locked = true;
          this.audio.blip("topple");
          this.trauma = Math.min(1, this.trauma + 0.24);
          if (e.x != null && e.y != null) this.burst(e.x, e.y, 18);
          break;
        case "order":
          this.audio.blip("order");
          this.trauma = Math.min(1, this.trauma + 0.2);
          break;
        case "orderFail":
          this.audio.blip("orderFail");
          break;
        case "over": {
          this.audio.blip("over");
          const best = Math.max(readBest(), this.sim.height);
          writeBest(best);
          useGameUI.getState().patch({ best, mode: "over", height: this.sim.height });
          break;
        }
      }
    }
    events.length = 0;
    if (locked) this.syncLocked();
    if (locked) this.publish();
  }

  private spawnFlash(e: Event) {
    const cells = e.cells?.length
      ? e.cells
      : e.x != null && e.y != null
        ? ([[e.x, e.y]] as [number, number][])
        : [];
    for (const [x, y] of cells) {
      this.flashes.push({ x, y, t: 0.55 });
    }
  }

  private hideInstanced(mesh: THREE.InstancedMesh, n: number) {
    const dummy = this.dummy;
    for (let i = 0; i < n; i++) {
      dummy.position.set(0, -40, 0);
      dummy.scale.set(0, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  private syncGhostDots(
    gCells: [number, number][],
    live: [number, number][],
    danger: boolean,
    p: Active,
  ) {
    const same = gCells.every(([x, y], i) => live[i]?.[0] === x && live[i]?.[1] === y);
    if (same) {
      this.hideInstanced(this.ghostDots, MAX_DOTS);
      return;
    }
    const occ = new Set(gCells.map(([x, y]) => `${x},${y}`));
    const pending = new Set(this.sim.previewClear().map(([x, y]) => `${x},${y}`));
    const march = (performance.now() * 0.004) % 1;
    const half = 0.46;
    const z = 0.56;
    const dummy = this.dummy;
    const dotsPerEdge = 6;
    let i = 0;
    for (let c = 0; c < gCells.length; c++) {
      const [cx, cy] = gCells[c]!;
      const hot = pending.has(`${cx},${cy}`);
      const hex = danger
        ? 0xe07a93
        : hot
          ? 0xfff4b0
          : p.thorn
            ? 0x8c4d5e
            : p.prism
              ? RAINBOW[c % RAINBOW.length]!
              : PIECE_COLORS[p.id];
      const sides = [
        { nx: 0, ny: 1, x1: -half, y1: half, x2: half, y2: half },
        { nx: 0, ny: -1, x1: -half, y1: -half, x2: half, y2: -half },
        { nx: 1, ny: 0, x1: half, y1: -half, x2: half, y2: half },
        { nx: -1, ny: 0, x1: -half, y1: -half, x2: -half, y2: half },
      ];
      const wx0 = worldX(cx, COLS);
      for (const s of sides) {
        if (occ.has(`${cx + s.nx},${cy + s.ny}`)) continue;
        for (let k = 0; k < dotsPerEdge; k++) {
          if (i >= MAX_DOTS) break;
          const u = (k + march) / dotsPerEdge;
          dummy.position.set(
            wx0 + s.x1 + (s.x2 - s.x1) * u,
            cy + PUFF_SIT + s.y1 + (s.y2 - s.y1) * u,
            z,
          );
          dummy.scale.setScalar(hot ? 1.4 : 1);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          this.ghostDots.setMatrixAt(i, dummy.matrix);
          this.color.setHex(hex);
          this.ghostDots.setColorAt(i, this.color);
          i++;
        }
      }
    }
    for (; i < MAX_DOTS; i++) {
      dummy.position.set(0, -40, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      this.ghostDots.setMatrixAt(i, dummy.matrix);
    }
    this.ghostDots.instanceMatrix.needsUpdate = true;
    if (this.ghostDots.instanceColor) this.ghostDots.instanceColor.needsUpdate = true;
  }

  private syncGlow(dt: number) {
    this.flashes = this.flashes.filter((f) => {
      f.t -= dt;
      return f.t > 0;
    });
    const pending = this.sim.mode === "playing" ? this.sim.previewClear() : [];
    const popping = this.sim.popping?.cells ?? [];
    const dummy = this.dummy;
    let i = 0;
    const pulse = 1.08 + Math.sin(performance.now() * 0.014) * 0.1;
    const spin = Math.floor(performance.now() * 0.016);
    for (const [x, y] of popping) {
      if (i >= MAX_GLOW) break;
      dummy.position.set(worldX(x, COLS), y + PUFF_SIT, 0);
      dummy.scale.setScalar(pulse * 1.35);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      this.glowMesh.setMatrixAt(i, dummy.matrix);
      this.color.setHex(RAINBOW[(spin + i) % RAINBOW.length]!);
      this.glowMesh.setColorAt(i, this.color);
      i++;
    }
    for (const [x, y] of pending) {
      if (i >= MAX_GLOW) break;
      if (popping.some(([px, py]) => px === x && py === y)) continue;
      dummy.position.set(worldX(x, COLS), y + PUFF_SIT, 0);
      dummy.scale.setScalar(pulse);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      this.glowMesh.setMatrixAt(i, dummy.matrix);
      this.color.setHex(0xfff3a8);
      this.glowMesh.setColorAt(i, this.color);
      i++;
    }
    for (const f of this.flashes) {
      if (i >= MAX_GLOW) break;
      const k = f.t / 0.55;
      dummy.position.set(worldX(f.x, COLS), f.y + PUFF_SIT, 0);
      dummy.scale.setScalar(1.12 + (1 - k) * 0.75);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      this.glowMesh.setMatrixAt(i, dummy.matrix);
      this.color.setRGB(1, 0.92 + 0.08 * k, 0.55 + 0.4 * k);
      this.glowMesh.setColorAt(i, this.color);
      i++;
    }
    for (; i < MAX_GLOW; i++) {
      dummy.position.set(0, -40, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      this.glowMesh.setMatrixAt(i, dummy.matrix);
    }
    this.glowMesh.instanceMatrix.needsUpdate = true;
    if (this.glowMesh.instanceColor) this.glowMesh.instanceColor.needsUpdate = true;
  }

  private burst(gx: number, gy: number, n = 18) {
    const pos = this.spark.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.spark.geometry.attributes.color as THREE.BufferAttribute;
    const wx = worldX(gx, COLS);
    for (let i = 0; i < n; i++) {
      const idx = (this.particleAge + i) % pos.count;
      pos.setXYZ(idx, wx + (Math.random() - 0.5) * 0.7, gy + 0.2 + Math.random() * 0.7, 0.55 + Math.random() * 0.55);
      this.sparkVel[idx * 3] = (Math.random() - 0.5) * 3.2;
      this.sparkVel[idx * 3 + 1] = 1.8 + Math.random() * 3.4;
      this.sparkVel[idx * 3 + 2] = (Math.random() - 0.5) * 3.2;
      const c = new THREE.Color(RAINBOW[i % RAINBOW.length]!);
      col.setXYZ(idx, c.r, c.g, c.b);
    }
    this.particleAge = (this.particleAge + n) % pos.count;
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  private syncLocked() {
    const dummy = this.dummy;
    let i = 0;
    const spin = Math.floor(performance.now() * 0.014);
    for (const [k, cell] of this.sim.board) {
      if (i >= MAX_BLOCKS) break;
      const [x, y] = parseKey(k);
      dummy.position.set(worldX(x, COLS), y + PUFF_SIT, 0);
      const popping = this.sim.poppingOf(x, y);
      const pulse = popping ? 1.12 + Math.sin(performance.now() * 0.022) * 0.12 : 1;
      dummy.scale.set(
        (cell.thorn ? 0.86 : 1) * pulse,
        (cell.thorn ? 1.22 : cell.spring ? 1.08 : 1) * pulse,
        (cell.thorn ? 0.86 : 1) * pulse,
      );
      dummy.rotation.set(0, cell.thorn ? 0.4 : 0, cell.thorn ? 0.18 : 0);
      dummy.updateMatrix();
      this.locked.setMatrixAt(i, dummy.matrix);
      this.color.setHex(popping ? RAINBOW[(spin + i) % RAINBOW.length]! : cell.color);
      this.locked.setColorAt(i, this.color);
      i++;
    }
    for (; i < MAX_BLOCKS; i++) {
      dummy.position.set(0, -20, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      this.locked.setMatrixAt(i, dummy.matrix);
    }
    this.locked.count = MAX_BLOCKS;
    this.locked.instanceMatrix.needsUpdate = true;
    if (this.locked.instanceColor) this.locked.instanceColor.needsUpdate = true;
    this.syncStars(0);
  }

  private syncStars(dt: number) {
    const dummy = this.dummy;
    const spin = performance.now() * 0.003;
    const n = this.sim.stars.length;
    for (let i = 0; i < 4; i++) {
      if (i < n) {
        const s = this.sim.stars[i]!;
        const pulse = 1 + Math.sin(spin * 2 + i) * 0.12;
        dummy.position.set(worldX(s.x, COLS), s.y + 0.62 + Math.sin(spin + i) * 0.08, 0.35);
        dummy.scale.set(pulse, pulse, pulse);
        dummy.rotation.set(spin, spin * 1.3, 0.4);
      } else {
        dummy.position.set(0, -30, 0);
        dummy.scale.set(0, 0, 0);
        dummy.rotation.set(0, 0, 0);
      }
      dummy.updateMatrix();
      this.starMesh.setMatrixAt(i, dummy.matrix);
    }
    this.starMesh.instanceMatrix.needsUpdate = true;
    void dt;
  }

  private syncPath() {
    const hops = this.sim.mode === "over" ? [] : this.sim.peekPath();
    const dummy = this.dummy;
    const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.12;
    for (let i = 0; i < 24; i++) {
      if (i < hops.length) {
        const h = hops[i]!;
        dummy.position.set(worldX(h.x, COLS), h.y + 0.52, 0.12);
        dummy.scale.set(1, 1, 1);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.updateMatrix();
        this.pathMesh.setMatrixAt(i, dummy.matrix);
        this.color.setHex(i === hops.length - 1 ? 0xffe08a : 0xffd0e4);
        this.pathMesh.setColorAt(i, this.color);
      } else {
        dummy.position.set(0, -40, 0);
        dummy.scale.set(0, 0, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        this.pathMesh.setMatrixAt(i, dummy.matrix);
      }
    }
    this.pathMesh.instanceMatrix.needsUpdate = true;
    if (this.pathMesh.instanceColor) this.pathMesh.instanceColor.needsUpdate = true;

    const next = hops[0];
    if (next && this.sim.mode !== "over") {
      this.nextPad.visible = true;
      this.nextPad.position.set(worldX(next.x, COLS), next.y + 0.56, 0.14);
      this.nextPad.scale.set(pulse, pulse, 1);
    } else {
      this.nextPad.visible = false;
    }
  }

  private draw(dt: number) {
    const u = this.sim.unicorn;
    const wx = worldX(u.visX, COLS);
    this.squash += (1 - this.squash) * (1 - Math.exp(-12 * dt));
    const hop = this.sim.hopTo;
    if (hop) {
      const dir = hop.x - (this.sim.hopFrom?.x ?? hop.x);
      if (dir !== 0) this.facing = dir > 0 ? 1 : -1;
    }
    this.unicorn.position.set(wx, u.visY + (this.sim.occupy(Math.round(u.visX), Math.round(u.visY)) ? 0.48 : 0.14), 0.42);
    this.unicorn.scale.set(this.facing * 0.95, 0.95 * this.squash, 0.95 / this.squash);
    this.unicorn.rotation.y = this.facing > 0 ? 0.25 : -0.25;
    if (this.sim.mode === "over") {
      this.unicorn.visible = this.sim.fallY < 1.45;
      this.unicorn.rotation.z = Math.min(1.35, this.sim.fallY * 2.2);
    } else {
      this.unicorn.rotation.z = 0;
      this.unicorn.visible = this.sim.invuln <= 0 || Math.sin(performance.now() * 0.028) > 0;
    }

    this.blob.position.set(wx, u.visY + PUFF_SIT, 0.42);
    const crushing = this.sim.crushing();
    const crushStar = this.sim.crushingStar();
    const blobMat = this.blob.material as THREE.MeshBasicMaterial;
    blobMat.color.setHex(crushing ? 0xe07a93 : 0x3d2c3a);
    blobMat.opacity = crushing ? 0.38 : 0.12;

    const p = this.sim.active;
    if (p && this.sim.mode === "playing") {
      const ghostY = this.sim.ghostY();
      const cells = this.sim.cells(p);
      const gCells = cells.map(([x, y]) => [x, y - (p.y - ghostY)] as [number, number]);
      const danger = crushing || crushStar;
      for (let i = 0; i < 4; i++) {
        const [cx, cy] = cells[i]!;
        const mesh = this.activeMeshes[i]!;
        mesh.visible = true;
        mesh.position.set(worldX(cx, COLS), cy + PUFF_SIT, 0);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const base = p.thorn ? 0x8c4d5e : p.prism ? RAINBOW[i % RAINBOW.length]! : PIECE_COLORS[p.id];
        mat.color.setHex(danger ? 0xe07a93 : base);
        mat.emissive.setHex(danger ? 0xe07a93 : base);
        mat.emissiveIntensity = 0.42;
      }
      this.syncGhostDots(gCells, cells, danger, p);
    } else {
      for (let i = 0; i < 4; i++) this.activeMeshes[i]!.visible = false;
      this.hideInstanced(this.ghostDots, MAX_DOTS);
    }

    this.syncGlow(dt);
    if (this.sim.popping) {
      this.syncLocked();
      this.sparkAcc += dt;
      if (this.sparkAcc > 0.04) {
        this.sparkAcc = 0;
        for (const [x, y] of this.sim.popping.cells) this.burst(x, y, 10);
        if (this.sim.popping.t > 0.16) this.audio.sparkle();
      }
    }
    this.syncStars(dt);
    this.syncPath();

    const pieceY = p ? p.y : u.visY;
    let landY = p ? this.sim.ghostY() : u.visY;
    let landCell = landY;
    let pieceTop = pieceY;
    if (p) {
      const gy = this.sim.ghostY();
      for (const [, cy] of this.sim.cells(p)) {
        pieceTop = Math.max(pieceTop, cy);
        landCell = Math.min(landCell, cy - (p.y - gy));
      }
    }
    const padBelow = 2.8;
    let lo = Math.min(landCell, u.visY) - padBelow;
    if (landCell <= 6) lo = Math.min(lo, -1.8);
    const hi = Math.max(pieceTop + 2.4, u.visY + 3.2);
    const spanAll = Math.max(8.2, hi - lo);
    let wantY = (lo + hi) / 2;
    if (this.sim.mode === "over") {
      if (this.overCamY == null) this.overCamY = this.camY;
      wantY = this.overCamY;
    }
    this.camY += (wantY - this.camY) * (1 - Math.exp(-(this.reduced ? 8 : 3.2) * dt));
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const shake = this.reduced ? 0 : this.trauma * this.trauma;
    const ox = (Math.random() - 0.5) * shake * 0.35;
    const oy = (Math.random() - 0.5) * shake * 0.25;

    const aspect = Math.max(0.38, this.camera.aspect);
    const vFov = (this.camera.fov * Math.PI) / 180;
    const wellW = COLS + 3.4;
    const fitW = wellW / 2 / (Math.tan(vFov / 2) * aspect);
    const fitH = spanAll / 2 / Math.tan(vFov / 2);
    const wantDist = Math.max(fitW, fitH, 14.5);
    this.camDist += (wantDist - this.camDist) * (1 - Math.exp(-2.2 * dt));
    this.camera.position.set(ox, this.camY + 1.05 + oy, this.camDist);
    this.camera.lookAt(0, this.camY, 0);

    this.sky.position.y = this.camY;
    (this.sky.material as THREE.ShaderMaterial).uniforms.h.value = this.sim.height;
    this.rainbow.position.set(0, this.camY + 6.5, -11);
    this.clouds.position.y = this.camY * 0.15;
    this.well.position.y = Math.max(0, this.camY - 8);

    const mist = this.scene.getObjectByName("mist") as THREE.Mesh | undefined;
    if (mist) mist.position.set(0, this.sim.fogY - 4.2, 0);

    this.skyCol.copy(this.dawnCol).lerp(this.duskCol, Math.min(1, this.sim.height / 40));
    this.renderer.setClearColor(this.skyCol, 1);

    const spos = this.spark.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < spos.count; i++) {
      const y = spos.getY(i);
      if (y < -10) continue;
      spos.setXYZ(
        i,
        spos.getX(i) + this.sparkVel[i * 3]! * dt,
        y + this.sparkVel[i * 3 + 1]! * dt,
        spos.getZ(i) + this.sparkVel[i * 3 + 2]! * dt,
      );
      this.sparkVel[i * 3 + 1]! -= 6 * dt;
    }
    spos.needsUpdate = true;

    this.unicorn.rotation.x = Math.sin(performance.now() * 0.003) * 0.03;

    this.publishHeight();
  }

  private lastPub = 0;
  private publishHeight() {
    const now = performance.now();
    if (now - this.lastPub < 80) return;
    this.lastPub = now;
    this.publishProbe();
    if (this.sim.mode === "playing" || this.sim.mode === "paused") {
      useGameUI.getState().patch({
        height: this.sim.height,
        combo: this.sim.combo,
        hearts: this.sim.hearts,
        toast: this.sim.toast,
        sleepy: this.sim.sleepy,
        windDir: this.sim.windDir,
        windWarn: this.sim.windWarn > 0,
        crushing: this.sim.crushing(),
        stars: this.sim.starGot,
        order: this.sim.order ? { ...this.sim.order } : null,
      });
    }
  }

  private publishProbe() {
    const sim = this.sim;
    const game = this;
    (window as unknown as { __nimbo?: object }).__nimbo = {
      get mode() {
        return sim.mode;
      },
      get height() {
        return sim.height;
      },
      get unicorn() {
        return { ...sim.unicorn };
      },
      get fogY() {
        return sim.fogY;
      },
      get pieceX() {
        return sim.active?.x ?? null;
      },
      get pieceId() {
        return sim.active?.id ?? null;
      },
      get pieceRot() {
        return sim.active?.rot ?? null;
      },
      get ghostY() {
        return sim.active ? sim.ghostY() : null;
      },
      get cols() {
        return COLS;
      },
      get hearts() {
        return sim.hearts;
      },
      get crushing() {
        return sim.crushing();
      },
      get stars() {
        return sim.stars.length;
      },
      get starGot() {
        return sim.starGot;
      },
      get order() {
        return sim.order;
      },
      get path() {
        return sim.peekPath();
      },
      get fallY() {
        return sim.fallY;
      },
      get camDist() {
        return game.camDist;
      },
      get pendingClear() {
        return sim.previewClear();
      },
      get popping() {
        return sim.popping?.cells.length ?? 0;
      },
      get match() {
        return MATCH;
      },
      get colors() {
        return [...sim.board.values()].map((c) => c.color);
      },
      popFive: () => {
        const color = PIECE_COLORS.I;
        for (let x = 2; x < 7; x++) {
          sim.board.set(`${x},1`, { color, prism: false, thorn: false, spring: false });
        }
        (sim as unknown as { beginPop: () => boolean }).beginPop();
        game.syncLocked();
      },
      get boardN() {
        return sim.board.size;
      },
      move: (dx: number) => sim.move(dx),
      rotate: (dir: 1 | -1) => sim.rotate(dir),
      drop: () => game.api().hardDrop(),
    };
  }

  private publish() {
    const ui = useGameUI.getState();
    ui.patch({
      mode: this.sim.mode,
      height: this.sim.height,
      combo: this.sim.combo,
      next: this.sim.nextPreview(),
      hearts: this.sim.hearts,
      toast: this.sim.toast,
      sleepy: this.sim.sleepy,
      windDir: this.sim.windDir,
      windWarn: this.sim.windWarn > 0,
      crushing: this.sim.crushing(),
      stars: this.sim.starGot,
      order: this.sim.order ? { ...this.sim.order } : null,
    });
    this.publishProbe();
  }

  private bind() {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.repeat) return;
      const c = e.code;
      const gameKeys = new Set([
        "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp",
        "KeyA", "KeyD", "KeyS", "KeyW", "KeyZ", "KeyX", "Space", "KeyP", "Escape", "KeyM",
      ]);
      if (gameKeys.has(c)) e.preventDefault();
      if (down) this.keys.add(c);
      else this.keys.delete(c);

      if (!down) {
        if (c === "ArrowLeft" || c === "KeyA") this.hold.left = false;
        if (c === "ArrowRight" || c === "KeyD") this.hold.right = false;
        if (c === "ArrowDown" || c === "KeyS") this.hold.soft = false;
        return;
      }

      if (c === "KeyM") {
        const muted = !useGameUI.getState().muted;
        this.api().setMuted(muted);
        return;
      }
      if (c === "KeyP" || c === "Escape") {
        if (this.sim.mode === "playing") this.pause();
        else if (this.sim.mode === "paused") this.resume();
        return;
      }
      if (this.sim.mode === "title" && (c === "Space" || c === "Enter")) {
        this.play();
        return;
      }
      if (this.sim.mode === "over" && (c === "Space" || c === "Enter")) {
        this.play();
        return;
      }
      if (this.sim.mode !== "playing") return;

      if (c === "ArrowLeft" || c === "KeyA") {
        this.hold.left = true;
        this.sim.move(-1);
        this.das = 0.11;
        this.dasDir = -1;
        this.audio.blip("move");
      } else if (c === "ArrowRight" || c === "KeyD") {
        this.hold.right = true;
        this.sim.move(1);
        this.das = 0.11;
        this.dasDir = 1;
        this.audio.blip("move");
      } else if (c === "ArrowDown" || c === "KeyS") {
        this.hold.soft = true;
      } else if (c === "ArrowUp" || c === "KeyW" || c === "KeyX") {
        if (this.sim.rotate(1)) this.audio.blip("rotate");
      } else if (c === "KeyZ" || c === "KeyQ") {
        if (this.sim.rotate(-1)) this.audio.blip("rotate");
      } else if (c === "Space") {
        this.api().hardDrop();
      }
    };

    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    const blur = () => {
      this.keys.clear();
      this.hold.left = this.hold.right = this.hold.soft = false;
    };
    const vis = () => {
      if (document.visibilityState === "visible") this.audio.resume();
    };
    const rs = () => this.resize();

    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("resize", rs);

    let px = 0;
    let py = 0;
    let pid = -1;
    const pd = (e: PointerEvent) => {
      if (e.target !== this.canvas) return;
      pid = e.pointerId;
      px = e.clientX;
      py = e.clientY;
    };
    const pu = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      pid = -1;
      if (this.sim.mode !== "playing") return;
      const dx = e.clientX - px;
      const dy = e.clientY - py;
      if (Math.hypot(dx, dy) < 18) {
        if (this.sim.rotate(1)) this.audio.blip("rotate");
      } else if (Math.abs(dx) > Math.abs(dy)) {
        const dir = dx > 0 ? 1 : -1;
        this.sim.move(dir);
        this.audio.blip("move");
      } else if (dy > 28) {
        this.api().hardDrop();
      }
    };
    this.canvas.addEventListener("pointerdown", pd);
    this.canvas.addEventListener("pointerup", pu);
    this.canvas.addEventListener("pointercancel", pu);

    this.unsub.push(() => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("resize", rs);
      this.canvas.removeEventListener("pointerdown", pd);
      this.canvas.removeEventListener("pointerup", pu);
      this.canvas.removeEventListener("pointercancel", pu);
    });
  }

  private pollGamepad() {
    const pads = navigator.getGamepads?.() ?? [];
    const p = pads[0];
    if (!p || this.sim.mode !== "playing") return;
    const ax = p.axes[0] ?? 0;
    const left = ax < -0.45 || p.buttons[14]?.pressed;
    const right = ax > 0.45 || p.buttons[15]?.pressed;
    this.hold.left = !!left;
    this.hold.right = !!right;
    this.hold.soft = !!(p.buttons[13]?.pressed || (p.axes[1] ?? 0) > 0.5);
    if (p.buttons[0]?.pressed && !this.keys.has("gpA")) {
      this.keys.add("gpA");
      this.api().hardDrop();
    }
    if (!p.buttons[0]?.pressed) this.keys.delete("gpA");
    if (p.buttons[1]?.pressed && !this.keys.has("gpB")) {
      this.keys.add("gpB");
      if (this.sim.rotate(1)) this.audio.blip("rotate");
    }
    if (!p.buttons[1]?.pressed) this.keys.delete("gpB");
  }

  private resize() {
    const parent = this.canvas.parentElement;
    const w = Math.max(1, parent?.clientWidth || this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, parent?.clientHeight || this.canvas.clientHeight || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio, window.innerWidth < 520 ? 1.4 : 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.72 ? 62 : w / h < 1.05 ? 50 : 42;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.unsub.forEach((fn) => fn());
    useGameUI.getState().setApi(null);
    this.audio.dispose();
    this.puffGeo.dispose();
    this.puffMat.dispose();
    this.starGeo.dispose();
    this.dotGeo.dispose();
    (this.ghostDots.material as THREE.Material).dispose();
    (this.glowMesh.material as THREE.Material).dispose();
    this.pathMesh.geometry.dispose();
    (this.pathMesh.material as THREE.Material).dispose();
    this.nextPad.geometry.dispose();
    (this.nextPad.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
