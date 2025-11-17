/* Trap Quiz — Learn + Quiz + Amrita Mode + Review
 * Uses first 3 CSV columns for content: [Class, Generic, Brands]
 * Uses column 6 (index 5) as Group label for filtering (optional).
 */
const CSV_FILE = "first_two_tables_first4.csv";  // <- rename here if needed

// ---------- Element refs ----------
const $ = sel => document.querySelector(sel);
const els = {
  // Status
  status: $("#status"),
  scorePill: $("#scorePill"),
  progressPill: $("#progressPill"),
  difficultyPill: $("#difficultyPill"),
  elapsedPill: $("#elapsedPill"),
  qProgLabel: $("#qProgLabel"),

  // Home
  home: $("#home"),
  goLearn: $("#goLearn"),
  goQuiz: $("#goQuiz"),

  // Quiz landing + scoreboard + category modal
  landing: $("#landing"),
  startBtn: $("#startBtn"),
  backHome1: $("#backHome1"),
  scoreTableBody: $("#scoreTable tbody"),
  downloadCSV: $("#downloadCSV"),
  clearScores: $("#clearScores"),
  quizSelSummary: $("#quizSelSummary"),
  openQuizCats: $("#openQuizCats"),
  quizCatModal: $("#quizCatModal"),
  closeQuizCats: $("#closeQuizCats"),
  quizCatTable: $("#quizCatTable"),
  quizCatSearch: $("#quizCatSearch"),
  quizSelectAll: $("#quizSelectAll"),
  quizClearAll: $("#quizClearAll"),
  applyQuizCats: $("#applyQuizCats"),

  // Quiz engine
  quiz: $("#quiz"),
  qType: $("#qType"),
  questionText: $("#questionText"),
  focusBox: $("#focusBox"),
  options: $("#options"),
  submitBtn: $("#submitBtn"),
  nextBtn: $("#nextBtn"),
  backBtn: $("#backBtn"),
  quitBtn: $("#quitBtn"),
  feedback: $("#feedback"),

  // Finish
  finish: $("#finish"),
  finalScore: $("#finalScore"),
  initials: $("#initials"),
  saveScore: $("#saveScore"),
  backHome2: $("#backHome2"),
  playAgain: $("#playAgain"),
  viewReview: $("#viewReview"),

  // Review / reflection
  review: $("#review"),
  reviewList: $("#reviewList"),
  reviewBack: $("#reviewBack"),

  // Learn landing (category picker)
  learnLanding: $("#learnLanding"),
  learnAll: $("#learn-all"),
  learnSelect: $("#learn-select"),
  learnCatPanel: $("#learnCatPanel"),
  learnCatTable: $("#learnCatTable"),
  learnCatSearch: $("#learnCatSearch"),
  learnSelectAll: $("#learnSelectAll"),
  learnClearAll: $("#learnClearAll"),
  startLearnAll: $("#startLearnAll"),
  startLearnSelected: $("#startLearnSelected"),
  backHome3: $("#backHome3"),

  // Learn flashcards
  learnFlash: $("#learnFlash"),
  learnProgress: $("#learnProgress"),
  fcGenericFront: $("#fcGenericFront"),
  fcGenericBack: $("#fcGenericBack"),
  fcClass: $("#fcClass"),
  fcBrands: $("#fcBrands"),
  flipBtn: $("#flipBtn"),
  flipBackBtn: $("#flipBackBtn"),
  prevCard: $("#prevCard"),
  nextCard: $("#nextCard"),
  backToLearn: $("#backToLearn"),
  genFilter: $("#genFilter"),
  genericSelect: $("#genericSelect"),
  jumpGeneric: $("#jumpGeneric"),

  // Misc
  confetti: $("#confetti"),
  hoverCard: $("#hoverCard"),
  hcTitle: $("#hcTitle"),
  hcClass: $("#hcClass"),
  hcBrands: $("#hcBrands"),
};

// ---------- Data ----------
let DATA = null; // [{Class, Generic, Brands[], Group}]
let MAP  = {};   // master maps
let GROUPS = []; // [{name, count}...]

// ---------- Helpers ----------
const pad2 = n => String(n).padStart(2,"0");
const fmtMMSS = s => `${pad2(Math.floor(s/60))}:${pad2(Math.floor(s%60))}`;
const shuffle = arr => arr.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const choice = arr => arr[Math.floor(Math.random()*arr.length)];
const uniq = arr => [...new Set(arr)];
const selectedDifficulty = () => (document.querySelector('input[name="difficulty"]:checked')?.value || "medium");
const selectedQuestionCount = () => parseInt(document.querySelector('input[name="qcount"]:checked')?.value || "30",10);

// ---------- CSV parsing ----------
function parseCSV(text){
  const rows = [];
  let i=0, field="", row=[], inQuotes=false;
  while(i<text.length){
    const ch = text[i];
    if(inQuotes){
      if(ch === '"'){
        if(text[i+1] === '"'){ field+='"'; i+=2; continue; }
        inQuotes = false; i++; continue;
      } else { field+=ch; i++; continue; }
    } else {
      if(ch === '"'){ inQuotes=true; i++; continue; }
      if(ch === ','){ row.push(field); field=""; i++; continue; }
      if(ch === '\n'){ row.push(field); field=""; rows.push(row); row=[]; i++; continue; }
      if(ch === '\r'){ row.push(field); field=""; rows.push(row); row=[]; i++; if(text[i]==='\n') i++; continue; }
      field+=ch; i++;
    }
  }
  if(field.length>0 || row.length>0){ row.push(field); rows.push(row); }
  return rows;
}
function cleanBrandLine(line){
  if(!line) return "";
  return line.replace(/\([^)]*\)/g,"").replace(/\*/g,"").replace(/\s+/g," ").trim();
}

