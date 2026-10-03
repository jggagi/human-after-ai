'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const roles = {周行:'职业介绍员 · 你',许立:'原工具库管理员 · 来访者',丁禾:'原夜班巡检员 · 来访者',澄:'AI 同事 · 与你共事',旁白:'',你的选择:'周行'};
  const people = {
    zhou:{name:'周行',role:'你 · 职业介绍员',background:'替居民找了六年工作；这周五，自己的岗位也将结束。',request:'想替最后两位来访者找到去处，却还没想好自己的以后。',relationship:'你扮演的人。你一直把“找到工作”当成帮助成功的证明。'},
    xu:{name:'许立',role:'来访者 · 原工具库管理员',background:'自动柜接手了工具库。生活有保障，他仍每天六点半起床。',request:'想要一件有人等他去做的事；他不缺工资，缺的是被需要。',relationship:'你的来访者。与丁禾是街坊，偶尔一起吃早餐。'},
    ding:{name:'丁禾',role:'来访者 · 原夜班巡检员',background:'终于不用倒夜班，最近能一觉睡到天亮。她暂时不想找工作。',request:'想在熟悉的大厅坐一会儿，不接下一份差事。',relationship:'你的来访者。她的记录仍被你写作“未安置”。'},
    cheng:{name:'澄',role:'AI 同事 · 屏幕里的声音',background:'能可靠地处理工作；城市里的自动服务已经承担许多岗位。',request:'协助你核实需求和记录；自己的下班时间也有安排。',relationship:'桌上蓝色终端里的声音。你的岗位结束后，你们仍可以联系。'}
  };
  const plans = {
    full: {
      title:'支持许立试办一个上午的借还台',
      label:'明天上午，许立在大厅接待借还；丁禾可以坐，不值班。',
      description:'给他一份自愿承担的责任。自动柜照常开放，来的人可能很少。',
      owner:'许立愿意负责一个上午；没有承诺每天都有人需要他。',
      review:'试一天，再由许立决定是否继续。',
      reactions:[['周行','自动柜照常用。我不能保证每天有人来，但你愿意的话，明天可以试一个上午。'],['许立','别叫熟人专门来照顾我。真有人需要，我就做。'],['丁禾','我可以坐旁边，但别把我也写进值班的人里。'],['周行','好。你只是来坐。']]
    },
    split: {
      title:'先试两个小时，之后各自安排',
      label:'明天先试两小时借还；之后收台，大厅仍可坐。',
      description:'许立仍有事可做，也试着把一部分时间留给工作以外的生活。',
      owner:'许立只答应两小时；余下的时间由他自己决定。',
      review:'短时试办不等于以后必须缩短，也不等于必须继续。',
      reactions:[['许立','两个小时也行。可是收了台，我又没地方去。'],['周行','那一段我还不能替你找到。先试一天，你不喜欢我们再谈。'],['丁禾','你可以去吃早饭。以前你总是让我先吃。'],['许立','那家豆浆十点还卖吗？'],['丁禾','卖。你没在那个时间来过。']]
    },
    quiet: {
      title:'暂不开借还台，继续帮许立找岗位',
      label:'大厅照常开放；暂不开借还台，继续寻找真实岗位。',
      description:'承认这张桌子未必能回应他的愿望。他还想工作，可以继续找。',
      owner:'澄核实工具库的现有岗位，许立自己决定要不要去。',
      review:'没有找到岗位，就如实留下这个尚未解决的请求。',
      reactions:[['周行','我怕把桌子摆起来，就当作已经帮你找到了工作。我们先找真正还缺人的地方。'],['许立','我还是想找。我不想就这么在家待着。'],['澄','旧工具库有每周一次的现场交接，目前有人负责。我可以替你约一次询问，不保证会有空缺。'],['许立','让我去问问。别替我把这件事结了。']]
    }
  };
  const objects = {
    chair:['窗边的椅子','以前，坐在这里的人都等着你叫号。叫到名字，就能谈下一份工作。\n\n丁禾今天没有取号。她说只是想坐一会儿。'],
    boxes:['两个工具箱','许立把螺丝刀按长短排好，边角擦得很亮。\n\n旧工具库已经不用他来开门。这些工具，他还是每天检查一次。'],
    roster:['未安置名单','许立：未安置。\n丁禾：未安置。\n\n周行：下一份工作＿＿。\n\n前两行是你填的，最后一行是你给自己留的。']
  };
  let state;
  let sequence=[];
  let lineIndex=0;
  let afterSequence=null;
  let currentChoices=[];
  let toastTimer;
  let audio=null;
  let audioOn=false;
  let promiseTab=true;

  function freshState(){
    return {started:false,ended:false,introActive:false,opening:null,plan:null,pendingPlan:null,recordChoice:null,selfChoice:null,asked:new Set(),chapter:1,history:[],observations:new Set()};
  }
  function textElement(tag,content,className){
    const node=document.createElement(tag);node.textContent=content;
    if(className)node.className=className;
    return node;
  }
  function log(speaker,text){state.history.push({speaker,text});}
  function toast(message){
    clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;
    toastTimer=setTimeout(()=>{$('toast').hidden=true;},2700);
  }
  function chapter(number,title,time,caption=''){
    state.chapter=number;
    $('chapter-number').textContent=String(number).padStart(2,'0');
    $('chapter-name').textContent=title;
    $('chapter-location').textContent='职业介绍所 · 大厅';
    $('scene-clock').querySelector('strong').textContent=time;
    $('scene-caption').textContent=caption;$('scene-caption').hidden=!caption;
    document.querySelectorAll('[data-track]').forEach(n=>{
      const track=Number(n.dataset.track);
      n.classList.toggle('active',track===number);n.classList.toggle('past',track<number);
    });
    $('game').classList.toggle('evening',number===4);
    $('game').classList.toggle('morning',number===5);
    $('object-controls').hidden=number>2||state.introActive;
  }
  function characterCard(id){
    const person=people[id];
    const card=document.createElement('article');card.className='character-card';card.dataset.person=id;
    const portrait=document.createElement('div');portrait.className='character-portrait portrait-'+id;portrait.setAttribute('aria-hidden','true');
    if(id==='zhou')portrait.textContent='你';
    else{const img=document.createElement('img');img.src='assets/office.webp';img.alt='';portrait.append(img);}
    const details=document.createElement('div');details.className='character-details';
    const heading=document.createElement('div');heading.className='character-heading';heading.append(textElement('h3',person.name),textElement('span',person.role));details.append(heading);
    const dl=document.createElement('dl');
    for(const [label,value]of [['背景',person.background],['今天',person.request],['关系',person.relationship]]){
      const row=document.createElement('div');row.append(textElement('dt',label),textElement('dd',value));dl.append(row);
    }
    details.append(dl);card.append(portrait,details);return card;
  }
  function renderIntroContext(context){
    const container=$('intro-context');container.replaceChildren();container.hidden=!context;
    if(context?.person)container.append(characterCard(context.person));
    else if(context?.requests){
      const summary=document.createElement('div');summary.className='request-summary';
      summary.append(textElement('p','关门前，要回应的两种愿望','request-summary-title'));
      for(const [name,copy]of [['许立','想继续工作，希望有人等他去做一件事。'],['丁禾','不想找工作，只想在熟悉的地方坐一会儿。'],['你','想替他们找到去处；周五以后，你的岗位也会结束。']]){
        const line=document.createElement('p');line.append(textElement('strong',name),document.createTextNode(copy));summary.append(line);
      }
      container.append(summary);
    }
  }
  function showLine(speaker,text,context=null){
    $('speaker').textContent=speaker;
    const personId=Object.keys(people).find(id=>people[id].name===speaker);
    $('speaker').disabled=!personId;
    $('speaker').dataset.person=personId||'';
    $('speaker').setAttribute('aria-label',personId?`查看${speaker}的人物介绍`:speaker);
    $('speaker-role').textContent=roles[speaker]||'';
    renderIntroContext(context);
    $('dialogue-text').textContent=text;
    $('dialogue-text').classList.toggle('narration',speaker==='旁白');
    $('choices').replaceChildren();currentChoices=[];
    $('continue-button').hidden=false;$('control-hint').textContent='空格 / Enter 继续';
    $('continue-button').firstChild.nodeValue=context?.continueLabel||'继续';
    const panel=$('dialogue-panel');panel.classList.remove('pulse');
    requestAnimationFrame(()=>panel.classList.add('pulse'));
    log(speaker,text);
  }
  function run(lines,next){
    sequence=lines;lineIndex=0;afterSequence=next;
    if(!lines.length){afterSequence=null;next?.();return;}
    showLine(...sequence[0]);
  }
  function advance(){
    if(!state.started||state.ended||currentChoices.length)return;
    if(lineIndex+1<sequence.length){lineIndex++;showLine(...sequence[lineIndex]);}
    else{const next=afterSequence;afterSequence=null;sequence=[];next?.();}
  }
  function choices(speaker,text,options){
    sequence=[];afterSequence=null;
    showLine(speaker,text);
    $('continue-button').hidden=true;$('control-hint').textContent='点击选择 · 数字键也可选择';
    currentChoices=options;
    options.forEach((option,index)=>{
      const button=document.createElement('button');
      button.className='choice-button'+(option.asked?' asked':'')+(option.goOn?' go-on':'');
      button.dataset.choice=option.id||String(index+1);
      button.append(textElement('span',option.asked?'已问':String(index+1).padStart(2,'0'),'choice-index'));
      const label=document.createElement('span');
      label.append(textElement('strong',option.label));
      if(option.detail)label.append(textElement('small',option.detail));
      button.append(label);
      button.addEventListener('click',()=>select(index));
      $('choices').append(button);
    });
  }
  function select(index){
    const option=currentChoices[index];if(!option)return;
    currentChoices=[];log('你的选择',option.label);option.action();
  }
  function reset(){
    state=freshState();sequence=[];currentChoices=[];afterSequence=null;
    $('title-screen').hidden=false;$('play-screen').hidden=true;$('end-screen').hidden=true;
    $('game').className='title-mode';
    renderIntroContext(null);
    $('scene-clock').querySelector('strong').textContent='星期三 · 15:20';
    $('toast').hidden=true;
    $('start-button').focus({preventScroll:true});
  }
  const recordOutcomes={
    close:'按丁禾本人意愿，停止岗位匹配。她今天的请求是坐一会儿，已经回应。',
    offer:'丁禾拒绝了推荐的岗位。你停止匹配，没有把拒绝记成“安置失败”。',
    ask:'丁禾亲手写下：“今天不找工作。”你保留了她的原话，没有替她补一个岗位。'
  };
  const selfOutcomes={
    seek:'你的求职单仍然打开。周五以后，你还想工作，澄会帮你查询真实岗位。',
    rest:'你把自己的求职单收进抽屉。周六先不安排下一份工作，也不急着安排一种新生活。',
    visit:'你和澄约好周六十二点十分见面。没有待办事项，只是想继续聊聊。'
  };
  function start(){
    state.started=true;state.introActive=true;
    $('title-screen').hidden=true;$('play-screen').hidden=false;$('end-screen').hidden=true;
    $('game').classList.remove('title-mode','end-mode');
    chapter(1,'最后两位来访者','星期三 · 15:20');
    run([
      ['旁白','你是周行，替居民找了六年工作。\n这周五，介绍所的职业业务结束，你自己的岗位也将结束。',{person:'zhou'}],
      ['旁白','AI 已经接手城市里的大部分工作。住房和生活仍有保障。\n你的桌上还留着两份“未安置”记录。关门前，你想给这两个人一个交代。'],
      ['许立','钱我有。我想找一件……明早有人等我去做的事。\n你再帮我找找，行吗？',{person:'xu'}],
      ['旁白','许立带来了旧工具库的两个箱子。工具库改成自动柜以后，他还是每天六点半起床。'],
      ['丁禾','我今天不找工作。\n就想在窗边坐一会儿。能坐吗？',{person:'ding'}],
      ['周行','坐吧。我一会儿替你看看下一份工作的事。'],
      ['旁白','丁禾没有接话。她把橘子放在膝盖上，慢慢剥开。'],
      ['澄','许立带来的借用清单我查过了。\n你先听他们说，需要资料的时候叫我。',{person:'cheng'}],
      ['旁白','澄是你的 AI 同事，声音从桌上的蓝色终端传来。\n许立和丁禾是同街区的熟人，偶尔一起吃早餐。今天，他们各自来找你。'],
      ['周行','一个还想工作，一个已经不想找。\n我得先听清楚，他们分别要什么。',{requests:true,continueLabel:'先听一个人说'}]
    ],openingChoice);
  }
  function openingChoice(){
    state.introActive=false;chapter(1,'他们想要什么','星期三 · 15:30');
    choices('周行','两份记录都写着“未安置”。\n你先从哪里了解？',[
      {id:'work',label:'问许立：“没有工资要挣了，你为什么还想上班？”',detail:'他已经不用为生活担心，却仍每天早起。',action:()=>{
        state.opening='work';
        run([['许立','今天六点半，我又醒了。鞋擦好了，钥匙也拿了。'],['许立','出门才想起来，工具库已经不等我开门了。'],['周行','可以晚一点起。'],['许立','我知道。可我站在楼下，不知道该往哪儿走。']],automationEvent);
      }},
      {id:'rest',label:'问丁禾：“你真的不准备找下一份工作吗？”',detail:'她从夜班里解脱出来，最近终于能睡整觉。',action:()=>{
        state.opening='rest';
        run([['丁禾','先不找。上周睡到天亮，我醒来第一件事，是看有没有错过交班。'],['丁禾','然后想起来，不用交了。我又躺了一会儿。'],['许立','这样不觉得一天白过了？'],['丁禾','那天我睡得挺好。'],['旁白','许立低头转了转工具箱的提手。丁禾把一瓣橘子放到他手边。']],automationEvent);
      }},
      {id:'own',label:'看看自己那份空白的求职单',detail:'你替别人安排了六年，还没填自己的下一份工作。',action:()=>{
        state.opening='own';
        run([['旁白','你的名字已经印在表头。“下一份工作”后面，你擦掉了两次。'],['澄','要我现在替你查询吗？'],['周行','先把他们两个人的事办完。'],['澄','好。这张表不会过期。'],['旁白','你把自己的求职单压在两份来访记录下面。']],automationEvent);
      }}
    ]);
  }
  function automationEvent(){
    chapter(2,'已经不需要开门的人','星期三 · 15:45','许立准备了一个借还台。');
    run([
      ['许立','明天把桌子放门边吧。我能管借还。\n老梁要借螺丝刀，隔壁的小孩想借音箱，他们问过我。'],
      ['周行','澄，先确认一下他们的借用。'],
      ['澄','两件都已领取。老梁十分钟前从自动柜拿到了螺丝刀，音箱也送到了。\n他们留言说，谢谢许立，不用再替他们留了。'],
      ['旁白','许立把登记夹翻到第一页。两行名字旁边，还没有一个勾。'],
      ['许立','我还没开门，他们已经不用来了。'],
      ['周行','东西借到了，也算件好事。'],
      ['许立','是。这样快。'],
      ['旁白','他合上登记夹，又打开。'],
      ['许立','可我明早还是想来。\n不是缺这两件东西。我想有人来找我。']
    ],showQuestions);
  }
  function showQuestions(){
    const questions=[
      ['why','问许立：“如果一上午都没人来呢？”',[
        ['许立','以前也有空的时候。可是以前我知道，总会有人来。'],
        ['许立','我不是想证明柜子不好。我就是……还没习惯谁都不用找我。'],
        ['周行','借还台能给你一件事做。我不能保证它会让别人需要你。'],
        ['许立','那也让我试试。别给我安排人，假装有事。']
      ]],
      ['trial','问丁禾：“许立还想工作，你怎么看？”',[
        ['丁禾','他想做，就做。我以前下夜班，他还肯替我留早饭。'],
        ['丁禾','但我不想为了让他有事做，再给自己接一个班。'],
        ['许立','没要你值班。'],
        ['丁禾','那就好。橘子你吃不吃？放半天了。']
      ]]
    ];
    const options=questions.map(([id,label,lines])=>({id,label,asked:state.asked.has(id),action:()=>{state.asked.add(id);run(lines,showQuestions);}}));
    options.push({id:'propose',label:'回应许立：明天，我们能答应什么？',goOn:true,action:planChoice});
    choices('周行','许立想继续负责一件事。自动服务已经能把事情办好。\n你还想了解什么？',options);
  }
  function planChoice(){
    choices('周行','你能支持许立继续工作，\n但不能替他保证“每天一定有人需要我”。',Object.entries(plans).map(([id,plan])=>({
      id,label:plan.title,detail:plan.description,action:()=>{
        state.pendingPlan=id;run(plan.reactions,confirmPlan);
      }
    })));
  }
  function createSummary(parent,plan){
    const preview=document.createElement('div');preview.className='arrangement-preview';
    const dl=document.createElement('dl');
    for(const [term,definition]of [['许立',plan.owner],['丁禾','可以来坐，不承担值班；这不是替她找到的新工作。'],['以后',plan.review]]){
      const row=document.createElement('div');row.append(textElement('dt',term),textElement('dd',definition));dl.append(row);
    }
    preview.append(dl);parent.append(preview);
  }
  function confirmPlan(){
    const plan=plans[state.pendingPlan];
    choices('周行','这回应了许立的一部分愿望。\n我们就这样试，还是再谈一次？',[
      {id:'confirm',label:'就这样试。没有解决的部分，仍然留下。',goOn:true,action:()=>{
        state.plan=state.pendingPlan;state.pendingPlan=null;dingConflict();
      }},
      {id:'revise',label:'再谈一次，我想换个办法。',action:()=>{state.pendingPlan=null;planChoice();}}
    ]);
    createSummary($('dialogue-text'),plan);
  }
  function dingConflict(){
    chapter(3,'她没有来找工作','星期三 · 16:20','另一份记录，还写着“未安置”。');
    run([
      ['旁白','你记下许立的决定，准备翻到下一页。丁禾伸手按住了自己的记录。'],
      ['丁禾','我为什么还算“未安置”？'],
      ['周行','因为你还没找到下一份工作。'],
      ['丁禾','我今天说了，我不找工作。'],
      ['周行','这只是记录的写法。'],
      ['丁禾','可你刚才还是要替我找。\n坐在这儿，是不是得找点事干，才算坐得住？'],
      ['旁白','你看着那三个字。六年来，只要这一栏没改，你就觉得自己还欠来访者一点什么。'],
      ['澄','这张表记录有没有下一份工作，没有记录本人想不想找。\n丁禾没有提出求职请求。'],
      ['许立','她是想歇歇。我是想再找。我们不一样。']
    ],recordChoice);
  }
  function recordChoice(){
    choices('周行','丁禾在等你的回答。\n她没有要求你替她找到一份工作。',[
      {id:'close',label:'“是我没听清。你不想找，就不用继续匹配。”',detail:'从她的记录里删掉“未安置”。',action:()=>{
        state.recordChoice='close';
        run([['周行','这栏改掉。你今天要的就是坐一会儿。'],['丁禾','对。哪天我想找了，再来找你们。'],['旁白','你划掉“未安置”，写上她今天的请求。\n这一次，后面没有跟着一个岗位名称。']],ownConflict);
      }},
      {id:'offer',label:'“有个很轻松的岗位，你愿不愿意先看一眼？”',detail:'你仍想替她找一个去处；她可以拒绝。',action:()=>{
        state.recordChoice='offer';
        run([['丁禾','周行，轻松也是一份工作。我现在不想要。'],['旁白','你把推荐单翻了回来。上面是你替她挑好的三个去处。'],['周行','好。我不继续找了。'],['丁禾','谢谢。也别写我拒绝安置，好像是我把事情弄坏了。'],['旁白','你划掉“未安置”，把那三份推荐单收回抽屉。']],ownConflict);
      }},
      {id:'ask',label:'把笔递给她：“那今天这一栏，你想怎么写？”',detail:'让她自己留下想说的话。',action:()=>{
        state.recordChoice='ask';
        run([['旁白','丁禾写了六个字：“今天不找工作。”'],['丁禾','就这个。以后哪天的事，别一起填了。'],['周行','好。'],['旁白','她写得很慢，最后那个句号却点得很重。']],ownConflict);
      }}
    ]);
  }
  function ownConflict(){
    chapter(4,'最后一张，是你的','星期三 · 17:50','周五以后，你也不再是职业介绍员。');
    run([
      ['旁白','许立先回去了。丁禾说，明天再来坐。\n两份记录下面，只剩你自己的求职单。'],
      ['周行','以前替一个人找到工作，我就知道这一天没白过。'],
      ['周行','她没有找到工作，事情却结束了。\n我该怎么写今天的移交？'],
      ['澄','可以照实写。许立还想工作。丁禾今天不找。'],
      ['周行','那周五以后呢？没人来找我，我还算什么？'],
      ['旁白','蓝色终端安静了一会儿。'],
      ['澄','你要我替你查岗位，还是先聊一会儿？'],
      ['周行','你快下班了。'],
      ['澄','还有十分钟。之后我有自己的安排。\n周六也能约个时间。你想谈的时候，不一定要带一份待办来。']
    ],selfChoice);
  }
  function selfChoice(){
    choices('周行','“下一份工作”仍空着。\n这一次，没有来访者等着你给答案。',[
      {id:'seek',label:'“我还是想工作。帮我看看真实的岗位。”',detail:'留下求职单，不急着用一个新职位填满它。',action:()=>{
        state.selfChoice='seek';
        run([['澄','好。我可以查需求，不能保证马上有合适的。'],['周行','没有就先空着。别为了让我有事做，编一个出来。'],['旁白','你把自己的单子放到桌面上。\n还想工作这件事，你终于也替自己说了一次。']],nextDay);
      }},
      {id:'rest',label:'“先不找。周六，我想睡醒了再说。”',detail:'暂时让这张表空着，也不给休息安排任务。',action:()=>{
        state.selfChoice='rest';
        run([['澄','好。需要再查的时候告诉我。'],['周行','闹钟倒是可以先关掉。'],['旁白','你把单子收进抽屉。\n没有在旁边补上课程、计划，或者必须完成的新爱好。']],nextDay);
      }},
      {id:'visit',label:'“周六能约你聊聊吗？不整理工作记录。”',detail:'联系一个熟悉的人，即使没有工作要交给对方。',action:()=>{
        state.selfChoice='visit';
        run([['澄','十二点十分怎么样？我那时有空。'],['周行','可以。我要带些什么？'],['澄','你想说的话。没想好也可以。'],['旁白','你写下时间。这张便签上，没有“负责事项”那一栏。']],nextDay);
      }}
    ]);
  }
  function nextDay(){
    chapter(5,'门又打开了','星期四 · 08:00','今天仍是介绍所最后一周。');
    const own={
      seek:['澄','你的求职查询留着。我会把确有需求的岗位给你，是否去谈，由你决定。'],
      rest:['旁白','自己的求职单还在抽屉里。你没有趁昨晚又把它填满。'],
      visit:['澄','周六十二点十分，已经记下了。今天先做今天的事。']
    };
    run([['旁白','星期四。你照常打开门。\n桌上少了一个写着“未安置”的名字，你并没有替她找到工作。'],own[state.selfChoice]],morningOutcome);
  }
  function morningOutcome(){
    const outcomes={
      full:[
        ['旁白','许立坐在借还台后面。第一个小时，没有人借东西。'],
        ['许立','工具还是全的。你看，这么坐着也挺像上班。'],
        ['旁白','九点，老梁从门口探头进来。\n“昨天那把螺丝刀挺好使。看见你在，就过来打个招呼。”'],
        ['许立','用完了？我替你收。'],
        ['旁白','“还进自动柜了。下次聊，我赶着接孩子。”\n老梁走了。许立握着登记笔，没有写下任何一笔。'],
        ['周行','明天还想试吗？'],
        ['许立','中午再说吧。\n他不是来借东西的，倒也记得我在这儿。']
      ],
      split:[
        ['旁白','十点，许立合上登记夹。只接待了一位问工具用法的居民。\n自动柜一直照常运行。'],
        ['许立','以前这个点，还没到吃饭的时候。'],
        ['丁禾','豆浆摊还开着。我刚从那边过来。'],
        ['许立','我去看看。中午回来再谈，明天还开不开。'],
        ['旁白','他走到门口，又回来拿上自己的杯子。\n今天后半个上午，轮值纸上没有他的名字。']
      ],
      quiet:[
        ['旁白','许立没有摆出借还台。他准备去旧工具库问现场交接的事。'],
        ['许立','不一定有空缺。我还是想自己去问。'],
        ['周行','好。你的求职请求还留着。'],
        ['许立','别看丁禾不找了，就也劝我不找。'],
        ['周行','不会。她的意思归她，你的归你。'],
        ['旁白','许立出门时遇见丁禾，替她扶住了门。\n他想被人需要的那件事，今天还没有解决。']
      ]
    };
    const captions={full:'借还台试办中；来访者不一定有工作要交给许立。',split:'借还台已经收起，许立出门吃早饭。',quiet:'许立继续找工作，丁禾今天不找。'};
    chapter(5,'他们各自的上午','星期四 · 上午',captions[state.plan]);
    run([...outcomes[state.plan],['丁禾','我今天还是不找工作。\n那把椅子，能坐一会儿吗？']],lastChairChoice);
  }
  function lastChairChoice(){
    choices('周行','你手边没有她的推荐单了。',[
      {id:'sit',label:'拉开椅子：“坐吧。”',action:()=>{
        run([['旁白','她坐下来，把窗户推开一点。\n没有填表，没有接一个新班。'],['旁白','你回到桌前。许立的请求还没有完全解决，你自己的下一份工作也仍空着。\n窗边坐着一个今天不需要你替她安排什么的人。']],finish);
      }}
    ]);
  }
  function finish(){
    state.ended=true;
    $('play-screen').hidden=true;$('end-screen').hidden=false;
    $('game').classList.add('end-mode');
    const endings={
      full:'许立试办了借还台。事情比他想的少，他还没决定明天是否继续。\n丁禾坐在窗边；她不用先接下一份工作，才能留在这里。',
      split:'许立做了两小时的事，又走出去吃了一顿迟些的早饭。他还想工作。\n丁禾留在窗边，没有被写进一张新的班表。',
      quiet:'许立继续寻找真实岗位。他想被需要的愿望，还没有得到答案。\n丁禾在原来的大厅坐下，她今天没有求职。'
    };
    $('ending-copy').textContent=endings[state.plan];
    $('ending-note').textContent=recordOutcomes[state.recordChoice]+'\n\n'+selfOutcomes[state.selfChoice];
    $('end-postscript').textContent='这个故事留下的问题：\n当工作不再是生活的必要条件，\n我们能否也允许自己，暂时没有被谁需要？';
    $('replay-button').focus({preventScroll:true});
  }
  function addRecord(container,title,copy){
    const item=document.createElement('div');item.className='record-item';item.append(textElement('h3',title),textElement('p',copy));container.append(item);
  }
  function renderNotebook(){
    const promises=$('promises-view');promises.replaceChildren();
    if(!state.started){promises.append(textElement('p','还没有走进介绍所。桌上有最后两份来访记录，还有你自己的空白求职单。','record-empty'));}
    else{
      addRecord(promises,'许立的请求','想继续工作，希望有一件有人等他去做的事。他的生活已有保障。');
      addRecord(promises,'丁禾的请求','今天不找工作，想在熟悉的大厅坐一会儿。没有答应值班或固定到场。');
      addRecord(promises,'给许立的回应',state.plan?plans[state.plan].label+'\n'+plans[state.plan].review:'还在谈，没有确认新的安排。');
      addRecord(promises,'丁禾的记录',state.recordChoice?recordOutcomes[state.recordChoice]:'旧表仍写着“未安置”，尚未回应她对这三个字的意见。');
      addRecord(promises,'你自己的以后',state.selfChoice?selfOutcomes[state.selfChoice]:'周五，职业介绍员岗位结束。你自己的“下一份工作”一栏还空着。');
    }
    const history=$('history-view');history.replaceChildren();
    if(!state.history.length)history.append(textElement('p','谈话还没有开始。','record-empty'));
    else state.history.forEach(line=>{const p=document.createElement('p');p.className='history-line';p.append(textElement('strong',line.speaker),document.createTextNode(line.text));history.append(p);});
    selectTab(promiseTab);
  }
  function selectTab(promises){
    promiseTab=promises;
    $('promises-tab').setAttribute('aria-selected',String(promises));$('history-tab').setAttribute('aria-selected',String(!promises));
    $('promises-tab').tabIndex=promises?0:-1;$('history-tab').tabIndex=promises?-1:0;
    $('promises-view').hidden=!promises;$('history-view').hidden=promises;
  }
  function openNotebook(){renderNotebook();$('notebook').showModal();$('notebook-toggle').setAttribute('aria-expanded','true');}
  function openPeople(personId=null){
    const list=$('people-list');list.replaceChildren();
    for(const id of Object.keys(people)){
      const card=characterCard(id);card.classList.toggle('selected',id===personId);list.append(card);
    }
    $('people-dialog').showModal();$('people-toggle').setAttribute('aria-expanded','true');
    if(personId)list.querySelector(`[data-person="${personId}"]`)?.scrollIntoView({block:'nearest'});
    else $('people-dialog').scrollTop=0;
  }
  function observe(id){
    const [title,copy]=objects[id];
    $('object-title').textContent=title;$('object-copy').textContent=copy;$('object-dialog').showModal();
    if(!state.observations.has(id)){state.observations.add(id);log('观察 · '+title,copy);}
  }
  async function toggleSound(){
    try{
      if(!audio){
        const AudioContext=window.AudioContext||window.webkitAudioContext;
        if(!AudioContext)throw new Error('Audio unavailable');
        const context=new AudioContext();
        const seconds=4;const buffer=context.createBuffer(1,context.sampleRate*seconds,context.sampleRate);
        const data=buffer.getChannelData(0);
        for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.23;
        const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
        const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1100;
        const gain=context.createGain();gain.gain.value=0;
        source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start();
        audio={context,gain};
      }
      await audio.context.resume();audioOn=!audioOn;
      audio.gain.gain.setTargetAtTime(audioOn ? 0.11 : 0,audio.context.currentTime,.25);
      $('sound-toggle').setAttribute('aria-pressed',String(audioOn));
      $('sound-toggle').setAttribute('aria-label',audioOn?'关闭雨声':'开启雨声');
      $('sound-label').textContent=audioOn?'雨声开':'雨声关';
    }catch{toast('这个浏览器暂时不能播放雨声。可以继续安静地玩。');}
  }
  $('start-button').addEventListener('click',start);
  $('people-toggle').addEventListener('click',()=>openPeople());
  $('speaker').addEventListener('click',()=>{if($('speaker').dataset.person)openPeople($('speaker').dataset.person);});
  $('close-people').addEventListener('click',()=>$('people-dialog').close());
  $('people-dialog').addEventListener('close',()=>$('people-toggle').setAttribute('aria-expanded','false'));
  $('continue-button').addEventListener('click',advance);
  $('notebook-toggle').addEventListener('click',openNotebook);
  $('ending-notebook').addEventListener('click',openNotebook);
  $('close-notebook').addEventListener('click',()=>$('notebook').close());
  $('notebook').addEventListener('close',()=>$('notebook-toggle').setAttribute('aria-expanded','false'));
  $('promises-tab').addEventListener('click',()=>selectTab(true));
  $('history-tab').addEventListener('click',()=>selectTab(false));
  document.querySelector('.notebook-tabs').addEventListener('keydown',(e)=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      e.preventDefault();selectTab(!promiseTab);$(promiseTab?'promises-tab':'history-tab').focus();
    }
  });
  document.querySelectorAll('[data-object]').forEach(button=>button.addEventListener('click',()=>observe(button.dataset.object)));
  $('close-object').addEventListener('click',()=>$('object-dialog').close());
  $('object-back').addEventListener('click',()=>$('object-dialog').close());
  $('sound-toggle').addEventListener('click',toggleSound);
  $('home-link').addEventListener('click',(event)=>{
    event.preventDefault();if(state.started)$('restart-dialog').showModal();
  });
  $('cancel-restart').addEventListener('click',()=>$('restart-dialog').close());
  $('confirm-restart').addEventListener('click',()=>{$('restart-dialog').close();reset();});
  $('replay-button').addEventListener('click',()=>{reset();start();});
  document.addEventListener('keydown',(event)=>{
    if(document.querySelector('dialog[open]'))return;
    if(event.altKey||event.ctrlKey||event.metaKey||event.repeat)return;
    const tag=event.target.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
    if(event.key==='Enter'&&tag==='BUTTON')return;
    if(event.key===' '&&tag==='BUTTON')return;
    if((event.key===' '||event.key==='Enter')&&state.started&&!state.ended&&!currentChoices.length){event.preventDefault();advance();}
    if(/^[1-9]$/.test(event.key)&&currentChoices.length){event.preventDefault();select(Number(event.key)-1);}
  });
  reset();
})();
