/* Socket-free component interactions. HTTP is stubbed with actual worker output.
 * Optional tool: CAUSALPACKET_REACT_TEST_RENDERER=/path/to/react-test-renderer
 * This is not a browser/CSS-layout or actual HTTP-transport verification.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const ts = require(path.join(frontend, 'node_modules/typescript'));
const resolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...rest) {
  if (request === 'react' || request.startsWith('react/')) request = path.join(frontend, 'node_modules', request);
  else if (request.startsWith('@/')) request = path.join(frontend, request.slice(2));
  return resolve.call(this, request, parent, ...rest);
};
for (const extension of ['.ts','.tsx']) require.extensions[extension] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
  }}).outputText;
  module._compile(output, filename);
};
const React = require(path.join(frontend, 'node_modules/react'));
const rendererPath = process.env.CAUSALPACKET_REACT_TEST_RENDERER;
if (!rendererPath) throw new Error('Set CAUSALPACKET_REACT_TEST_RENDERER to the optional react-test-renderer 19.3.1 package path. See docs/running.md.');
const { create, act } = require(rendererPath);
const Page = require(path.join(frontend, 'app/page.tsx')).default;
const { InvestigationSummary } = require(path.join(frontend, 'components/InvestigationSummary.tsx'));
const { UploadArea } = require(path.join(frontend, 'components/UploadArea.tsx'));
const { EvidenceLab } = require(path.join(frontend, 'components/EvidenceLab.tsx'));
const { FrameDrawer } = require(path.join(frontend, 'components/FrameDrawer.tsx'));
const { ReportExport } = require(path.join(frontend, 'components/ReportExport.tsx'));
const { PreviewBanner } = require(path.join(frontend, 'components/PreviewBanner.tsx'));
const { AlibiTest } = require(path.join(frontend, 'components/AlibiTest.tsx'));
const data = JSON.parse(fs.readFileSync(path.join(root, '.artifacts/ui-checks/data.json')));
global.IS_REACT_ACT_ENVIRONMENT = true;
const listeners = new Set();
global.window = { addEventListener: (name,fn) => listeners.add(fn), removeEventListener: (name,fn) => listeners.delete(fn), matchMedia: () => ({ matches: true }) };
let downloads = 0;
global.document = { createElement: () => ({ click: () => downloads++, remove() {}, style: {} }), body: { appendChild() {}, removeChild() {} } };
let delayedLab = null, delayedExport = null, rejectLab = false, lastLabSignal = null, lastExportSignal = null;
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
global.fetch = async (input, options={}) => {
  const url = new URL(input);
  if (url.pathname === '/api/health') return json(data.health);
  if (url.pathname === '/api/samples') return json(data.catalog);
  if (url.pathname === '/api/lab/evidence') {
    lastLabSignal = options.signal;
    if (rejectLab) return json({error:{code:'analysis_busy',message:'An analysis is already running.'}},429);
    if (delayedLab) return delayedLab.promise;
    return json(data.lab);
  }
  if (/\/api\/samples\/[^/]+\/analyze$/.test(url.pathname)) return json(data.reports[url.pathname.split('/')[3]]);
  if (url.pathname.endsWith('/reinterpret')) {
    const context=JSON.parse(options.body);
    return json(context.approved_gateway_macs?.length===2 ? data.gateway_approved : context.approved_gateway_macs?.length===1 ? data.gateway_baseline : data.reports['gateway-transition']);
  }
  if (url.pathname.endsWith('/export')) {
    lastExportSignal=options.signal;
    if (delayedExport) return delayedExport.promise;
    return new Response('{}',{headers:{'content-type':'application/json','content-disposition':'attachment; filename="causalpacket-report.json"'}});
  }
  throw new Error('Unexpected test transport request: '+url.pathname);
};
const deferred = () => { let resolve; const promise=new Promise(r => resolve=r); return {promise,resolve}; };
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : node?.children?.map(text).join('') || '';
let app;
const button = (label, scope=app.root) => {
  const result=scope.findAllByType('button').find(node => text(node).includes(label));
  assert(result, 'Missing button: '+label); return result;
};
const report = () => app.root.findByType(InvestigationSummary).props.report;
const click = async node => { await act(async () => { await node.props.onClick(); }); };
const sample = async id => {
  if (!app.root.findAllByType(UploadArea).length) await click(button('Change capture'));
  await act(async () => { await app.root.findByType(UploadArea).props.onSelectSample(id); });
};
const pending = async node => { await act(async () => { void node.props.onClick(); }); };
const errors=[];
const originalError=console.error;
console.error=(...args) => {
  if (String(args[0]).includes('react-test-renderer is deprecated')) return;
  errors.push(args.map(String).join(' '));
};

async function main() {
  const passed=[];
  const pass=name=>{passed.push(name);process.stdout.write('PASS '+name+'\n');};
  try {
    await act(async () => { app=create(React.createElement(Page),{createNodeMock:() => ({focus(){},scrollIntoView(){},querySelector:()=>({focus(){}})})}); });
    assert.equal(app.root.findAllByType(InvestigationSummary).length,0);
    assert.equal(app.root.findAllByType(UploadArea).length,1);
    pass('Fresh live workspace has no fabricated report');
    await sample('service-failure');
    assert.equal(report().incidents[0].assessment,'likely_fault');
    assert.equal(app.root.findAllByType(UploadArea).length,0);
    pass('Real service-failure report renders; ingestion collapses');
    await sample('gateway-transition');
    const baseline=JSON.stringify(report());
    await click(button('Can the diagnosis survive missing evidence?'));
    await click(button('Run evidence experiment'));
    assert.equal(JSON.stringify(report()),baseline);
    assert(app.root.findAll(node=>node.props?.['aria-label']==='Actual experiment results').length);
    const noReplies=app.root.findAllByType('button').find(node=>text(node).startsWith('0 / 20 replies'));
    assert(noReplies);await click(noReplies);
    const selected=app.root.findByProps({'aria-label':'Selected lab capture evidence'});
    assert(text(selected).includes('scan-0') && text(selected).includes('Unresolved'));
    await click(button('Derived #2 · source #3',selected));
    const labDrawer=app.root.findByType(EvidenceLab).findByType(FrameDrawer);
    assert.equal(labDrawer.props.sourceFrameNumber,3);
    assert(labDrawer.props.contextLabel.includes('scan-0'));
    await act(async()=>{for(const handler of listeners) handler({key:'Escape',preventDefault(){}});});
    assert.equal(app.root.findByType(EvidenceLab).findByType(FrameDrawer).props.frame,null);
    pass('Lab uses actual worker output, preserves active report and maps derived frames');
    rejectLab=true;await click(button('Run evidence experiment'));
    assert(text(app.root).includes('An analysis is already running.'));
    assert.equal(JSON.stringify(report()),baseline);rejectLab=false;
    pass('Lab API error preserves active report');
    delayedLab=deferred();await pending(button('Run evidence experiment'));
    await sample('healthy');
    assert(lastLabSignal.aborted);
    await act(async()=>{delayedLab.resolve(json(data.lab));await delayedLab.promise;});delayedLab=null;
    assert.equal(report().incidents.length,0);
    assert.equal(app.root.findAll(node=>node.props?.['aria-label']==='Actual experiment results').length,0);
    pass('Delayed lab response cannot overwrite new capture');
    await sample('gateway-transition');
    delayedLab=deferred();await pending(button('Run evidence experiment'));
    await act(async()=>{await app.root.findByType(AlibiTest).props.onApplyContext(data.gateway_baseline.context);});
    assert(lastLabSignal.aborted);
    await act(async()=>{delayedLab.resolve(json(data.lab));await delayedLab.promise;});delayedLab=null;
    assert.equal(report().incidents[0].assessment,'suspected_attack');
    assert.deepEqual(report().observations,data.reports['gateway-transition'].observations);
    assert.equal(app.root.findAll(node=>node.props?.['aria-label']==='Actual experiment results').length,0);
    pass('Same-ID Alibi change invalidates pending lab; packet observations stay fixed');
    delayedExport=deferred();await pending(button('Download data (.json)'));
    await act(async()=>{await app.root.findByType(AlibiTest).props.onApplyContext(data.gateway_approved.context);});
    assert(lastExportSignal.aborted);
    await act(async()=>{delayedExport.resolve(new Response('{}',{headers:{'content-type':'application/json'}}));await delayedExport.promise;});delayedExport=null;
    assert.equal(downloads,0);
    assert.equal(report().incidents[0].assessment,'unresolved');
    pass('Context change prevents a stale export download');
    delayedLab=deferred();await pending(button('Run evidence experiment'));
    await click(button('Preview Mode'));
    assert(lastLabSignal.aborted);
    await act(async()=>{delayedLab.resolve(json(data.lab));await delayedLab.promise;});delayedLab=null;
    assert.equal(report().data_origin,'development_fixture');
    assert.equal(app.root.findByType(PreviewBanner).props.dataOrigin,'development_fixture');
    const exports=app.root.findByType(ReportExport).findAllByType('button');
    assert(exports.every(node=>node.props.disabled));
    pass('Mode switch discards delayed lab and keeps fictional provenance/export guards');
    await click(button('Live API'));await sample('truncated');
    assert.equal(report().coverage.status,'partial');
    await sample('mixed-scan-and-fault');assert.equal(report().incidents.length,2);
    pass('Partial capture and independent mixed incidents still render');
    await act(async()=>{app.unmount();});app=null;
    assert.deepEqual(errors,[]);
    const output={method:'React Test Renderer interactions; HTTP stubbed using actual ASGI/worker outputs. No browser/CSS/real HTTP claim.',passed};
    fs.writeFileSync(path.join(root,'.artifacts/ui-checks/results.json'),JSON.stringify(output,null,2)+'\n');
    process.stdout.write('PASS '+passed.length+' component interaction scenarios; no unexpected React errors.\n');
  } finally {
    if (app) await act(async()=>{app.unmount();});
    console.error=originalError;
  }
}
main().catch(error=>{originalError(error);process.exitCode=1;});
