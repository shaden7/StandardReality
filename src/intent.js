// An intent is a proposal, never authority to mutate world state.
const directions={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0],norden:[0,-1],süden:[0,1],osten:[1,0],westen:[-1,0]};
export function validateProposal(value,world){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Proposal must be an object');
 const type=value.type;
 if(type==='move'){
   if(!Number.isInteger(value.dx)||!Number.isInteger(value.dy)||Math.abs(value.dx)+Math.abs(value.dy)!==1)throw Error('Invalid movement');
   return {type,dx:value.dx,dy:value.dy};
 }
 if(type==='toggleGenerator')return {type};
 if(type==='repair'||type==='observe')return {type};
 if(type==='createItem'){
   if(typeof value.name!=='string'||!/^[\p{L}\p{N}][\p{L}\p{N} '-]{0,39}$/u.test(value.name.trim()))throw Error('Invalid object name');
   return {type,name:value.name.trim()};
 }
 if(type==='pickup'||type==='drop'){
   if(!world.entities.some(e=>e.id===value.targetId&&e.kind==='item'))throw Error('Unknown item');
   return {type,targetId:value.targetId};
 }
 if(type==='speak'){
   if(typeof value.text!=='string'||!value.text.trim()||value.text.length>300)throw Error('Invalid speech');
   return {type,text:value.text.trim()};
 }
 if(type==='give'){
   if(!world.entities.some(e=>e.id===value.targetId&&e.kind==='item')||!world.entities.some(e=>e.id===value.recipientId&&e.kind==='person'))throw Error('Unknown transfer target');
   return {type,targetId:value.targetId,recipientId:value.recipientId};
 }
 if(type==='wait')return {type};
 throw Error('Unsupported action: '+String(type));
}
export function localInterpret(intent,world){
 const text=intent.trim().toLowerCase();
 const dir=Object.entries(directions).find(([word])=>new RegExp('\\b'+word+'\\b','u').test(text));
 if(dir&&/go|move|walk|geh|lauf|step|nach|to|toward/.test(text))return {type:'move',dx:dir[1][0],dy:dir[1][1]};
 if(/generator|aggregat|stromversorgung|hauptschalter/.test(text)&&/off|on|aus|ein|schalt|switch|toggle|stop|start/.test(text))return {type:'toggleGenerator'};
 if(/repair|reparier|fix/.test(text)&&/generator|engine|motor/.test(text))return {type:'repair'};
 if(/^(observe|look|beobachte|schau)$/i.test(text))return {type:'observe'};
 if(/^(wait|warten|tick|z)$/i.test(text))return {type:'wait'};
 const item=world.entities.find(e=>e.kind==='item'&&text.includes(e.name.toLowerCase().split(' ').at(-1)));
 if(item&&/take|pick|grab|nimm|heb|aufheben|steck/.test(text))return {type:'pickup',targetId:item.id};
 if(item&&/drop|release|leg|wirf|fallen/.test(text)&&(!/floor|ground|boden/.test(text)||world.entities[0].carrying===item.id))return {type:'drop',targetId:item.id};
 const placed=intent.match(/(?:throw|toss|place|drop|werfe|wirf|lege|platziere)\s+(?:(?:a|an|the|ein|eine|einen|einem|einer)\s+)?([\p{L}\p{N}][\p{L}\p{N} '-]{0,39}?)\s+(?:on|onto|auf|to)\s+(?:(?:the|den|dem|der|die)\s+)?(?:floor|ground|boden)\b/iu);
 const made=intent.match(/(?:create|spawn|erschaffe|erzeuge)\s+(?:(?:a|an|the|ein|eine|einen)\s+)?([\p{L}\p{N}][\p{L}\p{N} '-]{0,39})$/iu);
 const newName=(placed?.[1]||made?.[1])?.trim();
 if(newName)return {type:'createItem',name:newName};
 const recipient=world.entities.find(e=>e.kind==='person'&&e.id!=='player'&&text.includes(e.id));
 if(item&&recipient&&/give|hand|gib|übergeb/.test(text))return {type:'give',targetId:item.id,recipientId:recipient.id};
 if(/^(say|sage|sag|ruf|shout|tell)\b/i.test(text))return {type:'speak',text:intent.replace(/^(say|sage|sag|ruf|shout|tell)\s*/i,'')};
 return null;
}
export async function interpretIntent(intent,world){
 const fallback=localInterpret(intent,world);
 if(fallback?.type==='createItem')return {proposal:validateProposal(fallback,world),source:'local'};
 try{
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),35000);
   let response;
   try{response=await fetch('/api/interpret',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({intent,world:{entities:world.entities,systems:world.systems,room:world.entities.find(e=>e.id==='player'),tick:world.tick}}),signal:controller.signal});}
   finally{clearTimeout(timer);}
   if(response.status===503){
    let detail;
    try{detail=(await response.json()).error;}catch{}
    return {proposal:fallback?validateProposal(fallback,world):null,source:'local',error:typeof detail==='string'?detail:'AI server is not configured'};
   }
   if(!response.ok){
    let detail;
    try{detail=(await response.json()).error;}catch{}
    throw Error(typeof detail==='string'?detail:'AI request failed: '+response.status);
   }
   const answer=await response.json();
   if(answer.proposal?.type==='unsupported')return {proposal:null,source:'llm'};
   return {proposal:validateProposal(answer.proposal,world),source:'llm'};
 }catch(error){return {proposal:fallback?validateProposal(fallback,world):null,source:'local',error:error.message};}
}
