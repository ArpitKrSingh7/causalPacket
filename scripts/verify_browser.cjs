/* Real local browser walkthrough. Start one API/UI pair first.
 * Set CAUSALPACKET_PLAYWRIGHT_MODULE to an installed playwright package path.
 * Only delayed/error-response checks intercept HTTP; normal analysis/lab uses
 * the actual live API. This script closes its browser, not externally started servers.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const modulePath=process.env.CAUSALPACKET_PLAYWRIGHT_MODULE;
if(!modulePath) throw new Error('Set CAUSALPACKET_PLAYWRIGHT_MODULE to the installed playwright package path.');
const {chromium}=require(modulePath);
const output=path.resolve('.artifacts/final-ui');
fs.mkdirSync(output,{recursive:true});
const checks=[],errors=[],downloads=[];
const pass=name=>{checks.push(name);process.stdout.write('PASS '+name+'\n');};
const summary=page=>page.locator('section[aria-label="Investigation summary"]');

async function sample(page,id,title){
  const change=page.getByRole('button',{name:'Change capture',exact:true});
  if(await change.isVisible())await change.click();
  const response=page.waitForResponse(r=>r.url().includes('/api/samples/'+id+'/analyze')&&r.request().method()==='POST');
  await page.getByRole('button',{name:new RegExp(title)}).click();
  const actual=await response;assert.equal(actual.status(),200);
  const report=await actual.json();
  await page.getByRole('button',{name:'Change capture',exact:true}).waitFor();
  assert.deepEqual(report.context,{gateway_ip:null,approved_gateway_macs:[],authorized_scanner_ips:[]});
  return report;
}

async function reinterpret(page,action){
  const response=page.waitForResponse(r=>r.url().endsWith('/reinterpret')&&r.request().method()==='POST');
  await action();const actual=await response;assert.equal(actual.status(),200);return actual.json();
}

async function main(){
  let browser;
  try{
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    page.on('download',download=>downloads.push(download));
    await page.goto('http://localhost:3000');
    await page.getByRole('heading',{name:'Choose a sample or upload a capture to begin'}).waitFor();
    assert.equal(await summary(page).count(),0);
    await page.getByText('API Online',{exact:true}).waitFor();
    pass('Fresh Live state and actual backend catalog');

    const service=await sample(page,'service-failure','Service failure');
    await summary(page).getByRole('heading',{name:/12 connection attempts refused/}).waitFor();
    const bounds=await summary(page).boundingBox();assert(bounds&&bounds.y<450,'Diagnosis must be near the top of the viewport');
    await page.screenshot({path:path.join(output,'01-investigation.png')});
    await page.locator('section[aria-label="Evidence map"]').getByRole('button',{name:/^#\d+$/}).first().click();
    await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download data (.json)',exact:true}).click();
    const saved=await download;const file=path.join(output,'service-report.json');await saved.saveAs(file);
    assert.equal(JSON.parse(fs.readFileSync(file)).analysis_id,service.analysis_id);
    pass('Above-fold diagnosis, map frame drawer and actual JSON export');

    await sample(page,'mixed-scan-and-fault','Scan and independent fault');
    assert.equal(await page.locator('aside').getByRole('button').count(),2);
    await summary(page).getByRole('button',{name:'Test another explanation'}).click();
    await page.locator('input[placeholder="e.g. 192.0.2.115"]').fill('192.0.2.115');
    const approvedScan=await reinterpret(page,()=>page.getByRole('button',{name:'Apply Context',exact:true}).click());
    assert.deepEqual(approvedScan.incidents.map(i=>i.assessment).sort(),['likely_fault','unresolved']);
    pass('Mixed-case scanner authorization preserves independent fault');

    const gateway=await sample(page,'gateway-transition','Gateway identity investigation');
    await summary(page).getByRole('button',{name:'Test another explanation'}).click();
    const baseline=await reinterpret(page,()=>page.getByRole('button',{name:'Apply sample inventory',exact:true}).click());
    assert.equal(baseline.incidents[0].assessment,'suspected_attack');
    const approved=await reinterpret(page,()=>page.getByRole('button',{name:'Approve as authorized gateway',exact:true}).click());
    assert.equal(approved.incidents[0].assessment,'unresolved');
    for(const field of ['observations','evidence','edges','coverage'])assert.deepEqual(approved[field],gateway[field]);
    await summary(page).getByText('Still needs investigation',{exact:true}).waitFor();
    await page.screenshot({path:path.join(output,'02-alibi.png')});
    pass('Gateway baseline/approval and immutable facts with visible remaining problems');

    await page.getByRole('button',{name:/Can the diagnosis survive missing evidence/}).click();
    const labResponse=page.waitForResponse(r=>r.url().endsWith('/api/lab/evidence'),{timeout:30000});
    await page.getByRole('button',{name:'Run evidence experiment',exact:true}).click();
    const response=await labResponse;assert.equal(response.status(),200);const lab=await response.json();
    await page.locator('[aria-label="Actual experiment results"]').waitFor();
    assert.equal(lab.data_origin,'synthetic_experiment');assert.equal(lab.cases.length,10);
    const noReply=lab.cases.find(c=>c.id==='scan-0');assert.equal(noReply.report.incidents[0].assessment,'unresolved');
    await page.getByRole('button',{name:/^0 \/ 20 replies/}).click();
    await page.getByRole('button',{name:'Derived #2 · source #3',exact:true}).click();
    await page.getByRole('dialog').getByText(/Synthetic lab · scan-0.*source #3/).waitFor();
    await page.keyboard.press('Escape');
    const unchanged=await context.request.get('http://127.0.0.1:8000/api/analyses/'+approved.analysis_id+'/export?format=json');
    assert.deepEqual(await unchanged.json(),approved);
    await page.locator('section[aria-label="Experimental evidence lab"]').screenshot({path:path.join(output,'03-evidence-lab.png')});
    pass('Actual live lab, unresolved missing replies, mapped frames and unchanged main report');

    // Controlled stale-response fault injection uses an actual previously measured lab payload.
    let release,markSeen;
    const seen=new Promise(resolve=>{markSeen=resolve;});
    const delayed=new Promise(resolve=>{release=resolve;});
    await page.route('**/api/lab/evidence',async route=>{markSeen();await delayed;try{await route.fulfill({json:lab});}catch{ /* Aborted navigation is expected. */ }});
    await page.getByRole('button',{name:'Run evidence experiment',exact:true}).click();
    await page.getByRole('button',{name:'Running controlled cases…',exact:true}).waitFor();
    await seen;
    await sample(page,'healthy','Healthy exchanges');release();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('[aria-label="Actual experiment results"]').count(),0);
    await page.unroute('**/api/lab/evidence');
    pass('Delayed lab response is discarded after sample navigation');

    await sample(page,'truncated','Damaged capture');assert((await summary(page).innerText()).includes('partial coverage'));
    await page.setViewportSize({width:375,height:667});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile horizontal overflow');
    await page.screenshot({path:path.join(output,'04-mobile.png')});
    pass('Partial coverage and 375px viewport');
    await page.getByRole('button',{name:'Preview Mode',exact:true}).click();
    await page.getByText('Development preview · fictional data',{exact:false}).first().waitFor();
    assert(await page.getByRole('button',{name:'Download data (.json)',exact:true}).isDisabled());
    pass('Preview provenance and disabled exports');
    assert.deepEqual(errors,[],'Browser errors');
    fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({checks,console_errors:errors,method:'Live browser/API; delayed-response case uses explicit HTTP interception.'},null,2)+'\n');
    process.stdout.write('PASS real-browser walkthrough; artifacts: '+output+'\n');
  }finally{if(browser)await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
