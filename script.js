/* Trap Quiz — Learn + Quiz with Group Filters
 * Reads only first 3 columns for content: [Class, Generic, Brands]
 * Uses column 6 (index 5) as Group label. Columns 4 & 5 are ignored.
 */
const CSV_FILE = "first_two_tables_first4.csv";  // <- rename here if needed

// ---------- Element refs ----------
const els = {
  // Status
  status: document.getElementById("status"),
  scorePill: document.getElementById("scorePill"),
  progressPill: document.getElementById("progressPill"),
  difficultyPill: document.getElementById("difficultyPill"),
  elapsedPill: document.getElementById("elapsedPill"),
  qBar: document.getElementById("qBar"),
  qProgLabel: document.getElementById("qProgLabel"),

  // Home
  home: document.getElementById("home"),
  goLearn: document.getElementById("goLearn"),
  goQuiz: document.getElementById("goQuiz"),

  // Quiz landing + scoreboard + category modal
  landing: document.getElementById("landing"),
  startBtn: document.getElementById("startBtn"),
  backHome1: document.getElementById("backHome1"),
  scoreTableBody: document.querySelector("#scoreTable tbody"),
  downloadCSV: document.getElementById("downloadCSV"),
  clearScores: document.getElementById("clearScores"),
  quizSelSummary: document.getElementById("quizSelSummary"),
  openQuizCats: document.getElementById("openQuizCats"),
  quizCatModal: document.getElementById("quizCatModal"),
  closeQuizCats: document.getElementById("closeQuizCats"),
  quizCatTable: document.getElementById("quizCatTable"),
  quizCatSearch: document.getElementById("quizCatSearch"),
  quizSelectAll: document.getElementById("quizSelectAll"),
  quizClearAll: document.getElementById("quizClearAll"),
  applyQuizCats: document.getElementById("applyQuizCats"),

  // Quiz engine
  quiz: document.getElementById("quiz"),
  qType: document.getElementById("qType"),
  questionText: document.getElementById("questionText"),
  focusBox: document.getElementById("focusBox"),
  options: document.getElementById("options"),
  submitBtn: document.getElementById("submitBtn"),
  nextBtn: document.getElementById("nextBtn"),
  backBtn: document.getElementById("backBtn"),
  quitBtn: document.getElementById("quitBtn"),
  feedback: document.getElementById("feedback"),

  // Finish
  finish: document.getElementById("finish"),
  finalScore: document.getElementById("finalScore"),
  initials: document.getElementById("initials"),
  saveScore: document.getElementById("saveScore"),
  backHome2: document.getElementById("backHome2"),

  // Learn landing (category picker inline)
  learnLanding: document.getElementById("learnLanding"),
  learnAll: document.getElementById("learn-all"),
  learnSelect: document.getElementById("learn-select"),
  learnCatPanel: document.getElementById("learnCatPanel"),
  learnCatTable: document.getElementById("learnCatTable"),
  learnCatSearch: document.getElementById("learnCatSearch"),
  learnSelectAll: document.getElementById("learnSelectAll"),
  learnClearAll: document.getElementById("learnClearAll"),
  startLearnAll: document.getElementById("startLearnAll"),
  startLearnSelected: document.getElementById("startLearnSelected"),
  backHome3: document.getElementById("backHome3"),

  // Learn flashcards
  learnFlash: document.getElementById("learnFlash"),
  learnProgress: document.getElementById("learnProgress"),
  fcGenericFront: document.getElementById("fcGenericFront"),
  fcGenericBack: document.getElementById("fcGenericBack"),
  fcClass: document.getElementById("fcClass"),
  fcBrands: document.getElementById("fcBrands"),
  flipBtn: document.getElementById("flipBtn"),
  flipBackBtn: document.getElementById("flipBackBtn"),
  prevCard: document.getElementById("prevCard"),
  nextCard: document.getElementById("nextCard"),
  backToLearn: document.getElementById("backToLearn"),
  genFilter: document.getElementById("genFilter"),
  genericSelect: document.getElementById("genericSelect"),
  jumpGeneric: document.getElementById("jumpGeneric"),

  // Misc
  confetti: document.getElementById("confetti"),
};

// ---------- Data ----------
let DATA = null; // [{Class, Generic, Brands[], Group}]
let MAP  = {};   // master maps for full dataset
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
  const body = rows.slice(1); // header ignored

  DATA = body.map(r=>{
    const c0 = (r[0]||"").trim();              // Class
    const c1 = (r[1]||"").trim();              // Generic
    const c2raw = (r[2]||"");                  // Brands (possibly multi-line)
    const brands = uniq(c2raw.split(/\r?\n/).map(cleanBrandLine).filter(Boolean));
    const g6 = (r[5]||"").trim() || "Uncategorized";  // Group (6th column)
    return { Class:c0, Generic:c1, Brands:brands, Group:g6 };
  }).filter(x=>x.Class && x.Generic);

  // Build master maps
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
  const all = ["home","landing","quiz","finish","learnLanding","learnFlash","status","quizCatModal"];
  for(const id of all){
    const el = document.getElementById(id);
    if(!el) continue;
    el.classList.toggle("hidden", !ids.includes(id));
  }
}