async function loadData(){
  const res = await fetch(CSV_FILE);
  const txt = await res.text();
  const rows = parseCSV(txt).filter(r=>r.length>0);
  const body = rows.slice(1);

  DATA = body.map(r=>{
    const cls = (r[0]||"").trim();
    const gen = (r[1]||"").trim();
    const brands = uniq(((r[2]||"").split(/\r?\n/).map(cleanBrandLine)).filter(Boolean));
    const group = (r[5]||"").trim() || "Uncategorized";
    return { Class:cls, Generic:gen, Brands:brands, Group:group };
  }).filter(x=>x.Class && x.Generic);

  const classToGenerics = new Map();
  const genericToClass = new Map();
  const brandToGeneric = new Map();
  const groupToItems = new Map();

  for(const it of DATA){
    genericToClass.set(it.Generic, it.Class);
    if(!classToGenerics.has(it.Class)) classToGenerics.set(it.Class, []);
    classToGenerics.get(it.Class).push(it.Generic);

    if(!groupToItems.has(it.Group)) groupToItems.set(it.Group, []);
    groupToItems.get(it.Group).push(it);

    for(const b of it.Brands){
      if(!brandToGeneric.has(b)) brandToGeneric.set(b, it.Generic);
    }
  }

  GROUPS = [...groupToItems.keys()].sort((a,b)=>a.localeCompare(b)).map(name=>({name, count:groupToItems.get(name).length}));
  MAP = {
    classes: [...classToGenerics.keys()],
    generics: DATA.map(x=>x.Generic),
    brands: [...brandToGeneric.keys()],
    classToGenerics, genericToClass, brandToGeneric, groupToItems
  };
}

// ---------- View switching ----------
function show(...ids){
  const all = ["home","landing","quiz","finish","learnLanding","learnFlash","status","quizCatModal","review"];
  for(const id of all){
    const el = document.getElementById(id);
    if(!el) continue;
    el.classList.toggle("hidden", !ids.includes(id));
  }
}

// ---------- Confetti (fixed) ----------
function confettiBurst(){
  const wrap = els.confetti;
  const colors = ["#ff0095ff","#ff00d9ff","#9e306bff","#e7afcdff","#e177dfff","#9235a9ff","#992f8dff","#d830e1ff"];
  // const colors = ["#c49db4","#a98aa4","#e2d5dc","#d7b9c9","#a3d8c3","#cdeee4","#ffd6a5","#caffbf"];
  for(let i=0;i<120;i++){
    const d = document.createElement("div");
    d.className = "confetti";
    d.style.left = `${Math.random()*100}vw`;
    d.style.background = colors[i%colors.length];
    d.style.animationDuration = `${1.6 + Math.random()*1.8}s`;
    d.style.transform = `translateY(-20px) rotate(${Math.random()*360}deg)`;
    wrap.appendChild(d);
    setTimeout(()=>d.remove(), 4200);
  }
}

/* ============================================================
   CATEGORY PICKERS
   ============================================================ */
function buildCategoryTable(tbodyEl){
  if(!tbodyEl) return;
  tbodyEl.innerHTML = GROUPS.map(g =>
    `<tr>
       <td><input type="checkbox" class="catchk" value="${g.name}"></td>
       <td>${g.name}</td>
       <td>${g.count}</td>
     </tr>`).join("");
}
function filterCategoryTable(tbodyEl, query){
  if(!tbodyEl) return;
  const q = (query||"").trim().toLowerCase();
  for(const tr of tbodyEl.querySelectorAll("tr")){
    const name = tr.children[1]?.textContent.toLowerCase() || "";
    tr.style.display = name.includes(q) ? "" : "none";
  }
}
function getSelectedCategories(tbodyEl){
  if(!tbodyEl) return new Set();
  return new Set([...tbodyEl.querySelectorAll('input.catchk:checked')].map(cb=>cb.value));
}
function setAllCategories(tbodyEl, on){
  if(!tbodyEl) return;
  for(const cb of tbodyEl.querySelectorAll('input.catchk')) cb.checked = !!on;
}

/* ============================================================
   QUIZ ENGINE
   ============================================================ */
let QSTATE=null;
let QUIZ_GROUPS=null; // Set or null

function buildMapsFor(items){
  const classToGenerics = new Map();
  const genericToClass = new Map();
  const brandToGeneric = new Map();
  const classes = new Set(), generics = new Set(), brands = new Set();

  for(const it of items){
    classes.add(it.Class); generics.add(it.Generic);
    genericToClass.set(it.Generic, it.Class);
    if(!classToGenerics.has(it.Class)) classToGenerics.set(it.Class, []);
    classToGenerics.get(it.Class).push(it.Generic);
    for(const b of it.Brands){ brands.add(b); if(!brandToGeneric.has(b)) brandToGeneric.set(b, it.Generic); }
  }
  return {
    items,
    classes:[...classes],
    generics:[...generics],
    brands:[...brands],
    classToGenerics, genericToClass, brandToGeneric
  };
}
function poolFromGroups(groups){
  if(!groups || groups.size===0) return DATA.slice();
  const items=[]; for(const it of DATA){ if(groups.has(it.Group)) items.push(it); }
  return items;
}

