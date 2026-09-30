/* =========================================================
   GYAAN TATTVA - FULL TESTBOOK REVIEW & ENGINE (app.js)
========================================================= */

const STORAGE_USER_NAME = 'gt_user_profile_name';
const STORAGE_TEST_HISTORY = 'gt_test_history_records';

const IDB_CONFIG = {
  name: 'GyaanTattvaOfflineDB',
  store: 'tests_catalog',
  version: 1
};

const CAROUSEL_SUBJECTS = [
  { topic: "Polity", image: "polity.png", glow: "rgba(255, 179, 154, 0.45)" },
  { topic: "History", image: "history.png", glow: "rgba(255, 179, 154, 0.45)" },
  { topic: "Geography", image: "geography.png", glow: "rgba(255, 179, 154, 0.45)" },
  { topic: "Economics", image: "economics.png", glow: "rgba(255, 179, 154, 0.45)" },
  { topic: "Science & tech", image: "science.png", glow: "rgba(255, 179, 154, 0.45)" },
  { topic: "Current affairs", image: "current_affairs.png", glow: "rgba(255, 179, 154, 0.45)" },
  { topic: "Maths", image: "maths.png", glow: "rgba(255, 179, 154, 0.45)" },
  { topic: "Reasoning", image: "reasoning.png", glow: "rgba(255, 179, 154, 0.45)" }
];

let allTests = [];
let testHistory = [];
let currentTestSolutions = [];
let isReviewMode = false;

try {
  testHistory = JSON.parse(localStorage.getItem(STORAGE_TEST_HISTORY)) || [];
} catch (e) {
  testHistory = [];
}

let currentCardIndex = 0;
let activeTab = 'tests';
let activeTest = null;
let currentQuestions = [];
let userResponses = {};
let reviews = new Set();
let currentIdx = 0;
let timeLeft = 120 * 60;
let timerRef = null;
let isSwipingAction = false;

// --- 1. INDEXEDDB ENGINE ---

function getIDBInstance() {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(IDB_CONFIG.name, IDB_CONFIG.version);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_CONFIG.store)) {
        db.createObjectStore(IDB_CONFIG.store, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadAllLocalTests() {
  const db = await getIDBInstance();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_CONFIG.store, 'readonly');
    const store = tx.objectStore(IDB_CONFIG.store);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function saveLocalTest(testObj) {
  const db = await getIDBInstance();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_CONFIG.store, 'readwrite');
    const store = tx.objectStore(IDB_CONFIG.store);
    store.put(testObj);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function removeLocalTest(id) {
  const db = await getIDBInstance();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_CONFIG.store, 'readwrite');
    const store = tx.objectStore(IDB_CONFIG.store);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearLocalDatabase() {
  const db = await getIDBInstance();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_CONFIG.store, 'readwrite');
    const store = tx.objectStore(IDB_CONFIG.store);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- 2. FIRESTORE CLOUD ENGINE ---

async function syncCloudTests() {
  if (typeof db === 'undefined') return;
  try {
    const snapshot = await db.collection("exam_papers").get();
    if (!snapshot.empty) {
      for (const doc of snapshot.docs) {
        const cloudData = doc.data();
        await saveLocalTest({ id: doc.id, ...cloudData });
      }
      allTests = await loadAllLocalTests();
      if (activeTab === 'tests') {
        renderCarouselDOM();
        updateCarouselStates();
      }
    }
  } catch (err) {
    console.warn("Cloud sync deferred:", err.message);
  }
}

// Page View Controller
function switchPage(pageId) {
  const pages = document.querySelectorAll('.view-page');
  pages.forEach(page => {
    page.classList.remove('active');
    page.style.display = 'none';
  });

  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
    target.style.display = 'flex';
  }

  if (pageId === 'page-directory') {
    if (timerRef) clearInterval(timerRef);
    isReviewMode = false;
    loadUserProfile();
    if (activeTab === 'tests') {
      initCarouselEngine();
    } else if (activeTab === 'performance') {
      renderPerformanceDashboard();
    }
  }
}

function handleExamExit() {
  if (isReviewMode) {
    switchPage('page-analysis');
  } else {
    if (confirm("Do you want to exit the test session? Unsaved progress will be lost.")) {
      switchPage('page-directory');
    }
  }
}

// Failsafe Boot Routine
async function bootPortal() {
  try {
    allTests = await loadAllLocalTests();
  } catch (e) {
    allTests = [];
  }

  initTouchSwipe();
  syncCloudTests();

  setTimeout(() => { 
    switchPage('page-directory'); 
    loadUserProfile();
    initCarouselEngine();
  }, 1800);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootPortal);
} else {
  bootPortal();
}

