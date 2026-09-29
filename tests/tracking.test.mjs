import { test } from 'node:test';
import assert from 'node:assert/strict';
import { session, country } from '../src/lib/tracking.ts';
process.env.TRACKING_SECRET='unit-test-secret-not-for-production';

test('signed visitor cookies round-trip and deduplicate refreshes',()=>{
 const first=session();
 assert.match(first.id,/^[a-f0-9-]{36}$/);
 assert.deepEqual(session(first.value),first);
});
test('tampered or malformed cookies rotate to a fresh session',()=>{
 const first=session();
 for(const value of ['', 'invalid', first.id+'.'+'0'.repeat(64), 'bad.'+'a'.repeat(64)])assert.notEqual(session(value).id,first.id);
});
test('country headers are ignored without explicit trusted-edge configuration',()=>{
 delete process.env.TRUSTED_COUNTRY_HEADER;delete process.env.GEOIP_PROVIDER;
 assert.equal(country(new Headers({'x-vercel-ip-country':'US','cf-ipcountry':'GB'})),'unknown');
});
test('only valid ISO countries from the configured header are accepted',()=>{
 process.env.TRUSTED_COUNTRY_HEADER='x-test-country';
 assert.equal(country(new Headers({'x-test-country':'gb'})),'GB');
 for(const code of ['XX','T1','ZZ','US,GB',''])assert.equal(country(new Headers({'x-test-country':code})),'unknown');
 delete process.env.TRUSTED_COUNTRY_HEADER;
});
test('Railway lookup stays local and unknown addresses are never fabricated',()=>{
 process.env.GEOIP_PROVIDER='railway';
 assert.equal(country(new Headers({'x-real-ip':'127.0.0.1'})),'unknown');
 assert.equal(country(new Headers({'x-real-ip':'not-an-ip'})),'unknown');
 assert.match(country(new Headers({'x-real-ip':'8.8.8.8'})),/^[A-Z]{2}$/);
 delete process.env.GEOIP_PROVIDER;
});
