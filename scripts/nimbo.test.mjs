import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

// Exercise the readable game functions in isolation. No debug API is shipped.
const source=readFileSync(new URL('../js13k/src/game.js',import.meta.url),'utf8');
function game(saved={}) {
  const elements={}, notes=[];
  const element=()=>({style:{},setAttribute(){},setPointerCapture(){},textContent:'',innerHTML:''});
  const node=()=>({gain:{value:0,setTargetAtTime(){},setValueAtTime(){},exponentialRampToValueAtTime(){}},frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(t){notes.push(t)},stop(){}});
  class Audio {currentTime=0;state='running';destination={};createGain=node;createOscillator=node;suspend(){this.state='suspended'}resume(){this.state='running';return Promise.resolve()}}
  const context=vm.createContext({Math,Number,matchMedia:()=>({matches:false}),innerWidth:1280,innerHeight:800,devicePixelRatio:1,document:{hidden:false,getElementById:id=>elements[id]??=element()},localStorage:{getItem:k=>saved[k],setItem:(k,v)=>saved[k]=v},window:{AudioContext:Audio},DOMMatrix:class{},performance:{now:()=>0}});
  const exposed='S,COLS,cells,ghostY,hitsBody,fullRows,markPlatforms,saveCheckpoint,retryCheckpoint,tickSettle,die,reset,fillQ,k,PAL,SH,fits,move,rotate,hard,onKey,hold,pause,resume,play,grav,repath,tickUni,tick,findKills,tickPop,startPop,tickPiece,unlock,toggleMute,musicTick,syncScene,buildScene,nodes,W,releaseInputs';
  vm.runInContext(source.slice(0,source.indexOf('  resize();\n  W.reset();'))+`const S=reset('play');this.api={${exposed},mode:()=>mode,audio:()=>AC,master:()=>master};})();`,context);
  return {...context.api,elements,notes,saved};
}
const key=(code,repeat=false)=>({code,repeat,preventDefault(){}});