// ---------- Confetti ----------
function confettiBurst(){
  const wrap = els.confetti;
  const colors = ["#c49db4","#a98aa4","#e2d5dc","#d7b9c9","#a3d8c3","#cdeee4"];
  for(let i=0;i<80;i++){
    const d = document.createElement("div");
    d.className = "confetti";
    d.style.left = `${Math.random()*100}vw`;
    d.style.background = colors[i%colors.length];
    d.style.opacity = 0.7 + Math.random()*0.3;
    d.style.animationDuration = `${1.8 + Math.random()*1.6}s`;
    d.style.transform = `translateY(-20px) rotate(${Math.random()*360}deg)`;
    wrap.appendChild(d);
    setTimeout(()=>d.remove(), 3600);
  }
}

/* ============================================================
   CATEGORY PICKERS (shared builders)
   ============================================================ */
function buildCategoryTable(tbodyEl){
  tbodyEl.innerHTML = GROUPS.map(g =>
    `<tr>
       <td><input type="checkbox" class="catchk" value="${g.name}"></td>
       <td>${g.name}</td>
       <td>${g.count}</td>
     </tr>`).join("");
}
function filterCategoryTable(tbodyEl, query){
  const q = query.trim().toLowerCase();
  for(const tr of tbodyEl.querySelectorAll("tr")){
    const name = tr.children[1]?.textContent.toLowerCase() || "";
    tr.style.display = name.includes(q) ? "" : "none";
  }
}
function getSelectedCategories(tbodyEl){
  return new Set([...tbodyEl.querySelectorAll('input.catchk:checked')].map(cb=>cb.value));
}
function setAllCategories(tbodyEl, on){
  for(const cb of tbodyEl.querySelectorAll('input.catchk')) cb.checked = !!on;
}

/* ============================================================
   QUIZ ENGINE
   ============================================================ */
let QSTATE=null;
let QUIZ_GROUPS=null; // Set or null for all

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
  const items=[];
  for(const it of DATA){ if(groups.has(it.Group)) items.push(it); }
  return items;
}