// Sliding Circular Dock Switcher
function switchDashboardTab(tabId) {
  activeTab = tabId;
  const dock = document.getElementById('floatingDock');

  dock.classList.remove('pos-left', 'pos-center', 'pos-right');
  document.querySelectorAll('.dash-tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.dock-btn').forEach(btn => btn.classList.remove('active'));

  if (tabId === 'profile') {
    dock.classList.add('pos-left');
    document.getElementById('tabContentProfile').classList.add('active');
    document.getElementById('dockBtnProfile').classList.add('active');
    const storedName = localStorage.getItem(STORAGE_USER_NAME) || '';
    document.getElementById('profileNameInput').value = storedName;
  } else if (tabId === 'performance') {
    dock.classList.add('pos-right');
    document.getElementById('tabContentPerformance').classList.add('active');
    document.getElementById('dockBtnPerformance').classList.add('active');
    renderPerformanceDashboard();
  } else {
    dock.classList.add('pos-center');
    document.getElementById('tabContentTests').classList.add('active');
    document.getElementById('dockBtnTests').classList.add('active');
    initCarouselEngine();
  }
}

function loadUserProfile() {
  const storedName = localStorage.getItem(STORAGE_USER_NAME);
  const greetingEl = document.getElementById('dashUserGreeting');
  if (greetingEl) {
    greetingEl.innerText = storedName ? storedName : "Aspirant";
  }
}

function saveUserProfile() {
  const inputEl = document.getElementById('profileNameInput');
  const val = inputEl.value.trim();
  if (!val) return alert("Please enter candidate name.");
  localStorage.setItem(STORAGE_USER_NAME, val);
  loadUserProfile();
  alert(`Candidate profile updated as "${val}"!`);
  switchDashboardTab('tests');
}

function renderPerformanceDashboard() {
  const countEl = document.getElementById('kpiTestsTaken');
  const avgEl = document.getElementById('kpiAvgScore');
  const accEl = document.getElementById('kpiAccuracy');
  const historyContainer = document.getElementById('perfHistoryContainer');

  countEl.innerText = testHistory.length;

  if (testHistory.length === 0) {
    avgEl.innerText = '0.0';
    accEl.innerText = '0%';
    historyContainer.innerHTML = `<div class="perf-empty-state">No test sessions recorded yet.<br>Complete a test to view your scorecard history.</div>`;
    return;
  }

  const totalScore = testHistory.reduce((acc, curr) => acc + curr.score, 0);
  avgEl.innerText = (totalScore / testHistory.length).toFixed(1);

  const totalCorrect = testHistory.reduce((acc, curr) => acc + curr.correct, 0);
  const totalAttempted = testHistory.reduce((acc, curr) => acc + (curr.correct + curr.incorrect), 0);
  const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  accEl.innerText = `${accuracy}%`;

  historyContainer.innerHTML = testHistory.slice(-5).reverse().map(item => `
    <div class="perf-history-card">
      <div>
        <div class="perf-hist-title">${item.title}</div>
        <div class="perf-hist-meta">${item.topic} • ${item.date}</div>
      </div>
      <div class="perf-hist-score">${item.score > 0 ? '+' : ''}${item.score.toFixed(2)}</div>
    </div>
  `).join('');
}

// --- 3. 3D CYLINDRICAL CAROUSEL ---

function initCarouselEngine() {
  renderCarouselDOM();
  updateCarouselStates();
  setupCarouselSwipe();
}

