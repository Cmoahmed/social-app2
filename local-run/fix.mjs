import fs from 'node:fs';
const path='postman/SocialApp_Assignment.postman_collection.json';const c=JSON.parse(fs.readFileSync(path));const i=c.item[0].item[0].item.find(i=>i.name==='Malformed JSON');i.request.body.raw='{}';i.event.unshift({listen:'prerequest',script:{type:'text/javascript',exec:["pm.request.body.update('{');"]}});fs.writeFileSync(path,JSON.stringify(c,null,2)+'\n');
