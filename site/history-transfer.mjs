const KEY='mozes-progress-v1';
export function cleanHistory(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid saved progress.');
  const entries=Object.entries(value);if(entries.length>10000)throw Error('This file contains too many records.');
  const result={};
  for(const [id,r] of entries){
    if(!/^[-\w]{11}$/.test(id)||!r||typeof r!=='object')throw Error('Invalid video record.');
    const position=Number.isFinite(r.position)?Math.max(0,r.position):0;
    const duration=Number.isFinite(r.duration)?Math.max(0,r.duration):0;
    result[id]={position:duration>0?Math.min(position,duration):position,duration,watched:r.watched===true,updatedAt:Number.isFinite(r.updatedAt)?Math.max(0,r.updatedAt):0};
  }
  return result;
}
export function mergeHistory(current,incoming){
  const merged=cleanHistory(current),next=cleanHistory(incoming);
  for(const [id,r] of Object.entries(next))merged[id]=r;
  return merged;
}
export function parseBackup(text){
  if(text.length>2000000)throw Error('The file is too large.');
  const data=JSON.parse(text);
  if(data.format!=='mozes-watch-history'||data.version!==1)throw Error('Choose a saved-progress file downloaded from this website.');
  return cleanHistory(data.history);
}
if(typeof document!=='undefined'){
  const details=document.createElement('details');details.style.cssText='margin:0 0 18px;';
  const summary=document.createElement('summary');summary.textContent='Saved progress';summary.className='listen-button';summary.style.cssText='display:inline-block;cursor:pointer;';details.append(summary);
  const panel=document.createElement('div');panel.style.cssText='padding:14px 0;max-width:620px;';details.append(panel);
  const help=document.createElement('p');help.textContent='Moving websites? On the old website in the same browser, download your saved progress. Then import that file here. This copies watched videos and where you stopped. Imported records replace matching videos; other saved videos are kept.';panel.append(help);
  const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;gap:10px;margin:12px 0;';panel.append(row);
  const download=document.createElement('button');download.type='button';download.className='listen-button';download.textContent='Download saved progress';row.append(download);
  const upload=document.createElement('button');upload.type='button';upload.className='listen-button';upload.textContent='Import saved progress';row.append(upload);
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;panel.append(input);
  const old=document.createElement('a');old.href='https://mozes-shiurim-library.david-f-0231.chatgpt.site/#saved-progress';old.target='_blank';old.rel='noopener';old.textContent='Open old website';panel.append(old);
  const note=document.createElement('p');note.setAttribute('role','status');note.setAttribute('aria-live','polite');panel.append(note);
  details.id='saved-progress';document.querySelector('main > section:last-child')?.prepend(details);
  if(location.hash==='#saved-progress'){details.open=true;details.scrollIntoView({block:'start'});}
  const read=()=>cleanHistory(JSON.parse(localStorage.getItem(KEY)||'{}'));
  download.onclick=()=>{try{
    window.dispatchEvent(new Event('mozes-history-export'));
    const history=read(),count=Object.keys(history).length;
    if(!count){note.textContent='No saved progress was found in this browser on this address. Try the browser and device where you watched the videos.';return;}
    const file=new Blob([JSON.stringify({format:'mozes-watch-history',version:1,exportedAt:new Date().toISOString(),history},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='mozes-saved-progress.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    note.textContent=`Downloaded progress for ${count} videos. Import this file on the new website.`;
  }catch{note.textContent='Your browser could not read the saved progress.';}};
  upload.onclick=()=>input.click();
  input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{
    if(file.size>2000000)throw Error('The file is too large.');
    const incoming=parseBackup(await file.text());
    window.dispatchEvent(new Event('mozes-history-export'));
    const merged=mergeHistory(read(),incoming);
    localStorage.setItem(KEY,JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('mozes-history-imported',{detail:merged}));
    note.textContent=`Imported progress for ${Object.keys(incoming).length} videos. Your watched labels and saved places are ready.`;
  }catch(e){note.textContent=`Could not import: ${e.message}`;}finally{input.value='';}};
}