function renderCarouselDOM() {
  const track = document.getElementById('carouselTrack');
  const pagination = document.getElementById('carouselPagination');
  if (!track || !pagination) return;

  track.innerHTML = CAROUSEL_SUBJECTS.map((sub, idx) => {
    const testsCount = allTests.filter(t => (t.topic || '').toLowerCase() === sub.topic.toLowerCase()).length;

    return `
      <div class="depth-card state-hidden" 
           id="depthCard_${idx}" 
           style="--glow-color: ${sub.glow};"
           onclick="handleCardClick(${idx})">
        
        <img src="${sub.image}" class="card-poster-bg" alt="${sub.topic}">

        <div class="card-top-row">
          <span class="card-tests-badge">${testsCount} Tests</span>
        </div>

        <div class="card-bottom-row">
          <div class="card-title-pill">${sub.topic}</div>
          <button class="card-enter-btn" type="button" title="View Tests">
            <svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  pagination.innerHTML = CAROUSEL_SUBJECTS.map((_, idx) => `
    <div class="page-dot ${idx === currentCardIndex ? 'active' : ''}" 
         onclick="navigateToCard(${idx})"></div>
  `).join('');
}

function updateCarouselStates() {
  const total = CAROUSEL_SUBJECTS.length;

  CAROUSEL_SUBJECTS.forEach((_, idx) => {
    const card = document.getElementById(`depthCard_${idx}`);
    if (!card) return;

    card.classList.remove('state-center', 'state-left', 'state-right', 'state-hidden');

    if (idx === currentCardIndex) {
      card.classList.add('state-center');
    } else if (idx === (currentCardIndex - 1 + total) % total) {
      card.classList.add('state-left');
    } else if (idx === (currentCardIndex + 1) % total) {
      card.classList.add('state-right');
    } else {
      card.classList.add('state-hidden');
    }
  });

  document.querySelectorAll('.page-dot').forEach((dot, idx) => {
    if (idx === currentCardIndex) dot.classList.add('active');
    else dot.classList.remove('active');
  });
}

function navigateToCard(index) {
  currentCardIndex = index;
  updateCarouselStates();
}

function handleCardClick(index) {
  if (isSwipingAction) return;

  const total = CAROUSEL_SUBJECTS.length;
  if (index === currentCardIndex) {
    openTestSheet(CAROUSEL_SUBJECTS[index].topic);
  } else if (index === (currentCardIndex + 1) % total) {
    navigateToCard(index);
  } else if (index === (currentCardIndex - 1 + total) % total) {
    navigateToCard(index);
  }
}

function setupCarouselSwipe() {
  const zone = document.getElementById('carouselTouchZone');
  if (!zone || zone.dataset.swipeInitialized) return;
  zone.dataset.swipeInitialized = "true";

  let startX = 0, startY = 0, distX = 0, distY = 0;
  let isTouching = false;

  zone.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    distX = 0;
    distY = 0;
    isTouching = true;
    isSwipingAction = false;
  }, { passive: true });

  zone.addEventListener('touchmove', (e) => {
    if (!isTouching) return;
    const touch = e.touches[0];
    distX = touch.clientX - startX;
    distY = touch.clientY - startY;

    if (Math.abs(distX) > 10) isSwipingAction = true;
  }, { passive: true });

  zone.addEventListener('touchend', () => {
    if (!isTouching) return;
    isTouching = false;

    if (Math.abs(distY) > Math.abs(distX)) {
      setTimeout(() => { isSwipingAction = false; }, 80);
      return;
    }

    const threshold = 40;
    const total = CAROUSEL_SUBJECTS.length;

    if (distX < -threshold) {
      navigateToCard((currentCardIndex + 1) % total);
    } else if (distX > threshold) {
      navigateToCard((currentCardIndex - 1 + total) % total);
    }

    setTimeout(() => { isSwipingAction = false; }, 80);
  }, { passive: true });
}

function openTestSheet(topic) {
  const backdrop = document.getElementById('sheetBackdrop');
  const drawer = document.getElementById('testSheet');
  const container = document.getElementById('sheetTestsContainer');

  document.getElementById('sheetBadge').innerText = topic;
  document.getElementById('sheetTitle').innerText = `${topic} Papers`;

  const filtered = allTests.filter(t => (t.topic || '').toLowerCase() === topic.toLowerCase());

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-sheet-state">
        No test papers uploaded under <strong>${topic}</strong>.<br>
        Tap the gear icon on the top-right to add test JSON.
      </div>
    `;
  } else {
    container.innerHTML = filtered.map(t => `
      <div class="sheet-test-card">
        <div>
          <div class="sheet-test-title">${t.title}</div>
          <div class="sheet-test-count">${(t.questions || []).length} Questions • Marks: +${t.posMark ?? 2.0} / -${t.negMark ?? 0.66}</div>
        </div>
        <div class="sheet-test-actions">
          <button class="sheet-start-btn" onclick="startSpecificTest('${t.id}')">Start Test</button>
          <button class="sheet-del-btn" onclick="deleteTest('${t.id}')">✕</button>
        </div>
      </div>
    `).join('');
  }

  backdrop.classList.add('open');
  drawer.classList.add('open');
}

function closeTestSheet() {
  const backdrop = document.getElementById('sheetBackdrop');
  const drawer = document.getElementById('testSheet');
  if (backdrop) backdrop.classList.remove('open');
  if (drawer) drawer.classList.remove('open');
}
// Admin Panel Modal Actions
function openAdminModal() { 
  const el = document.getElementById('adminModal');
  if (el) el.classList.add('open'); 
}

function closeAdminModal() { 
  const el = document.getElementById('adminModal');
  if (el) el.classList.remove('open'); 
}

// Universal Question Parser (Maths, Statement, Key-Value)
function normalizeQuestionPayload(rawQuestion, index) {
  const qId = rawQuestion.id || `q${index + 1}`;
  let rawText = rawQuestion.question || rawQuestion.problem || rawQuestion.title || rawQuestion.q || '';
  let intro = '';
  let statements = [];
  let instruction = '';

  if (rawQuestion.statements && Array.isArray(rawQuestion.statements) && rawQuestion.statements.length > 0) {
    statements = rawQuestion.statements;
    intro = rawText;
  } else {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const numberedRegex = /^\d+[\.\)]\s*(.*)/;
    const collectedStatements = [];
    const beforeLines = [];
    const afterLines = [];
    let state = 'before';

    lines.forEach(line => {
      const match = line.match(numberedRegex);
      if (match) {
        state = 'statements';
        collectedStatements.push(line);
      } else if (state === 'statements') {
        state = 'after';
        afterLines.push(line);
      } else if (state === 'before') {
        beforeLines.push(line);
      } else {
        afterLines.push(line);
      }
    });

    if (collectedStatements.length > 0) {
      intro = beforeLines.join(' ');
      statements = collectedStatements;
      instruction = afterLines.join(' ');
    } else {
      intro = rawText;
    }
  }

  const normalizedOptions = [];
  const rawOpts = rawQuestion.options || rawQuestion.choices || [];

  if (Array.isArray(rawOpts)) {
    rawOpts.forEach((opt, oIdx) => {
      let optKey = String.fromCharCode(65 + oIdx);
      if (typeof opt === 'object' && opt !== null) {
        let detectedKey = opt.value || opt.key || opt.id || optKey;
        if (/^[1-9]$/.test(String(detectedKey).trim())) {
          detectedKey = String.fromCharCode(64 + parseInt(detectedKey));
        }
        normalizedOptions.push({
          key: String(detectedKey).toUpperCase(),
          text: String(opt.label || opt.text || opt.title || opt.val || ''),
          feedback: opt.feedback || opt.explanation || ''
        });
      } else {
        normalizedOptions.push({
          key: optKey,
          text: String(opt),
          feedback: ''
        });
      }
    });
  } else if (typeof rawOpts === 'object' && rawOpts !== null) {
    Object.entries(rawOpts).forEach(([k, val], oIdx) => {
      let optKey = k.trim().toUpperCase();
      if (/^[1-9]$/.test(optKey)) {
        optKey = String.fromCharCode(64 + parseInt(optKey));
      } else if (optKey.startsWith("OPT_") || optKey.startsWith("OPTION")) {
        optKey = optKey.replace(/[^A-Z]/g, '') || String.fromCharCode(65 + oIdx);
      }

      normalizedOptions.push({
        key: optKey,
        text: typeof val === 'object' ? (val.label || val.text || JSON.stringify(val)) : String(val),
        feedback: typeof val === 'object' ? (val.feedback || val.explanation || '') : ''
      });
    });
  }

  let correctKey = '';
  const rawAns = rawQuestion.correctValues?.[0] || rawQuestion.correct || rawQuestion.answer || rawQuestion.ans || rawQuestion.key;
  if (rawAns !== undefined && rawAns !== null) {
    let strAns = String(rawAns).trim().toUpperCase();
    if (/^[1-9]$/.test(strAns)) {
      correctKey = String.fromCharCode(64 + parseInt(strAns));
    } else {
      correctKey = strAns.charAt(0);
    }
  }

  return {
    id: qId,
    intro: intro,
    statements: statements,
    instruction: instruction,
    table: rawQuestion.table || '',
    options: normalizedOptions,
    correct: correctKey,
    hint: rawQuestion.hint || rawQuestion.explanation || rawQuestion.solution || ''
  };
}

