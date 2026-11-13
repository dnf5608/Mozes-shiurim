import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const nodes=new Map(),storage=new Map(),instances=[];
function node(){return {value:'all',hidden:false,checked:true,disabled:false,textContent:'',style:{},dataset:{},classList:{toggle(){},remove(){}},setAttribute(){},removeAttribute(){},append(...x){this.children=(this.children||[]).concat(x)},replaceChildren(...x){this.children=x;this.firstChild=x[0]},focus(){},addEventListener(){},querySelectorAll(){return []}}}
function get(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)}
get('query').value='';get('sort').value='channel';
const document={getElementById:get,createElement:node,querySelector:()=>node(),querySelectorAll:()=>[],addEventListener(){},body:node(),head:node()};
class Player{
 constructor(id,options){this.options=options;this.time=options.playerVars.start;this.duration=600;this.id=options.videoId;instances.push(this)}
 loadVideoById({videoId,startSeconds}){this.id=videoId;this.time=startSeconds}
 getVideoData(){return {video_id:this.id}}getCurrentTime(){return this.time}getDuration(){return this.duration}getIframe(){return node()}playVideo(){}seekTo(t){this.time=t}destroy(){this.destroyed=true}
}
const YT={Player,PlayerState:{PLAYING:1,PAUSED:2,ENDED:0}};
const context=vm.createContext({document,window:{YT,addEventListener(){}},YT,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},location:{origin:'https://example.test'},fetch:()=>new Promise(()=>{}),setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},console});
const state=fs.readFileSync(new URL('../site/playback-state.mjs',import.meta.url),'utf8').replaceAll('export function','function');
const app=fs.readFileSync(new URL('../site/app.js',import.meta.url),'utf8').replace(/^import .*?;\n/gm,'');
const dates=fs.readFileSync(new URL('../site/upload-date.mjs',import.meta.url),'utf8').replaceAll('export function','function');
vm.runInContext(state+'\n'+dates+'\n'+app,context);
const run=s=>vm.runInContext(s,context);
run("filtered=[{id:'aaaaaaaaaaa',title:'First',kind:'video'},{id:'bbbbbbbbbbb',title:'Second',kind:'video'}];videos=[...filtered];start(filtered[0],'dock',null)");await new Promise(r=>setImmediate(r));
let p=instances.at(-1);assert.equal(p.options.playerVars.start,0);p.options.events.onReady({target:p});p.options.events.onStateChange({data:1});p.time=125;run('save()');
assert.equal(JSON.parse(storage.get('mozes-progress-v1')).aaaaaaaaaaa.position,125);
assert.equal(get('external').href,'https://www.youtube.com/watch?v=aaaaaaaaaaa&t=125s');
p.time=126.9;get('external').onclick();assert.equal(get('external').href,'https://www.youtube.com/watch?v=aaaaaaaaaaa&t=126s');p.time=125;run('save()');
assert.equal(JSON.parse(storage.get('mozes-progress-v1')).aaaaaaaaaaa.watched,false);
run('render()');
const watchedToggle=get('grid').children[0].children[3].children[1];
watchedToggle.onclick();
assert.equal(JSON.parse(storage.get('mozes-progress-v1')).aaaaaaaaaaa.position,125);
assert.equal(run('positionFor(history.aaaaaaaaaaa)'),125);
watchedToggle.onclick();
assert.equal(JSON.parse(storage.get('mozes-progress-v1')).aaaaaaaaaaa.position,125);
assert.equal(JSON.parse(storage.get('mozes-progress-v1')).aaaaaaaaaaa.watched,false);
run('stop();start(filtered[0],"large",null)');await new Promise(r=>setImmediate(r));
p=instances.at(-1);assert.equal(p.options.playerVars.start,125);p.options.events.onReady({target:p});p.options.events.onStateChange({data:1});p.time=600;p.options.events.onStateChange({data:0});await new Promise(r=>setImmediate(r));
assert.equal(instances.at(-1).id,'bbbbbbbbbbb');assert.equal(instances.at(-1),p);assert.equal(p.destroyed,undefined);assert.equal(JSON.parse(storage.get('mozes-progress-v1')).aaaaaaaaaaa.watched,true);
const last=instances.at(-1);last.options.events.onReady({target:last});last.options.events.onStateChange({data:1});last.time=600;const count=instances.length;last.options.events.onStateChange({data:0});await new Promise(r=>setImmediate(r));assert.equal(instances.length,count);assert.match(get('playermessage').textContent,/end of this queue/);
run('stop();start(filtered[0],"large",null)');await new Promise(r=>setImmediate(r));p=instances.at(-1);get('autonext').checked=false;p.options.events.onReady({target:p});p.options.events.onStateChange({data:1});p.time=600;const before=instances.length;p.options.events.onStateChange({data:0});await new Promise(r=>setImmediate(r));assert.equal(instances.length,before);run('stop()');
console.log('Passed: actual player event handlers save progress, resume, mark completion, advance automatically, stop at queue end, and honor Auto-next off.');