test('each seven-piece bag contains all shapes and exactly one rainbow',()=>{
 const g=game(), st={bag:[],queue:[]};const result=[];
 for(let i=0;i<140;i++){g.fillQ(st);result.push(st.queue.shift())}
 for(let i=0;i<140;i+=7){const bag=result.slice(i,i+7);assert.equal(new Set(bag.map(p=>p.id)).size,7);assert.equal(bag.filter(p=>p.prism).length,1)}
});
test('rotations and hard drops stay in bounds and never overwrite occupied clouds',()=>{
 const g=game();
 g.S.uni.vx=-100;
 for(let id=0;id<7;id++) for(let x=-1;x<g.COLS;x++){
   g.S.board={};g.S.active={id,x:3,y:8,rot:0};
   for(let n=0;n<12;n++)g.move(x<3?-1:1);
   for(let n=0;n<4;n++){g.rotate(1);assert.ok(g.fits(g.S,id,g.S.active.rot,g.S.active.x,g.S.active.y))}
   g.hard();assert.equal(Object.keys(g.S.board).length,4);
 }
});
test('Space sweeps the whole drop and crushes before board writes or prism rewards',()=>{
 const g=game();
 g.S.board[g.k(1,0)]=g.PAL[0];
 g.S.uni={x:1,y:0,vx:1,vy:0,max:0};
 g.S.active={id:0,x:1,y:5,rot:0,prism:true};
 const board=JSON.stringify(g.S.board),fog=g.S.fog;
 g.hard();
 assert.equal(g.mode(),'over');assert.equal(JSON.stringify(g.S.board),board);assert.equal(g.S.fog,fog);
 assert.match(g.elements.cause.textContent,/crushed/);
});
test('five aligned colors clear, four do not; full rows take priority and remain',()=>{
 const g=game();g.S.board={};for(let x=0;x<4;x++)g.S.board[g.k(x,0)]=g.PAL[0];assert.equal(g.findKills(g.S).length,0);
 g.S.board[g.k(4,0)]=g.PAL[0];assert.equal(g.findKills(g.S).length,5);
 g.S.board={};for(let x=0;x<g.COLS;x++)g.S.board[g.k(x,0)]=g.PAL[0];assert.equal(g.findKills(g.S).length,0);
 g.markPlatforms(g.S);assert.ok(g.S.platforms[0]);assert.equal(Object.keys(g.S.board).length,14);
});
test('clears resolve gravity and chain before spawning the next piece',()=>{
 const g=game();g.S.board={};g.S.active=null;
 for(let x=0;x<5;x++){g.S.board[g.k(x,0)]=g.PAL[0];g.S.board[g.k(x,x+1)]=g.PAL[2]}
 g.startPop(g.findKills(g.S));g.tickPop(.6);assert.ok(g.S.settle);assert.equal(g.S.active,null);
 g.tickSettle(.4);assert.ok(g.S.pop);assert.equal(g.S.active,null);g.tickPop(.6);g.tickSettle(.4);
 assert.equal(Object.keys(g.S.board).length,0);assert.ok(g.S.active);assert.ok(g.S.fog < -5.5);
});
test('support loss during a hop falls at the current position instead of teleporting',()=>{
 const g=game(),u=g.S.uni;Object.assign(u,{x:1,y:5,vx:1.4,vy:5.5});g.S.board={[g.k(8,9)]:g.PAL[0],[g.k(1,2)]:g.PAL[1]};g.S.hopT={x:2,y:6};
 g.tickUni(1/60);assert.ok(g.S.falling);assert.equal(u.vy,5.5);assert.equal(u.vx,1.4);
 for(let i=0;i<180;i++)g.tickUni(1/60);assert.equal(u.x,1);assert.equal(u.y,2);assert.equal(u.vx,1);
});
test('gravity preserves visual position and invalidates old paths',()=>{
 const g=game();Object.assign(g.S.uni,{x:1,y:5,vx:1,vy:5});g.S.board={[g.k(1,5)]:g.PAL[0]};g.S.path=[{x:2,y:6}];g.grav(g.S);
 assert.equal(g.S.uni.vy,5);assert.equal(g.S.path.length,0);assert.ok(g.S.falling);g.tickUni(.1);assert.ok(g.S.uni.vy<5);
});
test('a completed hop recalculates the route from the landing cell',()=>{
 const g=game();g.S.board={[g.k(2,1)]:g.PAL[0],[g.k(3,3)]:g.PAL[1]};g.repath(g.S);
 for(let i=0;i<200;i++)g.tickUni(1/60);assert.equal(g.S.height,3);assert.equal(g.S.uni.x,3);
});
test('blocked paths do not climb beyond the two-up and one-across limits',()=>{
 const g=game();g.S.board={[g.k(4,5)]:g.PAL[0]};g.repath(g.S);for(let i=0;i<200;i++)g.tickUni(1/60);assert.equal(g.S.height,0);
});
test('key repeat cannot drop a second piece or toggle pause repeatedly',()=>{
 const g=game();g.onKey(key('Space'),1);const first=JSON.stringify(g.S.active);g.onKey(key('Space',true),1);assert.equal(JSON.stringify(g.S.active),first);
 g.onKey(key('KeyP'),1);g.onKey(key('KeyP',true),1);assert.equal(g.mode(),'paused');
});
test('pause freezes simulation and releases held controls; restart resets them',()=>{
 const g=game();g.onKey(key('KeyA'),1);g.pause();const before=JSON.stringify(g.S);g.tick(10);assert.equal(JSON.stringify(g.S),before);assert.equal(g.hold.l,0);
 g.S.falling=true;g.S.fallSpeed=18;g.play();assert.equal(g.S.falling,false);assert.equal(g.S.fallSpeed,0);assert.equal(g.S.height,0);assert.equal(g.S.fog,-5.5);assert.equal(g.hold.l,0);assert.equal(g.mode(),'playing');
});
test('grounded piece locks after the delay and cannot stall past 15 resets',()=>{
 const g=game();g.S.active={id:1,x:3,y:-1,rot:0};g.tickPiece(.2);assert.equal(Object.keys(g.S.board).length,0);g.tickPiece(.31);assert.equal(Object.keys(g.S.board).length,4);
 g.S.board={};g.S.active={id:1,x:3,y:-1,rot:0};g.S.lockN=15;g.tickPiece(.01);assert.equal(Object.keys(g.S.board).length,4);
});
test('fog uses the visible falling unicorn, then stops the run and saves best',()=>{
 const g=game();Object.assign(g.S.uni,{y:10,vy:1});g.S.fog=1;g.S.height=12;g.tick(1/60);assert.equal(g.mode(),'over');assert.equal(g.saved['nimbo-best-v1'],'12');
});
test('mute is honoured on first gesture and unmute never catches up old notes',()=>{
 const g=game({'nimbo-muted-v1':'1'});g.unlock();assert.equal(g.master().gain.value,0);g.audio().currentTime=3600;g.toggleMute();g.notes.length=0;g.musicTick();assert.ok(g.notes.length<=4);assert.ok(g.notes.every(t=>t>=3600));
});
test('renderer allocates all visible gameplay clouds before effects, beyond old 240 cap',()=>{
 const g=game();g.W.gl={clearColor(){},createBuffer(){return {}},bindBuffer(){},bufferData(){}};g.buildScene();g.S.board={};for(let y=0;y<40;y++)for(let x=0;x<10;x++)g.S.board[g.k(x,y)]=g.PAL[x%7];g.S.active={id:0,x:3,y:42,rot:0};g.syncScene(.016);
 const visible=Object.values(g.nodes).filter(n=>n.n.startsWith('p')&&n.y>-80);assert.ok(visible.length>=404);assert.ok(Number.isFinite(g.nodes.camera.z));
});

