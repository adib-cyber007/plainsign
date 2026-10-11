/* global window, document */
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const build = path.join(root, 'output/video-build');
const media = path.join(root, 'demo-dapp/public/videos');
const narration = JSON.parse(await readFile('docs/video-narration.json', 'utf8'));
await mkdir(media, {recursive:true});
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {cwd:root, encoding:'utf8', ...options});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr?.slice(-4000)}`);
  return result.stdout?.trim();
}
const probe = file => Number(run('ffprobe', ['-v','error','-show_entries','format=duration','-of','csv=p=0',file]));
const stamp = value => {
  const h = Math.floor(value / 3600), m = Math.floor(value % 3600 / 60), s = value % 60;
  return `${h}:${String(m).padStart(2,'0')}:${s.toFixed(2).padStart(5,'0')}`;
};
function ass(segments, label, total) {
  let output = `[Script Info]\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 0\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Caption,Segoe UI,32,&H00FFFFFF,&H00FFFFFF,&H0009101C,&H9009101C,0,0,0,0,100,100,0,0,3,7,0,2,80,80,24,1\nStyle: Label,Segoe UI,25,&H00B9D3FF,&H00FFFFFF,&H0009101C,&H9009101C,0,0,0,0,100,100,0,0,3,5,0,7,28,28,18,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 1,0:00:00.00,${stamp(total)},Label,,0,0,0,,${label}\n`;
  for (const segment of segments) {
    const sentences = segment.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g).map(s=>s.trim());
    const words = segment.text.split(/\s+/).length;
    let elapsed = 0;
    for (const sentence of sentences) {
      const duration = segment.speechDuration * sentence.split(/\s+/).length / words;
      output += `Dialogue: 0,${stamp(segment.start+elapsed)},${stamp(segment.start+elapsed+duration)},Caption,,0,0,0,,${sentence}\n`;
      elapsed += duration;
    }
  }
  return output;
}

const pitchSegments = [];
let pitchTime = 0;
for (let i=0;i<narration.presentation.length;i++) {
  const index = String(i+1).padStart(2,'0');
  const audio = path.join(build, `presentation-${index}.wav`);
  const speechDuration = probe(audio) / 1.22;
  const duration = speechDuration + 0.65;
  pitchSegments.push({...narration.presentation[i],start:pitchTime,speechDuration,duration});
  pitchTime += duration;
  run('ffmpeg',['-y','-loglevel','error','-loop','1','-framerate','12','-i',path.join(build,`slide.${String(i+1).padStart(3,'0')}.png`),'-i',audio,'-filter_complex','[1:a]atempo=1.22,apad=pad_dur=0.65[a]','-map','0:v','-map','[a]','-t',duration.toFixed(3),'-c:v','libx264','-preset','fast','-tune','stillimage','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k',path.join(build,`pitch-${index}.mp4`)]);
}
await writeFile(path.join(build,'pitch-concat.txt'),pitchSegments.map((_,i)=>`file 'pitch-${String(i+1).padStart(2,'0')}.mp4'`).join('\n'));
run('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',path.join(build,'pitch-concat.txt'),'-c','copy',path.join(build,'pitch-joined.mp4')]);
await writeFile(path.join(build,'presentation.ass'),ass(pitchSegments,'Synthetic narration · PlainSign · Mohamed Adib, solo entrant',pitchTime));
run('ffmpeg',['-y','-loglevel','error','-i',path.join(build,'pitch-joined.mp4'),'-vf','ass=output/video-build/presentation.ass','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',path.join(media,'presentation.mp4')]);
console.info(`Presentation created: ${probe(path.join(media,'presentation.mp4')).toFixed(1)} seconds`);

if (!process.env.npm_execpath) throw new Error('Run with npm run videos:record');
run(process.execPath,[process.env.npm_execpath,'run','build'],{env:{...process.env,VITE_E2E:'1',VITE_E2E_MOCK_ENRICH:'1',VITE_E2E_MOCK_LLM:'0',VITE_LLM_KEY:' ',VITE_ALCHEMY_KEY:' '}});
const siteRoot = path.resolve('demo-dapp/dist');
const server = createServer(async(req,res)=>{
  try {
    const pathname = new URL(req.url,'http://localhost').pathname.replace(/^\/plainsign\//,'/');
    const file = path.resolve(siteRoot,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(siteRoot+path.sep)) throw new Error('Invalid path');
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
    res.end(await readFile(file));
  } catch {res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(5173,'127.0.0.1',resolve));
const profile = await mkdtemp(path.join(build,'browser-'));
const extension = path.resolve('.output/chrome-mv3');
const context = await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:{width:1600,height:900},recordVideo:{dir:build,size:{width:1600,height:900}},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
const demoSegments = [];
let rawVideo;
try {
  await context.addInitScript({path:path.resolve('tests/e2e/mock-wallet.js')});
  const page = await context.newPage();
  rawVideo = page.video();
  const started = Date.now();
  await page.goto('http://127.0.0.1:5173/plainsign/?walletChainId=0xaa36a7');
  await page.waitForFunction(()=>Boolean(window.__plainsign?.wrapped));
  const reject = async()=>page.evaluate(()=>document.getElementById('plainsign-root').shadowRoot.querySelector('.ps-reject').click());
  const verdict = expected=>page.waitForFunction(value=>document.getElementById('plainsign-root')?.shadowRoot?.querySelector('.ps-verdict h1')?.textContent===value,expected);
  for(let i=0;i<narration.demo.length;i++) {
    const segment = narration.demo[i];
    if(segment.scene==='connect') await page.locator('#connect-wallet').click();
    if(segment.scene==='free-mint') {await page.locator('#free-mint').click();await verdict('Danger');}
    if(segment.scene==='reject') {await reject();await page.getByTestId('free-mint-outcome').filter({hasText:'Rejected (4001)'}).waitFor();if(await page.evaluate(()=>window.__walletCalls.length)!==0)throw new Error('Rejected request reached wallet');}
    if(segment.scene==='verify') {await page.locator('#verify').click();await verdict('Danger');}
    if(segment.scene==='sign-in') {await reject();await page.locator('#sign-in').click();await verdict('Safe');}
    if(segment.scene==='wrap') {await reject();await page.locator('#wrap').click();await verdict('Safe');}
    if(segment.scene==='review') {await reject();await page.goto('http://127.0.0.1:5173/plainsign/review.html');await page.locator('.preview-notice').waitFor();}
    const speechDuration = probe(path.join(build,`demo-${String(i+1).padStart(2,'0')}.wav`));
    const start=(Date.now()-started)/1000;
    demoSegments.push({...segment,start,speechDuration,duration:speechDuration+0.8});
    await page.screenshot({path:path.join(build,`demo-scene-${String(i+1).padStart(2,'0')}.png`)});
    await page.waitForTimeout((speechDuration+0.8)*1000);
  }
  await writeFile(path.join(build,'demo-timeline.json'),JSON.stringify(demoSegments,null,2));
} finally {await context.close();await new Promise(resolve=>server.close(resolve));}
const rawPath = await rawVideo.path();
const rawDuration = probe(rawPath);
await writeFile(path.join(build,'demo.ass'),ass(demoSegments,'Automated test wallet · Sepolia requests · simulated metadata · synthetic narration · no assets moved',rawDuration));
const audioInputs=demoSegments.flatMap((_,i)=>['-i',path.join(build,`demo-${String(i+1).padStart(2,'0')}.wav`)]);
const filters=demoSegments.map((s,i)=>`[${i}:a]adelay=${Math.round(s.start*1000)}:all=1[a${i}]`).join(';')+';'+demoSegments.map((_,i)=>`[a${i}]`).join('')+`amix=inputs=${demoSegments.length}:normalize=0,apad[a]`;
run('ffmpeg',['-y','-loglevel','error',...audioInputs,'-filter_complex',filters,'-map','[a]','-t',String(rawDuration),path.join(build,'demo-audio.wav')]);
run('ffmpeg',['-y','-loglevel','error','-i',rawPath,'-i',path.join(build,'demo-audio.wav'),'-vf','scale=1920:1080,ass=output/video-build/demo.ass','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','-shortest',path.join(media,'product-demo.mp4')]);
const results={presentation:probe(path.join(media,'presentation.mp4')),demo:probe(path.join(media,'product-demo.mp4'))};
if(results.presentation<120||results.presentation>180||results.demo>180)throw new Error(`Video durations outside requirements: ${JSON.stringify(results)}`);
await writeFile(path.join(build,'video-verification.json'),JSON.stringify(results,null,2));
console.info(JSON.stringify(results));