function tryQuestionGenerators(M, maxTries=40){
  const gens = [
    function q_generic_to_class(){
      const item = choice(M.items);
      const ok = M.genericToClass.get(item.Generic);
      const distract = M.classes.filter(c=>c!==ok);
      if(distract.length < 3) return null;
      const wrong = shuffle(distract).slice(0,3);
      const options = shuffle([ok, ...wrong]).map(c=>({text:c, value:c}));
      return {type:"generic_to_class", prompt:"Which class does the following drug belong to?", focus:item.Generic, options, correct:new Set([ok]), multi:false};
    },
    function q_brand_to_generic(){
      const pool = M.items.filter(it=>it.Brands.length>0);
      if(pool.length===0) return null;
      const item = choice(pool); const brand = choice(item.Brands);
      const wrongPool = M.generics.filter(g=>g!==item.Generic);
      if(wrongPool.length < 3) return null;
      const wrong = shuffle(wrongPool).slice(0,3);
      const options = shuffle([item.Generic, ...wrong]).map(g=>({text:g, value:g}));
      return {type:"brand_to_generic", prompt:"What is the generic name of the following brand-named drug?", focus:brand, options, correct:new Set([item.Generic]), multi:false};
    },
    function q_class_select_generics(){
      const rich = M.classes.filter(c => (M.classToGenerics.get(c)||[]).length >= 3);
      if(rich.length===0) return null;
      const cls = choice(rich);
      const inClass = M.classToGenerics.get(cls) || [];
      const nCorr = Math.min(inClass.length, Math.random()<0.5?2:3);
      if(nCorr<1) return null;
      const corrects = new Set(shuffle(inClass).slice(0,nCorr));
      const wrongPool = M.generics.filter(g => !inClass.includes(g));
      const needWrong = Math.max(3, 6 - nCorr);
      if(wrongPool.length < needWrong) return null;
      const wrongs = shuffle(wrongPool).slice(0, needWrong);
      const options = shuffle([...corrects, ...wrongs]).map(g=>({text:g, value:g}));
      return {type:"class_to_generics_select_all", prompt:"Which of the following belong to this class? (select all that apply)", focus:cls, options, correct:new Set([...corrects]), multi:true};
    },
    function q_generic_to_brand_single(){
      const pool = M.items.filter(it=>it.Brands.length>0);
      if(pool.length===0) return null;
      const item = choice(pool);
      const correctBrand = choice(item.Brands);
      const wrongPool = M.brands.filter(b => M.brandToGeneric.get(b) !== item.Generic);
      if(wrongPool.length < 3) return null;
      const wrong = shuffle(wrongPool).slice(0,3);
      const options = shuffle([correctBrand, ...wrong]).map(b=>({text:b, value:b}));
      return {type:"generic_to_brand", prompt:"Which brand corresponds to the following generic?", focus:item.Generic, options, correct:new Set([correctBrand]), multi:false};
    },
    function q_odd_one_out(){
      const cls = choice(M.classes);
      const inClass = M.classToGenerics.get(cls) || [];
      const notIn = M.generics.filter(g=>!inClass.includes(g));
      if(inClass.length<2 || notIn.length<1) return null;
      const correct = choice(notIn), sameClass = shuffle(inClass).slice(0,3);
      const options = shuffle([correct, ...sameClass]).map(g=>({text:g, value:g}));
      return {type:"odd_one_out", prompt:"Which of the following is NOT in this class?", focus:cls, options, correct:new Set([correct]), multi:false};
    }
  ];
  for(let k=0;k<maxTries;k++){
    const gen = choice(gens);
    const q = gen();
    if(q) return q;
  }
  return null;
}

function buildQuizSubset(groups, count, difficulty){
  const items = poolFromGroups(groups);
  const M = buildMapsFor(items);
  const qs=[]; let guard = 0;
  while(qs.length < count && guard < count*8){
    const q = tryQuestionGenerators(M);
    if(q) qs.push(q);
    guard++;
  }
  return qs.length ? qs : [];
}

function updateStatusBar(){
  els.scorePill.textContent = `Score: ${QSTATE.score}`;
  els.progressPill.textContent = `Question ${QSTATE.idx+1} of ${QSTATE.qList.length}`;
  els.difficultyPill.textContent = `Difficulty: ${QSTATE.difficulty}`;
}

function setQuizView(){ show("quiz","status"); }
function labelForType(t){
  switch(t){
    case "generic_to_class": return "Single choice • Generic → Class";
    case "brand_to_generic": return "Single choice • Brand → Generic";
    case "class_to_generics_select_all": return "Multi-select • Class → Generics";
    case "generic_to_brand": return "Single choice • Generic → Brand";
    case "odd_one_out": return "Single choice • Odd one out";
    default: return "";
  }
}

