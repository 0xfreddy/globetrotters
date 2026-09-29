import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const registry=JSON.parse(readFileSync('public/r/globetrotters.json','utf8'));
test('one-command install contains a self-contained component and dependency',()=>{
 assert.equal(registry.type,'registry:component');
 assert.ok(registry.dependencies.some(d=>d.startsWith('cobe@')));
 assert.equal(registry.files.length,1);
 assert.equal(registry.files[0].content,readFileSync('src/components/globetrotters.tsx','utf8'));
 assert.ok(!registry.files[0].content.includes('fetch('));
 assert.ok(!registry.files[0].content.includes('@/'));
});
