import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeOrigin,validProjectId,visitorKey,matchesSecret,positiveLimit} from '../src/lib/hosted-core.ts';
test('exact origins normalize safely without wildcard or URL credential bypasses',()=>{
 assert.equal(normalizeOrigin('https://EXAMPLE.com:443/'),'https://example.com');
 assert.equal(normalizeOrigin('http://localhost:3000'),'http://localhost:3000');
 for(const origin of ['https://example.com/path','https://user:pass@example.com','http://example.com','https://example.com?x=1','https://example.com#x','null','javascript:alert(1)','*'])assert.throws(()=>normalizeOrigin(origin));
});
test('project IDs cannot inject Redis namespace delimiters',()=>{
 assert.ok(validProjectId('gt_'+'a'.repeat(24)));assert.ok(validProjectId('self'));
 for(const id of ['gt_x','gt_:other','../self','self:active','*'])assert.equal(validProjectId(id),false);
});
test('visitor identifiers are scoped to each project and secret',()=>{
 assert.notEqual(visitorKey('a','same-visitor','secret'),visitorKey('b','same-visitor','secret'));
 assert.notEqual(visitorKey('a','same-visitor','secret'),visitorKey('a','same-visitor','rotated'));
 assert.equal(visitorKey('a','same-visitor','secret').length,64);
});
test('blank credentials never authorize, and configured limits cannot be negative',()=>{
 assert.equal(matchesSecret('',''),false);assert.equal(matchesSecret('x','x'),true);assert.equal(matchesSecret('x','y'),false);
 for(const value of ['-1','0','garbage','Infinity'])assert.equal(positiveLimit(value,100),100);
 assert.equal(positiveLimit('250',100),250);
});
