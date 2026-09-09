import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const root='public/press';mkdirSync(root,{recursive:true});
for(const scene of ['cover','checkpoint','thumbnail']){
 let js=readFileSync('js13k/src/game.js','utf8');
 const setup=`play(); S.board={}; S.active=null; S.fog=-10; mode='paused';
 for(let x=0;x<COLS;x++)S.board[k(x,0)]=PAL[x%7]; S.platforms[0]=1;
 for(let x=2;x<10;x++)for(let y=1;y<=x-1;y++)S.board[k(x,y)]=PAL[(x+y)%7];
 S.uni={x:9,y:8,vx:9,vy:8,max:8};S.height=8;S.checkpoint={uni:{y:0}};S.hopT=null;S.path=[];
 for(const id of ['title','hud','pad','status','pause','over','pauseBtn','mute'])show(id,0);
 const label=document.createElement('div');label.className='press-title';label.innerHTML='<small>A LITTLE CLOUD MAGIC</small><h1>Nimbo</h1><p>Build a path. Chase the rainbow.</p>';document.body.append(label);
 document.body.dataset.scene=${JSON.stringify(scene)};
 if(document.body.dataset.scene==='checkpoint'){for(let x=0;x<COLS;x++)S.board[k(x,6)]=PAL[x%7];S.platforms[6]=1;S.uni={x:5,y:6,vx:5,vy:6,max:6};S.checkpoint={uni:{y:6}};label.querySelector('p').textContent='Every rainbow is a way back.';}
 `;
 js=js.replace('  requestAnimationFrame(loop);',setup+'\n  requestAnimationFrame(loop);');
 js=js.replace('    W.render();',`    W.camera({x:0,y:6,z:innerWidth/innerHeight<1.1?36:29,fov:40}); W.render();`);
 const css=readFileSync('js13k/src/page.css','utf8')+`\n.press-title{position:absolute;left:7%;top:7%;color:#362344;pointer-events:none}.press-title small{font:700 12px system-ui;letter-spacing:.2em}.press-title h1{font:italic 120px Georgia;margin:6px 0 0;letter-spacing:-6px}.press-title p{font:italic 24px Georgia;color:#c53774;margin:0}[data-scene=thumbnail] .press-title{left:8%;top:5%}[data-scene=thumbnail] h1{font-size:68px;letter-spacing:-3px}[data-scene=thumbnail] small{font-size:8px}[data-scene=thumbnail] p{font-size:14px}[data-scene=checkpoint] .press-title p{font-size:24px}`;
 let html=readFileSync('js13k/src/page.html','utf8').replace('/*STYLE*/',()=>css).replace('/*GAME*/',()=>js);
 writeFileSync(root+'/'+scene+'.html',html);
}
console.log('Presentation scenes generated from the actual renderer; excluded from ZIP.');