test('entry columns cover the wider board without going out of bounds',()=>{
 const g=game(),xs=[];g.S.uni.vx=-100;for(let i=0;i<7;i++){xs.push(g.S.active.x);assert.ok(g.fits(g.S,g.S.active.id,0,g.S.active.x,g.S.active.y));g.hard()};assert.ok(new Set(xs).size>=4);assert.ok(xs.includes(10));
});


test('late clears settle on the fog cleanup boundary, not deleted original ground',()=>{
 const g=game();g.S.fog=20;g.S.board={};
 for(let y=18;y<30;y++)g.S.board[g.k(1,y)]=g.PAL[y%7];
 delete g.S.board[g.k(1,22)];g.grav(g.S);
 assert.ok(g.S.board[g.k(1,18)]);assert.ok(g.S.board[g.k(1,28)]);
 assert.equal(Object.keys(g.S.board).length,11);
 assert.ok(Object.keys(g.S.board).every(key=>Number(key)>=g.k(0,18)));
});

test('normal and soft descent crush; a nearby column and an intervening roof are safe',()=>{
 for(const soft of [false,true]) {
  const g=game();g.S.active={id:0,x:0,y:3,rot:0};g.hold.s=soft?1:0;
  for(let i=0;i<400&&g.mode()==='playing';i++)g.tickPiece(1/60);
  assert.equal(g.mode(),'over');assert.equal(Object.keys(g.S.board).length,0);
 }
 const g=game();g.S.active={id:0,x:3,y:8,rot:0};assert.equal(g.hitsBody(g.S,g.S.active,g.ghostY(g.S)),false);g.hard();assert.equal(g.mode(),'playing');
 g.S.active={id:0,x:0,y:8,rot:0};g.S.board[g.k(1,4)]=g.PAL[2];
 assert.equal(g.hitsBody(g.S,g.S.active,g.ghostY(g.S)),false);g.hard();assert.equal(g.mode(),'playing');
});

test('collision uses visible hop position and blocks sideways overlap',()=>{
 const g=game();Object.assign(g.S.uni,{x:1,y:0,vx:5,vy:4});g.S.active={id:0,x:4,y:10,rot:0};
 assert.ok(g.hitsBody(g.S,g.S.active,g.ghostY(g.S)));g.hard();assert.equal(g.mode(),'over');
 g.play();g.S.active={id:0,x:2,y:-1,rot:0};g.move(-1);assert.equal(g.S.active.x,2);
 const p={id:0,x:4,y:3,rot:0};
 assert.ok(g.hitsBody(g.S,p,p.y,{vx:3,vy:3},{vx:5,vy:3}));
});