async function adminImportTest() {
  const titleInput = document.getElementById('adminTestTitle').value.trim();
  const topic = document.getElementById('adminTopicSelect').value;
  const raw = document.getElementById('adminJsonInput').value.trim();

  const posMark = parseFloat(document.getElementById('adminPosMark').value) || 2.0;
  const negMark = parseFloat(document.getElementById('adminNegMark').value) || 0.0;

  if (!raw) return alert("JSON Payload cannot be empty.");

  try {
    const data = JSON.parse(raw);
    const questionsRaw = Array.isArray(data) ? data : (data.questions || data.paper || data.data || []);

    if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
      throw new Error("No questions array found in JSON.");
    }

    const testTitle = titleInput || data.title || `${topic} Practice Set`;
    const normalizedQuestions = questionsRaw.map((q, idx) => normalizeQuestionPayload(q, idx));

    const testRecord = {
      id: "test_" + Date.now().toString().slice(-6),
      title: testTitle,
      topic: topic,
      posMark: posMark,
      negMark: negMark,
      questions: normalizedQuestions,
      createdAt: new Date().toISOString()
    };

    await saveLocalTest(testRecord);
    allTests = await loadAllLocalTests();

    if (typeof db !== 'undefined') {
      db.collection("exam_papers").doc(testRecord.id).set(testRecord).catch(err => console.warn(err));
    }

    document.getElementById('adminJsonInput').value = '';
    document.getElementById('adminTestTitle').value = '';
    closeAdminModal();

    if (activeTab === 'tests') {
      renderCarouselDOM();
      updateCarouselStates();
    }

    const targetIdx = CAROUSEL_SUBJECTS.findIndex(s => s.topic.toLowerCase() === topic.toLowerCase());
    if (targetIdx !== -1) {
      navigateToCard(targetIdx);
      openTestSheet(topic);
    }

    alert(`Successfully saved "${testTitle}"! (+${posMark} / -${negMark})`);
  } catch (err) {
    alert("JSON Parsing Failed: " + err.message);
  }
}

