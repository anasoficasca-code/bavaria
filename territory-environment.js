import * as THREE from 'three';
// Same geographic reference and imagery provider as the Kennedy simulator.
// A real satellite ground supports the original architecture while 3D tiles stream.
export function createTerritoryEnvironment(scene, renderer, api) {
const skyU = {
      top: { value: new THREE.Color('#6498c4') },
      mid: { value: new THREE.Color('#a7c7df') },
      bot: { value: new THREE.Color('#d9e1df') },
      uTime: { value: 0 },
      uCloud: { value: 0.55 },
      uGlow: { value: 1.0 },
      uSunDir: { value: new THREE.Vector3(-500, 700, 400).normalize() }
    };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(15000, 20, 12),
      new THREE.ShaderMaterial({
        uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vP; uniform vec3 top, mid, bot, uSunDir; uniform float uTime, uCloud, uGlow;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
          float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }
          void main(){
            vec3 d = normalize(vP);
            float h = d.y;
            vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.75, h)) : mix(bot, mid, smoothstep(-0.08, 0.12, h));
            float sunAmt = max(dot(d, normalize(uSunDir)), 0.0);
            if (d.y > 0.015) {
              vec2 cuv = d.xz / (d.y + 0.28) * 0.75 + uTime * vec2(0.018, 0.007);
              float cl = smoothstep(0.50, 0.74, fbm(cuv)); // pocas nubes sueltas, no un techo cubierto
              vec3 cloudCol = mix(vec3(0.80, 0.84, 0.90), vec3(1.0, 0.98, 0.94), pow(sunAmt, 2.0));
              c = mix(c, cloudCol, cl * smoothstep(0.015, 0.18, d.y) * uCloud);
            }
            c += vec3(1.0, 0.86, 0.62) * (pow(sunAmt, 400.0) * 1.4 + pow(sunAmt, 14.0) * 0.18) * uGlow; // disco y halo del sol
            c += vec3(1.0, 0.74, 0.46) * pow(sunAmt, 5.0) * 0.16 * (1.0 - smoothstep(0.0, 0.45, h)) * uGlow; // horizonte más cálido del lado del sol
            c = mix(c, c * vec3(0.93, 0.97, 1.04), smoothstep(0.3, 0.9, h) * 0.5); // cenit algo más frío y profundo
            gl_FragColor = vec4(c, 1.0);
          }`
      })
    );
    sky.frustumCulled = false; sky.renderOrder = -30; // el cielo se dibuja primero (la foto de Google y todo lo demás van encima)
    scene.add(sky);
    
const terrain=new THREE.Group();scene.add(terrain);
const lat0=4.63+(3000-2090.06)/110540;
const lng0=-74.17+(9350-5193.24)/(111320*Math.cos(4.63*Math.PI/180));
const cos=Math.cos(4.63*Math.PI/180),loader=new THREE.TextureLoader();
api.satelliteLoaded=0;api.satelliteErrors=0;
const queue=[];
for(const [zoom,radius] of [[14,3],[17,4]]){
 const n=2**zoom,fx=(lng0+180)/360*n,fy=(1-Math.asinh(Math.tan(lat0*Math.PI/180))/Math.PI)/2*n;
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
  const x=Math.floor(fx)+dx,y=Math.floor(fy)+dy;
  const lon=t=>t/n*360-180,lat=t=>Math.atan(Math.sinh(Math.PI*(1-2*t/n)))*180/Math.PI;
  const west=(lon(x)-lng0)*111320*cos,east=(lon(x+1)-lng0)*111320*cos;
  const north=(lat0-lat(y))*110540,south=(lat0-lat(y+1))*110540;
  queue.push({zoom,x,y,west,east,north,south,d:dx*dx+dy*dy});
 }
}
queue.sort((a,b)=>a.zoom-b.zoom||a.d-b.d);
let pending=0,index=0;
function next(){
 while(pending<6&&index<queue.length){
 const q=queue[index++];pending++;
 loader.load('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/'+q.zoom+'/'+q.y+'/'+q.x,tex=>{
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(q.east-q.west,q.south-q.north),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));
  mesh.rotation.x=-Math.PI/2;mesh.position.set((q.west+q.east)/2,q.zoom===17?-1.2:-1.6,(q.north+q.south)/2);
  terrain.add(mesh);api.satelliteLoaded++;pending--;next();
 },undefined,()=>{api.satelliteErrors++;pending--;next();});
 }
}
next();
return {sky,terrain,update(camera){sky.position.copy(camera.position);},setPhotographic(on){terrain.visible=!on;}};
}
