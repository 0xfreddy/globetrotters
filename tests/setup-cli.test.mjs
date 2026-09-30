import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
test('self-host CLI provisions isolated resources, wires variables, and never prints its generated secret',()=>{
 const dir=mkdtempSync(join(tmpdir(),'gt-cli-test-')),log=join(dir,'calls.jsonl');
 mkdirSync(join(dir,'bin'));
 writeFileSync(join(dir,'bin','railway'),`#!/usr/bin/env node\nconst fs=require('node:fs');const a=process.argv.slice(2);fs.appendFileSync(process.env.GT_TEST_LOG,JSON.stringify({args:a,cwd:process.cwd()})+'\\n');if(a[0]==='init')console.log(JSON.stringify({id:'test-project',name:'test'}));else if(a[0]==='domain')console.log(JSON.stringify({domain:'https://tracker.example'}));else if(a[0]==='add')console.log('{}');\n`,{mode:0o755});
 try{
 const result=spawnSync(process.execPath,[resolve('packages/setup/index.mjs'),'--site','https://www.example.com','--workspace','workspace-id','--no-wait'],{encoding:'utf8',env:{...process.env,PATH:join(dir,'bin')+':'+process.env.PATH,GT_TEST_LOG:log}});
 assert.equal(result.status,0,result.stderr);
 const calls=readFileSync(log,'utf8').trim().split('\n').map(JSON.parse);
 const app=calls.find(c=>c.args.includes('--repo'));
 assert.ok(app.args.includes('SELF_HOSTED_ORIGIN=https://www.example.com'));
 assert.ok(app.args.includes('REDIS_URL=${{Redis.REDIS_URL}}'));
 assert.ok(app.args.includes('HOSTED_ENABLED=false'));
 const secret=app.args.find(a=>a.startsWith('TRACKING_SECRET=')).split('=')[1];assert.equal(secret.length,64);assert.ok(!result.stdout.includes(secret));
 assert.ok(calls.find(c=>c.args[0]==='init').args.includes('workspace-id'));
 assert.notEqual(app.cwd,process.cwd(),'must not relink the user app');
 assert.match(result.stdout,/projectId=self/);assert.match(result.stdout,/tracker.example/);
 rmSync(app.cwd,{recursive:true,force:true});
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('self-host CLI rejects non-origin URLs before calling Railway',()=>{
 const result=spawnSync(process.execPath,['packages/setup/index.mjs','--site','https://example.com/path'],{encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stderr,/without a path/);
});
