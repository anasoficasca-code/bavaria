const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
for(const [name,url] of [['BAVARIA','https://anasoficasca-code.github.io/bavaria/'],['REFERENCE','https://skolkovoforbusiness.ru/']]){
 const page=await browser.newPage({viewport:{width:1100,height:700},deviceScaleFactor:1});
 await page.addInitScript(()=>{const raf=window.requestAnimationFrame;window.__freezeReview=false;window.requestAnimationFrame=fn=>window.__freezeReview?0:raf.call(window,fn)});
 try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});if(name==='BAVARIA')await page.waitForFunction(()=>window.__BAVARIA?.photoReady||window.__BAVARIA?.treesReady,{timeout:90000});else await page.waitForTimeout(12000);
 await page.evaluate(()=>{window.__freezeReview=true;});const buffer=await page.screenshot({type:'jpeg',quality:65,timeout:20000});console.log('REVIEW_IMAGE_'+name+' '+buffer.toString('base64'));if(name==='BAVARIA')console.log('REVIEW_STATE '+JSON.stringify(await page.evaluate(()=>window.__BAVARIA)));}catch(e){console.log('CAPTURE_ERROR_'+name+' '+e.message)}await page.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