/* ----- Per-question timer (Medium/Hard only) ----- */
function perQuestionSeconds(q){
  // Hard: single 10s / multi 5s
  // Medium: single 15s / multi 10s
  const single = (QSTATE.difficulty==="hard") ? 10 : 15;
  const multi  = (QSTATE.difficulty==="hard") ? 5  : 10;
  return q.multi ? multi : single;
}
function startPerQuestionCountdown(i){
  if(QSTATE.difficulty === "Amrita"){ // Amrita Mode => no question timer
    els.qProgLabel.textContent = "No question timer (Amrita Mode)";
    return;
  }
  const q = QSTATE.qList[i];
  QSTATE.countdownTotal = perQuestionSeconds(q);
  QSTATE.countdownRemaining = QSTATE.countdownTotal;
  els.qProgLabel.textContent = `Question Timer: ${fmtMMSS(QSTATE.countdownRemaining)}`;

  if(QSTATE.countdownInterval) clearInterval(QSTATE.countdownInterval);
  QSTATE.countdownInterval = setInterval(()=>{
    QSTATE.countdownRemaining -= 1;
    if(QSTATE.countdownRemaining <= 0){
      QSTATE.countdownRemaining = 0;
      clearInterval(QSTATE.countdownInterval); QSTATE.countdownInterval=null;
      const ans = QSTATE.answers[i];
      if(!ans.submitted) ans.timedOut = true;
    }
    const label = (QSTATE.countdownRemaining>0) ? `Question Timer: ${fmtMMSS(QSTATE.countdownRemaining)}` : `Time! (half-credit if correct)`;
    els.qProgLabel.textContent = (QSTATE.difficulty==="Amrita") ? "No question timer (Amrita Mode)" : label;
  }, 1000);
}

/* ----- Render / interactions ----- */
function renderQuestion(){
  const q = QSTATE.qList[QSTATE.idx];
  const ans = QSTATE.answers[QSTATE.idx];

  els.qType.textContent = labelForType(q.type);
  els.questionText.textContent = q.prompt;
  if(q.focus){
    const isGenericFocus = (q.type==="generic_to_class" || q.type==="generic_to_brand");
    if(isGenericFocus){
      els.focusBox.innerHTML = `<span class="generic-chip" data-generic="${q.focus}">${q.focus}</span>`;
    } else {
      els.focusBox.textContent = q.focus;
    }
    els.focusBox.classList.remove("hidden");
  } else {
    els.focusBox.classList.add("hidden");
  }

  els.options.innerHTML = ""; els.feedback.textContent = ""; els.submitBtn.classList.add("hidden");

  if(q.multi){
    q.options.forEach((opt, idx)=>{
      const label = document.createElement("label");
      label.className = "opt";
      label.innerHTML = `<input type="checkbox" data-i="${idx}"> ${decorateOptionText(q.type, opt.text)}`;
      els.options.appendChild(label);
    });
    els.submitBtn.classList.remove("hidden");
  }else{
    q.options.forEach((opt, idx)=>{
      const btn = document.createElement("button");
      btn.className = "opt";
      btn.innerHTML = decorateOptionText(q.type, opt.text);
      btn.addEventListener("click", ()=>handleSingleChoice(idx));
      els.options.appendChild(btn);
    });
  }

  if(ans.submitted){ lockCurrentQuestionUI(q, ans); els.nextBtn.disabled=false; }
  else els.nextBtn.disabled = true;

  if(QSTATE.countdownInterval){ clearInterval(QSTATE.countdownInterval); QSTATE.countdownInterval=null; }
  startPerQuestionCountdown(QSTATE.idx);

  els.backBtn.disabled = (QSTATE.idx===0);
  updateStatusBar();
}

function decorateOptionText(qtype, text){
  const isGenericOption =
    (qtype==="brand_to_generic") ||
    (qtype==="class_to_generics_select_all") ||
    (qtype==="odd_one_out");
  return isGenericOption ? `<span class="generic-chip" data-generic="${text}">${text}</span>` : text;
}

function lockCurrentQuestionUI(q, ans){
  [...els.options.children].forEach((node, idx)=>{
    node.classList.add("disabled");
    const val = q.options[idx].value;
    if(q.multi){
      const input = node.querySelector("input[type=checkbox]");
      if(input) input.checked = ans.picked && ans.picked.has(val);
    }else{
      if(ans.picked && ans.picked === val) node.classList.add("opt-clicked");
    }
    if(q.correct.has(val)) node.classList.add("correct");
    else if((q.multi && ans.picked && ans.picked.has(val)) || (!q.multi && ans.picked===val)){
      node.classList.add("wrong");
    }
  });
  els.submitBtn.classList.add("hidden");
  const halfText = (QSTATE.difficulty==="Amrita") ? "" : (ans.award===1 ? "" : " (half-credit due to time)");
  els.feedback.textContent = ans.correct ? `Correct.${halfText}` : "Not correct.";
}

function scheduleAutoAdvance(){
  if(QSTATE.difficulty==="Amrita") return; // Amrita Mode: NO auto-next
  if(QSTATE.autoAdvanceTimeout) clearTimeout(QSTATE.autoAdvanceTimeout);
  const idxAt = QSTATE.idx;
  QSTATE.autoAdvanceTimeout = setTimeout(()=>{
    if(!document.getElementById("quiz").classList.contains("hidden") && QSTATE.idx===idxAt){
      if(QSTATE.idx < QSTATE.qList.length-1) nextQ();
      else finishQuiz();
    }
  }, 1000);
}