async function clearAllData() {
  if (confirm("Reset everything? All tests and history records will be wiped from this device.")) {
    allTests = [];
    testHistory = [];
    await clearLocalDatabase();
    localStorage.removeItem(STORAGE_TEST_HISTORY);
    closeAdminModal();
    closeTestSheet();
    if (activeTab === 'tests') {
      renderCarouselDOM();
      updateCarouselStates();
    } else if (activeTab === 'performance') {
      renderPerformanceDashboard();
    }
  }
}

async function deleteTest(id) {
  if (confirm("Delete this test permanently?")) {
    await removeLocalTest(id);
    allTests = await loadAllLocalTests();

    if (typeof db !== 'undefined') {
      db.collection("exam_papers").doc(id).delete().catch(err => console.warn(err));
    }

    const activeTopic = CAROUSEL_SUBJECTS[currentCardIndex].topic;
    openTestSheet(activeTopic);
    renderCarouselDOM();
    updateCarouselStates();
  }
}

// Test Engine Routine
function startSpecificTest(id) {
  activeTest = allTests.find(t => t.id === id);
  if (!activeTest) return;

  closeTestSheet();
  isReviewMode = false;
  currentQuestions = activeTest.questions || [];
  userResponses = {};
  reviews.clear();
  currentIdx = 0;
  timeLeft = 120 * 60;

  const pM = activeTest.posMark ?? 2.0;
  const nM = activeTest.negMark ?? 0.66;
  document.getElementById('badgeMarkPos').innerText = `+${pM}`;
  document.getElementById('badgeMarkNeg').innerText = nM > 0 ? `-${nM}` : '0.0';

  document.getElementById('active-test-title').innerText = activeTest.title;
  document.getElementById('examHeaderActionBtn').innerText = "SUBMIT";
  document.getElementById('examHeaderActionBtn').onclick = submitTest;
  document.getElementById('timer-box').style.display = 'inline';

  switchPage('page-test');
  renderQuestion(currentIdx);
  renderHorizontalPalette();
  startTimer();
}

