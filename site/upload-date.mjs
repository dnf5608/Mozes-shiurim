export function uploadLabel(value,now=Date.now()){
 const date=new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T12:00:00':value),age=now-date.getTime();if(!Number.isFinite(date.getTime()))return '';
 if(age<60000)return 'Just now';
 if(age<3600000){const n=Math.floor(age/60000);return `${n} minute${n===1?'':'s'} ago`}
 if(age<86400000){const n=Math.floor(age/3600000);return `${n} hour${n===1?'':'s'} ago`}
 if(age<7*86400000){const n=Math.floor(age/86400000);return `${n} day${n===1?'':'s'} ago`}
 if(age<30*86400000){const n=Math.floor(age/(7*86400000));return `${n} week${n===1?'':'s'} ago`}
 if(age<365*86400000){const n=Math.floor(age/(30*86400000));return `${n} month${n===1?'':'s'} ago`}
 const n=Math.floor(age/(365*86400000));return `${n} year${n===1?'':'s'} ago`;
}
export function uploadDetails(value){
 if(!value||!Number.isFinite(Date.parse(value)))return '';
 const date=new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T12:00:00':value),hasTime=/T\d{2}:\d{2}/.test(value);
 return date.toLocaleString('en-US',hasTime?{dateStyle:'long',timeStyle:'short'}:{dateStyle:'long'});
}
