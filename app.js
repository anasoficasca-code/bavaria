import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const compact=matchMedia('(max-width:760px)').matches;
let renderer,scene,camera,controls,night=false,paused=reduced,speed=1,tour=false;
const buildings=[],cars=[],lights=[],zones=new THREE.Group(),ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
const programs={0:['Talleres de formación','Oficios, agricultura urbana y aprendizaje compartido. Las estructuras industriales se recuperan para el conocimiento del barrio.'],2:['Mercado de proximidad','Productores locales y vecinos se encuentran en un mercado de pequeña escala. Los pedidos salen hacia los barrios en vehículos livianos y triciclos de carga.'],3:['Cocina y comedor comunitario','Los excedentes del mercado se convierten en alimentos para la comunidad. Los residuos orgánicos regresan al ciclo productivo.'],4:['Laboratorio de hongos','Residuos del mercado y la cocina se transforman en sustrato para el cultivo de hongos.'],5:['Comisiones y equipo técnico','Un espacio para gestionar el acuerdo de uso, las cuentas del fondo común y el trabajo técnico de la propuesta.'],6:['Espacio de cuidados','Un lugar para niños y personas mayores que permite participar en la vida comunitaria.'],9:['Energía compartida','Cubiertas solares y una propuesta de biogás para apoyar los procesos productivos.'],23:['Espacio de asamblea','El barrio participa en las decisiones y en el cuidado de este territorio común.']};
const W=p=>new THREE.Vector2((p[0]-9350)/5,-(p[1]-3000)/5);
const V=(p,y=0)=>{const q=W(p);return new THREE.Vector3(q.x,y,q.y)};
function shape(points){return new THREE.Shape(points.map(p=>{const q=W(p);return new THREE.Vector2(q.x,-q.y)}))}
function material(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.82,...extra})}
function box(w,h,d,mat,x,y,z,parent=scene){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function path(points,color,width=.8){const c=new THREE.CurvePath();for(let i=1;i<points.length;i++)c.add(new THREE.LineCurve3(V(points[i-1],.25),V(points[i],.25)));const m=new THREE.Mesh(new THREE.TubeGeometry(c,Math.max(30,points.length*8),width,5,false),material(color));m.receiveShadow=true;scene.add(m);return c}
function show(title,text,number='BAVARIA COMÚN'){ $('detail-title').textContent=title;$('detail-text').textContent=text;$('detail-number').textContent=number;$('detail').hidden=false;$('intro').classList.add('exploring');}
function setTour(on){tour=on;controls.autoRotate=on;controls.autoRotateSpeed=.35;$('tour').setAttribute('aria-pressed',String(on));}
function home(){setTour(false);camera.position.set(compact?260:240,240,310);controls.target.set(compact?-12:-65,0,0);controls.update();$('view-name').textContent='VISTA GENERAL';}
function failure(e){console.error(e);$('fallback').hidden=false;$('status').textContent='No se pudo cargar la maqueta';}
async function init(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.5:2));renderer.setSize(innerWidth,innerHeight);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 renderer.domElement.setAttribute('aria-label','Vista 3D: arrastra para girar, rueda para acercar');renderer.domElement.tabIndex=0;$('viewport').append(renderer.domElement);
 scene=new THREE.Scene();scene.fog=new THREE.Fog('#e0e1d5',500,1300);
 camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.5,1800);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=!reduced;controls.dampingFactor=.07;controls.minDistance=35;controls.maxDistance=650;controls.maxPolarAngle=Math.PI*.47;controls.listenToKeyEvents(renderer.domElement);home();
 const ambient=new THREE.HemisphereLight(0xfff4df,0x778474,2.6);scene.add(ambient);
 const sun=new THREE.DirectionalLight(0xffe1b5,3.5);sun.position.set(-120,200,120);sun.castShadow=true;sun.shadow.mapSize.set(compact?1024:2048,compact?1024:2048);Object.assign(sun.shadow.camera,{left:-180,right:180,top:180,bottom:-180,near:1,far:600});sun.shadow.bias=-.0005;sun.shadow.normalBias=.15;scene.add(sun);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(2200,2200),material('#dce0cf'));floor.rotation.x=-Math.PI/2;floor.position.y=-1.3;floor.receiveShadow=true;scene.add(floor);
 const get=async url=>{const r=await fetch(url);if(!r.ok)throw Error('No se pudo cargar '+url);return r.json()};
 const [data,forest]=await Promise.all([get('./data/bavaria.json'),get('./data/trees.json')]);
 const slab=new THREE.Mesh(new THREE.ExtrudeGeometry(shape(data.sitio),{depth:1,bevelEnabled:false}).rotateX(-Math.PI/2),material('#afb897'));slab.position.y=-1;slab.receiveShadow=true;scene.add(slab);
 const border=data.sitio.map(p=>V(p,.1));const boundary=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(border),new THREE.LineBasicMaterial({color:0x798768}));scene.add(boundary);
 const brick=material('#9c6950'),roof=material('#b2b8ac'),glass=material('#405955',{metalness:.45,roughness:.25});
 data.edif.forEach((e,index)=>{
 const h=Math.max(e.h/5,1);const mat=material(e.s==='ladrillo'?'#a7785d':e.s==='esqueleto'?'#b6ac95':'#cbc7b7');
 const geo=new THREE.ExtrudeGeometry(shape(e.p),{depth:h,bevelEnabled:false});geo.rotateX(-Math.PI/2);
 const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={index,title:programs[index]?.[0]||'Patrimonio industrial',text:programs[index]?.[1]||'Edificación existente de la antigua fábrica. Su recuperación forma parte de una propuesta de reutilización del patrimonio industrial.'};buildings.push(mesh);scene.add(mesh);
 const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo,28),new THREE.LineBasicMaterial({color:0x685d4a,transparent:true,opacity:.18}));scene.add(edges);
 const cap=new THREE.Mesh(new THREE.ShapeGeometry(shape(e.p)).rotateX(-Math.PI/2),roof);cap.position.y=h+.025;cap.receiveShadow=true;scene.add(cap);
 // Window strips follow the original building footprint.
 for(let i=0;i<e.p.length-1;i++){const a=V(e.p[i]),b=V(e.p[i+1]),len=a.distanceTo(b);if(len<2)continue;const mid=a.clone().add(b).multiplyScalar(.5);for(let level=1;level<h-.4;level+=1.1){const win=box(len*.86,.36,.055,glass,mid.x,level,mid.z);win.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);}}
 if(programs[index]){const c=e.p.reduce((a,p)=>a.add(V(p)),new THREE.Vector3()).multiplyScalar(1/e.p.length);const marker=new THREE.Mesh(new THREE.SphereGeometry(.65,12,8),material('#e76537',{emissive:'#d84f24',emissiveIntensity:.25}));marker.position.set(c.x,h+2,c.z);scene.add(marker);lights.push(marker.material);}
 });
 // The canopy coordinates are retained from the original Bavaria dataset.
 const points=forest.arboles.filter((_,i)=>i%(compact?3:2)===0);
 const foliage=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material('#647b49'),points.length);
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.13,.22,1,5),brick,points.length);
 const dummy=new THREE.Object3D();
 points.forEach((t,i)=>{const p=V(t),h=t[2]/5,r=t[3]/5;dummy.position.set(p.x,h*.35,p.z);dummy.scale.set(1,h*.7,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=h*.85;dummy.scale.set(r*1.5,h*.52,r*1.5);dummy.rotation.y=i*2.4;dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);foliage.setColorAt(i,new THREE.Color().setHSL(.23+(i%7)*.005,.22,.27+(i%5)*.027));});
 foliage.castShadow=true;foliage.receiveShadow=true;trunks.castShadow=true;scene.add(foliage,trunks);
 scene.add(zones);
 Object.entries(data.zonas).forEach(([name,p])=>{if(!Array.isArray(p)||!Array.isArray(p[0]))return;const m=new THREE.Mesh(new THREE.ShapeGeometry(shape(p)).rotateX(-Math.PI/2),material(name==='huerto'?'#a2ad70':name==='compost'?'#92795b':'#c6bba2'));m.position.y=.07;m.receiveShadow=true;zones.add(m)});
 // Conceptual internal and perimeter routes; these do not model measured road traffic.
 const routes=[
 {p:[[9000,3260],[9130,3150],[9300,3060],[9417,2823],[9566,2721],[9660,2620]],color:'#e3d9bf',n:8},
 {p:[[8860,2450],[8970,2800],[9120,3190],[9340,3530],[9490,3500]],color:'#8a9086',n:12},
 {p:[[9470,3520],[9420,3230],[9300,3060],[9220,3020]],color:'#d6c5a4',n:5}
 ];
 const tireMat=material('#303832'),windowMat=material('#314c4d',{metalness:.4,roughness:.2});
 routes.forEach((r,ri)=>{const curve=path(r.p,r.color,ri===1?2.1:1.1);const length=curve.getLength();for(let i=0;i<r.n;i++){
 const car=new THREE.Group();const paint=material(['#dd643d','#e4d5ad','#617d78','#f3efdf'][i%4],{roughness:.38,metalness:.15});
 box(ri===0?1.1:.9,.65,2,paint,0,.65,0,car);box(.82,.65,1.05,paint,0,1.2,-.1,car);box(.84,.35,.04,windowMat,0,1.3,.46,car);box(.84,.35,.04,windowMat,0,1.3,-.65,car);
 for(const x of [-.55,.55])for(const z of [-.6,.6]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.15,10),tireMat);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.32,z);car.add(wheel);}
 for(const x of [-.32,.32])box(.2,.13,.06,material('#ffedbc',{emissive:'#ffdf8e',emissiveIntensity:.5}),x,.75,1.03,car);
 scene.add(car);cars.push({mesh:car,curve,length,t:i/r.n,rate:(ri===1?7:4)/length});
 }});
 let down=null;renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];setTour(false)});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(buildings)[0];if(hit){const b=hit.object;show(b.userData.title,b.userData.text,'PATRIMONIO / '+String(b.userData.index+1).padStart(2,'0'));$('view-name').textContent=b.userData.title.toUpperCase();}});
 $('night').onclick=()=>{night=!night;document.body.classList.toggle('night',night);$('night').setAttribute('aria-pressed',String(night));$('night').textContent=night?'Día ☀':'Noche ◐';ambient.intensity=night?.6:2.6;sun.intensity=night?.65:3.5;sun.color.set(night?'#8daed1':'#ffe1b5');renderer.toneMappingExposure=night?.8:1.25;scene.fog.color.set(night?'#111e22':'#e0e1d5');floor.material.color.set(night?'#273936':'#dce0cf');glass.emissive.set(night?'#eeb86c':'#000000');glass.emissiveIntensity=night?.6:0;lights.forEach(m=>m.emissiveIntensity=night?2:.25);};
 $('pause').setAttribute('aria-pressed',String(paused));$('pause').textContent=paused?'Reanudar carros ▶':'Pausar carros Ⅱ';
 $('pause').onclick=()=>{paused=!paused;$('pause').setAttribute('aria-pressed',String(paused));$('pause').textContent=paused?'Reanudar carros ▶':'Pausar carros Ⅱ';};
 $('speed').oninput=e=>{speed=Number(e.target.value);$('speed-value').value=speed+'×'};
 $('tour').onclick=()=>setTour(!tour);$('home').onclick=home;
 $('explore').onclick=()=>{$('intro').classList.add('exploring');$('detail').hidden=true;controls.target.set(0,0,0);camera.position.set(200,190,250);controls.update();renderer.domElement.focus()};
 $('about').onclick=e=>{e.preventDefault();show('Un territorio que vuelve a conectar.','La antigua fábrica se explora como un lugar de producción local, aprendizaje y encuentro. Recuperar sus edificios, cuidar el bosque y llevar el abastecimiento a la escala del barrio.','01 / EL PROYECTO')};
 $('close-detail').onclick=()=>{$('detail').hidden=true};document.addEventListener('keydown',e=>{if(e.key==='Escape')$('detail').hidden=true});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failure(new Error('Se perdió el contexto WebGL. Recarga la página.'))});
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
 $('status').textContent='';let last=performance.now();
 renderer.setAnimationLoop(now=>{const dt=Math.min((now-last)/1000,.05);last=now;for(const c of cars){if(!paused)c.t=(c.t+dt*c.rate*speed)%1;const p=c.curve.getPoint(c.t),t=c.curve.getTangent(c.t);c.mesh.position.copy(p);c.mesh.rotation.y=Math.atan2(t.x,t.z);}controls.update();renderer.render(scene,camera)});
}
init().catch(failure);
