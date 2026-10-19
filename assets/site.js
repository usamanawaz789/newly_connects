(()=>{
'use strict';
const qs=(s,r=document)=>r.querySelector(s),qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const base=document.body.dataset.base||'';
const menu=qs('.menu-toggle'),nav=qs('header nav');
menu?.addEventListener('click',()=>{const open=nav.classList.toggle('mobile-open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
const drop=qs('.navdrop'),dropButton=qs('.navdrop>button');
function closeDrop(){drop?.classList.remove('open');dropButton?.setAttribute('aria-expanded','false');}
dropButton?.addEventListener('click',()=>{const open=drop.classList.toggle('open');dropButton.setAttribute('aria-expanded',String(open));});
document.addEventListener('click',e=>{if(drop&&!drop.contains(e.target))closeDrop();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrop();nav?.classList.remove('mobile-open');menu?.setAttribute('aria-expanded','false');}});
const tabs=qsa('[data-tab]');
function activate(tab){tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;qs('#panel-'+t.dataset.tab).hidden=!active;});}
tabs.forEach((t,i)=>{t.addEventListener('click',()=>activate(t));t.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight'||e.key==='ArrowDown')next=(i+1)%tabs.length;if(e.key==='ArrowLeft'||e.key==='ArrowUp')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();activate(tabs[next]);tabs[next].focus();}});});
const search=qs('.catalog-search'),filter=qs('.category-filter');
function updateCatalogue(){let total=0;const term=(search?.value||'').trim().toLowerCase(),category=filter?.value||'';qsa('.catalog-group').forEach(group=>{let count=0;qsa('.catalog-card',group).forEach(card=>{const show=card.dataset.search.includes(term)&&(!category||card.dataset.category===category);card.hidden=!show;if(show)count++;});group.hidden=count===0;total+=count;});const count=qs('.result-count');if(count)count.textContent=total+' results';const none=qs('.no-results');if(none)none.hidden=total!==0;}
search?.addEventListener('input',updateCatalogue);filter?.addEventListener('change',updateCatalogue);if(search)updateCatalogue();
const dialog=qs('#search-dialog'),globalInput=qs('#site-search'),results=qs('#search-results');
qs('.search-toggle')?.addEventListener('click',()=>{dialog.showModal();globalInput.focus();renderResults();});
function renderResults(){const term=globalInput.value.trim().toLowerCase();results.replaceChildren();if(term.length<2){const p=document.createElement('p');p.textContent='Enter at least two characters to search the website.';results.append(p);return;}
const matches=(window.NC_CATALOG||[]).filter(p=>(p.title+' '+p.category).toLowerCase().includes(term));matches.slice(0,20).forEach(p=>{const a=document.createElement('a');a.href=p.file.startsWith("/")?p.file:base+p.file;a.textContent=p.title;const sm=document.createElement('small');sm.textContent=p.kind+' / '+p.category;a.append(sm);results.append(a);});const p=document.createElement('p');p.textContent=matches.length===0?'No matching pages. Try another term.':matches.length>20?'Showing 20 of '+matches.length+' matches. Refine your search.':matches.length+' matching pages';results.append(p);}
globalInput?.addEventListener('input',renderResults);
const form=qs('#contact-form');
if(form){const service=new URLSearchParams(location.search).get('service');if(service)qs('#service-input').value=service.slice(0,180);
// Budget accepts digits only, shown with thousands separators.
const budget=qs('#budget-input');budget?.addEventListener('input',()=>{const digits=budget.value.replace(/\D/g,'').replace(/^0+(?=\d)/,'');budget.value=digits?Number(digits).toLocaleString('en-US'):'';});
// Sends the inquiry to the /api/contact serverless function.
const status=qs('#form-status'),submit=qs('#contact-submit');
form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;submit.disabled=true;status.textContent='Sending…';
try{const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'We could not send your inquiry.');form.reset();status.textContent='Thank you! Your inquiry has been sent. A confirmation is on its way to your email.';}
catch(err){status.textContent=err.message+' Please try again, or email contact@newlyconnects.com.';}
finally{submit.disabled=false;}});}
})();