function startTimer() {
  if (timerRef) clearInterval(timerRef);
  updateTimerUI();
  timerRef = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timerRef);
      alert("Time has expired!");
      submitTest();
      return;
    }
    timeLeft--;
    updateTimerUI();
  }, 1000);
}

function updateTimerUI() {
  const h = String(Math.floor(timeLeft / 3600)).padStart(2, '0');
  const m = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0');
  const s = String(timeLeft % 60).padStart(2, '0');
  const box = document.getElementById('timer-box');
  if (box) box.innerText = `${h}:${m}:${s}`;
}

// Render Question Engine with Solution Reviews
function renderQuestion(index) {
  if (!currentQuestions[index]) return;
  const q = currentQuestions[index];
  currentIdx = index;

  const statementsHtml = (q.statements && q.statements.length > 0)
    ? `<div class="statement-box">${q.statements.map(s => `<div class="statement-line">${s}</div>`).join('')}</div>`
    : '';

  const instructionHtml = q.instruction ? `<div class="q-instruction-text">${q.instruction}</div>` : '';

  const userAns = userResponses[q.id];
  const correctAns = q.correct ? q.correct.toUpperCase() : null;

  const optionsHtml = (q.options || []).map(opt => {
    const isSelected = userAns === opt.key;
    let cardStyle = '';
    let statusBadge = '';

    if (isReviewMode) {
      if (opt.key === correctAns) {
        cardStyle = 'border: 2px solid #1E6B37; background: #e8f5e9;';
        statusBadge = '<span style="margin-left:auto; color:#1E6B37; font-weight:800; font-size:11px;">✓ CORRECT</span>';
      } else if (isSelected && opt.key !== correctAns) {
        cardStyle = 'border: 2px solid #c5493b; background: #fde8e5;';
        statusBadge = '<span style="margin-left:auto; color:#c5493b; font-weight:800; font-size:11px;">✕ YOUR ANSWER</span>';
      }
    }

    return `
      <div class="option-clay-card ${isSelected ? 'selected' : ''}" 
           style="${cardStyle}"
           onclick="${isReviewMode ? '' : `toggleAnswerOption('${q.id}', '${opt.key}')`}">
        <span class="opt-prefix">(${opt.key})</span>
        <span class="opt-text-val">${opt.text}</span>
        ${statusBadge}
      </div>
    `;
  }).join('');

  let solutionBox = '';
  if (isReviewMode) {
    let explanationText = q.hint || '';
    const matchedOpt = (q.options || []).find(o => o.key === correctAns);
    if (!explanationText && matchedOpt && matchedOpt.feedback) {
      explanationText = matchedOpt.feedback;
    }

    solutionBox = `
      <div style="margin-top: 24px; padding: 16px 18px; border-radius: 20px; background: var(--surface-card); box-shadow: var(--matte-extruded-sm); border-left: 5px solid var(--plum-primary);">
        <div style="font-weight: 800; font-size: 13.5px; color: var(--plum-primary); margin-bottom: 8px;">Detailed Solution & Rationale</div>
        <div style="font-size: 13.5px; line-height: 1.6; color: var(--text-main);">${explanationText ? explanationText.replace(/\n/g, '<br>') : 'No extended explanation provided for this question.'}</div>
      </div>
    `;
  }

  document.getElementById('qContainer').innerHTML = `
    <div class="q-body-text">${(q.intro || '').replace(/\n/g, '<br>')}</div>
    ${statementsHtml}
    ${instructionHtml}
    <div class="options-column">${optionsHtml}</div>
    ${solutionBox}
  `;

  const bmBtn = document.getElementById('bookmarkToggleBtn');
  if (bmBtn) {
    if (reviews.has(q.id)) bmBtn.classList.add('active');
    else bmBtn.classList.remove('active');
  }

  renderHorizontalPalette();
  scrollActiveBubbleIntoView();
}