function handleSingleChoice(idx){
  const q = QSTATE.qList[QSTATE.idx];
  const ans = QSTATE.answers[QSTATE.idx];
  if(ans.submitted) return;

  const picked = q.options[idx].value;
  const correct = q.correct.has(picked);
  const award = correct ? ((QSTATE.difficulty==="Amrita") ? 1 : (ans.timedOut ? 0.5 : 1)) : 0;

  ans.submitted = true; ans.picked = picked; ans.correct = correct; ans.award = award;
  QSTATE.score += award;

  if(QSTATE.countdownInterval){ clearInterval(QSTATE.countdownInterval); QSTATE.countdownInterval=null; }

  lockCurrentQuestionUI(q, ans); els.nextBtn.disabled=false;
  if(correct) confettiBurst();
  updateStatusBar();
  scheduleAutoAdvance();
}
function handleSubmitMulti(){
  const q = QSTATE.qList[QSTATE.idx];
  const ans = QSTATE.answers[QSTATE.idx];
  if(ans.submitted) return;

  const checks = [...els.options.querySelectorAll('input[type=checkbox]')];
  const chosen = new Set(checks.filter(c=>c.checked).map(c=>q.options[+c.dataset.i].value));
  const correct = JSON.stringify([...chosen].sort()) === JSON.stringify([...q.correct].sort());
  const award = correct ? ((QSTATE.difficulty==="Amrita") ? 1 : (ans.timedOut ? 0.5 : 1)) : 0;

  ans.submitted = true; ans.picked = chosen; ans.correct = correct; ans.award = award;
  QSTATE.score += award;

  if(QSTATE.countdownInterval){ clearInterval(QSTATE.countdownInterval); QSTATE.countdownInterval=null; }

  lockCurrentQuestionUI(q, ans); els.nextBtn.disabled=false;
  if(correct) confettiBurst();
  updateStatusBar();
  scheduleAutoAdvance();
}

function nextQ(){
  if(QSTATE.countdownInterval){ clearInterval(QSTATE.countdownInterval); QSTATE.countdownInterval=null; }
  if(QSTATE.autoAdvanceTimeout){ clearTimeout(QSTATE.autoAdvanceTimeout); QSTATE.autoAdvanceTimeout=null; }
  if(!QSTATE.answers[QSTATE.idx].submitted) return;
  if(QSTATE.idx < QSTATE.qList.length-1){ QSTATE.idx++; renderQuestion(); }
  else finishQuiz();
}
function prevQ(){
  if(QSTATE.countdownInterval){ clearInterval(QSTATE.countdownInterval); QSTATE.countdownInterval=null; }
  if(QSTATE.autoAdvanceTimeout){ clearTimeout(QSTATE.autoAdvanceTimeout); QSTATE.autoAdvanceTimeout=null; }
  if(QSTATE.idx > 0){ QSTATE.idx--; renderQuestion(); }
}

function startQuiz(){
  const count = selectedQuestionCount();
  const diff = selectedDifficulty();
  const itemsOk = poolFromGroups(QUIZ_GROUPS);

  // Build and validate pool first
  const qs = buildQuizSubset(QUIZ_GROUPS, count, diff);
  if(!qs.length){ alert("Not enough data in the selected categories to build questions."); return; }

  QSTATE = {
    difficulty: diff,
    qList: qs,
    idx: 0,
    score: 0,
    answers: qs.map(q=>({submitted:false, multi:q.multi, picked:null, correct:false, award:0, timedOut:false})),
    startedAt: Date.now(),
    elapsedInterval: null,
    countdownInterval: null,
    countdownTotal: null,
    countdownRemaining: null,
    autoAdvanceTimeout: null
  };

  // elapsed timer
  els.elapsedPill.textContent = "Elapsed: 00:00";
  if(QSTATE.elapsedInterval) clearInterval(QSTATE.elapsedInterval);
  QSTATE.elapsedInterval = setInterval(()=>{
    const secs = Math.floor((Date.now()-QSTATE.startedAt)/1000);
    els.elapsedPill.textContent = `Elapsed: ${fmtMMSS(secs)}`;
    if(QSTATE.difficulty==="Amrita"){ els.qProgLabel.textContent = "No question timer (Amrita Mode)"; }
  }, 500);

  setQuizView();
  renderQuestion();
}
function finishQuiz(){
  if(QSTATE.elapsedInterval) clearInterval(QSTATE.elapsedInterval);
  if(QSTATE.countdownInterval) clearInterval(QSTATE.countdownInterval);
  els.finalScore.textContent = QSTATE.score.toString();
  buildReview();
  show("finish");
}

