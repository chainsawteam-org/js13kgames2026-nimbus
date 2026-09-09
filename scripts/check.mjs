// The competition source is plain JavaScript; validate every shipped/tool script.
import {readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
for(const p of ['js13k/src/game.js',...readdirSync('scripts').filter(p=>p.endsWith('.mjs')).map(p=>'scripts/'+p)])execFileSync(process.execPath,['--check',p],{stdio:'inherit'});
console.log('JavaScript syntax checks passed (no TypeScript source).');