function toggleAnswerOption(qId, key) {
  if (isReviewMode) return;
  if (userResponses[qId] === key) delete userResponses[qId];
  else userResponses[qId] = key;
  renderQuestion(currentIdx);
}

function toggleCurrentBookmark() {
  if (isReviewMode) return;
  const q = currentQuestions[currentIdx];
  if (!q) return;
  if (reviews.has(q.id)) reviews.delete(q.id);
  else reviews.add(q.id);
  renderQuestion(currentIdx);
}

function renderHorizontalPalette() {
  const track = document.getElementById('paletteTrack');
  if (!track) return;

  track.innerHTML = currentQuestions.map((q, idx) => {
    const isCur = idx === currentIdx;
    const userAns = userResponses[q.id];
    const correctAns = q.correct ? q.correct.toUpperCase() : null;

    let cls = '';
    let inlineStyle = '';

    if (isReviewMode) {
      if (!userAns) {
        cls = '';
      } else if (userAns === correctAns) {
        inlineStyle = 'background: #1E6B37; color: #fff;';
      } else {
        inlineStyle = 'background: #c5493b; color: #fff;';
      }
    } else {
      if (Boolean(userAns)) cls = 'answered';
      else if (reviews.has(q.id)) cls = 'reviewed';
    }

    if (isCur) cls += ' current';

    return `
      <button class="bubble-btn ${cls}" style="${inlineStyle}" id="bubble_q_${idx}" onclick="renderQuestion(${idx})">
        ${idx + 1}
      </button>
    `;
  }).join('');
}

