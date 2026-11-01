import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceAmount } from './advance-amount.ts';
test('zero/insufficient limit clears stale one-million display and submission amount',()=>{
 for(const limit of [0,-1,99000,NaN])assert.equal(advanceAmount(1000000,limit),0);
});
test('amount remains inside current limit when enrollment changes',()=>{
 assert.equal(advanceAmount(1000000,250000),250000);
 assert.equal(advanceAmount(1000000,251999),250000);
 assert.equal(advanceAmount(0,250000),100000);
 assert.equal(advanceAmount(150000,250000),150000);
});
