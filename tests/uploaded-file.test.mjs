import test from 'node:test';
import assert from 'node:assert/strict';
import {typescriptLoader} from './helpers/load-typescript.mjs';
const {normalizeUploadedFile}=typescriptLoader()('app/lib/uploaded-file.ts');
test('normal estimator accepts both supported upload URL shapes without losing file metadata',()=>{
  assert.deepEqual(normalizeUploadedFile({name:'photo.jpg',url:'https://example.invalid/photo.jpg',type:'image/jpeg',serverData:{}}),{name:'photo.jpg',url:'https://example.invalid/photo.jpg',type:'image/jpeg'});
  assert.equal(normalizeUploadedFile({name:'plan.pdf',ufsUrl:'https://example.invalid/plan.pdf'}).url,'https://example.invalid/plan.pdf');assert.throws(()=>normalizeUploadedFile({name:'missing-url'}));assert.throws(()=>normalizeUploadedFile(null));
});
