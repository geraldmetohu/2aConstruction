export const asOf = '2026-01-01T00:00:00.000Z';
export const quoteCatalogue = {
  settings: { id:'settings',effectiveFrom:asOf,currency:'GBP',markupPercent:'0',wastePercent:'0',contingencyPercent:'0',roundingPolicyVersion:'GBP_LINE_HALF_UP_V1' },
  units: [{id:'each',code:'ea',label:'each',dimensionKind:'COUNT',canonicalFactor:null,quantityScale:0,archived:false}],
  items: [{id:'door',code:'DOOR',name:'Internal door',description:'Standard door',unitId:'each',itemType:'ASSEMBLY',fixStage:'SECOND_FIX',active:true,archived:false,categoryArchived:false,defaultQuantity:'1',defaultDurationHours:null}],
  prices: [{id:'price',itemId:'door',effectiveFrom:asOf,currency:'GBP',versionNumber:1,materialUnitCost:'100',labourUnitCost:'40',plantUnitCost:'0',wasteUnitCost:'0',otherUnitCost:'0',taxCodeId:'vat',source:'Synthetic fixture',confidence:'VERIFIED'}],
  recipes: [], labourRoles:[{id:'carpenter',name:'Carpenter',archived:false}],labourRates:[{id:'rate',roleId:'carpenter',effectiveFrom:asOf,currency:'GBP',hourlyCost:'25',dailyCost:'200',productiveHoursPerDay:'8'}],
  taxCodes:[{id:'vat',label:'Standard VAT',active:true,archived:false},{id:'zero',label:'Configured zero VAT',active:true,archived:false}],taxRates:[{id:'tax',taxCodeId:'vat',effectiveFrom:asOf,rate:'20'},{id:'tax-zero',taxCodeId:'zero',effectiveFrom:asOf,rate:'0'}],options:[],optionVersions:[],
};
export const quoteInput = {asOf,currency:'GBP',lines:[{key:'a',type:'ITEM',itemId:'door',condition:'NEW_INSTALLATION',quantity:{kind:'EXPLICIT',value:'2'}}]};
export const quoteDoc = {
  title:'Internal refurbishment',customerName:'Preview Customer',customerEmail:'preview@example.invalid',address:'Example property\nLondon',validUntil:'2099-12-31',terms:'Subject to survey and written agreement before work starts.',
  assumptions:['Existing openings are sound.'],exclusions:['Decoration to adjoining rooms.'],sectionOrder:['Second fix'],roomOrder:['Bedroom'],stageOrder:['Installation'],
  lines:[{input:quoteInput.lines[0],description:'Supply and fit internal doors',section:'Second fix',room:'Bedroom',stage:'Installation',overrides:{},overrideReason:''}],
};
