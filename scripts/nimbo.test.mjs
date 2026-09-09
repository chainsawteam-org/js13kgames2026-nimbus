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
  const exposed='S,reset,fillQ,k,kx,ky,PAL,SH,fits,move,rotate,hard,onKey,hold,pause,resume,play,grav,repath,tickUni,tick,findKills,tickPop,startPop,tickPiece,unlock,toggleMute,musicTick,syncScene,buildScene,nodes,W,releaseInputs,boom,bindPad,base,floorAt,ghostY,changeZoom,walk,nextGap,connects,cells';
  vm.runInContext(source.slice(0,source.indexOf('  resize();\n  W.reset();'))+`const S=reset('play');this.api={${exposed},mode:()=>mode,audio:()=>AC,master:()=>master,sparksCount:()=>sparks.length};})();`,context);
  return {...context.api,elements,notes,saved};
}
const key=(code,repeat=false)=>({code,repeat,preventDefault(){}});

test('each seven-piece bag has every shape and exactly one rainbow',()=>{
 const g=game(),st={bag:[],queue:[]},pieces=[];
 for(let i=0;i<140;i++){g.fillQ(st);pieces.push(st.queue.shift())}
 for(let i=0;i<140;i+=7){const bag=pieces.slice(i,i+7);assert.equal(new Set(bag.map(p=>p.id)).size,7);assert.equal(bag.filter(p=>p.prism).length,1)}
});
test('left/right and all rotations respect the wider board and curved floor',()=>{
 const g=game();g.S.board={};g.S.bridge={};
 for(let id=0;id<7;id++){
  g.S.active={id,x:8,y:16,rot:0};g.move(-1);assert.equal(g.S.active.x,7);g.move(1);assert.equal(g.S.active.x,8);
  for(const dir of [-1,1]){for(let n=0;n<40;n++)g.move(dir);for(let n=0;n<4;n++){g.rotate(1);const p=g.S.active;assert.ok(g.fits(g.S,p.id,p.rot,p.x,p.y))}}
  g.hard();for(const key in g.S.board){assert.ok(g.kx(key)<24);assert.ok(g.ky(key)>=g.base(g.S,g.kx(key)))}g.S.board={};
 }
});
test('rainbow floor repeats continuously after the construction window scrolls',()=>{
 const g=game();for(let x=1;x<24;x++){const old=g.base(g.S,x);g.S.offset++;assert.equal(g.base(g.S,x-1),old);g.S.offset--}
 assert.equal(g.base(g.S,0),g.base(g.S,24));assert.ok(g.base(g.S,12)>g.base(g.S,0));
});
test('five touching colors merge around a corner; four and separated groups do not',()=>{
 const g=game();g.S.board={};const cells=[[0,4],[1,4],[2,4],[2,5],[3,5]];
 for(const [x,y] of cells.slice(0,4))g.S.board[g.k(x,y)]=g.PAL[0];assert.equal(g.findKills(g.S).length,0);
 g.S.board[g.k(3,5)]=g.PAL[0];assert.equal(g.findKills(g.S).length,5);
 g.S.board[g.k(3,5)]=g.PAL[1];assert.equal(g.findKills(g.S).length,0);
});
test('landing forecast finds the same merge without mutating the board',()=>{
 const g=game();g.S.board={};for(let x=8;x<12;x++)g.S.board[g.k(x,11)]=g.PAL[1];
 const before=JSON.stringify(g.S.board),extra={[g.k(12,11)]:g.PAL[1]};assert.equal(g.findKills(g.S,extra).length,5);assert.equal(JSON.stringify(g.S.board),before);
});
test('a merge clears cloud space without creating disconnected rainbow',()=>{
 const g=game();g.S.bridge={};g.S.board={};g.S.active=null;
 for(let x=8;x<13;x++)g.S.board[g.k(x,11)]=g.PAL[0];g.S.board[g.k(10,12)]=g.PAL[2];
 g.startPop(g.findKills(g.S));g.tickPop(.6);
 assert.equal(g.S.woven,0);for(let x=8;x<13;x++)assert.equal(g.S.bridge[x],undefined);
 assert.equal(Object.keys(g.S.board).length,1);assert.ok(g.S.board[g.k(10,g.floorAt(g.S,10))]);assert.ok(g.S.active);assert.ok(g.S.fog<-5.5);
});
test('gravity settles each column on the curved road without duplicating clouds',()=>{
 const g=game();g.S.board={};g.S.bridge={10:1};const floor=g.floorAt(g.S,10);
 g.S.board[g.k(10,floor+2)]=g.PAL[1];g.S.board[g.k(10,floor+4)]=g.PAL[2];g.grav(g.S);
 assert.equal(Object.keys(g.S.board).length,2);assert.equal(g.S.board[g.k(10,floor)],g.PAL[1]);assert.equal(g.S.board[g.k(10,floor+1)],g.PAL[2]);
});
test('Nimbo walks right on the road but stops at an unfilled gap',()=>{
 const g=game();g.S.active=null;for(let i=0;i<240;i++)g.tickUni(1/60);
 assert.equal(g.S.uni.x,4);assert.equal(g.S.height,3);assert.equal(g.walk(g.S,5,g.base(g.S,5)),false);
});
test('Cloud stacks never block the separate rainbow walking lane',()=>{
 const g=game();const y=g.base(g.S,4);g.S.board[g.k(4,y+1)]=g.PAL[1];g.S.board[g.k(4,y+2)]=g.PAL[1];g.S.board[g.k(4,y+3)]=g.PAL[1];
 assert.equal(g.walk(g.S,4,y),true);g.repath(g.S);for(let i=0;i<240;i++)g.tickUni(1/60);assert.equal(g.S.uni.x,4);
});
test('support removed during a hop causes a visible local fall',()=>{
 const g=game();g.S.board={};g.S.bridge={};Object.assign(g.S.uni,{x:4,y:9,vx:4.4,vy:9.5});g.S.hopT={x:5,y:10};g.S.board[g.k(4,7)]=g.PAL[0];
 g.tickUni(1/60);assert.ok(g.S.falling);assert.equal(g.S.uni.vx,4.4);assert.equal(g.S.uni.vy,9.5);
 for(let i=0;i<180;i++)g.tickUni(1/60);assert.equal(g.S.uni.x,4);assert.equal(g.S.uni.y,7);
});
test('fog chases horizontally and rainbow records preserve the old tower score',()=>{
 const g=game({'nimbo-best-v1':'91'});g.S.height=12;g.S.uni.vx=1;g.S.uni.vy=15;g.S.fog=1;g.tick(1/60);
 assert.equal(g.mode(),'over');assert.equal(g.saved['nimbo-rainbow-best-v1'],'12');assert.equal(g.saved['nimbo-best-v1'],'91');
});
test('scrolling preserves world progress and bounds the stored bridge',()=>{
 const g=game();g.S.active=null;g.S.fog=-10000;
 for(let i=0;i<7200;i++){for(let x=0;x<24;x++)g.S.bridge[x]=1;g.tick(1/60)}
 assert.ok(g.S.offset>100);assert.ok(g.S.height>100);assert.ok(g.S.uni.x<=8);assert.ok(Object.keys(g.S.bridge).length<=24);
});
test('repeated keydown cannot hard-drop twice or oscillate pause',()=>{
 const g=game();g.onKey(key('Space'),1);const p=JSON.stringify(g.S.active);g.onKey(key('Space',true),1);assert.equal(JSON.stringify(g.S.active),p);
 g.onKey(key('KeyP'),1);g.onKey(key('KeyP',true),1);assert.equal(g.mode(),'paused');
});
test('pause and restart release held inputs and reset the rainbow world',()=>{
 const g=game();g.onKey(key('KeyA'),1);g.pause();const before=JSON.stringify(g.S);g.tick(10);assert.equal(JSON.stringify(g.S),before);assert.equal(g.hold.l,0);
 g.S.offset=80;g.S.falling=true;g.S.fallSpeed=10;g.play();assert.equal(g.S.offset,0);assert.equal(g.S.height,0);assert.equal(g.S.falling,false);assert.equal(g.S.fog,-5.5);
});
test('pointer cancel and lost capture release movement and soft drop',()=>{
 const g=game();g.bindPad();const e={preventDefault(){},pointerId:9};
 for(const [id,action] of [['bl','l'],['br','r'],['bs','s']]){g.elements[id].onpointerdown(e);assert.equal(g.hold[action],1);g.elements[id].onpointercancel(e);assert.equal(g.hold[action],0);g.elements[id].onpointerdown(e);g.elements[id].onlostpointercapture(e);assert.equal(g.hold[action],0)}
});
test('lock delay gives adjustment time but cannot be reset forever',()=>{
 const g=game();g.S.board={};g.S.active={id:1,x:8,y:16,rot:0};g.S.active.y=g.ghostY(g.S);g.tickPiece(.2);assert.equal(Object.keys(g.S.board).length,0);g.tickPiece(.31);assert.equal(Object.keys(g.S.board).length,4);
});
test('mute before first gesture and resumption never schedule an audio backlog',()=>{
 const g=game({'nimbo-muted-v1':'1'});g.unlock();assert.equal(g.master().gain.value,0);g.audio().currentTime=3600;g.toggleMute();g.notes.length=0;g.musicTick();assert.ok(g.notes.length<=4);assert.ok(g.notes.every(t=>t>=3600));
});
function renderer(g){g.W.gl={clearColor(){},createBuffer(){return {}},bindBuffer(){},bufferData(){}};g.buildScene()}
test('camera framing stays fixed when the stack changes; zoom is user-controlled',()=>{
 const g=game();renderer(g);g.syncScene(.016);const camera=JSON.stringify(g.nodes.camera);
 for(let x=0;x<24;x++)for(let y=10;y<15;y++)g.S.board[g.k(x,y)]=g.PAL[x%7];g.S.active.y=18;g.syncScene(.016);assert.equal(JSON.stringify(g.nodes.camera),camera);
 const distance=g.nodes.camera.z;g.changeZoom(-.12);g.syncScene(.016);assert.ok(g.nodes.camera.z<distance);g.changeZoom(0);g.syncScene(.016);assert.equal(g.nodes.camera.z,distance);
});
test('dense rainbow sections render beyond the former 240-object cap',()=>{
 const g=game();renderer(g);for(let x=0;x<24;x++){g.S.bridge[x]=1;for(let y=10;y<15;y++)g.S.board[g.k(x,y)]=g.PAL[x%7]}g.syncScene(.016);
 assert.ok(Object.values(g.nodes).filter(n=>n.n.startsWith('p')&&n.y>-80).length>290);
});
test('effect bursts remain bounded and reuse the warmed rendering pool',()=>{
 const g=game();renderer(g);for(let i=0;i<100;i++)g.boom(2,4,50);assert.equal(g.sparksCount(),96);g.syncScene(.016);const warmed=Object.keys(g.nodes).length;
 for(let i=0;i<120;i++){g.boom(2,4,12);g.syncScene(.016)}assert.equal(g.sparksCount(),96);assert.equal(Object.keys(g.nodes).length,warmed);
});


