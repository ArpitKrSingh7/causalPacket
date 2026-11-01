/* Record the real redesigned interface and API responses. No fixtures or HTTP stubs.
 * Optional tool; Linux/WSL, Playwright Chromium and FFmpeg required.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const script = JSON.parse(fs.readFileSync(path.join(root, 'docs/video-voiceover.json'), 'utf8'));
const output = path.resolve(root, '.artifacts/demo-new-ui');
const ui = 'http://localhost:3000';
const api = 'http://127.0.0.1:8000';
const owned = [];
let browser, context;
const timings = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const summary = page => page.locator('section[aria-label="Investigation summary"]');
const modulePath = process.env.CAUSALPACKET_PLAYWRIGHT_MODULE || path.join(root, '.artifacts/recorder/node_modules/playwright');
let chromium;
try { ({ chromium } = require(modulePath)); }
catch { throw new Error('Install the optional recorder dependencies as described in docs/demo-script.md, or set CAUSALPACKET_PLAYWRIGHT_MODULE.'); }
if (fs.existsSync(output)) throw new Error('Recording output already exists: ' + output + '. Keep it for review or move it before recording again.');
for (const command of ['ffmpeg', 'ffprobe']) {
  const check = spawnSync(command, ['-version'], { stdio: 'ignore' });
  if (check.status !== 0) throw new Error(command + ' is required to prepare the MP4. See docs/demo-script.md.');
}
fs.mkdirSync(output, { recursive: true });

function start(command, args, cwd) {
  const log = fs.openSync(path.join(output, 'servers.log'), 'a');
  const child = spawn(command, args, { cwd, detached: true, stdio: ['ignore', log, log] });
  fs.closeSync(log);
  owned.push(child);
  child.on('error', error => process.stderr.write('Server startup: ' + error.message + '\n'));
  return child;
}
async function up(url) {
  try { return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok; }
  catch { return false; }
}
async function ready(url, timeout = 60000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await up(url)) return;
    if (owned.some(child => child.exitCode !== null)) throw new Error('A recording server stopped. See ' + path.join(output, 'servers.log'));
    await sleep(500);
  }
  throw new Error('Timed out waiting for ' + url);
}
async function stop() {
  if (context) { const current = context; context = null; await current.close().catch(() => {}); }
  if (browser) { const current = browser; browser = null; await current.close().catch(() => {}); }
  for (const child of owned) {
    if (child.exitCode === null && child.pid) {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Already exited. */ }
    }
  }
  await sleep(300);
  // These process groups were created by this recorder, never by the user.
  for (const child of owned) {
    if (child.exitCode === null && child.pid) {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* Already exited. */ }
    }
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stop().finally(() => process.exit(130)); });

function srtTime(seconds) {
  const millis = Math.round(seconds * 1000);
  return `${String(Math.floor(millis/3600000)).padStart(2,'0')}:${String(Math.floor(millis/60000)%60).padStart(2,'0')}:${String(Math.floor(millis/1000)%60).padStart(2,'0')},${String(millis%1000).padStart(3,'0')}`;
}
function saveTimings() {
  fs.writeFileSync(path.join(output, 'scene-timings.json'), JSON.stringify({ method: 'Actual Playwright browser recording with real local API responses; no HTTP interception.', frontend: ui, api, scenes: timings }, null, 2) + '\n');
  const cues = [];
  for (const scene of timings) {
    const words = scene.say.split(/\s+/);
    const chunks = [];
    for (let i=0;i<words.length;i+=15) chunks.push(words.slice(i,i+15).join(' '));
    chunks.forEach((line,index) => {
      const a=scene.start+(scene.end-scene.start)*index/chunks.length;
      const b=scene.start+(scene.end-scene.start)*(index+1)/chunks.length;
      cues.push(`${cues.length+1}\n${srtTime(a)} --> ${srtTime(b)}\n${line}\n`);
    });
  }
  fs.writeFileSync(path.join(output, 'voiceover.srt'), cues.join('\n'));
}