function tryQuestionGenerators(M, maxTries=40){
  const gens = [
    // produce functions using only data from M
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
  const qs=[];
  let guard = 0;
  while(qs.length < count && guard < count*8){
    const q = tryQuestionGenerators(M);
    if(q) qs.push(q);
    guard++;
  }
  return qs.length ? qs : [];
}

function barColorFromRatio(r){
  const hue = Math.max(0, Math.min(120, Math.round(120*r))); // 120->0 green->red
  return `hsl(${hue} 65% 45%)`;
}
function updateProgressBar(){
  const rem = QSTATE.countdownRemaining ?? 0;
  const total = QSTATE.countdownTotal ?? 1;
  const ratio = Math.max(0, Math.min(1, rem/total));
  els.qBar.style.width = `${ratio*100}%`;
  els.qBar.style.backgroundColor = barColorFromRatio(ratio);
  els.qProgLabel.textContent = rem>0 ? `Question timer: ${fmtMMSS(rem)}` : `Worth HALF!`;
}
function perQuestionSeconds(q){
  // Hard: single 10s / multi 5s
  // Medium: single 15s / multi 10s
  const single = (QSTATE.difficulty==="hard") ? 10 : 15;
  const multi  = (QSTATE.difficulty==="hard") ? 5  : 10;
  return q.multi ? multi : single;
}
function startPerQuestionCountdown(i){
  const q = QSTATE.qList[i];
  QSTATE.countdownTotal = perQuestionSeconds(q);
  QSTATE.countdownRemaining = QSTATE.countdownTotal;
  updateProgressBar();
  if(QSTATE.countdownInterval) clearInterval(QSTATE.countdownInterval);
  QSTATE.countdownInterval = setInterval(()=>{
    QSTATE.countdownRemaining -= 1;
    if(QSTATE.countdownRemaining <= 0){
      QSTATE.countdownRemaining = 0;
      clearInterval(QSTATE.countdownInterval); QSTATE.countdownInterval=null;
      const ans = QSTATE.answers[i];
      if(!ans.submitted) ans.timedOut = true;
    }
    updateProgressBar();
  }, 1000);
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

function renderQuestion(){
  const q = QSTATE.qList[QSTATE.idx];
  const ans = QSTATE.answers[QSTATE.idx];

  els.qType.textContent = labelForType(q.type);
  els.questionText.textContent = q.prompt;
  if(q.focus){ els.focusBox.textContent = q.focus; els.focusBox.classList.remove("hidden"); }
  else els.focusBox.classList.add("hidden");

  els.options.innerHTML = ""; els.feedback.textContent = ""; els.submitBtn.classList.add("hidden");

  if(q.multi){
    q.options.forEach((opt, idx)=>{
      const label = document.createElement("label");
      label.className = "opt";
      label.innerHTML = `<input type="checkbox" data-i="${idx}"> ${opt.text}`;
      els.options.appendChild(label);
    });
    els.submitBtn.classList.remove("hidden");
  }else{
    q.options.forEach((opt, idx)=>{
      const btn = document.createElement("button");
      btn.className = "opt"; btn.textContent = opt.text;
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
  els.feedback.textContent = ans.correct
    ? (ans.award===1 ? "Correct." : "Correct (half-credit due to time).")
    : "Not correct.";
}

function scheduleAutoAdvance(){
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
  const award = correct ? (ans.timedOut ? 0.5 : 1) : 0;

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
  const award = correct ? (ans.timedOut ? 0.5 : 1) : 0;

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
  const groups = QUIZ_GROUPS; // Set or null
  const count = selectedQuestionCount();
  const diff = selectedDifficulty();

  const qs = buildQuizSubset(groups, count, diff);
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
  }, 500);

  setQuizView();
  renderQuestion();
}
function finishQuiz(){
  if(QSTATE.elapsedInterval) clearInterval(QSTATE.elapsedInterval);
  if(QSTATE.countdownInterval) clearInterval(QSTATE.countdownInterval);
  show("finish");
  els.finalScore.textContent = QSTATE.score.toString();
}

function saveScore(){
  const initials = (els.initials.value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4) || "AAA";
  const elapsedSecs = Math.floor((Date.now()-QSTATE.startedAt)/1000);
  const entry = { initials, score: QSTATE.score, qcount: QSTATE.qList.length, difficulty: QSTATE.difficulty, elapsed: elapsedSecs, date: new Date().toISOString().slice(0,10) };
  const store = JSON.parse(localStorage.getItem("trapquiz_scores")||"[]");
  store.push(entry);
  store.sort((a,b)=> b.score - a.score || a.elapsed - b.elapsed);
  localStorage.setItem("trapquiz_scores", JSON.stringify(store.slice(0,50)));
  renderScoreboard();
  show("landing");
}

function renderScoreboard(){
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
   LEARN MODE (group-based)
   ============================================================ */
let LSTATE=null; // {pool, order, i, flipped}
let LEARN_GROUPS=null; // Set or null

function showLearnLanding(){
  // default radio: all
  els.learnAll.checked = true;
  els.learnSelect.checked = false;
  els.learnCatPanel.classList.add("hidden");

  // build table
  buildCategoryTable(els.learnCatTable.querySelector("tbody"));
  show("learnLanding");
}
els.learnAll?.addEventListener("change", ()=> els.learnCatPanel.classList.add("hidden"));
els.learnSelect?.addEventListener("change", ()=> els.learnCatPanel.classList.remove("hidden"));

function startLearning(groups){
  const pool = poolFromGroups(groups);
  if(pool.length===0){ alert("No items found for your selection."); return; }

  const order = shuffle(pool.map((_,i)=>i));
  LSTATE = { pool, order, i:0, flipped:false };

  // jump dropdown
  const gens = pool.map(x=>x.Generic).sort((a,b)=>a.localeCompare(b));
  els.genericSelect.innerHTML = gens.map(g=>`<option value="${g}">${g}</option>`).join("");
  els.genFilter.value = "";

  renderFlashcard();
  show("learnFlash");
}
function renderFlashcard(){
  const idx = LSTATE.order[LSTATE.i];
  const it = LSTATE.pool[idx];
  els.learnProgress.textContent = `Card ${LSTATE.i+1} of ${LSTATE.order.length}`;

  els.fcGenericFront.textContent = it.Generic;
  els.fcGenericBack.textContent = it.Generic;
  els.fcClass.textContent = it.Class || "—";
  els.fcBrands.textContent = (it.Brands && it.Brands.length) ? `• ${it.Brands.join("\n• ")}` : "—";

  // show front
  LSTATE.flipped = false;
  document.getElementById("cardFront").classList.remove("hidden");
  document.getElementById("cardBack").classList.add("hidden");

  // set dropdown current
  [...els.genericSelect.options].forEach(o=>{ if(o.value===it.Generic) els.genericSelect.value = o.value; });
}
function flipCard(){
  LSTATE.flipped = !LSTATE.flipped;
  document.getElementById("cardFront").classList.toggle("hidden", LSTATE.flipped);
  document.getElementById("cardBack").classList.toggle("hidden", !LSTATE.flipped);
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
els.genFilter?.addEventListener("input", ()=>{
  const q = els.genFilter.value.toLowerCase().trim();
  for(const opt of els.genericSelect.options){
    opt.hidden = !opt.text.toLowerCase().includes(q);
  }
});

/* ============================================================
   WIRING
   ============================================================ */
// Home
els.goLearn.addEventListener("click", async ()=>{
  if(!DATA) await loadData();
  showLearnLanding();
});
els.goQuiz.addEventListener("click", async ()=>{
  if(!DATA) await loadData();
  renderScoreboard();
  updateQuizSelSummary(null);
  show("landing");
});

// Back buttons
els.backHome1.addEventListener("click", ()=> show("home"));
els.backHome2.addEventListener("click", ()=> show("home"));
els.backHome3.addEventListener("click", ()=> show("home"));
els.backToLearn.addEventListener("click", ()=> showLearnLanding());

// Quiz start / actions
els.startBtn.addEventListener("click", startQuiz);
els.downloadCSV.addEventListener("click", downloadScoresCSV);
els.clearScores.addEventListener("click", ()=>{ localStorage.removeItem("trapquiz_scores"); renderScoreboard(); });

els.submitBtn.addEventListener("click", handleSubmitMulti);
els.nextBtn.addEventListener("click", nextQ);
els.backBtn.addEventListener("click", prevQ);
els.quitBtn.addEventListener("click", ()=> show("landing"));
els.saveScore.addEventListener("click", saveScore);

// Quiz categories modal
els.openQuizCats.addEventListener("click", ()=>{
  // build table on open to reflect latest data
  buildCategoryTable(els.quizCatTable.querySelector("tbody"));
  filterCategoryTable(els.quizCatTable.querySelector("tbody"), els.quizCatSearch.value||"");
  show("quizCatModal");
});
els.closeQuizCats.addEventListener("click", ()=> show("landing"));
els.quizCatSearch.addEventListener("input", ()=> filterCategoryTable(els.quizCatTable.querySelector("tbody"), els.quizCatSearch.value));
els.quizSelectAll.addEventListener("click", ()=> setAllCategories(els.quizCatTable.querySelector("tbody"), true));
els.quizClearAll.addEventListener("click", ()=> setAllCategories(els.quizCatTable.querySelector("tbody"), false));
els.applyQuizCats.addEventListener("click", ()=>{
  const set = getSelectedCategories(els.quizCatTable.querySelector("tbody"));
  QUIZ_GROUPS = set.size ? set : null; // null = all
  updateQuizSelSummary(QUIZ_GROUPS);
  show("landing");
});
function updateQuizSelSummary(set){
  if(!set || set.size===0){ els.quizSelSummary.textContent = "Categories: All"; return; }
  els.quizSelSummary.textContent = `Categories: ${set.size} selected`;
}

// Learn landing: category panel
els.learnAll.addEventListener("change", ()=> els.learnCatPanel.classList.add("hidden"));
els.learnSelect.addEventListener("change", ()=>{
  els.learnCatPanel.classList.remove("hidden");
  buildCategoryTable(els.learnCatTable.querySelector("tbody"));
});
els.learnCatSearch.addEventListener("input", ()=> filterCategoryTable(els.learnCatTable.querySelector("tbody"), els.learnCatSearch.value));
els.learnSelectAll.addEventListener("click", ()=> setAllCategories(els.learnCatTable.querySelector("tbody"), true));
els.learnClearAll.addEventListener("click", ()=> setAllCategories(els.learnCatTable.querySelector("tbody"), false));

els.startLearnAll.addEventListener("click", ()=> {
  const set = getSelectedCategories(els.learnCatTable.querySelector("tbody"));
  if(set.size===0){ startLearning(null); }
  startLearning(set);
});
els.startLearnSelected.addEventListener("click", ()=>{
  const set = getSelectedCategories(els.learnCatTable.querySelector("tbody"));
  if(set.size===0){ alert("Pick at least one category."); return; }
  startLearning(set);
});

// Flashcard controls
els.flipBtn.addEventListener("click", flipCard);
els.flipBackBtn.addEventListener("click", flipCard);
els.prevCard.addEventListener("click", prevCard);
els.nextCard.addEventListener("click", nextCard);
els.jumpGeneric.addEventListener("click", jumpToGeneric);

// Boot
(async function init(){
  renderScoreboard();
  show("home");
  try { await loadData(); } catch(e) { /* retry later if needed */ }
})();
