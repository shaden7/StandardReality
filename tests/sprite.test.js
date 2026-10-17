import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createSpriteService} from '../sprite-service.js';

const listen=async server=>{server.listen(0,'127.0.0.1');await once(server,'listening');return server.address().port;};
test('sprite API generates transparent PNG once and serves cached art',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'standardreality-sprites-'));
 t.after(async()=>{assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep));await rm(directory,{recursive:true,force:true});});
 let calls=0,payload;
 const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),Buffer.alloc(32)]);
 const provider=http.createServer(async(req,res)=>{
  calls++;let body='';for await(const chunk of req)body+=chunk;payload=JSON.parse(body);
  res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({data:[{b64_json:png.toString('base64')}]}));
 });
 const providerPort=await listen(provider);t.after(()=>provider.close());
 const app=http.createServer(createSpriteService({directory,apiKey:'test-key',model:'gpt-image-2.5-flare',endpoint:`http://127.0.0.1:${providerPort}/images/generations`}));
 const appPort=await listen(app);t.after(()=>app.close());
 const url=`http://127.0.0.1:${appPort}`;
 const post=name=>fetch(url+'/api/sprite',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name})});
 let response=await post('Banane');assert.equal(response.status,200);
 const first=await response.json();assert.match(first.url,/^\/api\/sprites\/[a-f0-9]{64}\.png$/);
 assert.equal(payload.background,'transparent');assert.equal(payload.output_format,'png');assert.equal(payload.model,'gpt-image-2.5-flare');
 response=await fetch(url+first.url);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await response.arrayBuffer()),png);
 response=await post('banane');assert.equal(response.status,200);assert.equal((await response.json()).url,first.url);assert.equal(calls,1);
 response=await post('../bad');assert.equal(response.status,400);assert.equal(calls,1);
});
