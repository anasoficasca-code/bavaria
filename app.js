import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
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
function path(points,color,width=.8){
 const c=new THREE.CurvePath();for(let i=1;i<points.length;i++)c.add(new THREE.LineCurve3(V(points[i-1],.12),V(points[i],.12)));
 const vertices=[],uvs=[],steps=Math.max(80,points.length*16);for(let i=0;i<=steps;i++){const t=i/steps,p=c.getPoint(t),d=c.getTangent(t),side=new THREE.Vector3(-d.z,0,d.x).normalize().multiplyScalar(width);for(const sign of [-1,1]){const q=p.clone().addScaledVector(side,sign);vertices.push(q.x,q.y,q.z);uvs.push(sign<0?0:1,t*c.getLength()*.12);}}
 const ix=[];for(let i=0;i<steps;i++){const j=i*2;ix.push(j,j+2,j+1,j+1,j+2,j+3);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(ix);g.computeVertexNormals();
 const map=surface('asphalt');const m=new THREE.Mesh(g,material(color,{map,side:THREE.DoubleSide}));m.receiveShadow=true;scene.add(m);
 // Painted dashes sit above the asphalt rather than floating tubes.
 for(let t=.02;t<.99;t+=.035){const p=c.getPoint(t),d=c.getTangent(t);const dash=box(.08,.012,.9,material('#e7dfc6'),p.x,.14,p.z);dash.rotation.y=Math.atan2(d.x,d.z);}
 return c;
}

let seed=718;const random=()=>((seed=(seed*16807)%2147483647)/2147483647);
function surface(kind){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
 c.fillStyle=kind==='brick'?'#9e6c50':kind==='grass'?'#778365':kind==='roof'?'#8a8d82':'#686b66';c.fillRect(0,0,512,512);
 for(let i=0;i<19000;i++){const v=Math.floor(random()*65);c.fillStyle='rgba('+v+','+v+','+v+','+(random()*.18)+')';const x=random()*512,y=random()*512;c.fillRect(x,y,1+random()*3,1+random()*3);}
 if(kind==='brick'){for(let y=0;y<512;y+=32)for(let x=-64;x<512;x+=96){const ox=x+(y/32%2)*48;c.strokeStyle='#c0ad94';c.lineWidth=2;c.strokeRect(ox,y,96,32);c.fillStyle='rgba(45,24,14,'+(random()*.18)+')';c.fillRect(ox+3,y+3,90,26);}}
 if(kind==='roof'){for(let x=0;x<512;x+=16){c.fillStyle='#ffffff20';c.fillRect(x,0,2,512);c.fillStyle='#00000025';c.fillRect(x+3,0,2,512);}}
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return tex;
}
function wallTexture(geometry){const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;for(let i=0;i<p.count;i++){if(Math.abs(n.getY(i))<.5)uv.setXY(i,(Math.abs(n.getX(i))>.7?p.getZ(i):p.getX(i))*.3,p.getY(i)*.3);else uv.setXY(i,p.getX(i)*.14,p.getZ(i)*.14);}uv.needsUpdate=true;}
function rounded(w,h,d,mat,x,y,z,parent){const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,.12),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}

