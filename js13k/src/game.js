(() => {
  // Nimbo — js13k 2026. W-style WebGL2 (xem/W, public domain): cubes, spheres,
  // pyramids, groups, camera, dFdx lighting. Same trick as Clawnicorn.
  const COLS = 10;
  const STRIDE = 16;
  const M = Math;
  const IDS = [0, 1, 2, 3, 4, 5, 6];
  const PAL = [
    [0.11, 0.94, 0.7],
    [1, 0.82, 0],
    [0.71, 0.29, 1],
    [1, 0.31, 0.07],
    [1, 0.14, 0.41],
    [0.1, 0.56, 1],
    [1, 0.24, 0.68],
  ];
  const RB = [
    [1, 0.55, 0.65],
    [1, 0.7, 0.54],
    [1, 0.88, 0.54],
    [0.66, 0.9, 0.81],
    [0.62, 0.84, 0.96],
    [0.77, 0.71, 0.95],
    [0.95, 0.65, 0.88],
  ];
  const SH = [
    [[[0, 2], [1, 2], [2, 2], [3, 2]], [[2, 0], [2, 1], [2, 2], [2, 3]], [[0, 1], [1, 1], [2, 1], [3, 1]], [[1, 0], [1, 1], [1, 2], [1, 3]]],
    [[[1, 1], [2, 1], [1, 2], [2, 2]], [[1, 1], [2, 1], [1, 2], [2, 2]], [[1, 1], [2, 1], [1, 2], [2, 2]], [[1, 1], [2, 1], [1, 2], [2, 2]]],
    [[[1, 2], [0, 1], [1, 1], [2, 1]], [[1, 2], [1, 1], [2, 1], [1, 0]], [[0, 1], [1, 1], [2, 1], [1, 0]], [[1, 2], [0, 1], [1, 1], [1, 0]]],
    [[[1, 2], [2, 2], [0, 1], [1, 1]], [[1, 2], [1, 1], [2, 1], [2, 0]], [[1, 1], [2, 1], [0, 0], [1, 0]], [[0, 2], [0, 1], [1, 1], [1, 0]]],
    [[[0, 2], [1, 2], [1, 1], [2, 1]], [[2, 2], [1, 1], [2, 1], [1, 0]], [[0, 1], [1, 1], [1, 0], [2, 0]], [[1, 2], [0, 1], [1, 1], [0, 0]]],
    [[[0, 2], [0, 1], [1, 1], [2, 1]], [[1, 2], [2, 2], [1, 1], [1, 0]], [[0, 1], [1, 1], [2, 1], [2, 0]], [[1, 2], [1, 1], [0, 0], [1, 0]]],
    [[[2, 2], [0, 1], [1, 1], [2, 1]], [[1, 2], [1, 1], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1], [0, 0]], [[0, 2], [1, 2], [1, 1], [1, 0]]],
  ];
  const KICKS = [[0, 0], [-1, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, 1], [-1, -1], [1, -1]];
  const CREAM = [1, 0.97, 0.93];
  const ROSE = [0.88, 0.48, 0.58];
  const GOLD = [1, 0.82, 0.36];
  const INK = [0.24, 0.17, 0.23];
  const MINT = [0.57, 0.87, 0.88];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  const canvas = $("c");

  const models = {};
  const nodes = {};
  let projection, ambient = 0.8, objectCount = 0;
  let positionLocation, colorLocation, pvLocation, modelLocation, lightLocation, ambientLocation;

  const col = (value) => {
    if (value && typeof value[0] === "number") return [value[0], value[1], value[2], 1];
    const short = value.length < 5;
    return [...value.replace("#", "").match(short ? /./g : /../g).map((p) => +("0x" + p) / (short ? 15 : 255)), 1];
  };
  const matrix = (node) => new DOMMatrix()
    .translateSelf(node.x || 0, node.y || 0, node.z || 0)
    .rotateSelf(node.rx || 0, node.ry || 0, node.rz || 0)
    .scaleSelf(node.w ?? 1, node.h ?? 1, node.d ?? 1);
  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
    return s;
  }
  function bufferModel(model) {
    if (model.verticesBuffer) return;
    const gl = W.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, model.verticesBuffer = gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
    if (model.indices) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indicesBuffer = gl.createBuffer());
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.indices), gl.STATIC_DRAW);
    }
  }
  function setState(settings, type) {
    const name = settings.n ||= "o" + objectCount++;
    if (settings.size) settings.w = settings.h = settings.d = settings.size;
    const old = nodes[name];
    const node = nodes[name] = { ...old, ...settings, n: name, type: type || old && old.type };
    if (settings.b) node.k = undefined;
    if (settings.fov) {
      const f = 1 / M.tan(settings.fov * M.PI / 360);
      projection = new DOMMatrix([
        f / (W.canvas.width / W.canvas.height), 0, 0, 0, 0, f, 0, 0,
        0, 0, -1001 / 999, -1, 0, 0, -2002 / 999, 0,
      ]);
    }
    const model = node.type && models[node.type];
    if (model) bufferModel(model);
  }
  function makeSphere() {
    const vertices = [], indices = [], precision = 8;
    for (let j = 0; j <= precision; j++) {
      const aj = j * M.PI / precision;
      for (let i = 0; i <= precision; i++) {
        const ai = 2 * i * M.PI / precision;
        vertices.push(M.sin(ai) * M.sin(aj) / 2, M.cos(aj) / 2, M.cos(ai) * M.sin(aj) / 2);
        if (i < precision && j < precision) {
          const a = j * (precision + 1) + i, b = a + precision + 1;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    }
    return { vertices, indices };
  }
  function makeCloud() {
    const model = makeSphere();
    model.vertices = model.vertices.map(v => M.sign(v) * M.pow(M.abs(v * 2), 0.32) * 0.5);
    return model;
  }
  function renderW() {
    const gl = W.gl, camera = nodes.camera, light = nodes.light;
    if (!camera || !light) return;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const view = matrix(camera).invertSelf().preMultiplySelf(projection);
    gl.uniformMatrix4fv(pvLocation, false, view.toFloat32Array());
    gl.uniform3f(lightLocation, light.x || 0, light.y || 0, light.z || 0);
    gl.uniform1f(ambientLocation, ambient);
    let last;
    for (const name in nodes) {
      const node = nodes[name];
      if (node.y < -80) continue;
      node.m = matrix(node);
      if (node.g && nodes[node.g] && nodes[node.g].m) node.m.preMultiplySelf(nodes[node.g].m);
      const model = node.type && models[node.type];
      if (!model) continue;
      gl.uniformMatrix4fv(modelLocation, false, node.m.toFloat32Array());
      if (model !== last) {
        last = model;
        gl.bindBuffer(gl.ARRAY_BUFFER, model.verticesBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        if (model.indices) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indicesBuffer);
      }
      gl.vertexAttrib4fv(colorLocation, node.k ||= col(node.b || [0.8, 0.8, 0.8]));
      if (model.indices) gl.drawElements(gl.TRIANGLES, model.indices.length, gl.UNSIGNED_SHORT, 0);
      else gl.drawArrays(gl.TRIANGLES, 0, model.vertices.length / 3);
    }
  }
  const W = {
    canvas,
    gl: null,
    reset() {
      W.canvas = canvas;
      const gl = W.gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
      if (!gl) {
        document.body.textContent = "WebGL2 required";
        return;
      }
      models.cube = { vertices: [
        -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
        0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
        -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
        -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
        -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,
      ] };
      models.pyramid = { vertices: [
        -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0, 0.5, 0, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0, 0.5, 0,
        0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0, 0.5, 0, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, 0, 0.5, 0,
        0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5,
      ] };
      models.sphere = makeSphere();
      models.cloud = makeCloud();
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER,
        "#version 300 es\nprecision highp float;in vec4 p,c;uniform mat4 v,m;out vec4 q,k;void main(){gl_Position=v*(q=m*p);k=c;}"));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER,
        "#version 300 es\nprecision highp float;in vec4 q,k;uniform vec3 l;uniform float a;out vec4 o;void main(){o=vec4(k.rgb*(max(0.,dot(l,-normalize(cross(dFdx(q.xyz),dFdy(q.xyz)))))*.36+a),k.a);}"));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      positionLocation = gl.getAttribLocation(program, "p");
      colorLocation = gl.getAttribLocation(program, "c");
      gl.enableVertexAttribArray(positionLocation);
      pvLocation = gl.getUniformLocation(program, "v");
      modelLocation = gl.getUniformLocation(program, "m");
      lightLocation = gl.getUniformLocation(program, "l");
      ambientLocation = gl.getUniformLocation(program, "a");
      gl.enable(gl.CULL_FACE);
      gl.enable(gl.DEPTH_TEST);
      W.clearColor([0.96, 0.79, 0.87]);
      W.light({ x: -0.45, y: -0.82, z: -0.38 });
      W.camera({ fov: 38 });
    },
    clearColor(v) { W.gl.clearColor(...col(v)); },
    ambient(v) { ambient = v; },
    group(s) { setState(s, "group"); },
    cube(s) { setState(s, "cube"); },
    pyramid(s) { setState(s, "pyramid"); },
    sphere(s) { setState(s, "sphere"); },
    cloud(s) { setState(s, "cloud"); },
    camera(s) { s.n = "camera"; setState(s, "camera"); },
    light(s) { s.n = "light"; setState(s, "light"); },
    move(s) { setState(s); },
    render: renderW,
  };

  let camY = 4, last = 0, acc = 0, trauma = 0, facing = 1, squash = 1;
  let mode = "title", muted = 0, best = 0, celebration = 0, frameTime = 0;
  try {
    best = M.max(0, +localStorage.getItem("nimbo-best-v1") || 0);
    if (!Number.isFinite(best)) best = 0;
    muted = localStorage.getItem('nimbo-muted-v1') === '1';
  } catch (e) { /* Storage is optional. */ }

  const hold = { l: 0, r: 0, s: 0 };
  let das = 0, dasDir = 0;
  const keys = {};
  let AC, master, music, sfx, nextNote = 0, step = 0, pad;
  let sparks = [];
  let sparkT = 0;

  function k(x, y) { return x + y * STRIDE; }
  function kx(key) { return +key % STRIDE; }
  function ky(key) { return (+key / STRIDE) | 0; }
  function cells(id, rot, x, y) { return SH[id][rot].map(([cx, cy]) => [cx + x, cy + y]); }
  function wx(x) { return x - (COLS - 1) / 2; }

  function reset(kind) {
    const st = {
      board: {}, active: null, bag: [], queue: [], placed: 0,
      uni: { x: 1, y: 0, vx: 1, vy: 0, max: 0 },
      path: [], hopF: null, hopT: null, hopA: 0, hopD: 0.34, idle: 0,
      fog: -5.5, combo: 0, height: 0, fallT: 0, lockT: 0, lockN: 0, fallY: 0,
      pop: null, popT: 0, lockBefore: 0, popChain: 0, falling: false, fallSpeed: 0,
    };
    if (kind === "title") {
      const stairs = [[1, 0, 5], [2, 0, 5], [2, 1, 2], [3, 1, 2], [3, 2, 3], [4, 2, 3], [4, 3, 6], [5, 3, 6], [5, 4, 0], [4, 5, 4], [3, 5, 4], [3, 6, 2], [2, 7, 5], [2, 8, 0], [3, 9, 1], [4, 9, 1], [4, 10, 6]];
      for (const [x, y, id] of stairs) st.board[k(x, y)] = y > 6 ? RB[y % 7] : PAL[id];
      st.uni = { x: 1, y: 0, vx: 1, vy: 0, max: 0 };
      repath(st);
      mode = "title";
    } else {
      mode = "playing";
      fillQ(st);
      spawn(st);
    }
    return st;
  }

  function fillQ(st) {
    while (st.queue.length < 5) {
      if (!st.bag.length) {
        st.bag = IDS.slice();
        st.prismIndex = M.random() * 7 | 0;
        for (let i = 6; i > 0; i--) { const j = M.random() * (i + 1) | 0; const t = st.bag[i]; st.bag[i] = st.bag[j]; st.bag[j] = t; }
      }
      st.queue.push({ id: st.bag.pop(), prism: st.bag.length === st.prismIndex });
    }
  }

  function maxY(st) {
    let m = 0;
    for (const key in st.board) { const y = ky(key); if (y > m) m = y; }
    return m;
  }

  function fits(st, id, rot, x, y) {
    for (const [cx, cy] of cells(id, rot, x, y)) {
      if (cx < 0 || cx >= COLS || cy < 0 || st.board[k(cx, cy)]) return 0;
    }
    return 1;
  }

  function spawn(st) {
    fillQ(st);
    const n = st.queue.shift();
    fillQ(st);
    const p = { id: n.id, x: [3, 0, 6, 1, 5, 0, 6][st.placed++ % 7], y: maxY(st) + 4, rot: 0, prism: n.prism };
    if (!fits(st, p.id, p.rot, p.x, p.y)) p.y += 2;
    st.active = p;
    st.fallT = st.lockT = st.lockN = 0;
  }

  function ghostY(st) {
    const p = st.active;
    if (!p) return 0;
    let y = p.y;
    while (fits(st, p.id, p.rot, p.x, y - 1)) y--;
    return y;
  }

  // Nimbo is a rider, not a solid obstacle. If a falling piece reaches her
  // cell, lift the piece until its footprint is safely above her before lock.
  // Existing cloud cells remain solid through fits(), so this cannot overwrite
  // the support she is standing on.
  function liftAboveUnicorn(st, p) {
    const ux = M.round(st.uni.x), uy = st.uni.y;
    let guard = 0;
    while (guard++ < 8 && cells(p.id, p.rot, p.x, p.y).some(([x, y]) => x === ux && y <= uy)) p.y++;
    return fits(st, p.id, p.rot, p.x, p.y);
  }

  function move(dx) {
    if (mode !== "playing" || !S.active) return;
    const p = S.active;
    if (!fits(S, p.id, p.rot, p.x + dx, p.y)) return;
    p.x += dx;
    onShift();
    blip("m");
  }

  function rotate(dir) {
    if (mode !== "playing" || !S.active) return;
    const p = S.active;
    const to = (p.rot + dir + 4) % 4;
    for (const [kx, ky] of KICKS) {
      if (fits(S, p.id, to, p.x + kx, p.y + ky)) {
        p.x += kx; p.y += ky; p.rot = to;
        onShift();
        blip("r");
        return;
      }
    }
  }

  function hard() {
    if (mode !== "playing" || !S.active) return;
    while (fits(S, S.active.id, S.active.rot, S.active.x, S.active.y - 1)) S.active.y--;
    liftAboveUnicorn(S, S.active);
    blip("h");
    trauma = M.min(1, trauma + 0.28);
    lock();
  }

  function onShift() {
    const p = S.active;
    if (!p) return;
    if (!fits(S, p.id, p.rot, p.x, p.y - 1)) {
      S.lockT = 0;
      S.lockN = M.min(S.lockN + 1, 15);
    }
  }

  function lock() {
    const p = S.active;
    if (!p) return;
    const before = reachable(S).best.y;
    const cs = cells(p.id, p.rot, p.x, p.y);
    cs.forEach(([x, y], i) => { S.board[k(x, y)] = p.prism ? RB[i % 7] : PAL[p.id]; });
    if (p.prism) { S.fog -= 2.4; celebration = 1.8; blip("p"); }
    blip("l");
    trauma = M.min(1, trauma + 0.22);
    S.active = null;
    S.lockBefore = before;
    S.popChain = 0;
    const ks = findKills(S);
    if (ks.length) {
      startPop(ks);
      return;
    }
    afterLock(before);
  }

  function startPop(ks) {
    S.pop = ks;
    S.popT = 0.52;
    S.popChain++;
    ks.forEach((key) => boom(kx(key), ky(key), 7));
    blip("k");
  }

  function afterLock(before) {
    repath(S);
    const after = reachable(S).best.y;
    if (after > before || S.popChain) { S.combo++; blip("c"); } else S.combo = 0;
    S.popChain = 0;
    spawn(S);
    hud();
  }

  function same(a, b) {
    return a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }

  function findKills(st, extra) {
    const col = (x, y) => (extra && extra[k(x, y)]) || st.board[k(x, y)];
    const kill = {};
    let max = 0;
    for (const key in st.board) { const y = ky(key); if (y > max) max = y; }
    if (extra) for (const key in extra) { const y = ky(key); if (y > max) max = y; }
    for (let y = 0; y <= max; y++) {
      let run = 1;
      for (let x = 1; x < COLS; x++) {
        if (same(col(x - 1, y), col(x, y))) run++; else run = 1;
        if (run >= 5) for (let i = 0; i < run; i++) kill[k(x - i, y)] = 1;
      }
      let filled = 0;
      for (let x = 0; x < COLS; x++) if (col(x, y)) filled++;
      if (filled === COLS) for (let x = 0; x < COLS; x++) kill[k(x, y)] = 1;
    }
    for (let x = 0; x < COLS; x++) {
      let run = 1;
      for (let y = 1; y <= max; y++) {
        if (same(col(x, y - 1), col(x, y))) run++; else run = 1;
        if (run >= 5) for (let i = 0; i < run; i++) kill[k(x, y - i)] = 1;
      }
    }
    return Object.keys(kill);
  }

  function grav(st) {
    const max = maxY(st), floor = M.max(0, st.fog - 2 | 0);
    for (let x = 0; x < COLS; x++) {
      for (let y = floor; y <= max; y++) {
        const key = k(x, y);
        const c = st.board[key];
        if (!c) continue;
        let ny = y;
        while (ny > floor && !st.board[k(x, ny - 1)]) ny--;
        if (ny === y) continue;
        delete st.board[key];
        st.board[k(x, ny)] = c;
      }
    }
    beginFall(st);
  }

  // Clouds can disappear during a hop. Fall where Nimbo actually is,
  // never teleport to the nearest (possibly unreachable) cloud.
  function beginFall(st) {
    st.path = [];
    st.hopF = st.hopT = null;
    st.falling = true;
    st.fallSpeed = 0;
    st.uni.x = M.max(0, M.min(COLS - 1, M.round(st.uni.vx)));
  }

  function boom(gx, gy, n) {
    if (reduced) return;
    for (let i = 0; i < n; i++) {
      if (sparks.length >= 96) sparks.shift();
      sparks.push({
        x: wx(gx) + (M.random() - 0.5) * 0.55,
        y: gy + 0.35,
        vx: (M.random() - 0.5) * 3.4,
        vy: 1.6 + M.random() * 3.2,
        c: RB[i % 7],
        t: 0.55,
      });
    }
  }

  function tickPop(dt) {
    if (!S.pop) return 1;
    S.popT -= dt;
    sparkT += dt;
    if (sparkT > 0.05) {
      sparkT = 0;
      S.pop.forEach((key) => boom(kx(key), ky(key), 2));
    }
    if (S.popT > 0) return 1;
    S.pop.forEach((key) => delete S.board[key]);
    S.pop = null;
    S.fog -= 1.4;
    blip("v");
    grav(S);
    repath(S);
    const more = findKills(S);
    if (more.length) { startPop(more); return 1; }
    afterLock(S.lockBefore);
    return 1;
  }

  function occupy(st, x, y) { return st.board[k(x, y)]; }
  function walk(st, x, y) { return y === 0 || occupy(st, x, y); }

  function reachable(st) {
    const start = k(st.uni.x, st.uni.y);
    const parent = {}, seen = { [start]: 1 }, q = [[st.uni.x, st.uni.y]];
    let bestC = q[0], qi = 0;
    while (qi < q.length) {
      const [x, y] = q[qi++];
      if (y > bestC[1] || (y === bestC[1] && M.abs(x - 4.5) < M.abs(bestC[0] - 4.5))) bestC = [x, y];
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 2; dy++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= COLS || ny < 0) continue;
        const kk = k(nx, ny);
        if (seen[kk] || !walk(st, nx, ny)) continue;
        seen[kk] = 1; parent[kk] = k(x, y); q.push([nx, ny]);
      }
    }
    return { best: { x: bestC[0], y: bestC[1] }, parent };
  }

  function repath(st) {
    if (st.falling || st.hopT) { st.path = []; return; }
    if (!walk(st, st.uni.x, st.uni.y)) {
      beginFall(st); return;
    }
    const { best: b, parent } = reachable(st);
    const hops = [];
    let cur = k(b.x, b.y), start = k(st.uni.x, st.uni.y);
    while (cur !== start) {
      hops.push({ x: kx(cur), y: ky(cur) });
      if (parent[cur] == null) break;
      cur = parent[cur];
    }
    hops.reverse();
    st.path = hops;
  }

  function tick(dt) {
    if (mode === "paused") return;
    if (mode === "over") {
      S.fallY += dt;
      S.uni.vy -= dt * 7;
      S.uni.vx += M.sin(S.fallY * 6) * dt * 1.4;
      return;
    }
    if (mode === "playing") {
      if (S.pop) tickPop(dt);
      else tickPiece(dt);
      S.fog += (0.15 + S.height * 0.0045) * dt;
      if (S.fog > S.uni.vy - 0.15) { die(); return; }
    }
    tickUni(dt);
    const cut = S.fog - 2 | 0;
    if (cut >= 0) for (const key in S.board) if (ky(key) < cut) delete S.board[key];
  }

  function tickPiece(dt) {
    const p = S.active;
    if (!p) return;
    const iv = hold.s ? 0.045 : M.max(0.3, 0.92 - S.height * 0.014);
    S.fallT += dt;
    while (S.fallT >= iv) {
      S.fallT -= iv;
      if (fits(S, p.id, p.rot, p.x, p.y - 1)) { p.y--; S.lockT = 0; }
      else break;
    }
    if (!fits(S, p.id, p.rot, p.x, p.y - 1)) {
      S.lockT += dt;
      if (S.lockT >= 0.5 || S.lockN >= 15) { liftAboveUnicorn(S, p); lock(); }
    } else S.lockT = 0;
  }

  function tickUni(dt) {
    if (S.pop) return;
    if (S.falling) {
      const u = S.uni;
      let floor = 0;
      for (const key in S.board) {
        const y = ky(key);
        if (kx(key) === u.x && y <= u.vy + 0.05 && y > floor) floor = y;
      }
      S.fallSpeed += dt * 12;
      u.vy = M.max(floor, u.vy - S.fallSpeed * dt);
      u.vx += (u.x - u.vx) * M.min(1, dt * 10);
      if (u.vy <= floor) {
        u.y = floor; u.vx = u.x; S.falling = false;
        squash = 0.82; boom(u.x, u.y, 5); repath(S);
      }
      return;
    }
    if (S.hopT) {
      if (!walk(S, S.hopT.x, S.hopT.y)) { beginFall(S); return; }
      S.hopA += dt;
      const t = M.min(1, S.hopA / S.hopD), a = 1 - (1 - t) * (1 - t);
      const f = S.hopF, to = S.hopT;
      S.uni.vx = f.x + (to.x - f.x) * a;
      S.uni.vy = f.y + (to.y - f.y) * a + M.sin(t * M.PI) * 0.72;
      if (t >= 1) {
        S.uni.x = to.x; S.uni.y = to.y; S.uni.vx = to.x; S.uni.vy = to.y;
        S.hopF = S.hopT = null;
        squash = 0.72;
        blip("n");
        boom(to.x, to.y, 5);
        if (to.y > S.uni.max) {
          if ((to.y / 10 | 0) > (S.height / 10 | 0)) {
            celebration = 3; blip('k');
            $('message').textContent = (to.y / 10 | 0) * 10 + ' m · A little closer to the stars';
          }
          S.uni.max = to.y; S.height = to.y; hud();
        }
        repath(S);
      }
      return;
    }
    if (S.path.length) {
      const n = S.path.shift();
      if (!walk(S, n.x, n.y) || M.abs(n.x - S.uni.x) > 1 || n.y - S.uni.y > 2 || S.uni.y - n.y > 1) { repath(S); return; }
      S.hopF = { x: S.uni.x, y: S.uni.y };
      S.hopT = n;
      S.hopA = 0;
      S.hopD = 0.28 + M.abs(n.y - S.uni.y) * 0.05;
      if (n.x !== S.uni.x) facing = n.x > S.uni.x ? 1 : -1;
      blip("j");
      return;
    }
    S.idle += dt;
    S.uni.vy = S.uni.y + M.sin(S.idle * 2.2) * 0.04;
    if (mode === "title" && S.idle > 2.8) {
      S.uni.x = 1; S.uni.y = 0; S.uni.vx = 1; S.uni.vy = 0;
      repath(S); S.idle = 0;
    }
  }

  function die() {
    mode = "over";
    releaseInputs();
    S.active = null;
    blip("o");
    best = M.max(best, S.height);
    try { localStorage.setItem("nimbo-best-v1", "" + best); } catch (e) { /* ignore */ }
    $("oh").textContent = S.height;
    $("ob").textContent = S.height >= best && S.height > 0 ? "A new personal best!" : "Best climb: " + best + " m";
    show("over", 1); show("hud", 0); show("pad", 0); show("pauseBtn", 0);
  }

  function play() {
    releaseInputs(); sparks = []; celebration = 0; acc = 0;
    $('message').textContent = '';
    unlock();
    blip("s");
    Object.assign(S, reset("play"));
    camY = 3; trauma = 0; squash = 1; facing = 1;
    show("title", 0); show("over", 0); show("pause", 0);
    show("hud", 1); show("pad", innerWidth < 800); show("pauseBtn", 1);
    hud();
  }

  function pause() {
    if (mode !== "playing") return;
    mode = "paused";
    releaseInputs();
    if (AC) AC.suspend();
    show("pause", 1);
  }

  function resume() {
    if (mode !== "paused") return;
    mode = "playing";
    unlock();
    show("pause", 0);
  }

  function hud() {
    $("alt").textContent = S.height;
    $("bst").textContent = "BEST " + best + " m";
    $("cmb").style.display = S.combo > 1 ? "block" : "none";
    $("cmb").textContent = "×" + S.combo;
    $('nxt').innerHTML = S.queue.slice(0, 3).map(q => '<span class="mini" aria-label="' + 'IOTSZJL'[q.id] + (q.prism ? ' rainbow' : '') + ' piece">' + SH[q.id][0].map(([x,y], i) => '<i style="grid-column:' + (x + 1) + ';grid-row:' + (3-y) + ';background:rgb(' + (q.prism ? RB[i] : PAL[q.id]).map(v => v * 255 | 0).join(',') + ')"></i>').join('') + '</span>').join('');
  }

  function releaseInputs() {
    hold.l = hold.r = hold.s = das = dasDir = 0;
    for (const key in keys) delete keys[key];
  }

  function show(id, on) {
    const flex = { pad: 1, hud: 1, title: 1, over: 1, pause: 1 };
    $(id).style.display = on ? (flex[id] ? "flex" : "block") : "none";
  }

  function onKey(e, down) {
    const c = e.code;
    if (/Arrow|Space|Key[ADSWZXPMQ]|Escape|Enter/.test(c)) e.preventDefault();
    if (down && (e.repeat || keys[c])) return;
    keys[c] = down;
    if (!down) {
      if (c === "ArrowLeft" || c === "KeyA") hold.l = 0;
      if (c === "ArrowRight" || c === "KeyD") hold.r = 0;
      if (c === "ArrowDown" || c === "KeyS") hold.s = 0;
      return;
    }
    if (c === "KeyM") return toggleMute();
    if (c === "KeyP" || c === "Escape") {
      if (mode === "playing") pause();
      else if (mode === "paused") resume();
      return;
    }
    if ((mode === "title" || mode === "over") && (c === "Space" || c === "Enter")) return play();
    if (mode !== "playing") return;
    if (c === "ArrowLeft" || c === "KeyA") { hold.l = 1; das = 0.15; dasDir = -1; move(-1); }
    else if (c === "ArrowRight" || c === "KeyD") { hold.r = 1; das = 0.15; dasDir = 1; move(1); }
    else if (c === "ArrowUp" || c === "KeyW" || c === "KeyX") rotate(1);
    else if (c === "KeyZ" || c === "KeyQ") rotate(-1);
    else if (c === "Space") hard();
    else if (c === "ArrowDown" || c === "KeyS") hold.s = 1;
  }

  function stepDas(dt) {
    if (mode !== "playing") return;
    if (hold.l && !hold.r) {
      if (dasDir !== -1) { dasDir = -1; das = 0.15; }
      else { das -= dt; if (das <= 0) { move(-1); das = 0.048; } }
    } else if (hold.r && !hold.l) {
      if (dasDir !== 1) { dasDir = 1; das = 0.15; }
      else { das -= dt; if (das <= 0) { move(1); das = 0.048; } }
    } else dasDir = 0;
  }

  function bindPad() {
    const holdBtn = (id, fnOn, fnOff) => {
      const el = $(id);
      const on = (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); fnOn(); };
      const off = (e) => { e.preventDefault(); fnOff && fnOff(); };
      el.onpointerdown = on;
      el.onpointerup = el.onpointercancel = el.onlostpointercapture = off;
    };
    holdBtn("bl", () => { hold.l = 1; das = 0.15; dasDir = -1; move(-1); }, () => { hold.l = 0; });
    holdBtn("br", () => { hold.r = 1; das = 0.15; dasDir = 1; move(1); }, () => { hold.r = 0; });
    holdBtn("bs", () => { hold.s = 1; }, () => { hold.s = 0; });
    $("bt").onpointerdown = (e) => { e.preventDefault(); rotate(1); };
    $("bd").onpointerdown = (e) => { e.preventDefault(); hard(); };
  }

  function bindSwipe() {
    let px, py, pid = -1;
    canvas.onpointerdown = (e) => { canvas.setPointerCapture(e.pointerId); pid = e.pointerId; px = e.clientX; py = e.clientY; };
    canvas.onpointercancel = () => { pid = -1; releaseInputs(); };
    canvas.onpointerup = (e) => {
      if (e.pointerId !== pid || mode !== "playing") return;
      pid = -1;
      const dx = e.clientX - px, dy = e.clientY - py;
      if (M.hypot(dx, dy) < 18) rotate(1);
      else if (M.abs(dx) > M.abs(dy)) move(dx > 0 ? 1 : -1);
      else if (dy > 28) hard();
    };
  }

  function unlock() {
    if (!(window.AudioContext || window.webkitAudioContext)) return;
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.connect(AC.destination); master.gain.value = muted ? 0 : 0.7;
      music = AC.createGain(); music.connect(master); music.gain.value = 0.2;
      sfx = AC.createGain(); sfx.connect(master); sfx.gain.value = 0.42;
      pad = AC.createOscillator();
      const g = AC.createGain(); g.gain.value = 0.035;
      pad.type = "sine"; pad.frequency.value = 174.6;
      pad.connect(g); g.connect(music); pad.start();
      nextNote = AC.currentTime + 0.05;
    }
    nextNote = AC.currentTime + 0.05;
    if (AC.state === "suspended") AC.resume().catch(() => {});
  }

  function toggleMute() {
    muted = !muted;
    soundLabel();
    try { localStorage.setItem('nimbo-muted-v1', muted ? '1' : '0'); } catch (e) {}
    if (AC) nextNote = AC.currentTime + 0.05;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, AC.currentTime, 0.04);
  }
  function soundLabel() {
    $('mute').textContent = muted ? 'Sound off' : 'Sound on';
    $('mute').setAttribute('aria-pressed', String(!muted));
  }

  function tone(f, t, d, g, type, bus) {
    if (!AC) return;
    const o = AC.createOscillator(), gn = AC.createGain();
    o.type = type; o.frequency.value = f;
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + 0.018);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(gn); gn.connect(bus);
    o.start(t); o.stop(t + d + 0.02);
    o.onended = () => { o.disconnect(); gn.disconnect(); };
  }

  function glide(f0, f1, t, d, g) {
    if (!AC) return;
    const o = AC.createOscillator(), gn = AC.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + d);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(g, t + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(gn); gn.connect(sfx);
    o.start(t); o.stop(t + d + 0.02);
    o.onended = () => { o.disconnect(); gn.disconnect(); };
  }

  function blip(kind) {
    if (!AC || muted) return;
    const t = AC.currentTime;
    if (kind === "m") tone(880, t, 0.05, 0.04, "sine", sfx);
    else if (kind === "r") { tone(640, t, 0.07, 0.05, "triangle", sfx); tone(960, t + 0.04, 0.06, 0.04, "sine", sfx); }
    else if (kind === "l") tone(180, t, 0.16, 0.12, "sine", sfx);
    else if (kind === "h") tone(140, t, 0.12, 0.1, "sine", sfx);
    else if (kind === "j") tone(520, t, 0.08, 0.06, "sine", sfx);
    else if (kind === "n") tone(240, t, 0.1, 0.07, "triangle", sfx);
    else if (kind === "c") { tone(523, t, 0.1, 0.06, "sine", sfx); tone(440, t + 0.08, 0.12, 0.06, "sine", sfx); }
    else if (kind === "k") {
      glide(400, 1680, t, 0.4, 0.032);
      const rain = [523, 587, 659, 784, 880, 988, 1047];
      for (let i = 0; i < 7; i++) {
        tone(rain[i], t + i * 0.05, 0.16, 0.048, "triangle", sfx);
        tone(rain[i] * 2, t + i * 0.05 + 0.02, 0.08, 0.02, "sine", sfx);
      }
    } else if (kind === "v") {
      glide(1200, 420, t, 0.16, 0.03);
      tone(1318, t, 0.14, 0.045, "sine", sfx);
      tone(1568, t + 0.05, 0.18, 0.035, "triangle", sfx);
    } else if (kind === "p") { tone(349, t, 0.12, 0.06, "sine", sfx); tone(440, t + 0.08, 0.14, 0.05, "sine", sfx); }
    else if (kind === "o") { tone(220, t, 0.25, 0.1, "sine", sfx); tone(174, t + 0.2, 0.4, 0.1, "triangle", sfx); }
    else if (kind === "s") { tone(174, t, 0.14, 0.07, "sine", sfx); tone(220, t + 0.08, 0.16, 0.07, "sine", sfx); tone(261, t + 0.16, 0.2, 0.08, "sine", sfx); }
  }

  function musicTick() {
    if (!AC || muted || mode === 'paused' || document.hidden) return;
    const now = AC.currentTime, seq = [523, 659, 784, 0, 880, 784, 659, 587, 523, 0, 659, 784, 1047, 880, 784, 0, 659, 587, 523, 0, 440, 523, 659, 0, 587, 659, 784, 659, 587, 523, 440, 0];
    nextNote = M.max(nextNote, now);
    const bass = [174, 146.8, 196, 130.8];
    while (nextNote < now + 0.2) {
      const n = seq[step % seq.length];
      if (n) tone(n, nextNote, 0.32, 0.065, "sine", music);
      if (step % 4 === 0) tone(bass[(step / 4 | 0) % 4], nextNote, 0.65, 0.045, "triangle", music);
      if (step % 8 === 0) tone(bass[(step / 4 | 0) % 4] * 3, nextNote, 1.2, 0.018, 'sine', music);
      nextNote += 0.42;
      step++;
    }
  }

  function resize() {
    const w = innerWidth, h = innerHeight, d = M.min(devicePixelRatio, w < 520 ? 1.4 : 2);
    const pw=w*d|0, ph=h*d|0;
    if(canvas.width===pw && canvas.height===ph) return;
    canvas.width = pw; canvas.height = ph;
    if (W.gl) {
      W.gl.viewport(0, 0, canvas.width, canvas.height);
      W.camera({ fov: innerWidth / innerHeight < 0.8 ? 46 : 38 });
    }
    if (mode === 'playing') show('pad', w < 800);
  }

  function buildScene() {
    W.ambient(0.68);
    W.light({ x: -0.45, y: -0.82, z: -0.38 });
    W.cloud({ n: "base", y: -1.1, w: 11.8, h: 1.35, d: 3.3, b: CREAM });
    W.cloud({ n: "fog", y: -8, w: 40, h: 10, d: 10, b: [0.68, 0.58, 0.8] });
    for (let i = 0; i < 16; i++) W.cloud({ n: "cl" + i, w: 2.5 + i % 3, h: 0.6 + i % 2 * 0.3, d: 1.3, b: [0.91,0.86,0.97] });
    // Each rainbow band shares the same compact mesh.
    const vertices = [], indices = [];
    for (let i = 0; i <= 40; i++) {
      const a = i / 40 * M.PI;
      for (const r of [0.94,1]) vertices.push(M.cos(a)*r, M.sin(a)*r, 0);
      if (i < 40) { const n=i*2; indices.push(n,n+1,n+2,n+1,n+3,n+2); }
    }
    models.arc = { vertices, indices };
    for (let i = 0; i < 7; i++) setState({n:'rb'+i,w:8-i*.3,h:8-i*.3,y:0,z:-5,b:RB[i]}, 'arc');
    W.group({ n: "uni" });
    const part = (n,x,y,z,w,h,d,b=CREAM) => W.sphere({n,g:'uni',x,y,z,w,h,d,b});
    part('body',0,.52,0,.72,.65,1.05);
    part('neck',0,.88,.31,.43,.72,.43);
    part('head',0,1.13,.5,.56,.57,.57);
    part('muzzle',0,.98,.82,.44,.28,.38,[1,.88,.89]);
    W.pyramid({n:'horn',g:'uni',y:1.62,z:.63,w:.16,h:.65,d:.16,b:GOLD,rx:12});
    for (const x of [-.2,.2]) {
      W.pyramid({n:'',g:'uni',x,y:1.48,z:.35,w:.19,h:.34,d:.17,b:CREAM,rz:x*45});
      part('',x,1.46,.42,.085,.15,.045,ROSE);
      part('',x*1.16,1.17,.72,.11,.14,.065,INK);
      part('',x*1.16-.015,1.2,.75,.036,.041,.025,CREAM);
      part('',x*1.25,1.02,.67,.12,.075,.06,ROSE);
    }
    for (let i=0;i<4;i++) {
      W.group({n:'leg'+i,g:'uni',x:i%2 ? .23:-.23,y:.39,z:i<2 ? .32:-.34});
      W.sphere({n:'',g:'leg'+i,y:-.16,w:.18,h:.4,d:.19,b:CREAM});
      W.cloud({n:'',g:'leg'+i,y:-.34,z:.025,w:.2,h:.13,d:.23,b:GOLD});
    }
    for (let i=0;i<7;i++) {
      part('mane'+i, M.sin(i*1.1)*.09,1.4-i*.1,.27-i*.065,.28,.24,.25,RB[i]);
      part('tail'+i, M.sin(i*.6)*.14,.65-i*.055,-.55-i*.075,.22-i*.012,.23,.3,RB[i]);
    }
    part('glint',0,1.99,.69,.08,.12,.08,CREAM);
  }

  let usedPuffs = 0;
  function syncScene(dt) {
    const u = S.uni;
    let landMin = u.vy, pieceMax = u.vy;
    if (S.active) {
      const gy = ghostY(S);
      const cs = cells(S.active.id, S.active.rot, S.active.x, S.active.y);
      for (const [, y] of cs) {
        pieceMax = M.max(pieceMax, y);
        landMin = M.min(landMin, y - (S.active.y - gy));
      }
    }
    let lo = M.min(landMin, u.vy) - 2.6;
    if (landMin <= 6) lo = M.min(lo, -1.7);
    const hi = M.max(pieceMax + 2.3, u.vy + 3);
    const spanAll = M.max(8, hi - lo);
    const want = (lo + hi) / 2;
    camY += (want - camY) * (1 - M.exp(-3.2 * dt));
    trauma = M.max(0, trauma - dt * 1.6);
    squash += (1 - squash) * (1-M.exp(-12*dt));
    const sh = reduced ? 0 : trauma * trauma;
    const ox = (M.random() - 0.5) * sh * 0.35;
    const oy = (M.random() - 0.5) * sh * 0.25;
    const portrait = innerWidth / innerHeight < .8;
    const dist = M.max(16, spanAll * 1.5, 6.5 / M.tan(20*M.PI/180) / (innerWidth/innerHeight));
    const titleOffset = mode === 'title' && innerWidth > 799 ? -3.6 : 0;
    W.camera({x:titleOffset+ox, y:camY+oy, z:dist, rx:0, ry:0, fov:40});
    const dusk = M.min(1, S.height / 60);
    W.clearColor([.81-dusk*.11,.74-dusk*.14,.94-dusk*.04]);
    W.move({n:'fog',y:S.fog-5});
    for (let j=0;j<16;j++) W.move({n:'cl'+j,x:(j&1?1:-1)*(6.8+j%4),y:camY+(j*2.7%22)-10,z:-6-j%3});
    for (let j=0;j<7;j++) W.move({n:'rb'+j,y:camY-2+(celebration>0?.3:0),z:-5});
    frameTime += mode === 'paused' ? 0 : dt;
    if (mode !== 'paused') celebration=M.max(0,celebration-dt);
    $('message').style.opacity=celebration>2 ? 1:0;
    $('status').style.display=mode==='playing'?'block':'none';
    const clearance=M.max(0,S.uni.vy-S.fog);
    $('fogbar').style.width=M.max(0,100-clearance*12)+'%';
    $('danger').textContent=clearance<2 ? 'Fog is close! Find higher ground' : 'Room to breathe · '+clearance.toFixed(1)+' m';
    $('route').textContent=S.path.length || S.hopT ? 'Follow the golden stepping stones' : 'Build within 1 across / 2 up';
    let i = 0;
    const put = (px, py, c, s) => {
      if (!nodes['p'+i]) W.cloud({n:'p'+i});
      W.move({ n: "p" + i, x: px, y: py + 0.05, z: s < .3 ? .55 : 0, w: s, h: s * 0.92, d: s, b: c });
      i++;
    };
    const place = (x, y, c, s) => put(wx(x), y, c, s);
    const extra = {};
    if (S.active && mode === "playing") {
      const gy0 = ghostY(S);
      cells(S.active.id, S.active.rot, S.active.x, gy0).forEach(([x, y], j) => {
        extra[k(x, y)] = S.active.prism ? RB[j % 7] : PAL[S.active.id];
      });
    }
    const pending = mode === "playing" ? findKills(S, extra) : [];
    const hot = {};
    pending.forEach((key) => { hot[key] = 1; });
    const GOLDG = [1, 0.95, 0.45];
    for (const key in S.board) {
      const x = kx(key), y = ky(key);
      if (y < lo - 2 || y > hi + 2) continue;
      const popping = S.pop && S.pop.indexOf(key) >= 0;
      const c = popping ? RB[(y + x) % 7] : (hot[key] ? GOLDG : S.board[key]);
      place(x, y, c, popping ? 1.05 : 0.9);
    }
    const p = S.active;
    if (p && (mode === "playing" || mode === "paused")) {
      const gy = ghostY(S);
      const cs = cells(p.id, p.rot, p.x, p.y);
      cs.forEach(([x, y], j) => {
        const c = p.prism ? RB[j % 7] : PAL[p.id];
        place(x, y, c, 0.9);
        if (gy !== p.y) {
          const gyy = y - (p.y - gy);
          const h = 0.42;
          const col = hot[k(x, gyy)] ? GOLDG : c;
          const dots = [[-h, -h], [0, -h], [h, -h], [h, 0], [h, h], [0, h], [-h, h], [-h, 0]];
          for (const [dx, dy] of dots) put(wx(x) + dx, gyy + dy, col, 0.14);
        }
      });
    }
    // Gameplay clouds are allocated first; effects never consume their slots.
    for (const step of S.path.slice(0,16)) put(wx(step.x),step.y+.52,GOLD,.12);
    if (!reduced && mode==='playing' && S.hopT && M.random()<dt*14) boom(S.uni.vx,S.uni.vy,1);
    for (const s of sparks) {
      s.t -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy -= 7 * dt;
      if (s.t > 0) put(s.x, s.y, s.c, 0.16);
    }
    sparks = sparks.filter((s) => s.t > 0);
    const activeCount=i;
    while (i < usedPuffs) { W.move({n:'p'+i,y:-90}); i++; }
    usedPuffs=activeCount;

    W.move({
      n: "uni",
      x: mode==='title' && portrait ? 0 : wx(S.uni.vx),
      y: mode==='title' && portrait ? camY+dist*.19 : S.uni.vy + (occupy(S, S.uni.x | 0, S.uni.y | 0) ? 0.48 : 0.14),
      z: 0.85,
      w:1.13,h:reduced?1.13:squash*1.13,d:1.13,
      ry: facing > 0 ? 55 : -55,
    });
    for(let j=0;j<4;j++) W.move({n:'leg'+j,rx:reduced?0:S.hopT?M.sin(frameTime*15+j*M.PI)*28:M.sin(frameTime*2+j)*3});
    for(let j=0;j<7;j++) W.move({n:'tail'+j,x:M.sin(j*.6)*.14+(reduced?0:M.sin(frameTime*3-j*.5)*.035)});
    W.move({n:'glint',w:reduced?.08:.06+M.sin(frameTime*5)*.035});
  }

  resize();
  W.reset();
  if (!W.gl) return;
  buildScene();
  const S = reset("title");
  addEventListener("resize", resize);
  addEventListener("keydown", (e) => onKey(e, 1));
  addEventListener("keyup", (e) => onKey(e, 0));
  addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  bindPad();
  bindSwipe();
  $("go").onclick = play;
  $("again").onclick = play;
  $("resume").onclick = resume;
  $("mute").onclick = toggleMute;
  $("pauseBtn").onclick = pause;
  soundLabel();
  $("best0").textContent = best ? "Your best: " + best + " m" : "A small climb. A little magic.";
  requestAnimationFrame(loop);

  function loop(now) {
    resize();
    const dt = M.min((now - last) / 1000, 0.1) || 0.016;
    last = now;
    acc += dt;
    stepDas(dt);
    while (acc >= 1 / 60) { tick(1 / 60); acc -= 1 / 60; }
    musicTick();
    syncScene(dt);
    W.render();
    requestAnimationFrame(loop);
  }
})();
