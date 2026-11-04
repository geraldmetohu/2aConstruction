import test from 'node:test';
import assert from 'node:assert/strict';
import {typescriptLoader} from './helpers/load-typescript.mjs';
const {addCalendarDays,londonDate,planWorkingDates}=typescriptLoader()('app/lib/company-settings/defaults.ts');
const defaults={versionId:'10000000-0000-4000-8000-000000000001',quoteValidityDays:14,invoiceTermsDays:21,workdayHours:8,defaultTeamSize:2,workingDays:[1,2,3,4,5]};
test('calendar terms cross leap days, months and daylight-saving changes without shifting dates',()=>{
  assert.equal(addCalendarDays('2028-02-28',2),'2028-03-01');assert.equal(addCalendarDays('2026-03-28',2),'2026-03-30');assert.equal(addCalendarDays('2026-12-31',14),'2027-01-14');assert.equal(londonDate(new Date('2026-06-01T23:30:00Z')),'2026-06-02');assert.throws(()=>addCalendarDays('2026-02-30',1));assert.throws(()=>addCalendarDays('2026-01-01',-1));
});
test('schedule suggestions use person-hours, team size and working days, leaving the input unchanged',()=>{
  const saved=JSON.stringify(defaults);assert.deepEqual(planWorkingDates('2026-10-02',32,defaults),{start:'2026-10-02',end:'2026-10-05',workingDays:2});assert.deepEqual(planWorkingDates('2026-10-03',1,defaults),{start:'2026-10-05',end:'2026-10-05',workingDays:1});assert.deepEqual(planWorkingDates('2026-10-03',32,{...defaults,workingDays:[6,7]}),{start:'2026-10-03',end:'2026-10-04',workingDays:2});assert.equal(JSON.stringify(defaults),saved);assert.throws(()=>planWorkingDates('2026-10-03',32,{...defaults,workingDays:[]}));assert.throws(()=>planWorkingDates('2026-10-03',0,defaults));
});