test('first three pieces wait without fog pressure or automatic locking',()=>{
 const g=game();for(let n=0;n<3;n++){
  const piece=JSON.stringify({...g.S.active,x:g.S.active.x+g.S.offset}),fog=g.S.fog+g.S.offset;
  for(let i=0;i<3600;i++)g.tick(1/60);
  assert.equal(JSON.stringify({...g.S.active,x:g.S.active.x+g.S.offset}),piece);assert.equal(g.S.fog+g.S.offset,fog);assert.equal(g.mode(),'playing');g.hard();
 }
 const fog=g.S.fog;g.tick(1/60);assert.ok(g.S.fog>fog);
});
test('default beginner placements extend the road without requiring a color match',()=>{
 for(let run=0;run<30;run++){
  const g=game();for(let n=0;n<3;n++){const woven=g.S.woven;g.hard();assert.ok(g.S.woven>woven)}
  g.S.active=null;for(let i=0;i<1000;i++)g.tickUni(1/60);assert.ok(g.S.height>=6);assert.equal(g.mode(),'playing');
 }
});

test('Space-only spam cannot extend an endless road or farm prism relief',()=>{
 for(let run=0;run<100;run++){
  const g=game();let drops=0;
  while(g.mode()==='playing'&&drops++<150){if(g.S.pop)g.tickPop(1);else g.hard();for(let t=0;t<12;t++)g.tick(1/60)}
  assert.equal(g.mode(),'over');assert.ok(g.S.height<20);
 }
});
test('rotation and edge overlap are required; isolated drops create no path',()=>{
 const g=game();g.S.drops=3;g.S.active={id:0,rot:0,x:14,y:18,prism:true};const woven=g.S.woven,fog=g.S.fog;g.hard();assert.equal(g.S.woven,woven);assert.ok(g.S.fog>fog);
 assert.equal(g.connects(g.S,[5,6]),false);assert.equal(g.connects(g.S,[4]),false);assert.equal(g.connects(g.S,[4,5]),true);
});
test('deliberate connected placements can traverse multiple rainbow sections',()=>{
 const g=game();for(let n=0;n<80&&g.mode()==='playing';n++){
  if(g.S.pop)g.tickPop(1);
  const p=g.S.active;let found=false;
  for(let r=0;r<4&&!found;r++)for(let x=0;x<21&&!found;x++)if(g.fits(g.S,p.id,r,x,18)&&g.connects(g.S,g.cells(p.id,r,x,18).map(c=>c[0]))){Object.assign(p,{rot:r,x,y:18});found=true}
  assert.ok(found);g.hard();for(let t=0;t<90;t++)g.tick(1/60);
 }
 assert.equal(g.mode(),'playing',JSON.stringify({height:g.S.height,fog:g.S.fog,uni:g.S.uni,gap:g.nextGap(g.S)}));assert.ok(g.S.height>80);
});