function show(title,text,number='BAVARIA COMÚN'){ $('detail-title').textContent=title;$('detail-text').textContent=text;$('detail-number').textContent=number;$('detail').hidden=false;$('intro').classList.add('exploring');}
function setTour(on){tour=on;controls.autoRotate=on;controls.autoRotateSpeed=.35;$('tour').setAttribute('aria-pressed',String(on));}
function home(){setTour(false);camera.position.set(compact?240:220,165,280);controls.target.set(compact?-12:-65,0,0);controls.update();$('view-name').textContent='VISTA GENERAL';}
function failure(e){console.error(e);$('fallback').hidden=false;$('status').textContent='No se pudo cargar la maqueta';}
async function init(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,compact?1.5:2));renderer.setSize(innerWidth,innerHeight);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.domElement.setAttribute('aria-label','Vista 3D: arrastra para girar, rueda para acercar');renderer.domElement.tabIndex=0;$('viewport').append(renderer.domElement);
 scene=new THREE.Scene();scene.fog=new THREE.Fog('#dce1d9',350,1150);
 const room=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
 const textures={brick:surface('brick'),grass:surface('grass'),roof:surface('roof')};
 textures.grass.repeat.set(180,180);
 camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.5,1800);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=!reduced;controls.dampingFactor=.07;controls.minDistance=35;controls.maxDistance=650;controls.maxPolarAngle=Math.PI*.47;controls.listenToKeyEvents(renderer.domElement);home();
 const ambient=new THREE.HemisphereLight(0xfff4df,0x657e72,1.15);scene.add(ambient);
 const sun=new THREE.DirectionalLight(0xffdec0,4.2);sun.position.set(-150,115,110);sun.castShadow=true;sun.shadow.mapSize.set(compact?1024:2048,compact?1024:2048);Object.assign(sun.shadow.camera,{left:-180,right:180,top:180,bottom:-180,near:1,far:600});sun.shadow.bias=-.0005;sun.shadow.normalBias=.15;scene.add(sun);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(2200,2200),material('#9da58d',{map:textures.grass,bumpMap:textures.grass,bumpScale:.08}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.3;floor.receiveShadow=true;scene.add(floor);
 const get=async url=>{const r=await fetch(url);if(!r.ok)throw Error('No se pudo cargar '+url);return r.json()};
 const [data,forest]=await Promise.all([get('./data/bavaria.json'),get('./data/trees.json')]);
 const slab=new THREE.Mesh(new THREE.ExtrudeGeometry(shape(data.sitio),{depth:1,bevelEnabled:false}).rotateX(-Math.PI/2),material('#8b9a76',{map:surface('grass'),bumpMap:surface('grass'),bumpScale:.09}));slab.position.y=-1;slab.receiveShadow=true;scene.add(slab);
 const border=data.sitio.map(p=>V(p,.1));const boundary=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(border),new THREE.LineBasicMaterial({color:0x798768}));scene.add(boundary);
 const brick=material('#7d6852'),roof=material('#c2c1b7',{map:textures.roof,bumpMap:textures.roof,bumpScale:.045,metalness:.35,roughness:.52}),glass=new THREE.MeshPhysicalMaterial({color:'#54716f',metalness:.3,roughness:.12,clearcoat:1,envMapIntensity:.8});
 data.edif.forEach((e,index)=>{
 const h=Math.max(e.h/5,1);const mat=material(e.s==='ladrillo'?'#dec9b0':e.s==='esqueleto'?'#b5ad97':'#d1cbbc',e.s==='ladrillo'?{map:textures.brick,bumpMap:textures.brick,bumpScale:.075}:{roughness:.92});
 const geo=new THREE.ExtrudeGeometry(shape(e.p),{depth:h,bevelEnabled:false});geo.rotateX(-Math.PI/2);wallTexture(geo);
 const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={index,title:programs[index]?.[0]||'Patrimonio industrial',text:programs[index]?.[1]||'Edificación existente de la antigua fábrica. Su recuperación forma parte de una propuesta de reutilización del patrimonio industrial.'};buildings.push(mesh);scene.add(mesh);
 const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo,28),new THREE.LineBasicMaterial({color:0x685d4a,transparent:true,opacity:.18}));scene.add(edges);
 const cap=new THREE.Mesh(new THREE.ShapeGeometry(shape(e.p)).rotateX(-Math.PI/2),roof);cap.position.y=h+.025;cap.receiveShadow=true;scene.add(cap);
 const bounds=new THREE.Box3().setFromObject(mesh),size=bounds.getSize(new THREE.Vector3());if(size.x>6&&size.z>6){const center=bounds.getCenter(new THREE.Vector3());for(let k=-1;k<=1;k++){const vent=box(.6,.5,.8,material('#747971',{metalness:.65}),center.x+k*1.5,h+.28,center.z);}}
 // Window strips follow the original building footprint.
 for(let i=0;i<e.p.length-1;i++){const a=V(e.p[i]),b=V(e.p[i+1]),len=a.distanceTo(b);if(len<2)continue;const mid=a.clone().add(b).multiplyScalar(.5);for(let level=1;level<h-.4;level+=1.1){const win=box(len*.86,.36,.055,glass,mid.x,level,mid.z);win.rotation.y=-Math.atan2(b.z-a.z,b.x-a.x);}}
 if(programs[index]){const c=e.p.reduce((a,p)=>a.add(V(p)),new THREE.Vector3()).multiplyScalar(1/e.p.length);const marker=new THREE.Mesh(new THREE.SphereGeometry(.65,12,8),material('#e76537',{emissive:'#d84f24',emissiveIntensity:.25}));marker.position.set(c.x,h+2,c.z);scene.add(marker);lights.push(marker.material);}
 });
 // The canopy coordinates are retained from the original Bavaria dataset.
 const points=forest.arboles.filter((_,i)=>i%(compact?3:2)===0);
 const foliage=new THREE.InstancedMesh(new THREE.SphereGeometry(1,compact?7:10,compact?5:7),material('#95a37c',{roughness:1}),points.length*3);
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.13,.22,1,5),brick,points.length);
 const dummy=new THREE.Object3D();
 points.forEach((t,i)=>{const p=V(t),h=t[2]/5,r=t[3]/5;dummy.position.set(p.x,h*.35,p.z);dummy.scale.set(1,h*.7,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=h*.85;dummy.scale.set(r*1.5,h*.52,r*1.5);dummy.rotation.y=i*2.4;dummy.updateMatrix();for(let k=0;k<3;k++){dummy.position.set(p.x+Math.sin(i*2.4+k*2.1)*r*.5,h*(.65+k*.15),p.z+Math.cos(i*1.7+k*2.1)*r*.5);dummy.scale.set(r*(1.2-k*.16),h*(.35+k*.02),r*(1.15-k*.14));dummy.updateMatrix();foliage.setMatrixAt(i*3+k,dummy.matrix);foliage.setColorAt(i*3+k,new THREE.Color().setHSL(.22+(i%7)*.009,.22+(i%3)*.04,.26+(i%5)*.023));}});
 foliage.castShadow=true;foliage.receiveShadow=true;trunks.castShadow=true;scene.add(foliage,trunks);
 data.tanques.forEach(p=>{const q=V(p);const tank=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.65,4.2,24),new THREE.MeshPhysicalMaterial({color:'#a9aca7',metalness:.72,roughness:.3}));tank.position.set(q.x,2.1,q.z);tank.castShadow=true;scene.add(tank);for(const y of [.4,2,3.8]){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.67,.055,6,24),material('#5f6865',{metalness:.7}));ring.rotation.x=Math.PI/2;ring.position.set(q.x,y,q.z);scene.add(ring);}});
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
 const car=new THREE.Group();const paint=new THREE.MeshPhysicalMaterial({color:['#dd643d','#e4d5ad','#617d78','#f3efdf'][i%4],roughness:.24,metalness:.45,clearcoat:1,clearcoatRoughness:.15});
 rounded(ri===0?1.1:.9,.55,2.1,paint,0,.6,0,car);rounded(.8,.55,1.1,paint,0,1.06,-.13,car);box(.84,.35,.04,windowMat,0,1.13,.44,car);box(.84,.35,.04,windowMat,0,1.13,-.7,car);
 for(const x of [-.55,.55])for(const z of [-.6,.6]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.15,16),tireMat);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.32,z);car.add(wheel);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.16,12),material('#b6bbb9',{metalness:.9,roughness:.23}));hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);car.add(hub);}
 for(const x of [-.32,.32])box(.2,.13,.06,material('#ffedbc',{emissive:'#ffdf8e',emissiveIntensity:.5}),x,.75,1.03,car);
 for(const x of [-.32,.32])box(.2,.13,.06,material('#7e1712',{emissive:'#e52518',emissiveIntensity:.4}),x,.65,-1.06,car);
 scene.add(car);cars.push({mesh:car,curve,length,t:i/r.n,rate:(ri===1?7:4)/length});
 }});
 let down=null;renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];setTour(false)});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(buildings)[0];if(hit){const b=hit.object;show(b.userData.title,b.userData.text,'PATRIMONIO / '+String(b.userData.index+1).padStart(2,'0'));$('view-name').textContent=b.userData.title.toUpperCase();}});
 $('night').onclick=()=>{night=!night;document.body.classList.toggle('night',night);$('night').setAttribute('aria-pressed',String(night));$('night').textContent=night?'Día ☀':'Noche ◐';ambient.intensity=night?.22:1.15;sun.intensity=night?.4:4.2;sun.color.set(night?'#8daed1':'#ffe1b5');renderer.toneMappingExposure=night?.7:1.05;scene.fog.color.set(night?'#111e22':'#e0e1d5');floor.material.color.set(night?'#334337':'#9da58d');glass.emissive.set(night?'#eeb86c':'#000000');glass.emissiveIntensity=night?.6:0;lights.forEach(m=>m.emissiveIntensity=night?2:.25);};
 $('pause').setAttribute('aria-pressed',String(paused));$('pause').textContent=paused?'Reanudar carros ▶':'Pausar carros Ⅱ';
 $('pause').onclick=()=>{paused=!paused;$('pause').setAttribute('aria-pressed',String(paused));$('pause').textContent=paused?'Reanudar carros ▶':'Pausar carros Ⅱ';};
 $('speed').oninput=e=>{speed=Number(e.target.value);$('speed-value').value=speed+'×'};
 $('tour').onclick=()=>setTour(!tour);$('home').onclick=home;
 $('explore').onclick=()=>{$('intro').classList.add('exploring');$('detail').hidden=true;controls.target.set(0,0,0);camera.position.set(150,95,195);controls.update();renderer.domElement.focus()};
 $('about').onclick=e=>{e.preventDefault();show('Un territorio que vuelve a conectar.','La antigua fábrica se explora como un lugar de producción local, aprendizaje y encuentro. Recuperar sus edificios, cuidar el bosque y llevar el abastecimiento a la escala del barrio.','01 / EL PROYECTO')};
 $('close-detail').onclick=()=>{$('detail').hidden=true};document.addEventListener('keydown',e=>{if(e.key==='Escape')$('detail').hidden=true});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failure(new Error('Se perdió el contexto WebGL. Recarga la página.'))});
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
 $('status').textContent='';let last=performance.now();
 renderer.setAnimationLoop(now=>{const dt=Math.min((now-last)/1000,.05);last=now;for(const c of cars){if(!paused)c.t=(c.t+dt*c.rate*speed)%1;const p=c.curve.getPoint(c.t),t=c.curve.getTangent(c.t);c.mesh.position.copy(p);c.mesh.rotation.y=Math.atan2(t.x,t.z);}controls.update();renderer.render(scene,camera)});
}
init().catch(failure);
