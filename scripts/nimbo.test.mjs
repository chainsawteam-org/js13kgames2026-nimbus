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
  const exposed='S,reset,fillQ,k,PAL,SH,fits,move,rotate,hard,onKey,hold,pause,resume,play,grav,repath,tickUni,tick,findKills,tickPop,startPop,tickPiece,unlock,toggleMute,musicTick,syncScene,buildScene,nodes,W,releaseInputs';
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
 for(let id=0;id<7;id++) for(let x=-1;x<9;x++){
   g.S.board={};g.S.active={id,x:3,y:8,rot:0};
   for(let n=0;n<12;n++)g.move(x<3?-1:1);
   for(let n=0;n<4;n++){g.rotate(1);assert.ok(g.fits(g.S,id,g.S.active.rot,g.S.active.x,g.S.active.y))}
   g.hard();assert.equal(Object.keys(g.S.board).length,4);
 }
});
test('five aligned colors clear, four do not; a full mixed row clears',()=>{
 const g=game();g.S.board={};for(let x=0;x<4;x++)g.S.board[g.k(x,0)]=g.PAL[0];assert.equal(g.findKills(g.S).length,0);
 g.S.board[g.k(4,0)]=g.PAL[0];assert.equal(g.findKills(g.S).length,5);
 g.S.board={};for(let x=0;x<10;x++)g.S.board[g.k(x,0)]=g.PAL[x%7];assert.equal(g.findKills(g.S).length,10);
});
test('clears resolve gravity and chain before spawning the next piece',()=>{
 const g=game();g.S.board={};g.S.active=null;
 for(let x=0;x<10;x++)g.S.board[g.k(x,0)]=g.PAL[x%7];
 for(let x=0;x<5;x++)g.S.board[g.k(x,1)]=g.PAL[2];
 g.startPop(Array.from({length:10},(_,x)=>String(g.k(x,0))));g.tickPop(.6);
 assert.ok(g.S.pop);assert.equal(g.S.active,null);g.tickPop(.6);
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

test('entry columns vary so an unattended centre stack cannot solve the game',()=>{
 const g=game(),xs=[];for(let i=0;i<7;i++){xs.push(g.S.active.x);g.hard()};assert.ok(new Set(xs).size>=4);
});


test('late clears settle on the fog cleanup boundary, not deleted original ground',()=>{
 const g=game();g.S.fog=20;g.S.board={};
 for(let y=18;y<30;y++)g.S.board[g.k(1,y)]=g.PAL[y%7];
 delete g.S.board[g.k(1,22)];g.grav(g.S);
 assert.ok(g.S.board[g.k(1,18)]);assert.ok(g.S.board[g.k(1,28)]);
 assert.equal(Object.keys(g.S.board).length,11);
 assert.ok(Object.keys(g.S.board).every(key=>Number(key)>=g.k(0,18)));
});