function saveScore(){
  const initials = (els.initials.value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4) || "AAA";
  const elapsedSecs = Math.floor((Date.now()-QSTATE.startedAt)/1000);
  var entry = { initials, score: QSTATE.score, qcount: QSTATE.qList.length, difficulty: QSTATE.difficulty, elapsed: elapsedSecs, date: new Date().toISOString().slice(0,10) };
  if (QSTATE.difficulty=="Amrita") {
  entry = { initials, score: QSTATE.score, qcount: QSTATE.qList.length, difficulty: "Amrita's'", elapsed: elapsedSecs, date: new Date().toISOString().slice(0,10) };
  }
  const store = JSON.parse(localStorage.getItem("trapquiz_scores")||"[]");
  store.push(entry);
  store.sort((a,b)=> b.score - a.score || a.elapsed - b.elapsed);
  localStorage.setItem("trapquiz_scores", JSON.stringify(store.slice(0,50)));
  renderScoreboard();
  show("landing");
}
function renderScoreboard(){
  if(!els.scoreTableBody) return;
  const store = JSON.parse(localStorage.getItem("trapquiz_scores")||"[]");
  const rows = store.slice(0,10);
  els.scoreTableBody.innerHTML = rows.map((r,i)=>
    `<tr><td>${i+1}</td><td>${r.initials}</td><td>${r.score}</td><td>${r.qcount}</td><td>${r.difficulty}</td><td>${fmtMMSS(r.elapsed)}</td><td>${r.date}</td></tr>`
  ).join("") || `<tr><td colspan="7" class="muted">No scores yet.</td></tr>`;
}
function downloadScoresCSV(){
  const store = JSON.parse(localStorage.getItem("trapquiz_scores")||"[]");
  const header = "Initials,Score,Questions,Difficulty,Elapsed,Date\n";
  const body = store.map(r => `${r.initials},${r.score},${r.qcount},${r.difficulty},${fmtMMSS(r.elapsed)},${r.date}`).join("\n");
  const blob = new Blob([header+body], {type:"text/csv;charset=utf-8;"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "highscores.csv";
  a.click(); URL.revokeObjectURL(a.href);
}

/* ============================================================
   REVIEW & REFLECTION
   ============================================================ */
function buildReview(){
  const list = els.reviewList;
  if(!list) return;
  list.innerHTML = "";
  const appRect = document.querySelector(".app").getBoundingClientRect();

  QSTATE.qList.forEach((q, i)=>{
    const ans = QSTATE.answers[i];
    const card = document.createElement("div");
    card.className = "review-card";

    const head = document.createElement("div");
    head.className = "review-head";
    head.innerHTML = `<span>${labelForType(q.type)}</span><span>${ans.correct ? "✅ Correct" : "❌ Incorrect"}</span>`;

    const qText = document.createElement("div");
    qText.className = "review-q";
    qText.textContent = q.prompt;

    const focus = document.createElement("div");
    focus.className = "review-focus";
    if(q.focus){
      const isGenericFocus = (q.type==="generic_to_class" || q.type==="generic_to_brand");
      focus.innerHTML = isGenericFocus
        ? `<span class="generic-chip" data-generic="${q.focus}">${q.focus}</span>`
        : q.focus;
    } else {
      focus.textContent = "—";
    }

    const opts = document.createElement("div");
    opts.className = "review-opts";
    q.options.forEach((opt, idx)=>{
      const node = document.createElement(q.multi ? "label" : "div");
      node.className = "opt";
      node.innerHTML = decorateOptionText(q.type, opt.text);

      const val = opt.value;
      const picked = q.multi ? (ans.picked && ans.picked.has(val)) : (ans.picked===val);
      if(q.correct.has(val)) node.classList.add("correct");
      else if(picked) node.classList.add("wrong");

      opts.appendChild(node);
    });

    card.appendChild(head);
    card.appendChild(qText);
    card.appendChild(focus);
    card.appendChild(opts);
    list.appendChild(card);
  });

  wireGenericChips(list, appRect);
}

function wireGenericChips(scopeEl, appRect){
  scopeEl.addEventListener("mouseover", onChipOver, true);
  scopeEl.addEventListener("mouseout", onChipOut, true);
  scopeEl.addEventListener("click", onChipClick, true);
  
  function onChipEnter(e){
    const chip = e.target.closest(".generic-chip");
    if(!chip) return;
    if(chip.classList.contains("pinned")) return;
    showHoverForChip(chip, appRect);
  }
  function onChipLeave(e){
    const chip = e.target.closest(".generic-chip");
    if(!chip) return;
    if(chip.classList.contains("pinned")) return;
    hideHoverCard();
  }

  function onChipOver(e){
  const chip = e.target.closest(".generic-chip");
  if(!chip) return;
  // Ignore transitions within the same chip (from its children)
  const rel = e.relatedTarget;
  if(rel && chip.contains(rel)) return;
  if(chip.classList.contains("pinned")) return;
  showHoverForChip(chip, appRect);
}

function onChipOut(e){
  const chip = e.target.closest(".generic-chip");
  if(!chip) return;
  const rel = e.relatedTarget;
  if(rel && chip.contains(rel)) return;
  if(chip.classList.contains("pinned")) return;
  hideHoverCard();
}

  function onChipClick(e){
    const chip = e.target.closest(".generic-chip");
    if(!chip) return;
    if(chip.classList.contains("pinned")){
      chip.classList.remove("pinned");
      const id = pinnedIdFor(chip.dataset.generic);
      const pinned = document.getElementById(id);
      if(pinned) pinned.remove();
    } else {
      chip.classList.add("pinned");
      const pinned = makeHoverCardElement();
      fillHoverCard(chip.dataset.generic, pinned);
      positionHoverCardBesideApp(chip, pinned, appRect);
      pinned.id = pinnedIdFor(chip.dataset.generic);
      addCloseButton(pinned, chip); 
      document.body.appendChild(pinned);
      enableDrag(pinned);
    }
  }
}

function pinnedIdFor(g){ return "pinned-hover-" + g.replace(/\W+/g,"_"); }

function addCloseButton(cardEl, chip){
  const btn = document.createElement('button');
  btn.className = 'hc-close';
  btn.type = 'button';
  btn.title = 'Close';
  btn.textContent = '×';
  btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    e.preventDefault();
    chip.classList.remove('pinned');
    cardEl.remove();
  });
  cardEl.appendChild(btn);
}


function showHoverForChip(chip, appRect){
  const hc = els.hoverCard;
  fillHoverCard(chip.dataset.generic, hc);
  positionHoverCardBesideApp(chip, hc, appRect);
  hc.classList.remove("hidden");
  enableDrag(hc);
}
function hideHoverCard(){ els.hoverCard.classList.add("hidden"); }