async function main() {
  let video;
  try {
    // Launch first: a blocked browser should not leave recording servers running.
    browser = await chromium.launch({ headless: true });
    if (!await up(api + '/api/health')) start(path.join(root,'.venv-hardened/bin/python'), ['-m','uvicorn','backend.app:app','--host','127.0.0.1','--port','8000'],root);
    if (!await up(ui)) {
      if (!fs.existsSync(path.join(root,'frontend/.next/BUILD_ID'))) {
        const build=spawnSync(process.execPath, ['node_modules/next/dist/bin/next','build','--webpack'],{cwd:path.join(root,'frontend'),stdio:'inherit'});
        if(build.status!==0)throw new Error('Frontend build failed.');
      }
      start(process.execPath,['node_modules/next/dist/bin/next','start','-p','3000'],path.join(root,'frontend'));
    }
    await ready(api+'/api/health'); await ready(ui);
    context = await browser.newContext({ viewport: { width:1440,height:900 }, recordVideo:{dir:path.join(output,'raw'),size:{width:1440,height:900}}, acceptDownloads:true, reducedMotion:'reduce' });
    const epoch=performance.now();
    const page=await context.newPage();video=page.video();
    page.setDefaultTimeout(30000);
    const consoleErrors=[];
    page.on('pageerror',error=>consoleErrors.push(error.message));
    await page.goto(ui,{waitUntil:'networkidle'});
    await page.getByRole('heading',{name:/Fault or foe/}).waitFor();
    await page.getByText('Engine online',{exact:true}).waitFor();
    await page.evaluate(()=>document.fonts.ready);
    // Recording includes initial page load; use that same timeline for narration.
    const initialVideoOffset=0;
    async function click(locator) {
      await locator.scrollIntoViewIfNeeded();
      await locator.hover();
      const box=await locator.boundingBox();
      if(box)await page.mouse.move(box.x+box.width/2,box.y+box.height/2,{steps:12});
      await sleep(350);await locator.click();
    }
    async function sample(id) {
      const change=page.getByRole('button',{name:'Change capture',exact:true});
      if(await change.isVisible())await click(change);
      let choice=page.locator(`[data-sample-id="${id}"]`);
      if(await choice.count()===0)await click(page.getByRole('button',{name:/Explore all \d+ captures/}));
      choice=page.locator(`[data-sample-id="${id}"]`);
      const pending=page.waitForResponse(response=>response.url().includes('/api/samples/'+id+'/analyze')&&response.request().method()==='POST');
      await click(choice);const response=await pending;assert.equal(response.status(),200);const report=await response.json();
      await summary(page).waitFor();await summary(page).scrollIntoViewIfNeeded();return report;
    }
    async function reinterpret(action) {
      const pending=page.waitForResponse(response=>response.url().endsWith('/reinterpret')&&response.request().method()==='POST');
      await action();const response=await pending;assert.equal(response.status(),200);return response.json();
    }
    async function scene(id,action) {
      const spec=script.scenes.find(item=>item.id===id);
      const start=initialVideoOffset+(performance.now()-epoch)/1000;
      process.stdout.write('Recording '+spec.title+'\n');
      await action();
      await sleep(Math.max(0,spec.seconds*1000-(performance.now()-epoch-start*1000)));
      timings.push({...spec,start,end:initialVideoOffset+(performance.now()-epoch)/1000});saveTimings();
    }
    await scene('intro',async()=>{await page.evaluate(()=>window.scrollTo(0,0));});
    await scene('problem',async()=>{await sleep(6500);await page.locator('#capture-ingestion').scrollIntoViewIfNeeded();});
    await scene('approach',async()=>{await page.locator('[aria-label="How an investigation works"]').scrollIntoViewIfNeeded();});
    await scene('service',async()=>{
      await sample('service-failure');await summary(page).getByRole('heading',{name:/12 connection attempts refused/}).waitFor();await sleep(6000);
      await click(page.locator('[aria-label="Evidence map"]').getByRole('button',{name:/^#\d+$/}).first());await sleep(5000);await page.keyboard.press('Escape');
      await click(page.locator('summary').filter({hasText:'Full observations, competing explanations and next checks'}));
      const comparison=page.getByText(/earlier completed handshake/i).first();if(await comparison.count())await comparison.scrollIntoViewIfNeeded();
    });
    await scene('mixed',async()=>{
      const report=await sample('mixed-scan-and-fault');assert.equal(report.incidents.length,2);await sleep(6000);
      await click(summary(page).getByRole('button',{name:'Test another explanation'}));
      await page.locator('input[placeholder="e.g. 192.0.2.115"]').fill('192.0.2.115');
      const approved=await reinterpret(()=>click(page.getByRole('button',{name:'Apply Context',exact:true})));assert.deepEqual(approved.incidents.map(i=>i.assessment).sort(),['likely_fault','unresolved']);
      await summary(page).scrollIntoViewIfNeeded();
    });
    let gateway;
    await scene('gateway',async()=>{
      gateway=await sample('gateway-transition');assert.equal(gateway.incidents[0].assessment,'unresolved');
      await sleep(5000);const map=page.locator('[aria-label="Evidence map"]');await map.scrollIntoViewIfNeeded();await sleep(6000);
      await click(map.getByRole('button',{name:/^#\d+$/}).first());await sleep(4000);await page.keyboard.press('Escape');
    });
    await scene('alibi',async()=>{
      await click(summary(page).getByRole('button',{name:'Test another explanation'}));await sleep(4000);
      const baseline=await reinterpret(()=>click(page.getByRole('button',{name:'Apply sample inventory',exact:true})));assert.equal(baseline.incidents[0].assessment,'suspected_attack');
      await summary(page).scrollIntoViewIfNeeded();await sleep(9000);
      const approved=await reinterpret(()=>click(page.getByRole('button',{name:'Approve as authorized gateway',exact:true})));assert.equal(approved.incidents[0].assessment,'unresolved');
      for(const field of ['observations','evidence','edges','coverage'])assert.deepEqual(approved[field],gateway[field]);
      await summary(page).scrollIntoViewIfNeeded();await summary(page).getByText('Evidence retained',{exact:true}).waitFor();
    });
    await scene('lab',async()=>{
      await click(page.getByRole('button',{name:/Can the diagnosis survive missing evidence/}));
      const pending=page.waitForResponse(response=>response.url().endsWith('/api/lab/evidence'),{timeout:90000});await click(page.getByRole('button',{name:'Run evidence experiment',exact:true}));
      const response=await pending;assert.equal(response.status(),200);const result=await response.json();assert.equal(result.data_origin,'synthetic_experiment');
      await page.locator('[aria-label="Actual experiment results"]').scrollIntoViewIfNeeded();await sleep(5000);
      await click(page.getByRole('button',{name:/^0 \/ 20 replies/}));await page.locator('[aria-label="Selected lab capture evidence"]').scrollIntoViewIfNeeded();
    });
    await scene('coverage',async()=>{
      const report=await sample('truncated');assert.equal(report.coverage.status,'partial');
      await sleep(5000);const pending=page.waitForEvent('download');await click(page.getByRole('button',{name:'Download report (.md)',exact:true}));await pending;
      await click(page.locator('summary').filter({hasText:'Capture coverage:'}));
    });
    await scene('closing',async()=>{
      // An explicit presentation end card, not a simulated application screen.
      await page.setContent(`<html><head><style>body{margin:0;background:#f5f5f2;color:#182336;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh}.card{width:1000px}small{font-size:14px;color:#6a7587;letter-spacing:3px}h1{font-size:76px;letter-spacing:-5px;font-weight:500;margin:26px 0}p{font-size:20px;color:#58667c;line-height:1.8}.urls{border-top:1px solid #dfe3e8;margin-top:45px;padding-top:30px;display:flex;gap:60px}.urls b{color:#182336;font-size:13px}a{display:block;color:#2855d9;font-size:18px;margin-top:12px;text-decoration:none}</style></head><body><div class="card"><small>CAUSALPACKET / DEMO END CARD</small><h1>Follow the <span style="color:#e64d2e">evidence.</span></h1><p>Arpit Kumar Singh · IIITDM Kancheepuram Cybersecurity Hackathon<br>Own detection logic. Competing explanations. Exact packet evidence.</p><div class="urls"><div><b>TRY THE APP · VERCEL</b><a>${script.frontend_url}</a></div><div><b>PYTHON API · RENDER</b><a>${script.backend_url}</a></div></div><p style="font-size:15px;margin-top:35px">Public source & setup: ${script.repository_url}</p></div></body></html>`);
    });
    assert.deepEqual(consoleErrors,[],'Browser runtime errors were recorded');
    await context.close();context=null;
    const raw=await video.path();
    const destination=path.join(output,'causalpacket-new-ui.mp4');
    const encode=spawnSync('ffmpeg',['-v','error','-nostdin','-i',raw,'-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart','-an',destination],{stdio:'inherit'});
    if(encode.status!==0)throw new Error('MP4 conversion failed; raw browser video remains available.');
    const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',destination],{encoding:'utf8'});
    const duration=Number(probe.stdout.trim());
    if(probe.status!==0||duration<120||duration>300)throw new Error('Review the recording duration before submitting: '+duration+' seconds.');
    fs.writeFileSync(path.join(output,'recording-status.json'),JSON.stringify({complete:true,duration_seconds:duration,video:destination,method:'Actual redesigned UI, real local API, synthetic captures. Review before publishing.'},null,2)+'\n');
    process.stdout.write('Recorded '+duration.toFixed(2)+' seconds. Add your voice-over and review: '+destination+'\n');
  } finally {
    await stop();
    if (fs.existsSync(output) && fs.readdirSync(output).length === 0) fs.rmdirSync(output);
  }
}
main().catch(error=>{process.stderr.write(String(error)+'\n');process.exitCode=1;});
