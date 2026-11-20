// No network or publication. Exercise the production loader on isolated records.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),{webcrypto}=require('crypto');
const layout=fs.readFileSync(process.argv[2]||'app/layout-r3.js','utf8');
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v!==null&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v)}
const fixtures=process.argv[3]?JSON.parse(fs.readFileSync(process.argv[3],'utf8')):[...JSON.parse(fs.readFileSync('app/index.html','utf8').match(/const RECIPES=(\[.*?\]);/s)[1]),...JSON.parse(fs.readFileSync('app/data/approved-r4-1.json','utf8')).recipes].map(row=>({row,sha256:require('crypto').createHash('sha256').update(canonical(row)).digest('hex')}));
const code=layout.slice(layout.indexOf('function publicationFingerprint'));
const baseline=fixtures.map(x=>x.row),first=baseline[0];
const correction={...first,name:'Synthetic isolated correction',ingredients:['1 g test ingredient'],steps:['Synthetic test only'],photo:null,reviewedRecordSha256:'a'.repeat(64),publicationUpdate:{baseAppSha256:fixtures[0].sha256,previousAppSha256:fixtures[0].sha256,reviewedDigest:'a'.repeat(64)}};
async function run(feed){
 const sandbox={RECIPES:structuredClone(baseline),CATEGORIES:[],recipeSearchCache:null,pantryIndexCache:null,draw(){},openRecipeDeepLink(){},window:{},crypto:webcrypto,TextEncoder,URL,console:{warn(){},error(...args){throw Error(args.join(' '))}},fetch:async()=>({ok:true,json:async()=>({schema:'sapore.app.published.v1',recipes:feed})})};
 vm.createContext(sandbox);vm.runInContext(code,sandbox);await sandbox.loadPublishedRecipesR15();return sandbox;
}
(async()=>{
 const env=await run([correction]);assert.equal(env.RECIPES.length,baseline.length);assert.equal(env.RECIPES[0].name,correction.name);assert.equal(env.window.__saporePublicationImport.updated,1);
 for(const fixture of fixtures)assert.equal(await env.saporeRecordSha256(fixture.row),fixture.sha256,'Python/browser hash parity '+fixture.row.id);
 const rejected=await run([{...correction,publicationUpdate:{...correction.publicationUpdate,baseAppSha256:'0'.repeat(64)}}]);assert.equal(rejected.RECIPES[0].name,first.name);assert.equal(rejected.window.__saporePublicationImport.updated,0);
 const second={...correction,ingredients:['2 g test ingredient'],reviewedRecordSha256:'b'.repeat(64),publicationUpdate:{...correction.publicationUpdate,previousAppSha256:await env.saporeRecordSha256(correction),reviewedDigest:'b'.repeat(64)}};
 const updated=await run([second]);assert.equal(updated.RECIPES[0].ingredients[0],'2 g test ingredient');assert.equal(updated.RECIPES.length,baseline.length);
 const corrupt=await run([{...correction,ingredients:[]}]);assert.equal(corrupt.RECIPES[0].name,first.name);
 console.log(JSON.stringify({status:'PASS',hashParity:fixtures.length,checks:['stable ID update','stale hash rejected','second revision baseline preserved','incomplete update rejected']}));
})().catch(e=>{console.error(e);process.exit(1)});
