import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTerritoryEnvironment } from './territory-environment.js';
import { construirBavaria } from './vendor/bavaria.js';
import { makeEnv, buildTrees, createFleet } from './vendor/real3d.js';
const $=id=>document.getElementById(id),ROOT='https://anasoficasca-code.github.io/simulador/';
const mobile=matchMedia('(max-width:760px)').matches,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const CX=9350,CY=3000,lw=(x,y)=>[x-CX,CY-y];
const api={ready:false,treesReady:false,photoReady:false,trafficReady:false,errors:[],mode:'model'};
window.__BAVARIA=api;
let scene,renderer,camera,orbit,T3,trees,fleet,tiles,model,ground,architecture,environment;
let photoAvailable=false,wantPhoto=true,paused=reduced,velocity=1,elapsed=1000,last=performance.now(),lastAttrib=0,loadedTiles=0,lastModel=0;
let move=null,frame=0,photoFailure=false,photoStarted=0,photoSettledAt=0;const picks=[],markers=[],directions=new Map(),steps=[];
const textureLoader=new THREE.TextureLoader(),pickRay=new THREE.Raycaster(),ndc=new THREE.Vector2(),projectUniform={value:0};
const views=[
 {title:'El territorio',p:[650,470,730],t:[-85,65,-30]},
 {title:'Patrimonio industrial',p:[-470,125,280],t:[-115,12,-140]},
 {title:'El bosque',p:[430,90,310],t:[210,15,90]}
];
function report(message){$('status').textContent=message;}
function texture(name,repeat=1,normal=false){const tex=textureLoader.load(ROOT+'data3d/textures/'+name+'.jpg',undefined,undefined,()=>api.errors.push('texture:'+name));tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(repeat,repeat);if(!normal)tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return tex;}
function poly(points){return new THREE.Shape(points.map(p=>{const q=lw(...p);return new THREE.Vector2(q[0],-q[1])}));}
function reveal(title,text,label='BAVARIA COMÚN'){$('detail-title').textContent=title;$('detail-text').textContent=text;$('detail-number').textContent=label;$('detail').hidden=false;explore();}
function explore(){document.body.classList.add('exploring');$('hero').classList.add('hidden');}
function fly(index,instant=false){const v=views[index];if(!v)return;move=null;orbit.autoRotate=false;$('tour').setAttribute('aria-pressed','false');document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',Number(b.dataset.view)===index));if(instant||reduced){camera.position.fromArray(v.p);orbit.target.fromArray(v.t);orbit.update();}else move={time:0,from:camera.position.clone(),to:new THREE.Vector3(...v.p),fromTarget:orbit.target.clone(),toTarget:new THREE.Vector3(...v.t)};if(index>0)explore();}
function setMode(photo){
 wantPhoto=photo;const usePhoto=photo&&photoAvailable;api.mode=usePhoto?'photo':'model';
 if(environment)environment.setPhotographic(usePhoto);
 if(model)model.visible=!usePhoto;if(trees)trees.ver(!usePhoto);
 if(tiles)tiles.group.visible=photoAvailable;
 projectUniform.value=usePhoto?0:1;
 $('photo').classList.toggle('selected',usePhoto);$('photo').setAttribute('aria-pressed',String(usePhoto));$('model').classList.toggle('selected',!usePhoto);$('model').setAttribute('aria-pressed',String(!usePhoto));
 $('mode-status').textContent=usePhoto?'TERRITORIO FOTOGRÁFICO 3D':'ARQUITECTURA + ÁRBOLES DEL SIMULADOR';
 if(!photoAvailable&&photo)report(photoFailure?'La foto 3D no respondió. Se muestra el modelo original.':'Cargando territorio fotográfico 3D…');
}
function buildMask(data){
 const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,1024,1024);ctx.fillStyle='#fff';ctx.beginPath();data.sitio.forEach((p,i)=>{const q=lw(...p),x=(q[0]+800)/1600*1024,y=(q[1]+800)/1600*1024;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.fill();const t=new THREE.CanvasTexture(c);t.flipY=false;return t;
}
async function setupPhoto(data){
 try{
 const [TR,PL,{DRACOLoader}]=await Promise.all([import('3d-tiles-renderer'),import('3d-tiles-renderer/plugins'),import('three/addons/loaders/DRACOLoader.js')]);
 const draco=new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
 tiles=new TR.TilesRenderer();tiles.registerPlugin(new PL.GoogleCloudAuthPlugin({apiToken:"AIzaSyCF2MXjc0DYRFrHk7j_BCyxVpWOdYqDIC4",autoRefreshToken:true}));tiles.registerPlugin(new PL.GLTFExtensionsPlugin({dracoLoader:draco}));tiles.setCamera(camera);tiles.setResolutionFromRenderer(camera,renderer);tiles.errorTarget=mobile?12:5;photoStarted=performance.now();api.photoStage='streaming';api.photoErrors=0;
 const lat=4.63+(CY-2090.06)/110540,lng=-74.17+(CX-5193.24)/(111320*Math.cos(4.63*Math.PI/180));
 const enu=new THREE.Matrix4();TR.WGS84_ELLIPSOID.getEastNorthUpFrame(lat*Math.PI/180,lng*Math.PI/180,enu);enu.multiply(new THREE.Matrix4().makeTranslation(0,0,2564));
 tiles.group.matrixAutoUpdate=false;tiles.group.matrix.copy(new THREE.Matrix4().makeRotationX(-Math.PI/2).multiply(enu.invert()));tiles.group.updateMatrixWorld(true);tiles.group.visible=false;scene.add(tiles.group);
 const mask=buildMask(data);
 tiles.addEventListener('load-model',({scene:tileScene})=>{
 loadedTiles++;api.loadedTiles=loadedTiles;lastModel=performance.now();tileScene.traverse(o=>{
 if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;
 for(const mat of Array.isArray(o.material)?o.material:[o.material]){
 if(!mat)continue;if(mat.map)mat.map.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
 mat.toneMapped=false;
 if(!mat.isMeshBasicMaterial&&mat.map){mat.emissiveMap=mat.map;mat.emissive.setScalar(1);mat.color.setScalar(0);mat.metalness=0;mat.roughness=1;}
 mat.onBeforeCompile=sh=>{sh.uniforms.projectView=projectUniform;sh.uniforms.siteMask={value:mask};
 sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 siteWorld;').replace('#include <begin_vertex>','#include <begin_vertex>\nsiteWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 siteWorld;uniform float projectView;uniform sampler2D siteMask;').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nvec2 siteUV=(siteWorld.xz+vec2(800.0))/1600.0;if(projectView>0.5&&siteUV.x>0.0&&siteUV.y>0.0&&siteUV.x<1.0&&siteUV.y<1.0&&texture2D(siteMask,siteUV).r>0.5)discard;');};mat.customProgramCacheKey=()=> 'bavariaSiteCutV3';mat.needsUpdate=true;
 }
 });
 // Readiness is evaluated from visible coverage in the render loop, never download count alone.
 });
 tiles.addEventListener('load-error',()=>{api.photoErrors++;if(!loadedTiles){photoFailure=true;report('La foto 3D no respondió. El modelo original sigue disponible.');}});
 setTimeout(()=>{if(!photoAvailable){photoFailure=true;api.photoStage='fallback';setMode(wantPhoto);}},45000);
 }catch(e){photoFailure=true;api.errors.push('photo:'+e.message);setMode(false);}
}
async function loadTraffic(){
 const r=await fetch(ROOT+'data3d/traf/c10.bin');if(!r.ok)throw Error('No se pudo cargar el tráfico SUMO');
 const dv=new DataView(await r.arrayBuffer());if(dv.getUint32(0,true)!==0x31465452)throw Error('Formato de tráfico no reconocido');
 let offset=4;const count=dv.getUint16(offset,true);offset+=2;const t0=Math.round(dv.getFloat32(offset,true));offset+=4;let prev=new Map();
 for(let s=0;s<count;s++){const n=dv.getUint16(offset,true);offset+=2;const ids=offset,dx=offset+2*n,dy=offset+4*n;offset+=6*n;const current=new Map(),sample=new Map();let id=0;
 for(let i=0;i<n;i++){id+=dv.getUint16(ids+2*i,true);const p=prev.get(id),x=p?p[0]+dv.getInt16(dx+2*i,true):dv.getUint16(dx+2*i,true),y=p?p[1]+dv.getInt16(dy+2*i,true):dv.getUint16(dy+2*i,true);current.set(id,[x,y]);if(Math.hypot(x/5-CX,y/5-CY)<1700)sample.set(id,lw(x/5,y/5));}
 steps[t0+s]=sample;prev=current;}
 api.trafficReady=true;
}
function updateTraffic(dt){if(!fleet||!api.trafficReady)return;if(!paused)elapsed+=dt*velocity;if(elapsed>=1098)elapsed=1000;const k=Math.floor(elapsed),a=steps[k],b=steps[k+1],f=elapsed-k;if(!a||!b)return;fleet.begin();
 for(const [id,p]of a){const q=b.get(id);if(!q)continue;const dx=q[0]-p[0],dz=q[1]-p[1];let angle=directions.get(id)||0;if(Math.hypot(dx,dz)>.02){angle=Math.atan2(dx,dz);directions.set(id,angle);}fleet.add(p[0]+dx*f,p[1]+dz*f,angle,id);}
 fleet.end(camera.position.x,camera.position.z);api.vehicles=fleet.n;
}
function bind(){
 $('explore').onclick=()=>{explore();fly(1);};$('home').onclick=()=>{fly(0);document.body.classList.remove('exploring');$('hero').classList.remove('hidden');$('detail').hidden=true;};$('forest-view').onclick=()=>fly(2);
 $('about').onclick=()=>reveal('Patrimonio que vuelve a conectar.','La antigua fábrica de Bavaria, su bosque y la vida de Kennedy forman un territorio compartido. Este visor reutiliza la arquitectura, los árboles y el tráfico del simulador original.','01 / EL PROYECTO');
 $('photo').onclick=()=>setMode(true);$('model').onclick=()=>setMode(false);$('close-detail').onclick=()=>{$('detail').hidden=true};
 $('pause').setAttribute('aria-pressed',String(paused));$('pause').textContent=paused?'Carros ▶':'Carros Ⅱ';$('pause').onclick=()=>{paused=!paused;$('pause').setAttribute('aria-pressed',String(paused));$('pause').textContent=paused?'Carros ▶':'Carros Ⅱ'};
 $('speed').oninput=e=>velocity=Number(e.target.value);
 $('tour').onclick=()=>{move=null;explore();orbit.autoRotate=!orbit.autoRotate;$('tour').setAttribute('aria-pressed',String(orbit.autoRotate));};
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{fly(Number(b.dataset.view));$('menu-panel').hidden=true;$('menu').setAttribute('aria-expanded','false')});
 $('menu').onclick=()=>{const on=$('menu-panel').hidden;$('menu-panel').hidden=!on;$('menu').setAttribute('aria-expanded',String(on))};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('detail').hidden=true;$('menu-panel').hidden=true;$('menu').setAttribute('aria-expanded','false')}});
 document.addEventListener('visibilitychange',()=>{last=performance.now();});
 let down;renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];move=null;orbit.autoRotate=false;$('tour').setAttribute('aria-pressed','false');explore()});
 renderer.domElement.addEventListener('pointercancel',()=>{down=null;});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const r=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);pickRay.setFromCamera(ndc,camera);const hit=pickRay.intersectObjects(picks)[0];if(hit){const d=hit.object.userData;reveal(d.title,d.text,d.label);}});
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(tiles)tiles.setResolutionFromRenderer(camera,renderer)});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('fallback').hidden=false;});
}
function hotspots(data){
 const config=[
 {i:0,title:'PATRIMONIO INDUSTRIAL',text:'La estructura industrial se reconstruye con el módulo original bavaria.js: columnas, vigas, ladrillo, silos y cubiertas. Las huellas conservan su posición en el territorio.'},
 {i:2,title:'EL CORAZÓN DE BAVARIA',text:'Una de las naves centrales del conjunto. La propuesta del simulador estudia su recuperación para la vida productiva y comunitaria del barrio.'}
 ];
 config.forEach((p,j)=>{const e=data.edif[p.i],q=e.p.reduce((a,p)=>[a[0]+p[0]/e.p.length,a[1]+p[1]/e.p.length],[0,0]),w=lw(...q),b=document.createElement('button');b.className='hotspot';b.textContent=p.title;b.onclick=()=>reveal(p.title,p.text,'0'+(j+1)+' / BAVARIA');$('hotspots').append(b);markers.push({el:b,point:new THREE.Vector3(w[0],e.h+8,w[1])});});
 const b=document.createElement('button');b.className='hotspot';b.textContent='EL BOSQUE';b.onclick=()=>{fly(2);reveal('Un bosque dentro de la ciudad.','El arbolado conserva las posiciones del archivo bavaria_arboles.json. En el modelo arquitectónico se utilizan los árboles escaneados de Poly Haven ya incluidos en tu simulador.','03 / NATURALEZA')};$('hotspots').append(b);markers.push({el:b,point:new THREE.Vector3(270,30,60)});
 data.edif.forEach((e,i)=>{const g=new THREE.ExtrudeGeometry(poly(e.p),{depth:e.h,bevelEnabled:false}).rotateX(-Math.PI/2);const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false}));mesh.userData={title:config.find(p=>p.i===i)?.title||'Patrimonio industrial',text:config.find(p=>p.i===i)?.text||'Edificio existente del conjunto de Bavaria. Geometría y posición del simulador Kennedy.',label:'BAVARIA / '+String(i+1).padStart(2,'0')};picks.push(mesh);/* Raycast targets need world matrices but never enter the rendered scene. */mesh.updateMatrixWorld();});
}
async function init(){
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=THREE.SRGBColorSpace;$('viewport').append(renderer.domElement);renderer.domElement.tabIndex=0;
 scene=new THREE.Scene();scene.background=new THREE.Color('#b6cddd');scene.fog=new THREE.FogExp2('#cbd8db',.00024);environment=createTerritoryEnvironment(scene,renderer,api);
 camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,1,40000);orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=!reduced;orbit.dampingFactor=.065;orbit.minDistance=25;orbit.maxDistance=2800;orbit.maxPolarAngle=Math.PI*.485;orbit.autoRotateSpeed=.24;orbit.listenToKeyEvents(renderer.domElement);fly(0,true);
 scene.add(new THREE.HemisphereLight('#d9e8f4','#8c886c',1.55));const sun=new THREE.DirectionalLight('#fff0d5',2.7);sun.position.set(-500,700,400);sun.castShadow=!mobile;sun.shadow.mapSize.set(mobile?1024:4096,mobile?1024:4096);Object.assign(sun.shadow.camera,{left:-650,right:650,bottom:-650,top:650,near:10,far:2200});sun.shadow.bias=-.0002;sun.shadow.normalBias=.3;scene.add(sun);
 scene.environment=makeEnv(renderer);
 model=new THREE.Group();scene.add(model);
 T3={THREE,scene:model,renderer,movil:mobile,liviano:mobile,realista:true,kenArboles:true,waterU:{value:0},sueloY:.3,escenario:'hoy'};
 bind();
 const json=async url=>{const r=await fetch(url);if(!r.ok)throw Error('HTTP '+r.status+' en '+url);return r.json()};
 const [data,forest,roads]=await Promise.all([json('./data/bavaria.json'),json('./data/trees.json'),json('./data/roads.json')]);T3.bavArboles=forest.arboles;
 ground=new THREE.Mesh(new THREE.ShapeGeometry(poly(data.sitio)).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:texture('pasto_color',20),normalMap:texture('pasto_normal',20,true),normalScale:new THREE.Vector2(.5,.5),roughness:1}));ground.position.y=-.15;ground.receiveShadow=true;model.add(ground);
 architecture=construirBavaria({THREE,T3,lw,D:data,liviano:mobile});
 const asphalt=new THREE.MeshStandardMaterial({color:'#585b57',map:texture('via_color',1),normalMap:texture('via_normal',1,true),roughness:.92,side:THREE.DoubleSide});
 const roadGeometries=[];roads.edges.forEach(([type,points])=>{const width=type==='major'?8:type==='mid'?5:3;const pos=[],uv=[];for(let i=0;i<points.length-1;i++){const a=lw(...points[i]),b=lw(...points[i+1]);if(Math.min(Math.hypot(...a),Math.hypot(...b))>850)continue;const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.1)continue;const nx=-dz/len*width,nz=dx/len*width;const v=[[a[0]+nx,.02,a[1]+nz],[a[0]-nx,.02,a[1]-nz],[b[0]+nx,.02,b[1]+nz],[b[0]-nx,.02,b[1]-nz]];for(const j of[0,1,2,2,1,3]){pos.push(...v[j]);uv.push(j%2,len*(j>1?1:0)/8);}}if(!pos.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();roadGeometries.push(g)});if(roadGeometries.length){const merged=mergeGeometries(roadGeometries);const roadMesh=new THREE.Mesh(merged,asphalt);roadMesh.receiveShadow=true;model.add(roadMesh);roadGeometries.forEach(g=>g.dispose());}
 fleet=createFleet({...T3,scene},scene.environment);fleet.setNear(650);
 hotspots(data);api.ready=true;report('Cargando árboles y territorio fotográfico…');$('loading').classList.add('done');setTimeout(()=>$('loading').hidden=true,650);
 setupPhoto(data);
 loadTraffic().catch(e=>{api.errors.push(e.message);$('pause').disabled=true;$('pause').textContent='Tráfico no disponible'});
 buildTrees(T3,{t:forest.arboles},[],lw,scene.environment,[],null).then(t=>{trees=t;api.treesReady=true;setMode(wantPhoto);}).catch(e=>{api.errors.push('trees:'+e.message);report('El arbolado no pudo cargarse. Recarga para intentarlo de nuevo.');});
 const camDirection=new THREE.Vector3();$('attribution').textContent='© Esri · Imagen satelital';
 renderer.setAnimationLoop(now=>{
 if(document.hidden){last=now;return;}
 const dt=Math.min((now-last)/1000,.05);last=now;frame++;T3.waterU.value+=reduced?0:dt;
 if(move){move.time+=dt;const t=Math.min(1,move.time/2.4),e=t*t*(3-2*t);camera.position.lerpVectors(move.from,move.to,e);orbit.target.lerpVectors(move.fromTarget,move.toTarget,e);if(t===1)move=null;}
 if(!move)orbit.update();else camera.lookAt(orbit.target);camera.updateMatrixWorld();environment.update(camera);
 if(tiles){tiles.setResolutionFromRenderer(camera,renderer);tiles.update();
 const visible=tiles.visibleTiles?.size||0;api.visibleTiles=visible;
 const age=now-photoStarted;
 tiles.errorTarget=mobile?12:5;
 api.photoPending=(tiles.stats?.downloading||0)+(tiles.stats?.parsing||0);api.photoStage=photoAvailable?(api.photoPending?'refining':'visible'):'streaming';
 if(!photoAvailable&&visible>=12&&loadedTiles>=24&&age>8000&&now-lastModel>800){
  photoAvailable=true;api.photoReady=true;photoSettledAt=now;setMode(wantPhoto);report('');
 }
 api.photoSettled=photoAvailable&&api.photoPending===0&&now-lastModel>1500&&now-photoSettledAt>3500;
 if(now-lastAttrib>1800){lastAttrib=now;try{const a=tiles.getAttributions().filter(a=>a.type==='string').map(a=>a.value).join(' · ');$('attribution').textContent=photoAvailable?'Google'+(a?' · '+a:'')+(api.mode==='model'?' · © Esri':''):'© Esri · Imagen satelital';}catch{} }}
 if(trees&&model.visible&&frame%8===0){camera.getWorldDirection(camDirection);trees.update({position:camera.position,cam:camera.position,dir:camDirection});}
 updateTraffic(dt);
 markers.forEach(m=>{const p=m.point.clone().project(camera),visible=p.z<1&&p.z>-1&&Math.abs(p.x)<.96&&Math.abs(p.y)<.9;m.el.hidden=!visible;m.el.style.left=((p.x*.5+.5)*innerWidth)+'px';m.el.style.top=((-p.y*.5+.5)*innerHeight)+'px';});
 renderer.render(scene,camera);api.frames=frame;api.drawCalls=renderer.info.render.calls;
 });
}
init().catch(e=>{api.errors.push(e.message);console.error(e);$('loading').hidden=true;$('fallback').hidden=false;report('No se pudo cargar la escena');});
