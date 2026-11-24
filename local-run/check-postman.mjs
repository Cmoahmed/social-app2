import {spawn} from 'node:child_process';import {randomBytes} from 'node:crypto';import fs from 'node:fs';import newman from 'newman';
const child=spawn(process.execPath,['dist/server.js'],{env:{...process.env,PORT:'3032',NODE_ENV:'development',JWT_SECRET:randomBytes(48).toString('hex'),MONGODB_URI:'mongodb://127.0.0.1:27017/social_app_course'},windowsHide:true,stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
try{let ready=false;for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:3032/api/health');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}if(!ready)throw Error(output);
for(const k of Object.keys(process.env))if(/^(http_proxy|https_proxy|all_proxy)$/i.test(k))delete process.env[k];process.env.NO_PROXY='localhost,127.0.0.1';
const environment=JSON.parse(fs.readFileSync('postman/SocialApp_Local.postman_environment.json'));environment.values[0].value='http://127.0.0.1:3032';
await new Promise((resolve,reject)=>newman.run({collection:JSON.parse(fs.readFileSync('postman/SocialApp_Assignment.postman_collection.json')),environment,folder:'Express basics and errors',reporters:['cli']},(e,s)=>e?reject(e):s.run.failures.length?reject(Error('Newman failures')):resolve()));
}finally{child.kill();}