function scrollActiveBubbleIntoView() {
  const activeBubble = document.getElementById(`bubble_q_${currentIdx}`);
  if (activeBubble) {
    activeBubble.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

let touchStartX = 0, touchStartY = 0;

function initTouchSwipe() {
  const swipeArea = document.getElementById('touchSwipeArea');
  if (!swipeArea) return;

  swipeArea.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  swipeArea.addEventListener('touchend', (e) => {
    const diffX = e.changedTouches[0].screenX - touchStartX;
    const diffY = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(diffY) > Math.abs(diffX)) return;

    const threshold = 55;
    if (diffX < -threshold) {
      if (currentIdx < currentQuestions.length - 1) renderQuestion(currentIdx + 1);
    } else if (diffX > threshold) {
      if (currentIdx > 0) renderQuestion(currentIdx - 1);
    } else if (diffX > threshold) {
      if (currentIdx > 0) renderQuestion(currentIdx - 1);
    }
  }, { passive: true });
}

// Testbook Submission & Analysis Output
function submitTest() {
  if (timerRef) clearInterval(timerRef);
  let correct = 0, incorrect = 0, unattempted = 0;
  currentTestSolutions = [];

  const posWeight = activeTest ? (activeTest.posMark ?? 2.0) : 2.0;
  const negWeight = activeTest ? (activeTest.negMark ?? 0.66) : 0.66;

  currentQuestions.forEach((q, idx) => {
    const userAns = userResponses[q.id];
    const correctAns = q.correct ? q.correct.toUpperCase() : null;

    let filterType = '';
    let statusCls = '';
    let statusText = '';
    let shortSnippet = q.intro ? q.intro.slice(0, 75) + '...' : 'Question ' + (idx + 1);

    if (!userAns) {
      unattempted++;
      filterType = 'skipped';
      statusCls = '';
      statusText = `Skipped • Correct: (${correctAns || 'N/A'})`;
    } else if (correctAns && userAns === correctAns) {
      correct++;
      filterType = 'correct';
      statusCls = 'correct';
      statusText = `Correct (+${posWeight}) • Marked: (${userAns})`;
    } else if (correctAns && userAns !== correctAns) {
      incorrect++;
      filterType = 'incorrect';
      statusCls = 'incorrect';
      statusText = `Incorrect (-${negWeight}) • Marked: (${userAns}) | Correct: (${correctAns})`;
    } else {
      filterType = 'skipped';
      statusCls = '';
      statusText = `Marked: (${userAns})`;
    }

    currentTestSolutions.push({
      type: filterType,
      index: idx,
      html: `
        <div class="sol-card ${statusCls}" style="cursor: pointer; transition: transform 0.15s ease;" onclick="jumpToQuestionReview(${idx})">
          <div class="sol-card-header">
            <span>Q${idx + 1}</span>
            <span style="font-size: 11px; font-weight: 700;">${statusText}</span>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-top: 4px;">${shortSnippet}</div>
          <div style="font-size: 11px; color: var(--plum-primary); font-weight: 800; margin-top: 6px;">Tap to view full solution in test view →</div>
        </div>
      `
    });
  });

  const totalScore = (correct * posWeight) - (incorrect * negWeight);
  const totalAttempted = correct + incorrect;
  const accuracyPercent = totalAttempted > 0 ? Math.round((correct / totalAttempted) * 100) : 0;

  testHistory.push({
    title: activeTest ? activeTest.title : "Practice Test",
    topic: activeTest ? activeTest.topic : "General",
    score: totalScore,
    correct: correct,
    incorrect: incorrect,
    date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  });
  localStorage.setItem(STORAGE_TEST_HISTORY, JSON.stringify(testHistory));

  document.getElementById('analysisTestTitle').innerText = activeTest ? activeTest.title : "Practice Test";
  document.getElementById('res-score').innerText = totalScore.toFixed(2);
  document.getElementById('res-accuracy-percent').innerText = `${accuracyPercent}%`;
  document.getElementById('res-unattempted').innerText = unattempted;

  filterSolutions('all');
  switchPage('page-analysis');
}

function jumpToQuestionReview(qIndex) {
  isReviewMode = true;
  document.getElementById('examHeaderActionBtn').innerText = "ANALYSIS";
  document.getElementById('examHeaderActionBtn').onclick = () => switchPage('page-analysis');
  document.getElementById('timer-box').style.display = 'none';

  switchPage('page-test');
  renderQuestion(qIndex);
}

function filterSolutions(filterType) {
  const container = document.getElementById('solutions-container');
  if (!container) return;

  const tabs = ['all', 'correct', 'incorrect', 'skipped'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabFilter${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) {
      if (t === filterType) {
        btn.style.boxShadow = 'var(--matte-sunken)';
        btn.style.fontWeight = '800';
      } else {
        btn.style.boxShadow = 'var(--matte-extruded-sm)';
        btn.style.fontWeight = '600';
      }
    }
  });

  const filtered = filterType === 'all' 
    ? currentTestSolutions 
    : currentTestSolutions.filter(item => item.type === filterType);

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 30px; color: var(--text-muted); font-size: 13px;">No questions in this category.</div>`;
  } else {
    container.innerHTML = filtered.map(item => item.html).join('');
  }
}
