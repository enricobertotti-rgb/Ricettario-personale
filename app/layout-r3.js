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
function recipeMetrics(r){const fields=[['portions','Porzioni',r.serves],['clock',r.displayContract==='sapore.display.v2'?'Tempi':'Preparazione',r.displayContract==='sapore.display.v2'?r.originalTimes:r.prep],['oven','Cottura',r.cook],['thermometer','Temperatura',r.temperature]];const metrics=fields.filter(([, ,value])=>value!==undefined&&value!==null&&String(value).trim()!=='').map(([icon,label,value])=>`<div class="r3Metric">${recipeIcon(icon)}<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div></div>`).join('');return metrics||r.rest?`<dl class="r3Metrics" aria-label="Porzioni, tempi e temperatura">${metrics}${r.rest?`<div class="r3Metric r3Rest">${recipeIcon('rest')}<div><dt>Riposi</dt><dd>${esc(r.rest)}</dd></div></div>`:''}</dl>`:'';}
function recipeMethod(r){const steps=preparationSteps(r.steps);return `<section class="r3Method" aria-labelledby="preparationTitle"><div class="r3SectionHeading r3PreparationHeading"><h2 id="preparationTitle">Preparazione</h2><span>${steps.length} passaggi</span><div class="r3StepSwitch" role="group" aria-label="Disposizione del procedimento"><button type="button" data-step-columns="one" aria-controls="preparationRows" aria-pressed="${recipeStepColumns==='one'}">${recipeIcon('rows')}In fila</button><button type="button" data-step-columns="two" aria-controls="preparationRows" aria-pressed="${recipeStepColumns==='two'}">${recipeIcon('columns')}2 colonne</button></div><button type="button" class="r3Print" id="printRecipe" aria-label="Stampa la ricetta o salvala come PDF">${recipeIcon('print')}Stampa</button></div><ol class="r3Steps" id="preparationRows" role="list" data-columns="${recipeStepColumns}">${steps.map((text,i)=>`<li class="step"><i aria-hidden="true">${String(i+1).padStart(2,'0')}</i><span>${esc(text)}</span></li>`).join('')}</ol><p class="r3StepHint">In fila oppure su due colonne, da sinistra a destra e poi alla riga successiva.</p>${r.notes?`<section class="r3Notes"><h2>Note</h2><p>${esc(r.notes)}</p></section>`:''}${r.variants?`<section class="r3Notes"><h2>Varianti documentate</h2><p>${esc(r.variants)}</p></section>`:''}${r.safetyNotes?`<section class="r3Notes"><h2>Indicazioni della fonte</h2><p>${esc(r.safetyNotes)}</p></section>`:''}${r.story?`<details class="r3Details"><summary>Storia e contesto della ricetta</summary><p>${esc(r.story)}</p></details>`:''}</section>`;}
function setRecipeColumns(value){if(value!=='one'&&value!=='two')return;recipeStepColumns=value;const rows=el('preparationRows');if(rows)rows.dataset.columns=value;root.querySelectorAll('[data-step-columns]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.stepColumns===value)));}

function recipeCard(r,image){return `<article class="recipe r3Recipe" aria-labelledby="recipeTitle"><div class="r3Intro"><header class="recipeHeader"><div class="category">${esc(r.category.toUpperCase())}</div><h1 id="recipeTitle">${esc(r.name)}</h1>${recipeSource(r)}${r.origin?`<p class="r3Origin">${recipeIcon('pin')}<span>${esc(r.origin)}</span></p>`:''}</header>${recipeMetrics(r)}<figure class="photo${DRIVE_PHOTOS[r.id]||(r.photo&&r.photoCreditUrl&&r.photoLicense)?'':' noPhoto'}"><div class="imageWrap">${image}</div>${r.photoCreditUrl&&recipeURL(r.photoCreditUrl)?`<figcaption class="photoCaption"><a href="${esc(recipeURL(r.photoCreditUrl))}" target="_blank" rel="noopener noreferrer">${esc(r.photoAuthor||'Fonte fotografia')} ↗</a><span>${esc(r.photoLicense||'')}${r.photoIllustrative?' · Immagine illustrativa':''}</span></figcaption>`:''}</figure>${r.description?`<p class="r3Description">${esc(r.description)}</p>`:''}</div><section class="ingredients r3Ingredients" aria-labelledby="ingredientTitle"><div class="r3SectionHeading"><h2 id="ingredientTitle">Ingredienti</h2>${r.serves?`<span>${esc(r.serves)}</span>`:''}</div>${ingredientRows(r.ingredients)}</section>${recipeMethod(r)}</article>`}


// Sapore R4.1: append only editorially verified recipes without changing the 478 originals.
// The matching approved versions retain their separate traceability in data/approved-r4-1.json.
(function loadReviewedRecipesR41(){
  const editorialDataUrl='data/approved-r4-1.json';
  window.addEventListener('DOMContentLoaded',()=>{
    fetch(editorialDataUrl,{cache:'no-cache'}).then(response=>{
      if(!response.ok)throw new Error('Editorial dataset HTTP '+response.status);
      return response.json();
    }).then(data=>{
      if(data.schema!=='sapore.app.editorial-import.v1'||data.editorial_revision!=='CUR-20261117-FONTE-R4.1'||data.new_recipe_count!==data.recipes?.length||!Array.isArray(data.recipes)||!Array.isArray(data.existingMatches))throw new Error('Editorial dataset does not match reviewed manifest');
      const accepted=[],skipped=[];
      const normUrl=value=>{try{const u=new URL(value);return u.hostname.toLowerCase().replace(/^www\./,'')+decodeURIComponent(u.pathname).toLowerCase().replace(/\/$/,'')}catch(_){return ''}};
      const ids=new Set(RECIPES.map(r=>r.id));
      const urls=new Set(RECIPES.map(r=>normUrl(r.source)).filter(Boolean));
      const pendingIds=new Set();
      const pendingUrls=new Set();
      for(const r of data.recipes){
        if(!r||typeof r!=='object'){skipped.push(null);continue;}
        const url=normUrl(r.source);
        if(!r.id||!r.name||!r.category||!Array.isArray(r.ingredients)||!r.ingredients.length||!Array.isArray(r.steps)||!r.steps.length||!url||ids.has(r.id)||urls.has(url)||pendingIds.has(r.id)||pendingUrls.has(url)||!r.reviewedRecordSha256||!r.baseRecordSha256){skipped.push(r?.id||null);continue;}
        pendingIds.add(r.id);pendingUrls.add(url);accepted.push(r);
      }
      RECIPES.push(...accepted);
      CATEGORIES.splice(0,CATEGORIES.length,...new Set(RECIPES.map(r=>r.category)));
      CATEGORIES.sort((a,b)=>a.localeCompare(b,'it'));
      recipeSearchCache=null;
      pantryIndexCache=null;
      draw();
      window.__saporeEditorialImport={status:'loaded',added:accepted.length,skipped,alreadyMatched:data.existingMatches.length,total:RECIPES.length,revision:data.editorial_revision};

    }).catch(error=>{
      window.__saporeEditorialImport={status:'error',message:String(error)};
      console.error('Sapore editorial import: previous catalog kept unchanged.',error);
    }).finally(()=>loadPublishedRecipesR15());
  },{once:true});
})();

// Independent publication feed: preserve the reviewed R4.1 baseline unchanged.
function publicationFingerprint(r){
  const norm=v=>String(v??'').normalize('NFC').trim().replace(/\s+/g,' ').toLowerCase();
  return JSON.stringify(['ingredients','steps','serves','prep','cook','rest','temperature','originalTimes','variants'].map(k=>Array.isArray(r[k])?r[k].map(norm):norm(r[k])));
}
async function loadPublishedRecipesR15(){
  try{
    const response=await fetch('data/published-r15.json',{cache:'no-cache'});
    if(!response.ok)throw new Error('Publication dataset HTTP '+response.status);
    const data=await response.json();
    if(data.schema!=='sapore.app.published.v1'||!Array.isArray(data.recipes))throw new Error('Invalid publication manifest');
    const normUrl=value=>{try{const u=new URL(value);if(!/^https?:$/.test(u.protocol))return '';return u.hostname.toLowerCase().replace(/^www\./,'')+decodeURIComponent(u.pathname).toLowerCase().replace(/\/$/,'')}catch(_){return ''}};
    const ids=new Map(RECIPES.map(r=>[r.id,r]));
    const fingerprints=new Map(RECIPES.map(r=>[publicationFingerprint(r),r.id]));
    const sourceIds=new Map();
    for(const r of RECIPES){const u=normUrl(r.source);if(u)sourceIds.set(u,[...(sourceIds.get(u)||[]),r.id]);}
    const accepted=[],skipped=[];
    for(const r of data.recipes){
      const reject=(reason,existingId)=>skipped.push({id:r?.id||null,reason,existingId:existingId||null});
      if(!r||typeof r.id!=='string'||! /^[A-Za-z0-9_-]+$/.test(r.id)||typeof r.name!=='string'||!r.name.trim()||!r.category||
         !Array.isArray(r.ingredients)||!r.ingredients.length||!r.ingredients.every(x=>typeof x==='string'&&x.trim())||
         !Array.isArray(r.steps)||!r.steps.length||!r.steps.every(x=>typeof x==='string'&&x.trim())||
         !/^[a-f0-9]{64}$/.test(r.reviewedRecordSha256||'')||r.photo!=null){reject('invalid_record');continue;}
      const url=normUrl(r.source),fp=publicationFingerprint(r);
      if(!url){reject('invalid_source');continue;}
      if(ids.has(r.id)){
        const previous=ids.get(r.id),update=r.publicationUpdate;
        if(update&&update.reviewedDigest===r.reviewedRecordSha256&&update.previousAppSha256===await publicationRecordSha(previous)){
          const position=RECIPES.findIndex(x=>x.id===r.id);
          if(position>=0)RECIPES[position]=r;
          else accepted[accepted.findIndex(x=>x.id===r.id)]=r;
          ids.set(r.id,r);fingerprints.delete(publicationFingerprint(previous));fingerprints.set(fp,r.id);
          continue;
        }
        reject(publicationFingerprint(previous)===fp?'already_present':'id_conflict',r.id);continue;
      }
      if(fingerprints.has(fp)){reject('exact_content_duplicate',fingerprints.get(fp));continue;}
      // An URL match is a review signal, never proof that two recipes are identical.
      const matches=sourceIds.get(url)||[];
      const decision=r.publicationPreflight;
      if(matches.length&&!(decision?.decision==='distinct_variant'&&decision.reviewedDigest===r.reviewedRecordSha256&&
          decision.reason&&matches.every(id=>decision.comparedAppIds?.includes(id)))){reject('same_source_needs_review',matches[0]);continue;}
      accepted.push(r);ids.set(r.id,r);fingerprints.set(fp,r.id);sourceIds.set(url,[...matches,r.id]);
    }
    RECIPES.push(...accepted);
    CATEGORIES.splice(0,CATEGORIES.length,...new Set(RECIPES.map(r=>r.category)));
    CATEGORIES.sort((a,b)=>a.localeCompare(b,'it'));
    recipeSearchCache=null;pantryIndexCache=null;
    draw();openRecipeDeepLink();
    window.__saporePublicationImport={status:'loaded',added:accepted.length,total:RECIPES.length,partial:skipped.length>0,skipped};
    if(skipped.length)console.warn('Sapore publication: individual records skipped; remaining recipes loaded.',skipped);
  }catch(error){
    window.__saporePublicationImport={status:'error',message:String(error)};
    console.error('Sapore publication import: existing catalog retained.',error);
  }
}

function publicationCanonical(value){
  if(Array.isArray(value))return value.map(publicationCanonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,publicationCanonical(value[k])]));
  return value;
}
async function publicationRecordSha(value){
  const bytes=new TextEncoder().encode(JSON.stringify(publicationCanonical(value)));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
