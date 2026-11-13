import fs from 'node:fs/promises';
import {refreshCatalog} from './collector.mjs';

const site=new URL('../site/',import.meta.url);
const catalogFile=new URL('../data/catalog.json',import.meta.url);
let stored=null;
try { stored=await fs.readFile(catalogFile,'utf8'); }
catch(e) { if(e.code!=='ENOENT')throw e; }
let next=null;
const bucket={
  async get() {return stored?{async json(){return JSON.parse(stored)}}:null},
  async put(key,value) {next=JSON.parse(value)}
};
const catalog=await refreshCatalog(bucket);
if(!next || !catalog.videos.length || !catalog.podcast?.videos.length)throw Error('Refresh did not produce a complete catalog');
for(const list of [catalog.videos,catalog.podcast.videos]){
  if(new Set(list.map(v=>v.id)).size!==list.length)throw Error('Duplicate IDs');
  if(list.some(v=>!/^[-\w]{11}$/.test(v.id)||!v.title))throw Error('Invalid video record');
}
const before=stored?JSON.parse(stored).videos:JSON.parse(await fs.readFile(new URL('videos.json',site),'utf8'));
const ids=new Set(catalog.videos.map(v=>v.id));
if(before.some(v=>!ids.has(v.id)))throw Error('Refresh lost an existing video');
// All source requests and validation finish before any output is replaced.
const outputs=[
  [catalogFile,catalog],
  [new URL('videos.json',site),catalog.videos],
  [new URL('podcasts.json',site),catalog.podcast],
  [new URL('status.json',site),{checkedAt:catalog.checkedAt,total:catalog.videos.length,added:catalog.added,podcastEpisodes:catalog.podcast.videos.length}]
];
for(const [file,value] of outputs){
  const temp=new URL(file.href+'.tmp');
  await fs.writeFile(temp,JSON.stringify(value,null,2)+'\n');
  await fs.rename(temp,file);
}
console.log(JSON.stringify({ok:true,checkedAt:catalog.checkedAt,total:catalog.videos.length,added:catalog.added,podcastEpisodes:catalog.podcast.videos.length}));
