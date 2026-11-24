import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
const collection = JSON.parse(readFileSync('postman/SocialApp_Assignment.postman_collection.json', 'utf8'));
const environment = JSON.parse(readFileSync('postman/SocialApp_Local.postman_environment.json', 'utf8'));
assert.equal(collection.info.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
assert.equal(collection.item.length, 2);
assert.equal(collection.item[0].name, 'Social App - New Assignment');
assert.equal(collection.item[0].item.length, 8);
const known = new Set(environment.values.map(v => v.key));
let requests = 0;
const walk = items => items.forEach(item => {
  if (item.item) return walk(item.item);
  requests++;
  assert.ok(item.request.method && item.request.url.startsWith('{{baseUrl}}/api/'));
  if (item.request.body) JSON.parse(item.request.body.raw);
  for (const match of JSON.stringify(item.request).matchAll(/\{\{(\w+)\}\}/g)) assert.ok(known.has(match[1]), `Missing variable ${match[1]}`);
  item.event.forEach(event => new Script(event.script.exec.join('\n')));
});
walk([collection.item[0]]);
for (const value of environment.values) if (value.key !== 'baseUrl') assert.equal(value.value, '', `Committed secret or identity: ${value.key}`);
const files = root => readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(`${root}/${entry.name}`) : [`${root}/${entry.name}`]);
const source = [...files('src'), ...files('course-examples')].map(file => readFileSync(file, 'utf8')).join('\n');
const map = readFileSync('docs/QUESTION_MAP.md', 'utf8');
for (let q = 1; q <= 43; q++) {
  assert.match(source, new RegExp(`// Question ${q}:`));
  assert.ok(map.includes(`| ${q} |`));
}
console.log(`Validated ${requests} Postman requests, 8 folders, empty environment secrets, scripts, and all 43 question references.`);

const assignment2 = JSON.parse(readFileSync('postman/Assignment2_Posts_Comments.postman_collection.json', 'utf8'));
const assignment2Env = JSON.parse(readFileSync('postman/Assignment2_Local.postman_environment.json', 'utf8'));
assert.equal(assignment2.info.schema, collection.info.schema);
assert.equal(assignment2.item.length, 1);
assert.deepEqual(assignment2.item[0], collection.item[1]);
assert.equal(assignment2.item[0].name, 'Assignment 2 - Posts & Comments CRUD');
assert.equal(assignment2.item[0].item.length, 5);
known.clear();
for (const { key, value } of assignment2Env.values) {
  known.add(key);
  if (!['baseUrl', 'missingId'].includes(key)) assert.equal(value, '', `Committed Assignment 2 value: ${key}`);
}
requests = 0;
walk(assignment2.item);
assert.equal(requests, 51);
const assignment2Map = readFileSync('docs/ASSIGNMENT2_QUESTION_MAP.md', 'utf8');
for (let q = 1; q <= 10; q++) {
  assert.match(source, new RegExp(`// Assignment 2 - Question ${q}:`));
  assert.ok(assignment2Map.includes(`| ${q} |`));
}
console.log(`Validated ${requests} Assignment 2 requests, 5 folders, environment, scripts, and all 10 question references.`);
