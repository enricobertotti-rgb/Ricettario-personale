// Presentation groups only: original recipe categories and provenance stay intact.
const SAPORE_GROUPS = [
 ['basi','Basi di cucina',['Brodi e fondi','Impasti e creme','Salse e condimenti']],
 ['antipasti','Antipasti',[]],
 ['primi','Primi piatti',['Pasta e gnocchi','Riso e cereali','Zuppe e minestre']],
 ['secondi','Secondi',['Carne','Pesce','Vegetariani e uova']],
 ['contorni','Contorni',[]],
 ['salati','Panificati salati',['Pane e focacce','Pizza','Torte salate e altri impasti']],
 ['lievitati','Lievitati dolci',['Grandi lievitati','Brioche e sfogliati','Altri lievitati']],
 ['dolci','Dolci e pasticceria',['Torte e biscotti','Dessert al cucchiaio','Gelati e sorbetti']],
 ['unici','Piatti unici',[]],
 ['bevande','Bevande',[]]
];
let saporeMacro='', saporeSub='', saporeCountry='', saporeCountryIndex=false;
function saporeGroup(r){
 const c=String(r.category||'').toLowerCase(), n=String(r.name||'').toLowerCase();
 if(/^(panettone|pandoro|colomba)\b/.test(n))return ['lievitati','Grandi lievitati'];
 if(/^(brioche|croissant|cornetti|pain au chocolat)\b/.test(n)&&!/salat/.test(n))return ['lievitati','Brioche e sfogliati'];
 if(/roux|besciamella|^brodo\b|^fondo (bruno|bianco)|^fumetto\b/.test(n))return ['basi',/brodo|fondo|fumetto/.test(n)?'Brodi e fondi':'Salse e condimenti'];
 if(/preparazioni di base|creme, impasti|salse|sughi|condimenti/.test(c))return ['basi',/salse|sughi|condimenti/.test(c)?'Salse e condimenti':'Impasti e creme'];
 if(/colazione|lievitati dolci/.test(c)){
  if(/panettone|pandoro|colomba/.test(n))return ['lievitati','Grandi lievitati'];
  if(/brioche|croissant|cornett|sfogliat|pain au chocolat/.test(n))return ['lievitati','Brioche e sfogliati'];
  // Breakfast is not synonymous with yeast dough: preserve non-leavened desserts.
  if(/pancake|waffle|porridge|crep[eè]|cr[eê]pe/.test(n))return ['dolci','Torte e biscotti'];
  return (r.ingredients||[]).some(x=>/lievito di birra|lievito madre|pasta madre|licoli/i.test(x))?['lievitati','Altri lievitati']:['dolci','Torte e biscotti'];
 }
 if(/pane|focacce|panini|pizze|lievitati salati|torte salate/.test(c))return ['salati',/pizza|pizze|pinsa/.test(n)?'Pizza':/torta salata|quiche|strudel salato/.test(n)?'Torte salate e altri impasti':'Pane e focacce'];
 if(/primi|pasta|gnocchi/.test(c))return ['primi','Pasta e gnocchi'];
 if(/risotti|riso|cereali/.test(c))return ['primi','Riso e cereali'];
 if(/zuppe|minestre|vellutate/.test(c))return ['primi','Zuppe e minestre'];
 if(/secondi di carne/.test(c))return ['secondi','Carne'];
 if(/secondi di pesce/.test(c))return ['secondi','Pesce'];
 if(/uova|secondi vegetariani/.test(c))return ['secondi','Vegetariani e uova'];
 if(/verdure|contorni/.test(c))return ['contorni',''];
 if(/antipasti|aperitivi/.test(c))return ['antipasti',''];
 if(/bevande|cocktail/.test(c))return ['bevande',''];
 if(/gelati|sorbetti|granite/.test(c))return ['dolci','Gelati e sorbetti'];
 if(/dessert al cucchiaio|freddi/.test(c))return ['dolci','Dessert al cucchiaio'];
 if(/torte|dolci|biscotti|pasticceria/.test(c))return ['dolci','Torte e biscotti'];
 return ['unici',''];
}
const SAPORE_COUNTRIES = [
 ['Italia',/\b(italia|italian[aoei])\b/i],['Francia',/\b(francia|francese|francesi)\b/i],
 ['Spagna',/\b(spagna|spagnol[aoei])\b/i],['Portogallo',/\b(portogallo|portoghese)\b/i],
 ['Grecia',/\b(grecia|grec[ao])\b/i],['Germania',/\b(germania|tedesc[ao])\b/i],
 ['Austria',/\b(austria|austriac[ao])\b/i],['Regno Unito',/\b(regno unito|britannic[ao]|inghilterra)\b/i],
 ['Stati Uniti',/\b(stati uniti|statunitense|usa)\b/i],['Messico',/\b(messico|messican[ao])\b/i],
 ['Argentina',/\b(argentina|argentino)\b/i],['Brasile',/\b(brasile|brasilian[ao])\b/i],
 ['India',/\b(india|indian[aoei])\b/i],['Cina',/\b(cina|cinese|cinesi)\b/i],
 ['Giappone',/\b(giappone|giapponese|giapponesi)\b/i],['Corea',/\b(corea|corean[ao])\b/i],
 ['Thailandia',/\b(thailandia|thailandese|thailandesi)\b/i],['Vietnam',/\b(vietnam|vietnamita)\b/i],
 ['Libano',/\b(libano|libanese)\b/i],['Turchia',/\b(turchia|turc[ao])\b/i],
 ['Marocco',/\b(marocco|marocchin[ao])\b/i],['Perù',/\b(perù|peru|peruvian[ao])\b/i]
];
function saporeRecipeCountry(r){
 const explicit=r.country||r.countryOfOrigin||r.originCountry;
 if(typeof explicit==='string'&&explicit.trim())return explicit.trim();
 // Only the supplied origin field; never the author's country, URL or ingredients.
 const origin=String(r.origin||'');
 const matches=SAPORE_COUNTRIES.filter(([,rule])=>rule.test(origin));
 return matches.length===1?matches[0][0]:'';
}
function saporeVisibleRecipes(){
 return [...new Map(RECIPES.filter(r=>!r.aliasOf).map(r=>[r.id,r])).values()];
}
function saporeCountryMatches(r){
 const country=saporeRecipeCountry(r);
 return !saporeCountry||(saporeCountry==='__unknown'?!country:country===saporeCountry);
}
function saporeScope(r){
 const [macro,sub]=saporeGroup(r);
 return !r.aliasOf&&(!saporeMacro||macro===saporeMacro)&&(!saporeSub||sub===saporeSub)&&saporeCountryMatches(r);
}
function saporeCountryLabel(value){return value==='__unknown'?'Origine non indicata':value;}
function saporeIndexMarkup(){
 const visible=saporeVisibleRecipes(),countries=[...new Set(visible.map(saporeRecipeCountry).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it'));
 const unknown=visible.filter(r=>!saporeRecipeCountry(r)).length;
 const group=SAPORE_GROUPS.find(g=>g[0]===saporeMacro);
 const card=(attrs,label,count,unit='ricette')=>'<button class="categoryCard" '+attrs+'><span class="catLabel">'+esc(label)+'<small>'+count+' '+unit+'</small></span><span class="catArrow" aria-hidden="true">›</span></button>';
 const countryCards=countries.map(c=>card('data-country="'+esc(c)+'"',c,visible.filter(r=>saporeRecipeCountry(r)===c).length)).join('')+
  (unknown?card('data-country="__unknown"','Origine non indicata',unknown):'');
 const macroCards=SAPORE_GROUPS.map(([id,label])=>{
  const count=visible.filter(r=>saporeCountryMatches(r)&&saporeGroup(r)[0]===id).length;
  return card('data-macro="'+id+'" '+(count?'':'disabled'),label,count);
 }).join('');
 const cards=saporeCountryIndex?countryCards:card('data-country-index="open"','Per paese',countries.length,'paesi')+macroCards;
 const chips=group?'<div class="saporeChips" role="group" aria-label="Sottocategorie"><button data-sub="" aria-pressed="'+!saporeSub+'">Tutte</button>'+group[2].map(sub=>'<button data-sub="'+esc(sub)+'" aria-pressed="'+(saporeSub===sub)+'">'+esc(sub)+'</button>').join('')+'</div>':'';
 const countrySelect='<div class="saporeCountry"><label for="countryFilter">Cucina per paese</label><select id="countryFilter"><option value="">Tutti i paesi</option>'+countries.map(c=>'<option value="'+esc(c)+'" '+(saporeCountry===c?'selected':'')+'>'+esc(c)+'</option>').join('')+'<option value="__unknown" '+(saporeCountry==='__unknown'?'selected':'')+'>Origine non indicata</option></select></div>';
 const macroSelect='<div class="saporeCountry"><label for="countryCategoryFilter">Categoria</label><select id="countryCategoryFilter"><option value="">Tutte le categorie</option>'+SAPORE_GROUPS.map(([id,label])=>'<option value="'+id+'" '+(saporeMacro===id?'selected':'')+'>'+esc(label)+'</option>').join('')+'</select></div>';
 const title=saporeCountryIndex?(saporeCountry?saporeCountryLabel(saporeCountry):'Per paese'):(group?group[1]:'Cosa cuciniamo?');
 const back=saporeCountryIndex?(saporeCountry?'<button data-country-index="open">Tutti i paesi</button>':'<button data-country-index="close">Indice</button>'):(group?'<button data-macro="">Indice</button>':'');
 const intro=saporeCountryIndex?(saporeCountry?visible.filter(saporeCountryMatches).length+' ricette':countries.length+' paesi · '+visible.length+' ricette'):(visible.length+' ricette · '+SAPORE_GROUPS.length+' categorie principali');
 return '<section class="index saporeIndex"><div class="indexTop"><h2>'+esc(title)+'</h2>'+back+'</div><p class="small categoryIntro">'+intro+'</p>'+
  (saporeCountryIndex?(saporeCountry?macroSelect:''):(group?countrySelect:''))+chips+recipeSearchInput()+
  '<div id="indexCategories" class="categoryGrid">'+cards+'</div></section>';
}
function saporeRenderIndexResults(){
 const target=el('searchResults');if(!target)return;
 const active=!!filter.trim(),scoped=!!(saporeMacro||saporeCountry);
 el('indexCategories').hidden=active||scoped;
 el('clearSearch').hidden=!filter;
 const status=el('searchStatus');
 if(!active&&!scoped){target.innerHTML='';status.textContent='';return;}
 if(!recipeSearchCache)recipeSearchCache=saporeVisibleRecipes().map(recipeSearchIndex);
 const matches=active?recipeSearch(recipeSearchCache,filter).filter(x=>saporeScope(x.r)):saporeVisibleRecipes().filter(saporeScope).sort((a,b)=>a.name.localeCompare(b.name,'it')).map(r=>({r}));
 const rows=[...new Map(matches.map(row=>[row.r.id,row])).values()];
 status.textContent=rows.length+' '+(rows.length===1?'ricetta':'ricette')+(scoped?' nella selezione':' in tutto il ricettario');
 target.innerHTML=rows.map(({r,evidence})=>'<button data-openid="'+esc(r.id)+'"><div class="searchResultText"><strong>'+esc(r.name)+'</strong><small>'+esc(SAPORE_GROUPS.find(g=>g[0]===saporeGroup(r)[0])[1])+(saporeRecipeCountry(r)?' · '+esc(saporeRecipeCountry(r)):'')+'</small>'+(evidence?'<p>'+esc(evidence.label)+': '+esc(recipeSearchExcerpt(evidence,filter))+'</p>':'')+'</div><span aria-hidden="true">›</span></button>').join('')||'<p class="small">Nessuna ricetta con questi filtri. Cambia paese, categoria o ricerca.</p>';
}
function saporeInstallIndexEvents(){
 root.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.countryIndex!==undefined||b.dataset.country!==undefined||b.dataset.macro!==undefined||b.dataset.sub!==undefined){
   event.stopImmediatePropagation();
   if(b.dataset.countryIndex!==undefined){
    saporeCountryIndex=b.dataset.countryIndex==='open';saporeCountry='';saporeMacro='';saporeSub='';filter='';
   }else if(b.dataset.country!==undefined){
    saporeCountryIndex=true;saporeCountry=b.dataset.country;saporeMacro='';saporeSub='';filter='';
   }else if(b.dataset.macro!==undefined){
    saporeMacro=b.dataset.macro;saporeSub='';
    if(!saporeMacro){saporeCountry='';filter='';}
   }else saporeSub=b.dataset.sub;
   categoryIndex=true;selected=null;story=false;pantry=false;searchNavIds=null;draw();window.scrollTo(0,0);return;
  }
  if((b.id==='back'||b.id==='categoryToggle')&&searchNavIds?.length){
   event.stopImmediatePropagation();selected=null;categoryIndex=true;story=false;pantry=false;draw();return;
  }
  if(['indexToggle','openIndex','allCategories'].includes(b.id)){saporeMacro='';saporeSub='';saporeCountry='';saporeCountryIndex=false;}
 },true);
 root.addEventListener('change',event=>{
  if(event.target.id==='countryFilter'||event.target.id==='countryCategoryFilter'){
   if(event.target.id==='countryFilter')saporeCountry=event.target.value;
   else{saporeMacro=event.target.value;saporeSub='';}
   const focus=event.target.id;searchNavIds=null;draw();el(focus).focus();
  }
 });
}
