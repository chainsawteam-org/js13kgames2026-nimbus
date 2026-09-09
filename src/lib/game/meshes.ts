import * as THREE from "three";

export function makePuffGeometry(): THREE.BufferGeometry {
  return makeRoundedBox(0.9, 0.9, 0.9, 0.13, 3);
}

/** Candy tetromino cube: box with spherical corners so faces stay readable. */
export function makeRoundedBox(
  w: number,
  h: number,
  d: number,
  r: number,
  seg: number,
): THREE.BufferGeometry {
  const div = seg * 2 + 2;
  const g = new THREE.BoxGeometry(w, h, d, div, div, div);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const hd = d / 2 - r;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const cx = Math.max(-hw, Math.min(hw, v.x));
    const cy = Math.max(-hh, Math.min(hh, v.y));
    const cz = Math.max(-hd, Math.min(hd, v.z));
    const nx = v.x - cx;
    const ny = v.y - cy;
    const nz = v.z - cz;
    const len = Math.hypot(nx, ny, nz);
    if (len > 1e-8) {
      v.set(cx + (nx / len) * r, cy + (ny / len) * r, cz + (nz / len) * r);
    } else {
      v.set(cx, cy, cz);
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export function discTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const grd = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, "rgba(255,255,255,0.95)");
  grd.addColorStop(0.35, "rgba(255,214,232,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export function createSky(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color("#b9d7f4") },
      mid: { value: new THREE.Color("#f4c9de") },
      bot: { value: new THREE.Color("#ffe4c4") },
      h: { value: 0 },
    },
    vertexShader: `
      varying vec3 wp;
      void main() {
        wp = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 wp;
      uniform vec3 top;
      uniform vec3 mid;
      uniform vec3 bot;
      uniform float h;
      void main() {
        float y = normalize(wp).y * 0.5 + 0.5;
        vec3 c = mix(bot, mid, smoothstep(0.02, 0.48, y));
        c = mix(c, top, smoothstep(0.42, 1.0, y));
        float dusk = clamp(h * 0.018, 0.0, 0.45);
        c = mix(c, vec3(0.72, 0.68, 0.95), dusk * y);
        gl_FragColor = vec4(c, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(48, 24, 16), mat);
  mesh.frustumCulled = false;
  return mesh;
}

export function createRainbow(): THREE.Mesh {
  const geo = new THREE.TorusGeometry(14, 0.28, 8, 72, Math.PI);
  const col = new Float32Array(geo.attributes.position.count * 3);
  const bands = [
    new THREE.Color(0xff8ba7),
    new THREE.Color(0xffb38a),
    new THREE.Color(0xffe08a),
    new THREE.Color(0xa8e6cf),
    new THREE.Color(0x9ed7f5),
    new THREE.Color(0xc5b4f3),
  ];
  const c = new THREE.Color();
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const y = geo.attributes.position.getY(i);
    const t = THREE.MathUtils.clamp((y + 0.4) / 0.8, 0, 0.999);
    const idx = Math.floor(t * (bands.length - 1));
    c.copy(bands[idx]!).lerp(bands[idx + 1] ?? bands[idx]!, t * (bands.length - 1) - idx);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.85, fog: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI;
  mesh.rotation.z = 0.02;
  return mesh;
}

export function createClouds(count = 18): THREE.InstancedMesh {
  const geo = new THREE.SphereGeometry(1, 10, 8);
  const mat = new THREE.MeshLambertMaterial({ color: 0xfff6fb, transparent: true, opacity: 0.82, fog: false });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    dummy.position.set(side * (5.5 + Math.random() * 6), Math.random() * 28 - 2, -6 - Math.random() * 10);
    dummy.scale.set(1.6 + Math.random() * 1.8, 0.7 + Math.random() * 0.5, 1.1 + Math.random() * 0.8);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

export function createUnicorn(): THREE.Group {
  const root = new THREE.Group();
  const cream = new THREE.MeshLambertMaterial({ color: 0xfff4e8 });
  const rose = new THREE.MeshLambertMaterial({ color: 0xff9bb5 });
  const lav = new THREE.MeshLambertMaterial({ color: 0xd7c0ee });
  const ink = new THREE.MeshLambertMaterial({ color: 0x3d2c3a });
  const hornMat = new THREE.MeshLambertMaterial({ color: 0xf0d78c });
  const blush = new THREE.MeshLambertMaterial({ color: 0xffc2c8 });
  const white = new THREE.MeshLambertMaterial({ color: 0xfffdf8 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), cream);
  body.position.set(0, 0.48, 0.02);
  body.scale.set(1.05, 0.86, 0.78);
  root.add(body);

  const rump = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), cream);
  rump.position.set(0, 0.42, -0.32);
  rump.scale.set(0.95, 0.78, 0.9);
  root.add(rump);

  const neck = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), cream);
  neck.position.set(0, 0.68, 0.22);
  neck.scale.set(0.85, 1.1, 0.8);
  root.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), cream);
  head.position.set(0, 0.86, 0.4);
  head.scale.set(0.95, 0.88, 1.02);
  root.add(head);

  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), cream);
  snout.position.set(0, 0.76, 0.6);
  snout.scale.set(0.92, 0.68, 1.05);
  root.add(snout);

  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.34, 8), hornMat);
  horn.position.set(0, 1.12, 0.42);
  horn.rotation.x = -0.42;
  root.add(horn);

  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 6), cream);
    ear.position.set(s * 0.16, 1.08, 0.34);
    ear.rotation.z = s * -0.35;
    ear.rotation.x = -0.2;
    root.add(ear);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), ink);
    eye.position.set(s * 0.1, 0.9, 0.6);
    root.add(eye);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), white);
    shine.position.set(s * 0.11, 0.92, 0.63);
    root.add(shine);

    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), blush);
    cheek.position.set(s * 0.16, 0.78, 0.55);
    cheek.scale.set(1, 0.6, 0.7);
    root.add(cheek);
  }

  const legGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.32, 8);
  const hoofGeo = new THREE.SphereGeometry(0.055, 8, 6);
  const spots: [number, number, number][] = [
    [-0.16, 0.2, 0.14],
    [0.16, 0.2, 0.14],
    [-0.15, 0.2, -0.32],
    [0.15, 0.2, -0.32],
  ];
  for (const [x, y, z] of spots) {
    const leg = new THREE.Mesh(legGeo, cream);
    leg.position.set(x, y, z);
    root.add(leg);
    const hoof = new THREE.Mesh(hoofGeo, rose);
    hoof.position.set(x, 0.05, z);
    hoof.scale.set(1, 0.55, 1.1);
    root.add(hoof);
  }

  const maneCols = [rose, lav, rose, lav, rose];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), maneCols[i]);
    m.position.set((i % 2 === 0 ? -0.08 : 0.08) * 0.4, 0.95 - i * 0.09, 0.22 - i * 0.08);
    m.scale.set(0.7, 1.1, 0.85);
    root.add(m);
  }

  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), i % 2 ? rose : lav);
    t.position.set(0.02 * (i % 2 ? 1 : -1), 0.42 - i * 0.05, -0.48 - i * 0.08);
    t.scale.set(0.8, 0.7, 1.1);
    root.add(t);
  }

  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = false;
      o.receiveShadow = false;
      const mat = o.material as THREE.MeshLambertMaterial;
      mat.fog = false;
    }
  });
  return root;
}

export function createStarGeometry(): THREE.BufferGeometry {
  const geo = new THREE.OctahedronGeometry(0.2, 0);
  geo.computeVertexNormals();
  return geo;
}

export function worldX(col: number, cols: number) {
  return col - (cols - 1) / 2;
}


