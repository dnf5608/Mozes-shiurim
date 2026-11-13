import fs from 'node:fs/promises';
const expected=JSON.parse(await fs.readFile(new URL('../site/status.json',import.meta.url),'utf8'));
let failure;
for(let attempt=0;attempt<6;attempt++){
  try{
    const url=new URL('status.json',process.env.PAGE_URL);url.searchParams.set('v',Date.now());
    const response=await fetch(url,{signal:AbortSignal.timeout(20000),cache:'no-store'});
    if(!response.ok)throw Error(`Status HTTP ${response.status}`);
    const actual=await response.json();
    if(actual.checkedAt!==expected.checkedAt||actual.total!==expected.total)throw Error('Published status does not match the saved refresh');
    const videos=await fetch(new URL('videos.json?v='+Date.now(),process.env.PAGE_URL),{signal:AbortSignal.timeout(20000)});
    if(!videos.ok||(await videos.json()).length!==expected.total)throw Error('Published video count differs');
    console.log(`Verified ${expected.total} videos, ${expected.podcastEpisodes} podcast episodes, checked ${expected.checkedAt}`);
    process.exit(0);
  }catch(e){failure=e;console.log(e.message);if(attempt<5)await new Promise(resolve=>setTimeout(resolve,10000));}
}
throw failure;