test('platforms stay fixed, split vertical matches and take precedence in previews',()=>{
 const g=game();g.S.board={};
 for(let x=0;x<13;x++)g.S.board[g.k(x,3)]=g.PAL[x%7];g.markPlatforms(g.S);assert.equal(g.S.platforms[3],undefined);
 const extra={[g.k(13,3)]:g.PAL[0]};assert.equal(g.fullRows(g.S,extra)[0],'3');
 g.S.board[g.k(13,3)]=g.PAL[0];g.markPlatforms(g.S);
 for(let y=0;y<7;y++)g.S.board[g.k(1,y)]=g.PAL[0];
 assert.equal(g.findKills(g.S).length,0);
 g.S.board[g.k(6,8)]=g.PAL[2];g.grav(g.S);
 assert.ok(g.S.board[g.k(6,4)]);assert.ok(g.S.platforms[3]);
 for(let x=0;x<14;x++)assert.ok(g.S.board[g.k(x,3)]);
});

test('crossing matches deduplicate cells; six clears but separated fours do not',()=>{
 const g=game();g.S.board={};for(let x=0;x<6;x++)g.S.board[g.k(x,3)]=g.PAL[1];
 for(let y=0;y<6;y++)g.S.board[g.k(2,y)]=g.PAL[1];assert.equal(g.findKills(g.S).length,11);
 g.S.board={};for(const x of [0,1,2,3,5,6,7,8])g.S.board[g.k(x,0)]=g.PAL[1];assert.equal(g.findKills(g.S).length,0);
});

test('clearing freezes fog and input; settling can create a protected platform',()=>{
 const g=game();g.S.active=null;g.S.board={};
 for(let x=0;x<14;x++)g.S.board[g.k(x,x%3+2)]=g.PAL[x%7];
 for(let x=0;x<5;x++)g.S.board[g.k(x,6)]=g.PAL[0];
 g.startPop(g.findKills(g.S));const before=JSON.stringify(g.S.uni),fog=g.S.fog;
 g.tick(.2);g.hard();assert.equal(g.S.fog,fog);assert.equal(JSON.stringify(g.S.uni),before);
 g.tick(.31);assert.ok(g.S.settle);assert.equal(g.S.active,null);const settledFog=g.S.fog;
 g.tick(.2);assert.equal(g.S.fog,settledFog);assert.equal(g.mode(),'playing');g.tick(.16);
 assert.ok(g.S.platforms[0]);assert.equal(Object.keys(g.S.board).length,14);assert.ok(g.S.active);
});

test('checkpoint saves only stable landings, restores an isolated state and replaces only upward',()=>{
 const g=game();for(let x=0;x<14;x++)g.S.board[g.k(x,4)]=g.PAL[x%7];g.markPlatforms(g.S);
 g.saveCheckpoint(g.S);assert.equal(g.S.checkpoint,null);
 Object.assign(g.S.uni,{y:4,vy:4,max:4});g.S.height=4;g.S.hopT={x:1,y:4};g.saveCheckpoint(g.S);assert.equal(g.S.checkpoint,null);
 g.S.hopT=null;g.saveCheckpoint(g.S);const saved=JSON.stringify(g.S.checkpoint),next=JSON.stringify(g.S.queue);
 g.S.board[g.k(1,9)]=g.PAL[0];g.S.queue.shift();g.S.fog=8;g.S.height=12;g.die('crush');g.retryCheckpoint();
 assert.equal(g.mode(),'playing');assert.equal(g.S.height,4);assert.equal(g.S.fog,-5.5);assert.equal(JSON.stringify(g.S.queue),next);
 assert.equal(JSON.stringify(g.S.checkpoint),saved);assert.equal(g.S.board[g.k(1,9)],undefined);assert.equal(g.S.active.y,8);assert.equal(g.saved['nimbo-best-v1'],'12');
 for(let x=0;x<14;x++)g.S.board[g.k(x,6)]=g.PAL[x%7];g.markPlatforms(g.S);Object.assign(g.S.uni,{y:6,vy:6});g.saveCheckpoint(g.S);assert.equal(g.S.checkpoint.uni.y,6);
 Object.assign(g.S.uni,{y:4,vy:4});g.saveCheckpoint(g.S);assert.equal(g.S.checkpoint.uni.y,6);
 g.play();assert.equal(g.S.checkpoint,null);assert.equal(Object.keys(g.S.platforms).length,0);
});

