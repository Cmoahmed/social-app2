import fs from 'node:fs';import cp from 'node:child_process';
const tracked=cp.execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${d}/${e.name}`):[`${d}/${e.name}`]);
const paths=[...new Set([...tracked,'.env.example','README.md','tsconfig.json','tsconfig.build.json',...walk('docs'),...walk('postman')])];
let findings=[];let largest={size:0};
const env=fs.readFileSync('.env','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{let p=l.indexOf('=');return [l.slice(0,p),l.slice(p+1).trim().replace(/^['"]|['"]$/g,'')]}).filter(([k,v])=>/SECRET|TOKEN|PASSWORD|CLIENT_ID/.test(k)&&v.length>=12&&!/^(replace|test-|mock-)/.test(v));
for(const p of paths){const t=fs.readFileSync(p,'utf8'),size=fs.statSync(p).size;if(size>largest.size)largest={path:p,size};for(const [key,value] of env)if(t.includes(value))findings.push({path:p,kind:'Matches private local '+key});for(const [kind,re]of Object.entries({privateKey:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,githubToken:/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/,googleSecret:/GOCSPX-[A-Za-z0-9_-]{20,}/,jwt:/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,credentialUri:/(?:mongodb(?:\+srv)?|https?):\/\/[^\s/@:]+:[^\s/@]+@/,machinePath:/C:\\Users\\/}))if(re.test(t))findings.push({path:p,kind});}
console.log(JSON.stringify({filesScanned:paths.length,findings,largest},null,2));if(findings.length)process.exitCode=1;
