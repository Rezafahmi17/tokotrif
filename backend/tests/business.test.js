import {test} from 'node:test';import assert from 'node:assert/strict';
import {assertTransition} from '../src/services/orderStateMachine.js';
import {pageOptions,slugify} from '../src/utils/common.js';
test('aliran pesanan COD valid',()=>{
 assert.equal(assertTransition('pending','confirm','admin_toko'),'confirmed');
 assert.equal(assertTransition('confirmed','paid','admin_toko'),'paid');
 assert.equal(assertTransition('paid','received','customer'),'completed');
});
test('konfirmasi lunas dua kali atau customer terlalu dini ditolak',()=>{
 assert.throws(()=>assertTransition('paid','paid','admin_toko'),e=>e.status===409);
 assert.throws(()=>assertTransition('pending','paid','admin_toko'),e=>e.status===409);
 assert.throws(()=>assertTransition('confirmed','customer_cancel','customer'),e=>e.status===409);
});
test('pagination membatasi input',()=>{assert.deepEqual(pageOptions({page:'-2',limit:'999'}),{page:1,limit:60,offset:0});});
test('slug aman untuk URL',()=>{assert.equal(slugify('Tas Kanvas Premium!'),'tas-kanvas-premium');});