test('a saved platform survives fog cleanup, but the fog can still kill',()=>{
 const g=game();for(let x=0;x<14;x++)g.S.board[g.k(x,0)]=g.PAL[x%7];g.markPlatforms(g.S);
 g.S.uni.vy=g.S.uni.y=20;g.S.fog=10;g.S.active=null;g.tick(.01);
 assert.equal(Object.keys(g.S.board).length,14);g.S.uni.vy=0;g.tick(.01);assert.equal(g.mode(),'over');
});

test('wide camera renders twenty useful rows and checkpoint material flags reset in the pool',()=>{
 const g=game();g.W.gl={clearColor(){},createBuffer(){return {}},bindBuffer(){},bufferData(){}};g.buildScene();
 g.S.board={};for(let x=0;x<14;x++)g.S.board[g.k(x,0)]=g.PAL[x%7];g.markPlatforms(g.S);g.saveCheckpoint(g.S);
 g.syncScene(.016);assert.equal(Object.values(g.nodes).filter(n=>n.glow===2).length,14);
 assert.ok(2*g.nodes.camera.z*Math.tan(Math.PI/9)*.7>=20);
 g.S.board={};g.S.platforms={};g.S.checkpoint=null;g.syncScene(.016);
 assert.equal(Object.values(g.nodes).filter(n=>n.y>-80&&n.glow).length,0);
});

test('game-over camera and body stop drifting while the retry menu is open',()=>{
 const g=game();g.W.gl={clearColor(){},createBuffer(){return {}},bindBuffer(){},bufferData(){}};g.buildScene();g.syncScene(.016);
 const cameraY=g.nodes.camera.y;g.die('crush');for(let i=0;i<120;i++){g.tick(1/60);g.syncScene(1/60)}
 const y=g.S.uni.vy;for(let i=0;i<120;i++){g.tick(1/60);g.syncScene(1/60)}
 assert.equal(g.S.uni.vy,y);assert.equal(g.nodes.camera.y,cameraY);
});

test('dense wider towers retain their platforms and reuse rendering capacity',()=>{
 const g=game();g.W.gl={clearColor(){},createBuffer(){return {}},bindBuffer(){},bufferData(){}};g.buildScene();g.S.board={};g.S.uni.vx=-100;
 for(let y=0;y<80;y++)for(let x=0;x<14;x++)g.S.board[g.k(x,y)]=g.PAL[(x+y)%7];
 g.markPlatforms(g.S);const board=JSON.stringify(g.S.board);g.grav(g.S);assert.equal(JSON.stringify(g.S.board),board);
 g.S.active={id:0,rot:0,x:5,y:82};
 // Warm the smoothly moving camera until the complete fixture is in view.
 for(let i=0;i<100;i++)g.syncScene(.016);
 const allocated=Object.keys(g.nodes).length;
 for(let i=0;i<100;i++)g.syncScene(.016);
 assert.equal(Object.keys(g.nodes).length,allocated);assert.ok(Number.isFinite(g.nodes.camera.z));
 assert.ok(Object.values(g.nodes).filter(n=>n.n.startsWith('p')&&n.y>-80).length>=1124);
});

test('a lethal forecast does not promise color clears that cannot happen',()=>{
 const g=game();g.W.gl={clearColor(){},createBuffer(){return {}},bindBuffer(){},bufferData(){}};g.buildScene();g.S.board={};
 for(let x=0;x<4;x++)g.S.board[g.k(x,0)]=g.PAL[0];
 g.S.uni.x=g.S.uni.vx=4;g.S.active={id:0,x:4,y:6,rot:0};g.syncScene(.016);
 assert.match(g.elements.danger.textContent,/crush/);
 assert.deepEqual(Array.from(g.nodes.p0.b),Array.from(g.PAL[0]));
 g.S.uni.x=g.S.uni.vx=12;g.syncScene(.016);
 assert.deepEqual(Array.from(g.nodes.p0.b),[1,.95,.45]);
});
