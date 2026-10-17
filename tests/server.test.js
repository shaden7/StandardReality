import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const listen=async server=>{server.listen(0,'127.0.0.1');await once(server,'listening');return server.address().port;};
const requestBody={intent:'turn off engine',world:{entities:[{id:'player',kind:'person',x:3,y:9}],systems:{generatorOn:true},tick:0}};

test('gpt-6-luna request and provider errors',async t=>{
 let providerResponse={status:200,body:{choices:[{message:{content:'{"proposal":{"type":"toggleGenerator"}}'}}]}};
 let sentBody;
 const provider=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  sentBody=JSON.parse(body);
  res.writeHead(providerResponse.status,{'content-type':'application/json'});
  res.end(JSON.stringify(providerResponse.body));
 });
 const providerPort=await listen(provider);
 t.after(()=>provider.close());

 const probe=http.createServer();const appPort=await listen(probe);await new Promise(resolve=>probe.close(resolve));
 const child=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,OPENAI_API_KEY:'test-secret-key',OPENAI_MODEL:'gpt-6-luna',OPENAI_BASE_URL:`http://127.0.0.1:${providerPort}`,PORT:String(appPort)},stdio:'ignore'});
 t.after(()=>child.kill());
 const url=`http://127.0.0.1:${appPort}/api/interpret`;
 let response;
 for(let attempt=0;attempt<40;attempt++){
  try{response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestBody)});break;}
  catch{await new Promise(resolve=>setTimeout(resolve,50));}
 }
 assert.ok(response,'server started');
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{proposal:{type:'toggleGenerator'},usage:null});
 assert.equal(sentBody.model,'gpt-6-luna');
 assert.equal(sentBody.reasoning_effort,'none');
 assert.equal('temperature' in sentBody,false);

 providerResponse={status:200,body:{choices:[{message:{content:'{"proposal":{"type":"observe"},"reason":"Check the workshop"}'}}],usage:{total_tokens:27}}};
 response=await fetch(`http://127.0.0.1:${appPort}/api/agent-decision`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({view:{actorId:'mara',visibleEntities:[],knowledge:{generatorOn:{value:false,source:'observed'}}}})});
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{proposal:{type:'observe'},reason:'Check the workshop',usage:{total_tokens:27}});
 assert.equal(sentBody.messages[0].role,'system');
 assert.equal(JSON.parse(sentBody.messages[1].content).actorId,'mara');
 assert.equal('world' in JSON.parse(sentBody.messages[1].content),false);

 providerResponse={status:400,body:{error:{message:'Unsupported value: test-secret-key'}}};
 response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestBody)});
 assert.equal(response.status,502);
 const failure=await response.json();
 assert.match(failure.error,/OpenAI HTTP 400: Unsupported value/);
 assert.match(failure.error,/\[redacted\]/);
 assert.doesNotMatch(failure.error,/test-secret-key/);
});
