#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { minify } from "terser";
import { deflateRawSync, crc32 } from "node:zlib";
import { Packer } from "roadroller";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIMIT = 13 * 1024;

const jsSrc = readFileSync(join(root, "js13k/src/game.js"), "utf8");
const cssSrc = readFileSync(join(root, "js13k/src/page.css"), "utf8");

const minJs = await minify(jsSrc, {
  compress: {
    passes: 3,
    pure_getters: true,
    unsafe: true,
    unsafe_math: true,
    drop_console: true,
    booleans_as_integers: true,
    unsafe_arrows: true,
  },
  mangle: { toplevel: true, properties: false },
  format: { comments: false },
});
if (minJs.error) throw minJs.error;

const css = cssSrc
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .replace(/ ?([:{}.,;>+~]) ?/g, "$1")
  .trim();

const page = readFileSync(join(root, "js13k/src/page.html"), "utf8");
const makeHtml = (code) => page.replace("/*STYLE*/", css).replace("/*GAME*/", () => code);
const zipOf = (html) => makeZip("index.html", Buffer.from(html));

let js = minJs.code;
let html = makeHtml(js);
let zipBuf = zipOf(html);
let mode = "terser";

// Roadroller searches random model selectors. Fix its build-only seed so the
// same source and toolchain reproduce the exact artifact we playtest.
const nativeRandom = Math.random;
let packSeed = 13;
Math.random = () => ((packSeed = (Math.imul(packSeed, 1664525) + 1013904223) >>> 0) / 4294967296);
try {
  const packer = new Packer([{ data: js, type: "js", action: "eval" }], { allowFreeVars: true });
  for (const level of [1, 2]) {
    await packer.optimize(level);
    const { firstLine, secondLine } = packer.makeDecoder();
    const rolled = makeHtml(firstLine + secondLine);
    const z = zipOf(rolled);
    if (z.length < zipBuf.length) {
      html = rolled;
      zipBuf = z;
      mode = `roadroller-${level}`;
    }
  }
} catch (err) {
  console.warn("roadroller skipped:", err.message);
} finally {
  Math.random = nativeRandom;
}

const outDir = join(root, "public/entry");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "index.html"), html);
writeFileSync(join(root, "public/nimbo.zip"), zipBuf);

const bytes = zipBuf.length;
const ok = bytes <= LIMIT;
const size = {
  html: Buffer.byteLength(html),
  js: js.length,
  bytes,
  limit: LIMIT,
  ok,
  kb: +(bytes / 1024).toFixed(2),
  mode,
};
writeFileSync(join(outDir, "size.json"), JSON.stringify(size, null, 2) + "\n");
writeFileSync(join(root, "js13k/size.json"), JSON.stringify(size, null, 2) + "\n");

console.log(
  ok
    ? `js13k pack OK  ${mode}  zip ${bytes} / ${LIMIT} bytes (${size.kb} KB)  html ${size.html}`
    : `js13k pack OVER LIMIT  ${mode}  zip ${bytes} / ${LIMIT} bytes  html ${size.html}  js ${js.length}`,
);
if (!ok) process.exit(1);

function makeZip(name, data) {
  const nameBuf = Buffer.from(name);
  const crc = crc32(data);
  const compressed = deflateRawSync(data, { level: 9 });
  const local = Buffer.alloc(30 + nameBuf.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0, 6);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(0, 10);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  local.writeUInt16LE(0, 28);
  nameBuf.copy(local, 30);

  const central = Buffer.alloc(46 + nameBuf.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(0, 12);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt32LE(0, 32);
  central.writeUInt32LE(0, 38);
  nameBuf.copy(central, 46);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(local.length + compressed.length, 16);

  return Buffer.concat([local, compressed, central, end]);
}