function fillHoverCard(generic, cardEl){
  const cls = MAP.genericToClass.get(generic) || "—";
  const brands = (DATA.find(x=>x.Generic===generic)?.Brands || []);
  const brandText = brands.length ? `• ${brands.join("\n• ")}` : "—";
  const title = cardEl.querySelector(".hc-title");
  const c = cardEl.querySelector("#hcClass");
  const b = cardEl.querySelector("#hcBrands");
  if(title) title.textContent = generic;
  if(c) c.textContent = cls;
  if(b) b.textContent = brandText;
}
function positionHoverCardBesideApp(chip, cardEl, appRect){
  const rect = chip.getBoundingClientRect();
  const sideLeft = (rect.left < (appRect.left + appRect.width/2));
  const width = Math.min(320, Math.floor(window.innerWidth*0.44));
  cardEl.style.width = width + "px";

  const gap = 0;
  let left = sideLeft ? (appRect.left - width - gap) : (appRect.right + gap);
  let top = rect.top;

  // ensure element has dimensions before clamping
  document.body.appendChild(cardEl);
  const h = cardEl.offsetHeight || 180;

  top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
  cardEl.style.left = `${Math.max(4, left)}px`;
  cardEl.style.top = `${top}px`;
}

function makeHoverCardElement(){
  const base = els.hoverCard;
  const clone = base.cloneNode(true);
  clone.classList.remove("hidden");
  return clone;
}
function enableDrag(cardEl){
  const handle = cardEl.querySelector(".hc-handle");
  if(!handle) return;
  let dragging=false, startX=0, startY=0, startLeft=0, startTop=0;

  const onDown = (e)=>{
    dragging=true;
    const r = cardEl.getBoundingClientRect();
    startLeft = r.left; startTop = r.top;
    startX = e.clientX; startY = e.clientY;
    e.preventDefault();
  };
  const onMove = (e)=>{
    if(!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    cardEl.style.left = `${Math.max(4, Math.min(window.innerWidth-20, startLeft+dx))}px`;
    cardEl.style.top  = `${Math.max(4, Math.min(window.innerHeight-20, startTop+dy))}px`;
  };
  const onUp = ()=> dragging=false;

  handle.addEventListener("mousedown", onDown);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);

  handle.addEventListener("touchstart", (e)=>onDown(e.touches[0]), {passive:false});
  window.addEventListener("touchmove", (e)=>onMove(e.touches[0]), {passive:false});
  window.addEventListener("touchend", onUp);
}

/* ============================================================
   LEARN MODE
   ============================================================ */
let LSTATE=null; // { pool, order, i, flipped }
function showLearnLanding(){
  if(els.learnAll) els.learnAll.checked = true;
  if(els.learnSelect) els.learnSelect.checked = false;
  if(els.learnCatPanel) els.learnCatPanel.classList.add("hidden");

  const tbody = els.learnCatTable?.querySelector("tbody");
  buildCategoryTable(tbody);
  show("learnLanding");
}
function startLearning(groupsSet){
  const pool = poolFromGroups(groupsSet && groupsSet.size ? groupsSet : null);
  if(pool.length===0){ alert("No items found for your selection."); return; }

  const order = shuffle(pool.map((_,i)=>i));
  LSTATE = { pool, order, i:0, flipped:false };

  const gens = pool.map(x=>x.Generic).sort((a,b)=>a.localeCompare(b));
  if(els.genericSelect) els.genericSelect.innerHTML = gens.map(g=>`<option value="${g}">${g}</option>`).join("");
  if(els.genFilter) els.genFilter.value = "";

  renderFlashcard();
  show("learnFlash");
}
function renderFlashcard(){
  const idx = LSTATE.order[LSTATE.i];
  const it = LSTATE.pool[idx];
  if(els.learnProgress) els.learnProgress.textContent = `Card ${LSTATE.i+1} of ${LSTATE.order.length}`;

  els.fcGenericFront.textContent = it.Generic;
  els.fcGenericBack.textContent = it.Generic;
  els.fcClass.textContent = it.Class || "—";
  els.fcBrands.textContent = (it.Brands && it.Brands.length) ? `• ${it.Brands.join("\n• ")}` : "—";

  LSTATE.flipped = false;
  $("#cardFront").classList.remove("hidden");
  $("#cardBack").classList.add("hidden");

  [...els.genericSelect.options].forEach(o=>{ if(o.value===it.Generic) els.genericSelect.value = o.value; });
}
function flipCard(){
  LSTATE.flipped = !LSTATE.flipped;
  $("#cardFront").classList.toggle("hidden", LSTATE.flipped);
  $("#cardBack").classList.toggle("hidden", !LSTATE.flipped);
}
function nextCard(){ LSTATE.i = (LSTATE.i+1) % LSTATE.order.length; renderFlashcard(); }
function prevCard(){ LSTATE.i = (LSTATE.i-1+LSTATE.order.length) % LSTATE.order.length; renderFlashcard(); }
function jumpToGeneric(){
  const val = els.genericSelect.value;
  const pos = LSTATE.pool.findIndex(it=>it.Generic===val);
  if(pos>=0){
    const k = LSTATE.order.findIndex(i => i===pos);
    if(k>=0){ LSTATE.i = k; renderFlashcard(); }
  }
}

/* ============================================================
   WIRING (null-safe)
   ============================================================ */
