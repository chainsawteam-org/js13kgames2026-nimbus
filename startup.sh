#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then exit 0; fi
mkdir -p .grok
node --input-type=module <<'JS'
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
const log = openSync('.grok/dev.log', 'a');
const child = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(), detached: true, stdio: ['ignore', log, log]
});
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.unref();
closeSync(log);
JS
