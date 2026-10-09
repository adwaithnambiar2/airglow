import {CanvasBook,clamp,mapLandmark,pinchRatio,isPinching,renderBook} from './core.js';
const $=id=>document.getElementById(id);
const stage=$('stage'),art=$('art'),overlay=$('overlay'),video=$('video'),cursor=$('cursor');
const ctx=art.getContext('2d'),octx=overlay.getContext('2d');
const book=new CanvasBook();let width=1,height=1,dpr=1,mode='pointer',stream=null,landmarker=null,raf=0,lastVideo=-1,lastDetection=0,pinching=false,smoothed=null,pointerDown=false,toastTimer;
let settings={brush:'neon',color:'#ba92ff',size:6};
const colors=[['Lilac','#ba92ff'],['Rose','#ff91c4'],['Peach','#ffbd91'],['Sunbeam','#ffe699'],['Mint','#87efce'],['Sky','#83cbff'],['Snow','#f6efff']];
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
function refresh(){renderBook(ctx,book,width,height);$('welcome').classList.toggle('hidden',book.visible().length>0);$('stroke-count').textContent=book.count()+(book.count()===1?' stroke':' strokes');$('undo').disabled=!book.strokes.length&&!book.current;$('redo').disabled=!book.redoStack.length;}
function finish(){book.end();pointerDown=false;pinching=false;cursor.classList.remove('drawing');refresh();}
function resize(){finish();const rect=stage.getBoundingClientRect();width=rect.width;height=rect.height;dpr=Math.min(2,devicePixelRatio||1);for(const c of [art,overlay]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);c.getContext('2d').setTransform(dpr,0,0,dpr,0,0)}refresh();}
new ResizeObserver(resize).observe(stage);
function position(point,drawing){cursor.style.left=point.x*width+'px';cursor.style.top=point.y*height+'px';cursor.style.display='block';cursor.classList.toggle('drawing',drawing);}
function pointFromEvent(e){const r=stage.getBoundingClientRect();return{x:clamp((e.clientX-r.left)/r.width),y:clamp((e.clientY-r.top)/r.height)}}
function paint(point,start){if(start)book.begin(point,{...settings});else book.add(point);refresh();}
stage.addEventListener('pointerdown',e=>{if(mode!=='pointer'||e.target.closest('button')||(e.pointerType==='mouse'&&e.button!==0))return;stage.setPointerCapture(e.pointerId);pointerDown=true;const p=pointFromEvent(e);paint(p,true);position(p,true);});
stage.addEventListener('pointermove',e=>{if(mode!=='pointer')return;const p=pointFromEvent(e);position(p,pointerDown);if(pointerDown)paint(p,false)});
stage.addEventListener('pointerup',()=>finish());stage.addEventListener('pointercancel',()=>finish());stage.addEventListener('pointerleave',()=>{if(!pointerDown&&mode==='pointer')cursor.style.display='none'});
for(const [name,color] of colors){const b=document.createElement('button');b.className='swatch'+(color===settings.color?' selected':'');b.style.setProperty('--color',color);b.setAttribute('aria-label',name+' color');b.setAttribute('aria-pressed',color===settings.color);b.title=name;b.onclick=()=>{finish();settings.color=color;document.querySelectorAll('.swatch').forEach(s=>{const on=s===b;s.classList.toggle('selected',on);s.setAttribute('aria-pressed',on)});};$('swatches').append(b)}
document.querySelectorAll('[data-brush]').forEach(b=>b.onclick=()=>{finish();settings.brush=b.dataset.brush;document.querySelectorAll('[data-brush]').forEach(s=>{const on=s===b;s.classList.toggle('selected',on);s.setAttribute('aria-pressed',on)})});
$('size').oninput=()=>{finish();settings.size=Number($('size').value);$('size-value').textContent=settings.size+' px'};
$('paper').onchange=()=>{stage.classList.toggle('light',$('paper').value==='light');toast($('paper').value==='transparent'?'PNG export will have a transparent background.':'Canvas mood changed.');};
$('show-video').onchange=()=>stage.classList.toggle('show-camera',$('show-video').checked);
$('undo').onclick=()=>{finish();book.undo();refresh()};$('redo').onclick=()=>{finish();book.redo();refresh()};
$('clear').onclick=()=>{finish();$('clear-dialog').showModal()};$('cancel-clear').onclick=()=>$('clear-dialog').close();$('confirm-clear').onclick=()=>{book.clear();refresh();$('clear-dialog').close();toast('Fresh canvas. Undo brings your drawing back.')};
$('export').onclick=()=>{finish();const out=document.createElement('canvas');out.width=art.width;out.height=art.height;const c=out.getContext('2d');if($('paper').value!=='transparent'){c.fillStyle=$('paper').value==='light'?'#efeaf4':'#100c1b';c.fillRect(0,0,out.width,out.height)}c.drawImage(art,0,0);out.toBlob(blob=>{if(!blob){toast('Export failed. Try again.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='airglow-'+new Date().toISOString().replace(/[:.]/g,'-')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('A little magic, saved as PNG.');},'image/png')};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.studio').requestFullscreen()}catch{toast('Fullscreen is unavailable in this browser.')}};
function setMode(next){mode=next;stage.classList.toggle('camera',next==='camera');stage.classList.toggle('show-camera',$('show-video').checked);$('pointer-mode').classList.toggle('selected',next==='pointer');$('camera-mode').classList.toggle('selected',next==='camera');$('pointer-mode').setAttribute('aria-pressed',next==='pointer');$('camera-mode').setAttribute('aria-pressed',next==='camera');$('mode-label').textContent=next==='camera'?'HAND TRACKING':'MOUSE STUDIO';$('status-dot').classList.toggle('live',next==='camera');$('gesture-label').textContent=next==='camera'?'SHOW ONE HAND · PINCH TO DRAW':'CLICK & DRAG TO DRAW';}
function stopCamera(){cancelAnimationFrame(raf);if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;lastVideo=-1;smoothed=null;finish();octx.clearRect(0,0,width,height);cursor.style.display='none';$('tracking-fps').textContent='';setMode('pointer')}
let cameraEpoch=0;
$('pointer-mode').onclick=()=>{cameraEpoch++;stopCamera();$('camera-mode').disabled=false;$('camera-mode').textContent='◎ Camera'};
async function startCamera(){if(mode==='camera')return;const epoch=++cameraEpoch;$('camera-mode').disabled=true;$('camera-mode').textContent='Loading…';toast('Loading hand tracking. Your browser will ask for camera access.');let acquired=null;
try{
 if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera requires localhost or HTTPS. Open this app through start.py.');
 if(!landmarker){const mp=await import('/vendor/mediapipe/vision_bundle.mjs');const vision=await mp.FilesetResolver.forVisionTasks('/vendor/mediapipe/wasm');const options={baseOptions:{modelAssetPath:'/vendor/mediapipe/hand_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:0.6,minHandPresenceConfidence:0.6,minTrackingConfidence:0.6};try{landmarker=await mp.HandLandmarker.createFromOptions(vision,options)}catch{options.baseOptions.delegate='CPU';landmarker=await mp.HandLandmarker.createFromOptions(vision,options)}}
 if(epoch!==cameraEpoch)return;
 acquired=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'},audio:false});
 if(epoch!==cameraEpoch){acquired.getTracks().forEach(t=>t.stop());return;}
 stream=acquired;video.srcObject=stream;await video.play();if(epoch!==cameraEpoch)return;
 finish();setMode('camera');toast('Pinch thumb and index to draw. Open them to move without drawing.');lastDetection=0;lastVideo=-1;raf=requestAnimationFrame(trackLoop);
}catch(error){if(acquired)acquired.getTracks().forEach(t=>t.stop());if(epoch===cameraEpoch){stopCamera();toast(error.name==='NotAllowedError'?'Camera permission was denied. Mouse mode still works.':error.message+' Mouse mode is available.');}}
finally{if(epoch===cameraEpoch){$('camera-mode').disabled=false;$('camera-mode').textContent='◎ Camera'}}}
$('camera-mode').onclick=startCamera;
const connections=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
function trackLoop(now){if(mode!=='camera'||!stream)return;try{if(video.readyState>=2&&video.currentTime!==lastVideo&&now-lastDetection>=50){lastVideo=video.currentTime;const elapsed=now-lastDetection;lastDetection=now;const results=landmarker.detectForVideo(video,now);octx.clearRect(0,0,width,height);if(results.landmarks.length){const hand=results.landmarks[0],points=hand.map(p=>mapLandmark(p,video.videoWidth,video.videoHeight,width,height));octx.strokeStyle='#b995eb88';octx.lineWidth=1.5;for(const [a,b] of connections){octx.beginPath();octx.moveTo(points[a].x*width,points[a].y*height);octx.lineTo(points[b].x*width,points[b].y*height);octx.stroke()}
 const target=points[8];if(!smoothed)smoothed=target;else smoothed={x:smoothed.x+(target.x-smoothed.x)*.45,y:smoothed.y+(target.y-smoothed.y)*.45};
 const next=isPinching(pinchRatio(hand,video.videoWidth,video.videoHeight),pinching);position(smoothed,next);if(next){paint(smoothed,!pinching);}else if(pinching){finish();}pinching=next;$('gesture-label').textContent=next?'LEAVING A LITTLE LIGHT':'HAND FOUND · PINCH TO DRAW';$('tracking-fps').textContent=Math.round(1000/elapsed)+' FPS';
 }else{finish();smoothed=null;cursor.style.display='none';$('gesture-label').textContent='LOOKING FOR YOUR HAND';$('tracking-fps').textContent='';}}
 raf=requestAnimationFrame(trackLoop);
}catch(error){stopCamera();toast('Tracking stopped: '+error.message+'. Mouse mode still works.')}}
$('demo').onclick=()=>{finish();const saved={...settings};const curves=[{color:'#ba92ff',phase:0},{color:'#ff91c4',phase:1.4},{color:'#87efce',phase:2.8}];for(const c of curves){let first=true;for(let i=0;i<=200;i++){const t=i/200*Math.PI*2;const point={x:.5+.23*Math.cos(t+c.phase)*Math.sin(t*.5+.4),y:.48+.22*Math.sin(t)*Math.cos(t*.5+c.phase)};if(first){book.begin(point,{brush:'neon',color:c.color,size:4});first=false}else book.add(point)}book.end()}settings=saved;refresh();toast('A little inspiration. Undo a curve, or draw something of your own.');};
document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea')||$('clear-dialog').open)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).click()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();$('redo').click()}else if(!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==='e')$('export').click()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cameraEpoch++;stopCamera();$('camera-mode').disabled=false;$('camera-mode').textContent='◎ Camera'}});
window.addEventListener('beforeunload',()=>{stopCamera();landmarker?.close()});
refresh();
