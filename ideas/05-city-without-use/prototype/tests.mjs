import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium }=await import(process.env.CITY_PLAYWRIGHT_MODULE||'playwright');

await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CITY_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const failures=[];
page.on('pageerror',e=>failures.push(e.message));
page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
const root='http://127.0.0.1:4173';
const choice=id=>page.locator(`[data-choice="${id}"]`);
async function untilChoice(id){
  const lines=[];
  for(let i=0;i<80;i++){
    lines.push(await page.locator('#dialogue-text').innerText());
    if(await choice(id).isVisible())return lines.join('\n');
    if(await page.locator('#continue-button').isVisible())await page.locator('#continue-button').click();
    else throw new Error(`Stopped before ${id}: ${lines.at(-1)}`);
  }
  throw new Error(`Unreachable ${id}`);
}
async function notebook(){await page.locator('#notebook-toggle').click();return page.locator('#promises-view').innerText();}
async function closeNotebook(){await page.locator('#close-notebook').click();}
const routes=[
  {opening:'work',plan:'full',record:'close',self:'seek',questions:true,revision:true},
  {opening:'rest',plan:'split',record:'offer',self:'rest'},
  {opening:'own',plan:'quiet',record:'ask',self:'visit'},
  {opening:'work',plan:'quiet',record:'offer',self:'seek'},
  {opening:'rest',plan:'full',record:'ask',self:'rest'},
  {opening:'own',plan:'split',record:'close',self:'visit'}
];
const recordChecks={close:'停止岗位匹配',offer:'没有把拒绝记成“安置失败”',ask:'今天不找工作。'};
const selfChecks={seek:'还想工作',rest:'求职单收进抽屉',visit:'周六十二点十分'};
const planChecks={full:'借还台试办中',split:'借还台已经收起',quiet:'许立继续找工作'};
for(const route of routes){
  await page.goto(root);await page.locator('#start-button').click();
  if(route.questions){
    assert(await page.locator('#intro-context [data-person="zhou"]').isVisible());
    assert((await page.locator('#dialogue-text').innerText()).includes('你自己的岗位也将结束'));
    assert(!(await page.locator('#object-controls').isVisible()));
    await page.locator('#people-toggle').click();
    assert.equal(await page.locator('#people-list .character-card').count(),4);
    const before=await page.locator('#dialogue-text').innerText();
    await page.keyboard.press('Space');assert.equal(await page.locator('#dialogue-text').innerText(),before);
    await page.keyboard.press('Escape');
    const introduced=[];let requestsSeen=false;let speakerChecked=false;
    for(let i=0;i<30&&!(await choice('work').isVisible());i++){
      const cards=page.locator('#intro-context .character-card');
      const person=await cards.count()?await cards.first().getAttribute('data-person'):null;
      if(person&&!introduced.includes(person))introduced.push(person);
      if(person==='xu'&&!speakerChecked){
        await page.locator('#speaker').click();
        assert(await page.locator('#people-list [data-person="xu"].selected').isVisible());
        await page.locator('#close-people').click();speakerChecked=true;
      }
      if(await page.locator('.request-summary').isVisible()){
        requestsSeen=true;const recap=await page.locator('.request-summary').innerText();
        assert(recap.includes('想继续工作')&&recap.includes('不想找工作')&&recap.includes('你的岗位也会结束'));
      }
      await page.locator('#continue-button').click();
    }
    assert.deepEqual(introduced,['zhou','xu','ding','cheng']);assert(requestsSeen&&speakerChecked);
  }
  await untilChoice(route.opening);await choice(route.opening).click();
  const automation=await untilChoice('propose');
  assert(automation.includes('两件都已领取')&&automation.includes('他们已经不用来了'),'AI ability must have an emotional consequence on every route');
  if(route.questions){
    for(const id of ['why','trial']){
      await choice(id).click();await untilChoice('propose');assert((await choice(id).innerText()).startsWith('已问'));
    }
    await page.locator('[data-object="roster"]').click();
    assert((await page.locator('#object-copy').innerText()).includes('周行：下一份工作'));
    const before=await page.locator('#dialogue-text').innerText();
    await page.keyboard.press('1');assert.equal(await page.locator('#dialogue-text').innerText(),before);
    await page.keyboard.press('Escape');
    await notebook();await page.locator('#history-tab').click();
    assert((await page.locator('#history-view').innerText()).includes('别给我安排人，假装有事'));
    await page.keyboard.press('ArrowLeft');assert(await page.locator('#promises-view').isVisible());await closeNotebook();
  }
  await choice('propose').click();
  if(route.revision){
    await choice('split').click();await untilChoice('revise');
    assert((await notebook()).includes('还在谈，没有确认新的安排'),'Preview must not commit a plan');
    await closeNotebook();await choice('revise').click();
  }
  await choice(route.plan).click();await untilChoice('confirm');await choice('confirm').click();
  const ding=await untilChoice(route.record);
  assert(ding.includes('我为什么还算“未安置”')&&ding.includes('她是想歇歇。我是想再找'),'Ding’s disagreement must appear on every route');
  if(route.questions)await page.screenshot({path:'test-results/conflict-desktop.png'});
  await choice(route.record).click();
  const own=await untilChoice(route.self);
  assert(own.includes('没人来找我，我还算什么')&&own.includes('之后我有自己的安排'),'Zhou’s fear and Cheng’s boundaries must appear on every route');
  if(route.record==='offer')assert(own.includes('轻松也是一份工作')&&own.includes('我不继续找了'),'Ding’s refusal must change Zhou’s action');
  await choice(route.self).click();
  const nextDay=await untilChoice('sit');
  assert(nextDay.includes('我今天还是不找工作')&&nextDay.includes('那把椅子'));
  assert((await page.locator('#scene-caption').innerText()).includes(planChecks[route.plan]));
  await choice('sit').click();
  for(let i=0;i<20&&!(await page.locator('#end-screen').isVisible());i++)await page.locator('#continue-button').click();
  assert(await page.locator('#end-screen').isVisible());
  const ending=await page.locator('#ending-note').innerText();
  assert(ending.includes(recordChecks[route.record])&&ending.includes(selfChecks[route.self]),'Ending must reflect both personal choices');
  const ledger=await notebook();
  assert(ledger.includes('没有答应值班或固定到场')&&ledger.includes(recordChecks[route.record])&&ledger.includes(selfChecks[route.self]));
  await closeNotebook();console.log('PASS',JSON.stringify(route));
}
await page.screenshot({path:'test-results/ending-desktop.png'});
await page.locator('#replay-button').click();await untilChoice('work');
const resetLedger=await notebook();
assert(resetLedger.includes('还在谈，没有确认')&&!resetLedger.includes('周六十二点十分'),'Replay must clear every old decision');await closeNotebook();
await page.locator('#home-link').click();await page.locator('#cancel-restart').click();assert(await choice('work').isVisible());
await page.keyboard.press('1');assert(!(await choice('work').isVisible()),'Number keys select a response');
await page.locator('#home-link').click();await page.locator('#confirm-restart').click();assert(await page.locator('#title-screen').isVisible());
await page.screenshot({path:'test-results/title-desktop.png'});
await page.locator('#sound-toggle').click();assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'true');
await page.locator('#sound-toggle').click();assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false');
for(const width of [390,320]){
  await page.setViewportSize({width,height:844});await page.goto(root);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`test-results/title-mobile-${width}.png`,fullPage:true});
  await page.locator('#start-button').click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#people-toggle').click();
  assert(await page.locator('#people-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth));await page.keyboard.press('Escape');
  await untilChoice('rest');await choice('rest').click();await untilChoice('propose');await choice('propose').click();
  await choice('full').click();await untilChoice('confirm');await choice('confirm').click();await untilChoice('close');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const buttons=await page.locator('.choice-button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
  assert(buttons.every(height=>height>=44));
  await page.screenshot({path:`test-results/conflict-mobile-${width}.png`,fullPage:true});
}
for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.goto(root);
  await page.addStyleTag({content:'html {font-size:200%}'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Title must fit at 200% text');
  await page.locator('#start-button').click();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Character card must fit at 200% text');
  await untilChoice('own');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Choices must fit at 200% text');
}
assert.deepEqual(failures,[],'No runtime errors or failed assets');
await browser.close();
console.log('PASS: 6 complete routes; all principal choices; mandatory conflicts, accurate endings, plan revision, cast introductions, dialogs, replay, keyboard, audio, 320/390px mobile and 200% text layouts.');
