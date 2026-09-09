import { firefox } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Firefox is outside agent-browser's Chromium support. Use the same final ZIP.
const url=process.argv[2]||'http://127.0.0.1:8082/';
const out='workfiles/release/firefox.json';
const browser=await firefox.launch({headless:true});
const report={version:browser.version(),url,viewports:[]};
try {
 for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:844,height:390}]) {
  const page=await browser.newPage({viewport,hasTouch:true});
  const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('request',r=>requests.push(r.url()));
  await page.goto(url);await page.locator('#go').waitFor();
  await page.screenshot({path:`screenshots/nimbo-firefox-${viewport.width}-title.png`});
  await page.locator('#go').click();
  await page.keyboard.press('a');await page.keyboard.press('a');await page.keyboard.press('Space');
  await page.waitForTimeout(650);
  await page.keyboard.press('d');await page.keyboard.press('w');await page.keyboard.press('Space');
  await page.waitForTimeout(1000);
  await page.keyboard.press('p');const height=await page.locator('#alt').innerText();
  await page.waitForTimeout(250);assert.equal(await page.locator('#alt').innerText(),height);
  await page.locator('#resume').click();
  await page.locator('#mute').click();assert.equal(await page.locator('#mute').innerText(),'Sound off');
  await page.locator('#mute').click();assert.equal(await page.locator('#mute').innerText(),'Sound on');
  if(viewport.width<800){await page.locator('#br').tap();await page.locator('#bt').tap();await page.locator('#bd').tap();}
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  assert.equal(overflow,false);
  await page.screenshot({path:`screenshots/nimbo-firefox-${viewport.width}-play.png`});
  // Continue playing with the network disabled after loading the ZIP entry.
  await page.context().setOffline(true);
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  const external=requests.filter(r=>!r.startsWith(new URL(url).origin));
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  report.viewports.push({viewport,errors,external,requests,height,overflow,offlineInput:true});
  await page.close();
 }
 report.ok=true;
} finally {
 mkdirSync('workfiles/release',{recursive:true});writeFileSync(out,JSON.stringify(report,null,2)+'\n');await browser.close();
}
console.log(JSON.stringify(report,null,2));
