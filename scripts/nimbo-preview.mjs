// Local QA only: / serves the exact ZIP, /scenarios adds visible fixture controls.
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {inflateRawSync,crc32} from 'node:zlib';
import {createHash} from 'node:crypto';
const zip=readFileSync('public/nimbo.zip');
const start=30+zip.readUInt16LE(26)+zip.readUInt16LE(28);
const entry=inflateRawSync(zip.subarray(start,start+zip.readUInt32LE(18)));
if(crc32(entry)!==zip.readUInt32LE(14))throw Error('ZIP CRC mismatch');
if(zip.subarray(30,40).toString()!=='index.html')throw Error('Missing root index.html');
if(!entry.equals(readFileSync('public/entry/index.html')))throw Error('Preview differs from ZIP');
mkdirSync('workfiles/release/unpacked',{recursive:true});
writeFileSync('workfiles/release/unpacked/index.html',entry);
writeFileSync('workfiles/release/archive.json',JSON.stringify({bytes:zip.length,sha256:createHash('sha256').update(zip).digest('hex'),integrity:true,previewMatches:true},null,2)+'\n');
const fixtures=`
  const qa=document.createElement('div');
  qa.style='position:fixed;top:150px;left:12px;z-index:9;display:flex;gap:6px';
  qa.innerHTML='<button id="qaCheckpoint">QA: complete a checkpoint</button><button id="qaCrush">QA: aim at Nimbo</button><button id="qaClear">QA: clear chain</button>';
  document.body.append(qa);
  $('qaCheckpoint').onclick=()=>{
    play();S.board={};S.fog=-20;
    for(let x=0;x<10;x++)S.board[k(x,2)]=PAL[x%7];
    for(let x=10;x<14;x++)S.board[k(x,1)]=PAL[x%7];
    S.active={id:0,x:10,y:7,rot:0,prism:false};
  };
  $('qaCrush').onclick=()=>{S.active={id:0,x:S.uni.x-2,y:S.uni.y+8,rot:1,prism:false};};
  $('qaClear').onclick=()=>{
    play();S.board={};S.uni.x=S.uni.vx=12;S.fog=-20;
    for(let x=0;x<5;x++){S.board[k(x,0)]=PAL[0];S.board[k(x,x+1)]=PAL[2];}
    S.active=null;startPop(findKills(S));
  };
`;
const source=readFileSync('js13k/src/game.js','utf8').replace(/\}\)\(\);\s*$/,fixtures+'})();');
const scenario=readFileSync('js13k/src/page.html','utf8').replace('/*STYLE*/',readFileSync('js13k/src/page.css','utf8')).replace('/*GAME*/',()=>source);
createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.setHeader('Cache-Control','no-store');res.end(req.url==='/scenarios'?scenario:entry)}).listen(8082,'127.0.0.1',()=>console.log('Exact ZIP at http://127.0.0.1:8082/; QA fixtures at /scenarios'));