// Home
els.goLearn && els.goLearn.addEventListener("click", async ()=>{ if(!DATA) await loadData(); showLearnLanding(); });
els.goQuiz  && els.goQuiz.addEventListener("click",  async ()=>{ if(!DATA) await loadData(); renderScoreboard(); updateQuizSelSummary(null); show("landing"); });

// Back buttons
els.backHome1 && els.backHome1.addEventListener("click", ()=> show("home"));
els.backHome2 && els.backHome2.addEventListener("click", ()=> show("home"));
els.backHome3 && els.backHome3.addEventListener("click", ()=> show("home"));
els.backToLearn && els.backToLearn.addEventListener("click", ()=> showLearnLanding());
els.reviewBack && els.reviewBack.addEventListener("click", ()=> show("finish"));

// Quiz start / actions
els.startBtn && els.startBtn.addEventListener("click", startQuiz);
els.downloadCSV && els.downloadCSV.addEventListener("click", downloadScoresCSV);
els.clearScores && els.clearScores.addEventListener("click", ()=>{ localStorage.removeItem("trapquiz_scores"); renderScoreboard(); });

els.submitBtn && els.submitBtn.addEventListener("click", handleSubmitMulti);
els.nextBtn && els.nextBtn.addEventListener("click", nextQ);
els.backBtn && els.backBtn.addEventListener("click", prevQ);
els.quitBtn && els.quitBtn.addEventListener("click", ()=> show("landing"));
els.saveScore && els.saveScore.addEventListener("click", saveScore);
els.playAgain && els.playAgain.addEventListener("click", ()=> { show("landing"); });
els.viewReview && els.viewReview.addEventListener("click", ()=> { show("review"); });

// Quiz categories modal
function updateQuizSelSummary(set){
  if(!els.quizSelSummary) return;
  if(!set || set.size===0){ els.quizSelSummary.textContent = "Categories: All"; return; }
  els.quizSelSummary.textContent = `Categories: ${set.size} selected`;
}
els.openQuizCats && els.openQuizCats.addEventListener("click", ()=>{
  buildCategoryTable(els.quizCatTable?.querySelector("tbody"));
  filterCategoryTable(els.quizCatTable?.querySelector("tbody"), els.quizCatSearch?.value||"");
  show("quizCatModal");
});
els.closeQuizCats && els.closeQuizCats.addEventListener("click", ()=> show("landing"));
els.quizCatSearch && els.quizCatSearch.addEventListener("input", ()=> filterCategoryTable(els.quizCatTable?.querySelector("tbody"), els.quizCatSearch.value));
els.quizSelectAll && els.quizSelectAll.addEventListener("click", ()=> setAllCategories(els.quizCatTable?.querySelector("tbody"), true));
els.quizClearAll && els.quizClearAll.addEventListener("click", ()=> setAllCategories(els.quizCatTable?.querySelector("tbody"), false));
els.applyQuizCats && els.applyQuizCats.addEventListener("click", ()=>{
  const set = getSelectedCategories(els.quizCatTable?.querySelector("tbody"));
  QUIZ_GROUPS = set.size ? set : null;
  updateQuizSelSummary(QUIZ_GROUPS);
  show("landing");
});

// Learn landing: category panel
els.learnAll && els.learnAll.addEventListener("change", ()=> els.learnCatPanel && els.learnCatPanel.classList.add("hidden"));
els.learnSelect && els.learnSelect.addEventListener("change", ()=>{ if(els.learnCatPanel) els.learnCatPanel.classList.remove("hidden"); buildCategoryTable(els.learnCatTable?.querySelector("tbody")); });
els.learnCatSearch && els.learnCatSearch.addEventListener("input", ()=> filterCategoryTable(els.learnCatTable?.querySelector("tbody"), els.learnCatSearch.value));
els.learnSelectAll && els.learnSelectAll.addEventListener("click", ()=> setAllCategories(els.learnCatTable?.querySelector("tbody"), true));
els.learnClearAll && els.learnClearAll.addEventListener("click", ()=> setAllCategories(els.learnCatTable?.querySelector("tbody"), false));

els.startLearnAll && els.startLearnAll.addEventListener("click", ()=>{
  const set = getSelectedCategories(els.learnCatTable?.querySelector("tbody"));
  if(set.size===0){ startLearning(null); } else { startLearning(set); }
});
els.startLearnSelected && els.startLearnSelected.addEventListener("click", ()=>{
  const set = getSelectedCategories(els.learnCatTable?.querySelector("tbody"));
  if(set.size===0){ alert("Pick at least one category."); return; }
  startLearning(set);
});

// Flashcard controls
els.flipBtn && els.flipBtn.addEventListener("click", flipCard);
els.flipBackBtn && els.flipBackBtn.addEventListener("click", flipCard);
els.prevCard && els.prevCard.addEventListener("click", prevCard);
els.nextCard && els.nextCard.addEventListener("click", nextCard);
els.jumpGeneric && els.jumpGeneric.addEventListener("click", jumpToGeneric);
els.genFilter && els.genFilter.addEventListener("input", ()=>{
  const q = els.genFilter.value.toLowerCase().trim();
  for(const opt of els.genericSelect.options){ opt.hidden = !opt.text.toLowerCase().includes(q); }
});

// Boot
(async function init(){
  try { await loadData(); } catch(e) { /* will retry when needed */ }
  renderScoreboard();
  show("home");
})();
