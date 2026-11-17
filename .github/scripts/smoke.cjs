const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.join(process.cwd(),'public',decodeURIComponent(new URL(req.url,'http://localhost').pathname));const resolved=path.resolve(file);if(!resolved.startsWith(path.resolve('public')+path.sep)&&resolved!==path.resolve('public')){res.writeHead(403);return res.end();}
 const target=resolved===path.resolve('public')?path.join(resolved,'index.html'):resolved;
 fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found');}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.txt':'text/plain'})[path.extname(target)]||'application/octet-stream');res.end(data);});});
 if(!process.env.SITE_URL)await new Promise(r=>server.listen(4173,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});const errors=[],network=[];const safeUrl=url=>{try{const u=new URL(url);return u.host+u.pathname}catch{return 'invalid URL'}};page.on('requestfailed',r=>{if(network.length<25)network.push({kind:'requestfailed',resource:safeUrl(r.url()),error:r.failure()?.errorText})});page.on('response',r=>{if(r.status()>=400&&network.length<25)network.push({kind:'http',resource:safeUrl(r.url()),status:r.status()})});
 page.on('pageerror',e=>{errors.push(e.message);console.log('BROWSER_ERROR '+e.message)});page.on('console',m=>{if(m.type()==='error'&&/Shader Error|VALIDATE_STATUS|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>{const tick=t=>window.__capturePaused?raf(tick):callback(t);return raf(tick)};});
 const capture=async options=>{await page.evaluate(()=>window.__capturePaused=true);await page.waitForTimeout(250);try{return await page.screenshot({...options,timeout:60000})}finally{await page.evaluate(()=>window.__capturePaused=false)}};
 await page.goto(process.env.SITE_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.__BAVARIA?.ready,{timeout:90000});
 await page.waitForFunction(()=>window.__BAVARIA?.treesReady&&window.__BAVARIA?.trafficReady&&window.__BAVARIA.frames>10,{timeout:120000});
 assert.equal(await page.locator('#portada').isVisible(),false,'Open directly in the movable model');
 console.log('INITIAL_STATE '+JSON.stringify(await page.evaluate(()=>window.__BAVARIA)));
 console.log('VISUAL_BASELINE_JPEG '+(await capture({type:'jpeg',quality:65,timeout:45000})).toString('base64'));
 await page.locator('#model').click();await page.waitForTimeout(1500);
 assert.equal(await page.evaluate(()=>window.__BAVARIA.mode),'model');
 const a=await page.evaluate(()=>window.__BAVARIA);assert.ok(a.vehicles>0,'Original SUMO trajectories must produce visible vehicles');
 await page.locator('#pause').click();assert.equal(await page.locator('#pause').getAttribute('aria-pressed'),'true');
 await page.locator('#speed').fill('2');
 await page.locator('#forest-view').click();await page.waitForFunction(()=>window.__BAVARIA.cameraMoving===false,{timeout:60000});console.log('FOREST_STATE '+JSON.stringify(await page.evaluate(()=>window.__BAVARIA)));
 await page.locator('#about').click();assert.equal(await page.locator('#detail').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#detail').isVisible(),false);
 await capture({path:'bavaria-desktop.png'});console.log('VISUAL_MODEL_JPEG '+(await capture({type:'jpeg',quality:72})).toString('base64'));
 await page.locator('#photo').click();await page.waitForTimeout(12000);
 console.log('VISUAL_PHOTO_JPEG '+(await capture({type:'jpeg',quality:72,timeout:45000})).toString('base64'));
 const final=await page.evaluate(()=>window.__BAVARIA);console.log('BAVARIA_BROWSER_RESULT '+JSON.stringify(final));console.log('BAVARIA_NETWORK '+JSON.stringify(network));assert.deepEqual(errors,[],'No browser or shader runtime errors');
 if(process.env.REQUIRE_PHOTO==='1')assert.ok(final.photoReady,'The published site must load Google photographic 3D tiles');
 await page.setViewportSize({width:390,height:844});await page.locator('#menu').click();assert.equal(await page.locator('#menu-panel').isVisible(),true);await capture({path:'bavaria-mobile.png'});
 await page.locator('#return-cover').click();assert.equal(await page.locator('#portada').isVisible(),true);
 await page.locator('#cover-gallery-button').click();assert.equal(await page.locator('#cover-gallery').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#cover-gallery').isVisible(),false);
 await capture({path:'bavaria-cover-mobile.png'});console.log('VISUAL_MOBILE_COVER_JPEG '+(await capture({type:'jpeg',quality:75})).toString('base64'));
 console.log('BAVARIA_UI_SMOKE_OK');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
