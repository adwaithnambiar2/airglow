export const clamp = (n, min=0, max=1) => Math.max(min,Math.min(max,n));

export function mapLandmark(point, vw, vh, sw, sh) {
  const scale=Math.max(sw/vw,sh/vh), dx=(vw*scale-sw)/2, dy=(vh*scale-sh)/2;
  return {x:clamp(((1-point.x)*vw*scale-dx)/sw),y:clamp((point.y*vh*scale-dy)/sh)};
}

export function pinchRatio(hand, width, height) {
  const distance=(a,b)=>Math.hypot((a.x-b.x)*width,(a.y-b.y)*height);
  const palm=distance(hand[0],hand[9]);
  return palm>1 ? distance(hand[4],hand[8])/palm : Infinity;
}

export function isPinching(ratio, previous) {
  return Number.isFinite(ratio) && ratio<(previous?0.48:0.32);
}

export class CanvasBook {
  constructor(){this.strokes=[];this.redoStack=[];this.current=null;this.nextId=1;}
  begin(point,settings){this.end();this.redoStack=[];this.current={id:this.nextId++,...settings,points:[point]};}
  add(point){if(!this.current)return;const previous=this.current.points.at(-1);if(Math.hypot(point.x-previous.x,point.y-previous.y)<0.001)return;this.current.points.push(point);if(this.current.points.length>=4000){const settings={brush:this.current.brush,color:this.current.color,size:this.current.size};this.end();this.begin(point,settings);}}
  end(){if(this.current){this.strokes.push(this.current);this.current=null;}}
  undo(){this.end();if(this.strokes.length)this.redoStack.push(this.strokes.pop());}
  redo(){this.end();if(this.redoStack.length)this.strokes.push(this.redoStack.pop());}
  clear(){this.end();if(this.strokes.length){this.redoStack=[];this.strokes.push({id:this.nextId++,brush:'clear',points:[]});}}
  visible(){const last=this.strokes.findLastIndex(s=>s.brush==='clear');return this.strokes.slice(last+1).concat(this.current?[this.current]:[]);}
  count(){return this.visible().filter(s=>s.brush!=='eraser').length;}
}

export function drawStroke(ctx,stroke,width,height){
  if(stroke.brush==='clear'){ctx.clearRect(0,0,width,height);return;}
  if(!stroke.points.length)return;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=stroke.size;
  const eraser=stroke.brush==='eraser';ctx.globalCompositeOperation=eraser?'destination-out':'source-over';
  const points=stroke.points;
  for(let i=0;i<points.length;i++){
    const a=points[Math.max(0,i-1)],b=points[i];
    const color=stroke.brush==='aurora'?`hsl(${(stroke.id*43+i*2)%360} 95% 72%)`:stroke.color;
    ctx.strokeStyle=color;ctx.fillStyle=color;
    ctx.shadowColor=color;ctx.shadowBlur=!eraser && stroke.brush!=='ink'?stroke.size*2:0;
    if(i===0){ctx.beginPath();ctx.arc(b.x*width,b.y*height,stroke.size/2,0,Math.PI*2);ctx.fill();}
    else{ctx.beginPath();ctx.moveTo(a.x*width,a.y*height);ctx.lineTo(b.x*width,b.y*height);ctx.stroke();}
  }
  ctx.restore();
}

export function renderBook(ctx,book,width,height){ctx.clearRect(0,0,width,height);for(const stroke of book.visible())drawStroke(ctx,stroke,width,height);}
