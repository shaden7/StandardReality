// Generated art is a cached presentation asset. It never edits canonical world state.
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';

const MAX_IMAGE_BYTES=8*1024*1024;
const PNG_SIGNATURE=Buffer.from('89504e470d0a1a0a','hex');
const validName=name=>typeof name==='string'&&/^[\p{L}\p{N}][\p{L}\p{N} '-]{0,39}$/u.test(name.trim());
const send=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));};
const keyFor=(name,model)=>createHash('sha256').update('sprite-v1\n'+model+'\n'+name.toLocaleLowerCase()).digest('hex');

export function createSpriteService({
 directory=process.env.SPRITE_DIR||'generated-sprites',
 model=process.env.OPENAI_IMAGE_MODEL||'gpt-image-2.5-flare',
 endpoint=process.env.OPENAI_IMAGE_BASE_URL||'https://api.openai.com/v1/images/generations',
 apiKey=process.env.OPENAI_API_KEY,
 fetchImage=fetch
}={}){
 const folder=resolve(directory),pending=new Map();
 async function cached(key){try{return await readFile(join(folder,key+'.png'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 async function generate(name,key){
  const existing=await cached(key);if(existing)return;
  if(pending.has(key))return pending.get(key);
  if(pending.size>=2)throw Object.assign(Error('Image queue is full'),{status:429});
  const task=(async()=>{
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);
   let response;
   try{
    response=await fetchImage(endpoint,{method:'POST',headers:{authorization:'Bearer '+apiKey,'content-type':'application/json'},body:JSON.stringify({
     model,
     prompt:`One single ${name} as a clear, compact top-down pixel-art game item for a worn industrial science-fiction crawler. Centered, complete object, strong recognizable silhouette, restrained colors, no people, no scene, no floor, no shadow, no text. Transparent background.`,
     size:'1024x1024',quality:'low',background:'transparent',output_format:'png',n:1
    }),signal:controller.signal});
   }finally{clearTimeout(timeout);}
   if(!response.ok)throw Object.assign(Error('Image provider returned HTTP '+response.status),{status:502});
   const data=await response.json(),b64=data.data?.[0]?.b64_json;
   if(typeof b64!=='string'||b64.length>MAX_IMAGE_BYTES*2)throw Object.assign(Error('Invalid image response'),{status:502});
   const bytes=Buffer.from(b64,'base64');
   if(bytes.length>MAX_IMAGE_BYTES||!bytes.subarray(0,8).equals(PNG_SIGNATURE))throw Object.assign(Error('Invalid PNG response'),{status:502});
   await mkdir(folder,{recursive:true});
   await writeFile(join(folder,key+'.png'),bytes);
  })();
  pending.set(key,task);
  try{await task;}finally{pending.delete(key);}
 }
 return async function handle(req,res){
  if(req.method==='GET'&&/^\/api\/sprites\/[a-f0-9]{64}\.png$/.test(req.url||'')){
   const key=req.url.slice('/api/sprites/'.length,-4),bytes=await cached(key);
   if(!bytes){send(res,404,{error:'Sprite not found'});return;}
   res.writeHead(200,{'content-type':'image/png','content-length':bytes.length,'cache-control':'public, max-age=31536000, immutable','x-content-type-options':'nosniff'});res.end(bytes);return;
  }
  if(req.url!=='/api/sprite'||req.method!=='POST'){send(res,404,{error:'Not found'});return;}
  if(!apiKey){send(res,503,{error:'No API key configured for image generation'});return;}
  try{
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>512){send(res,413,{error:'Request too large'});return;}}
   const {name}=JSON.parse(raw);
   if(!validName(name)){send(res,400,{error:'Invalid item name'});return;}
   const key=keyFor(name.trim(),model),wasCached=!!(await cached(key));
   await generate(name.trim(),key);
   send(res,200,{url:'/api/sprites/'+key+'.png',cached:wasCached});
  }catch(e){send(res,e.status||502,{error:e.name==='AbortError'?'Image generation timed out':e.message==='Image queue is full'||e.message?.startsWith('Image provider returned HTTP ')?e.message:'Image generation failed'});}
 };
}
