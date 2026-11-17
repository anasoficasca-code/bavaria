const $=id=>document.getElementById(id);
const cover=$('portada'), gallery=$('cover-gallery'),project=$('cover-project');
const sceneParts=[document.querySelector('body>header'),document.querySelector('main'),document.querySelector('body>footer'),$('menu-panel')];
function setCover(on){
 document.body.classList.toggle('on-portada',on);cover.hidden=!on;
 sceneParts.forEach(el=>{if(el)el.inert=on;});
 $('return-cover').hidden=on;
 if(on){$('explore').focus({preventScroll:true});}
 else{if(!window.__BAVARIA?.ready){setTimeout(()=>{if(!window.__BAVARIA?.ready&&!document.body.classList.contains('on-portada')){$('loading').hidden=true;$('fallback').hidden=false;}},25000);}document.body.classList.add('exploring');$('hero').classList.add('hidden');requestAnimationFrame(()=>$('model').focus({preventScroll:true}));}
}
$('explore').addEventListener('click',()=>setCover(false));
$('scene-explore').onclick=()=>{$('explore').click();};
$('cover-tour').onclick=()=>{$('explore').click();};
$('return-cover').onclick=()=>setCover(true);
$('cover-home').onclick=()=>setCover(true);
$('cover-forest').onclick=()=>{setCover(false);$('forest-view').click();};
function openDialog(dialog){dialog.showModal();}
$('cover-gallery-button').onclick=()=>openDialog(gallery);
$('cover-project-button').onclick=()=>openDialog(project);
$('cover-project-nav').onclick=()=>openDialog(project);
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.onclick=()=>button.closest('dialog').close());
for(const dialog of [gallery,project])dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
const image=$('cover-image');image.addEventListener('error',()=>{image.hidden=true;cover.classList.add('image-unavailable');});
setCover(false);
