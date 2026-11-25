// Shared R3 layout: display existing fields only; never infer culinary values.
let recipeStepColumns='one';
const RECIPE_UI_ICONS={
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
 oven:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M7 6.5h.01M11 6.5h.01M7 13h10v5H7z"/>',
 thermometer:'<path d="M9 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z"/><path d="M12 8v9"/>',
 portions:'<path d="M4 3v5c0 3 6 3 6 0V3M7 3v18M17 13V3c-4 2-4 9 0 10Zm0 0v8"/>',
 rest:'<path d="M6 3h12M6 21h12M7 3v4l10 10v4M17 3v4L7 17v4"/>',
 source:'<path d="m10 13 4-4M8.5 15.5l-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0M12.5 8.5l1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0"/>',
 pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
 print:'<path d="M7 8V3h10v5M7 17H4V8h16v9h-3M7 14h10v7H7zM17 11h.01"/>',
 rows:'<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
 columns:'<rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/>'
};
function recipeIcon(name){return `<svg class="r3Icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${RECIPE_UI_ICONS[name]||RECIPE_UI_ICONS.clock}</svg>`;}
function recipeURL(value){try{const u=new URL(String(value||''));return /^https?:$/.test(u.protocol)?u.href:''}catch(_){return ''}}
function recipeSource(r){const url=recipeURL(r.source);if(!url)return '';const host=new URL(url).hostname.replace(/^www\./,'');const label=/(^|\.)giallozafferano\.(it|com|es|com\.br)$/.test(host)?'GialloZafferano':host;return `<p class="r3Source">${recipeIcon('source')}<span><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Fonte: ${esc(label)} ↗</a>${r.author?`<small>${esc(r.author)}</small>`:''}</span></p>`;}
function recipeMetrics(r){const fields=[['portions','Porzioni',r.serves],['clock','Preparazione',r.prep],['oven','Cottura',r.cook],['thermometer','Temperatura',r.temperature]];const metrics=fields.filter(([, ,value])=>value!==undefined&&value!==null&&String(value).trim()!=='').map(([icon,label,value])=>`<div class="r3Metric">${recipeIcon(icon)}<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div></div>`).join('');return metrics||r.rest?`<dl class="r3Metrics" aria-label="Porzioni, tempi e temperatura">${metrics}${r.rest?`<div class="r3Metric r3Rest">${recipeIcon('rest')}<div><dt>Riposi</dt><dd>${esc(r.rest)}</dd></div></div>`:''}</dl>`:'';}
function recipeMethod(r){const steps=preparationSteps(r.steps);return `<section class="r3Method" aria-labelledby="preparationTitle"><div class="r3SectionHeading r3PreparationHeading"><h2 id="preparationTitle">Preparazione</h2><span>${steps.length} passaggi</span><div class="r3StepSwitch" role="group" aria-label="Disposizione del procedimento"><button type="button" data-step-columns="one" aria-controls="preparationRows" aria-pressed="${recipeStepColumns==='one'}">${recipeIcon('rows')}In fila</button><button type="button" data-step-columns="two" aria-controls="preparationRows" aria-pressed="${recipeStepColumns==='two'}">${recipeIcon('columns')}2 colonne</button></div><button type="button" class="r3Print" id="printRecipe" aria-label="Stampa la ricetta o salvala come PDF">${recipeIcon('print')}Stampa</button></div><ol class="r3Steps" id="preparationRows" role="list" data-columns="${recipeStepColumns}">${steps.map((text,i)=>`<li class="step"><i aria-hidden="true">${String(i+1).padStart(2,'0')}</i><span>${esc(text)}</span></li>`).join('')}</ol><p class="r3StepHint">In fila oppure su due colonne, da sinistra a destra e poi alla riga successiva.</p>${r.notes?`<section class="r3Notes"><h2>Note</h2><p>${esc(r.notes)}</p></section>`:''}${r.story?`<details class="r3Details"><summary>Storia e contesto della ricetta</summary><p>${esc(r.story)}</p></details>`:''}</section>`;}
function setRecipeColumns(value){if(value!=='one'&&value!=='two')return;recipeStepColumns=value;const rows=el('preparationRows');if(rows)rows.dataset.columns=value;root.querySelectorAll('[data-step-columns]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.stepColumns===value)));}

function recipeCard(r,image){return `<article class="recipe r3Recipe" aria-labelledby="recipeTitle"><div class="r3Intro"><header class="recipeHeader"><div class="category">${esc(r.category.toUpperCase())}</div><h1 id="recipeTitle">${esc(r.name)}</h1>${recipeSource(r)}${r.origin?`<p class="r3Origin">${recipeIcon('pin')}<span>${esc(r.origin)}</span></p>`:''}</header>${recipeMetrics(r)}<figure class="photo${DRIVE_PHOTOS[r.id]||(r.photo&&r.photoCreditUrl&&r.photoLicense)?'':' noPhoto'}"><div class="imageWrap">${image}</div>${r.photoCreditUrl&&recipeURL(r.photoCreditUrl)?`<figcaption class="photoCaption"><a href="${esc(recipeURL(r.photoCreditUrl))}" target="_blank" rel="noopener noreferrer">${esc(r.photoAuthor||'Fonte fotografia')} ↗</a><span>${esc(r.photoLicense||'')}${r.photoIllustrative?' · Immagine illustrativa':''}</span></figcaption>`:''}</figure>${r.description?`<p class="r3Description">${esc(r.description)}</p>`:''}</div><section class="ingredients r3Ingredients" aria-labelledby="ingredientTitle"><div class="r3SectionHeading"><h2 id="ingredientTitle">Ingredienti</h2>${r.serves?`<span>${esc(r.serves)}</span>`:''}</div>${ingredientRows(r.ingredients)}</section>${recipeMethod(r)}</article>`}


// One initial load and at most two manual retries; no background polling.
const saporeCatalogControl={attempts:0,maxAttempts:3,inFlight:null,inline:null,reviewed:new Map(),pendingDeepLink:null};
function saporeCatalogStatus(){
  if(typeof document==='undefined')return;
  const app=document.getElementById('app');
  if(!app)return;
  let banner=document.getElementById('saporeCatalogStatus');
  if(!banner){
    banner=document.createElement('aside');banner.id='saporeCatalogStatus';banner.className='r3CatalogStatus';
    banner.setAttribute('aria-label','Stato del catalogo');
    const message=document.createElement('p');message.id='saporeCatalogMessage';message.setAttribute('role','status');message.setAttribute('aria-live','polite');
    const button=document.createElement('button');button.type='button';button.id='saporeCatalogRetry';button.textContent='Riprova';
    button.addEventListener('click',()=>{retrySaporeCatalog();});
    banner.append(message,button);app.insertBefore(banner,document.getElementById('stage'));
  }
  const state=window.__saporeCatalogLoad;
  banner.hidden=!state||state.status==='loaded';
  if(!state)return;
  banner.dataset.status=state.status;
  document.getElementById('saporeCatalogMessage').textContent=state.status==='loading'?
    'Caricamento del catalogo. Puoi già consultare le ricette disponibili.':
    'Il catalogo è incompleto. Le ricette disponibili restano consultabili.'+(state.canRetry?' Puoi riprovare a caricare le altre.':' Ricarica la pagina più tardi per riprovare.');
  const button=document.getElementById('saporeCatalogRetry');
  button.hidden=state.status==='loaded'||(!state.canRetry&&state.status!=='loading');
  button.disabled=!state.canRetry;
}
function saporeRefreshCatalog(){
  CATEGORIES.splice(0,CATEGORIES.length,...new Set(RECIPES.map(r=>r.category)));
  CATEGORIES.sort((a,b)=>a.localeCompare(b,'it'));
  recipeSearchCache=null;pantryIndexCache=null;
  if(typeof selected!=='undefined'&&selected){
    const current=RECIPES.find(r=>r.id===selected.id);
    if(current){selected=current;if(typeof category!=='undefined')category=current.category;}
  }
  const focus=typeof document!=='undefined'?document.activeElement:null;
  const cursor=focus&&typeof focus.selectionStart==='number'?[focus.selectionStart,focus.selectionEnd]:null;
  draw();
  if(focus?.id&&typeof document!=='undefined'){
    const replacement=document.getElementById(focus.id);
    if(replacement&&replacement!==focus){replacement.focus({preventScroll:true});if(cursor&&replacement.setSelectionRange)replacement.setSelectionRange(...cursor);}
  }
}
async function saporeCatalogJson(url){
  const controller=new AbortController();let timer;
  try{
    const expired=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Catalog request timeout'));},12000);});
    const request=(async()=>{const response=await fetch(url,{cache:'no-cache',signal:controller.signal});if(!response.ok)throw new Error('Catalog dataset HTTP '+response.status);return response.json();})();
    return await Promise.race([request,expired]);
  }finally{clearTimeout(timer);}
}
// Validate the whole R4.1 manifest against the immutable inline catalog, even
// when a previous degraded attempt has already imported independent R15 rows.
async function loadReviewedRecipesR41(){
  if(window.__saporeEditorialImport?.status==='loaded')return;
  try{
      if(!saporeCatalogControl.inline){
        const original=typeof SAPORE_ORIGINAL_RECORDS!=='undefined'?Array.from(SAPORE_ORIGINAL_RECORDS.values()):RECIPES;
        saporeCatalogControl.inline=JSON.parse(JSON.stringify(original));
      }
      const data=await saporeCatalogJson('data/approved-r4-1.json');
      if(data.schema!=='sapore.app.editorial-import.v1'||data.editorial_revision!=='CUR-20261117-FONTE-R4.1'||data.new_recipe_count!==54||!Array.isArray(data.recipes)||data.recipes.length!==54||!Array.isArray(data.existingMatches)||data.existingMatches.length!==10)throw new Error('Editorial dataset does not match reviewed manifest');
      if(saporeCatalogControl.inline.length!==478)throw new Error('Unexpected original recipe count');
      const normUrl=value=>{try{const u=new URL(value);return u.hostname.toLowerCase().replace(/^www\./,'')+decodeURIComponent(u.pathname).toLowerCase().replace(/\/$/,'')}catch(_){return ''}};
      const ids=new Set(saporeCatalogControl.inline.map(r=>r.id));
      const urls=new Set(saporeCatalogControl.inline.map(r=>normUrl(r.source)).filter(Boolean));
      const pendingIds=new Set();
      const pendingUrls=new Set();
      for(const r of data.recipes){
        const url=normUrl(r.source);
        if(!r.id||!r.name||!r.category||!Array.isArray(r.ingredients)||!r.ingredients.length||!Array.isArray(r.steps)||!r.steps.length||!url||ids.has(r.id)||urls.has(url)||pendingIds.has(r.id)||pendingUrls.has(url)||!r.reviewedRecordSha256||!r.baseRecordSha256)throw new Error('Invalid, incomplete or duplicate editorial recipe: '+String(r.id));
        const existing=RECIPES.find(current=>current.id===r.id);
        if(existing&&saporeCanonicalJson(existing)!==saporeCanonicalJson(r))throw new Error('Editorial identity already occupied');
        pendingIds.add(r.id);pendingUrls.add(url);
      }
      const added=data.recipes.filter(r=>!RECIPES.some(current=>current.id===r.id));
      for(const r of data.recipes)saporeCatalogControl.reviewed.set(r.id,JSON.parse(JSON.stringify(r)));
      RECIPES.push(...added);
      window.__saporeEditorialImport={status:'loaded',added:added.length,alreadyMatched:data.existingMatches.length,total:RECIPES.length,revision:data.editorial_revision};
  }catch(error){
      window.__saporeEditorialImport={status:'error',message:String(error)};
      console.error('Sapore editorial import: previous catalog kept unchanged.',error);
  }
  if(window.__saporeEditorialImport.status==='loaded')saporeRefreshCatalog();
}
function loadSaporeCatalog(){
  if(saporeCatalogControl.inFlight)return saporeCatalogControl.inFlight;
  if(window.__saporeCatalogLoad?.status==='loaded'||saporeCatalogControl.attempts>=saporeCatalogControl.maxAttempts)return Promise.resolve(window.__saporeCatalogLoad);
  if(!saporeCatalogControl.attempts){
    const hash=window.location?.hash||'',match=hash.match(/^#recipe=([A-Za-z0-9_-]+)$/);
    if(match&&!RECIPES.some(r=>r.id===match[1]))saporeCatalogControl.pendingDeepLink=hash;
  }
  saporeCatalogControl.attempts++;
  window.__saporeCatalogLoad={status:'loading',attempts:saporeCatalogControl.attempts,maxAttempts:saporeCatalogControl.maxAttempts,canRetry:false};
  saporeCatalogStatus();
  const promise=(async()=>{
    try{
      await loadReviewedRecipesR41();
      await loadPublishedRecipesR15();
    }catch(error){console.error('Sapore catalog: loading stopped; available recipes retained.',error);}
    const complete=window.__saporeEditorialImport?.status==='loaded'&&window.__saporePublicationImport?.status==='loaded'&&!window.__saporePublicationImport.partial;
    window.__saporeCatalogLoad={status:complete?'loaded':'partial',attempts:saporeCatalogControl.attempts,maxAttempts:saporeCatalogControl.maxAttempts,canRetry:!complete&&saporeCatalogControl.attempts<saporeCatalogControl.maxAttempts};
    const pending=saporeCatalogControl.pendingDeepLink,match=pending?.match(/^#recipe=([A-Za-z0-9_-]+)$/);
    if(match&&window.location?.hash===pending&&RECIPES.some(r=>r.id===match[1])){saporeCatalogControl.pendingDeepLink=null;openRecipeDeepLink();}
    return window.__saporeCatalogLoad;
  })().finally(()=>{saporeCatalogControl.inFlight=null;saporeCatalogStatus();});
  saporeCatalogControl.inFlight=promise;window.__saporeCatalogReady=promise;
  return promise;
}
function retrySaporeCatalog(){return loadSaporeCatalog();}
window.addEventListener('DOMContentLoaded',()=>{
  window.addEventListener('hashchange',()=>{
    const hash=window.location?.hash||'',match=hash.match(/^#recipe=([A-Za-z0-9_-]+)$/);
    saporeCatalogControl.pendingDeepLink=match&&!RECIPES.some(r=>r.id===match[1])?hash:null;
  });
  if(typeof document!=='undefined'){
    document.addEventListener('click',event=>{if(!event.target.closest?.('#saporeCatalogStatus'))saporeCatalogControl.pendingDeepLink=null;});
    document.addEventListener('input',()=>{saporeCatalogControl.pendingDeepLink=null;});
  }
  return loadSaporeCatalog();
},{once:true});

// Independent publication feed: preserve the reviewed R4.1 baseline unchanged.
function publicationFingerprint(r){
  const norm=v=>String(v??'').normalize('NFC').trim().replace(/\s+/g,' ').toLowerCase();
  return JSON.stringify(['ingredients','steps','serves','prep','cook','rest','temperature'].map(k=>Array.isArray(r[k])?r[k].map(norm):norm(r[k])));
}
// R26: immutable baseline hash authorizes an overlay, keeping the original ID.
// The inline catalog snapshot precedes display-only EDITORIAL_ENRICHMENT.
function saporeCanonicalJson(value){
  if(Array.isArray(value))return '['+value.map(saporeCanonicalJson).join(',')+']';
  if(value!==null&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+saporeCanonicalJson(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
async function saporeRecordSha256(value){
  const bytes=new TextEncoder().encode(saporeCanonicalJson(value));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
}
async function loadPublishedRecipesR15(){
  try{
    const data=await saporeCatalogJson('data/published-r15.json');
    if(data.schema!=='sapore.app.published.v1'||!Array.isArray(data.recipes))throw new Error('Invalid publication manifest');
    const normUrl=value=>{try{const u=new URL(value);if(!/^https?:$/.test(u.protocol))return '';return u.hostname.toLowerCase().replace(/^www\./,'')+decodeURIComponent(u.pathname).toLowerCase().replace(/\/$/,'')}catch(_){return ''}};
    const ids=new Map(RECIPES.map(r=>[r.id,r]));
    const fingerprints=new Map(RECIPES.map(r=>[publicationFingerprint(r),r.id]));
    const sourceIds=new Map();
    for(const r of RECIPES){const u=normUrl(r.source);if(u)sourceIds.set(u,[...(sourceIds.get(u)||[]),r.id]);}
    const accepted=[],updates=[],skipped=[];
    for(const r of data.recipes){
      const reject=(reason,existingId)=>skipped.push({id:r?.id||null,reason,existingId:existingId||null});
      if(!r||typeof r.id!=='string'||!r.id||typeof r.name!=='string'||!r.name.trim()||!r.category||
         !Array.isArray(r.ingredients)||!r.ingredients.length||!r.ingredients.every(x=>typeof x==='string'&&x.trim())||
         !Array.isArray(r.steps)||!r.steps.length||!r.steps.every(x=>typeof x==='string'&&x.trim())||
         !/^[a-f0-9]{64}$/.test(r.reviewedRecordSha256||'')||r.photo!=null){reject('invalid_record');continue;}
      const url=normUrl(r.source),fp=publicationFingerprint(r);
      if(!url){reject('invalid_source');continue;}
      const proof=r.publicationUpdate;
      if(proof&&(!/^[a-f0-9]{64}$/.test(proof.baseAppSha256||'')||!/^[a-f0-9]{64}$/.test(proof.previousAppSha256||'')||proof.reviewedDigest!==r.reviewedRecordSha256)){reject('invalid_update_proof');continue;}
      // Until R4.1 is validated, an absent update ID might depend on that
      // missing baseline. With both baselines loaded, an absent ID belongs to
      // a standalone R15 publication, including its approved later revisions.
      if(proof&&!ids.has(r.id)&&window.__saporeEditorialImport?.status!=='loaded'){reject('missing_baseline');continue;}
      if(ids.has(r.id)){
        const previous=ids.get(r.id);
        if(saporeCanonicalJson(previous)===saporeCanonicalJson(r)){reject('already_present',r.id);continue;}
        const immutable=typeof SAPORE_ORIGINAL_RECORDS!=='undefined'&&SAPORE_ORIGINAL_RECORDS.has(r.id)?SAPORE_ORIGINAL_RECORDS.get(r.id):saporeCatalogControl.reviewed.get(r.id);
        const baselineHash=await saporeRecordSha256(immutable||previous);
        // A native R15 revision can advance during a manual recovery. When its
        // original baseline is absent, require the exact previously loaded
        // revision AND its unchanged original baseline proof.
        const nativeSuccessor=!immutable&&previous.publicationUpdate&&proof&&
          proof.baseAppSha256===previous.publicationUpdate.baseAppSha256&&proof.previousAppSha256===baselineHash;
        if(proof?.reviewedDigest===r.reviewedRecordSha256&&(proof.baseAppSha256===baselineHash||nativeSuccessor)){
          if(fingerprints.has(fp)&&fingerprints.get(fp)!==r.id){reject('exact_content_duplicate',fingerprints.get(fp));continue;}
          updates.push(r);ids.set(r.id,r);fingerprints.delete(publicationFingerprint(previous));fingerprints.set(fp,r.id);
          const oldUrl=normUrl(previous.source);sourceIds.set(oldUrl,(sourceIds.get(oldUrl)||[]).filter(id=>id!==r.id));
          sourceIds.set(url,[...(sourceIds.get(url)||[]),r.id]);continue;
        }
        reject('id_conflict',r.id);continue;
      }
      if(fingerprints.has(fp)){reject('exact_content_duplicate',fingerprints.get(fp));continue;}
      // An URL match is a review signal, never proof that two recipes are identical.
      const matches=sourceIds.get(url)||[];
      const decision=r.publicationPreflight;
      if(matches.length&&!(decision?.decision==='distinct_variant'&&decision.reviewedDigest===r.reviewedRecordSha256&&
          decision.reason&&matches.every(id=>decision.comparedAppIds?.includes(id)))){reject('same_source_needs_review',matches[0]);continue;}
      accepted.push(r);ids.set(r.id,r);fingerprints.set(fp,r.id);sourceIds.set(url,[...matches,r.id]);
    }
    for(const r of updates){const index=RECIPES.findIndex(old=>old.id===r.id);if(index>=0)RECIPES[index]=r;}
    RECIPES.push(...accepted);
    const blocked=skipped.filter(r=>r.reason!=='already_present');
    window.__saporePublicationImport={status:'loaded',added:accepted.length,updated:updates.length,updateContract:'r26-baseline-overlay-v1',total:RECIPES.length,partial:blocked.length>0,skipped};
    saporeRefreshCatalog();
    if(blocked.length)console.warn('Sapore publication: individual records skipped; remaining recipes loaded.',blocked);
  }catch(error){
    window.__saporePublicationImport={status:'error',message:String(error)};
    console.error('Sapore publication import: existing catalog retained.',error);
  }
}
