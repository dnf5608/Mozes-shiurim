export function positionFor(record){return record&&Number.isFinite(record.position)&&!(record.duration>0&&record.position/record.duration>=.95)?Math.max(0,record.position):0}
export function nextIndex(queue,index){return index>=0&&index+1<queue.length?index+1:-1}
export function progressRecord(previous,position,duration,ended=false){
 if(!Number.isFinite(position)||!Number.isFinite(duration)||duration<=0)return previous||null;
 const p=Math.max(0,Math.min(position,duration));
 return {position:p,duration,watched:!!previous?.watched||ended||p/duration>=.95,updatedAt:Date.now()};
}
export function percent(record){return record?.watched?100:record?.duration>0?Math.max(0,Math.min(100,100*record.position/record.duration)):0}
export function timeLabel(seconds){const s=Math.max(0,Math.floor(seconds||0));return s>=3600?`${Math.floor(s/3600)}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`:`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}
