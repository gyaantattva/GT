/* =========================================================
   GYAAN TATTVA - UNIFIED MASTER JAVASCRIPT ENGINE (Part 1/5)
   Session Management, Routing, Loader Dismiss & Safe State
========================================================= */

const STORAGE_USER_NAME = 'gt_user_profile_name';
const STORAGE_USER_PWD = 'gt_user_profile_password';
const STORAGE_AUTH_SESSION = 'gt_student_logged_in_session';
const STORAGE_USER_ROLE = 'gt_current_user_role';
const STORAGE_ADMIN_MASTER_PWD = 'gt_admin_master_password_key';
const STORAGE_TEST_HISTORY = 'gt_test_history_records';
const STORAGE_SAVED_NOTES = 'gt_saved_exam_notes';
const ONE_DAY_MS = 86400000;

function dismissGlobalLoader() {
  const loader = document.getElementById('app-global-loader');
  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => { loader.style.display = 'none'; }, 550);
  }
}

function getAdminMasterPassword() {
  return localStorage.getItem(STORAGE_ADMIN_MASTER_PWD) || '';
}

function updateAdminMasterPassword() {
  const newPwd = document.getElementById('newMasterAdminPwdInput').value.trim();
  if (!newPwd) return alert("Please enter new master password.");
  localStorage.setItem(STORAGE_ADMIN_MASTER_PWD, newPwd);
  document.getElementById('newMasterAdminPwdInput').value = '';
  alert("Master Admin Password updated successfully!");
}

let pendingAdminAction = 'landing';

function openAdminPasswordModal(action) {
  pendingAdminAction = action;
  const currentMaster = getAdminMasterPassword();
  const verifyForm = document.getElementById('adminVerifyForm');
  const createForm = document.getElementById('adminCreateForm');
  const modalTitle = document.getElementById('adminModalDynamicTitle');
  const modalDesc = document.getElementById('adminModalDynamicDesc');

  if (!currentMaster) {
    if (modalTitle) modalTitle.textContent = "Set Admin Password";
    if (modalDesc) modalDesc.textContent = "Create master password for first-time setup";
    if (verifyForm) verifyForm.style.display = 'none';
    if (createForm) { createForm.style.display = 'flex'; createForm.reset(); }
  } else {
    if (modalTitle) modalTitle.textContent = "Admin Verification";
    if (modalDesc) modalDesc.textContent = "Enter master password to continue";
    if (createForm) createForm.style.display = 'none';
    if (verifyForm) { verifyForm.style.display = 'flex'; verifyForm.reset(); }
  }

  document.getElementById('adminPasswordModal').classList.add('open');
  pushModalState('adminPasswordModal');
}

function closeAdminPasswordModal() {
  document.getElementById('adminPasswordModal').classList.remove('open');
}

function handleFirstTimeAdminCreate(event) {
  event.preventDefault();
  const p1 = document.getElementById('adminSetupPwd1').value.trim();
  const p2 = document.getElementById('adminSetupPwd2').value.trim();

  if (!p1 || !p2) return alert("Please fill both password fields.");
  if (p1 !== p2) return alert("Passwords do not match. Re-enter correctly.");

  localStorage.setItem(STORAGE_ADMIN_MASTER_PWD, p1);
  alert("Master Admin Password successfully created!");
  closeAdminPasswordModal();

  if (pendingAdminAction === 'landing') {
    localStorage.setItem(STORAGE_AUTH_SESSION, 'true');
    localStorage.setItem(STORAGE_USER_ROLE, 'admin');
    localStorage.setItem(STORAGE_USER_NAME, 'Administrator');
    updateRoleUI();
    switchPage('page-directory');
  } else {
    openAdminModal();
  }
}

function handleAdminPasswordVerify(event) {
  event.preventDefault();
  const entered = document.getElementById('adminMasterPwdInput').value.trim();
  const master = getAdminMasterPassword();

  if (entered !== master) return alert("Incorrect Master Admin Password.");

  closeAdminPasswordModal();

  if (pendingAdminAction === 'landing') {
    localStorage.setItem(STORAGE_AUTH_SESSION, 'true');
    localStorage.setItem(STORAGE_USER_ROLE, 'admin');
    localStorage.setItem(STORAGE_USER_NAME, 'Administrator');
    updateRoleUI();
    switchPage('page-directory');
  } else {
    openAdminModal();
  }
}

function handleGearClick() {
  const role = localStorage.getItem(STORAGE_USER_ROLE);
  if (role === 'admin') openAdminModal();
  else openAdminPasswordModal('settings');
}

function updateRoleUI() {
  const role = localStorage.getItem(STORAGE_USER_ROLE);
  const badge = document.getElementById('adminRoleBadge');
  if (badge) badge.style.display = role === 'admin' ? 'inline-block' : 'none';
}

function togglePasswordVisibility(inputId) {
  const inp = document.getElementById(inputId);
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}

function handleStudentAuth(event) {
  event.preventDefault();
  const u = document.getElementById('authUsernameInput').value.trim();
  const p = document.getElementById('authPasswordInput').value.trim();
  if (!u || !p) return alert("Please enter Name and Password.");

  const savedUser = localStorage.getItem(STORAGE_USER_NAME) || '';
  const savedPwd = localStorage.getItem(STORAGE_USER_PWD) || '';

  if (savedUser && savedPwd && u === savedUser && p !== savedPwd) {
    return alert("Incorrect Password for this student.");
  }

  localStorage.setItem(STORAGE_AUTH_SESSION, 'true');
  localStorage.setItem(STORAGE_USER_ROLE, 'student');
  localStorage.setItem(STORAGE_USER_NAME, u);
  updateRoleUI();
  switchPage('page-directory');
}

function handleStudentSignUp() {
  const u = document.getElementById('authUsernameInput').value.trim();
  const p = document.getElementById('authPasswordInput').value.trim();
  if (!u || !p) return alert("Enter Name and Password to Register.");

  localStorage.setItem(STORAGE_USER_NAME, u);
  localStorage.setItem(STORAGE_USER_PWD, p);
  localStorage.setItem(STORAGE_AUTH_SESSION, 'true');
  localStorage.setItem(STORAGE_USER_ROLE, 'student');
  updateRoleUI();
  alert(`Account created for ${u}! Welcome.`);
  switchPage('page-directory');
}

function handleForgotPasswordNotice() {
  alert("Default Password for Demo is '1234' or tap 'Sign up' to set your credentials.");
}

function handleUserSignOut() {
  if (confirm("Do you want to sign out?")) {
    localStorage.removeItem(STORAGE_AUTH_SESSION);
    localStorage.removeItem(STORAGE_USER_ROLE);
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.remove('open');
    updateRoleUI();
    switchPage('page-auth');
  }
}

function purgeExpiredHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_TEST_HISTORY);
    if (!raw) return [];
    const list = JSON.parse(raw) || [];
    const now = Date.now();
    const freshList = list.filter(item => item.timestamp && (now - item.timestamp) < ONE_DAY_MS);
    localStorage.setItem(STORAGE_TEST_HISTORY, JSON.stringify(freshList));
    return freshList;
  } catch (e) { return []; }
}

function getSavedNotes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_SAVED_NOTES)) || []; } catch (e) { return []; }
}

function showToast(msg) {
  const existing = document.querySelector('.gt-toast-msg');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'gt-toast-msg';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { if (toast) toast.remove(); }, 1800);
}

function pushNavigationState(stateObj) { window.history.pushState(stateObj, ''); }
function pushModalState(modalId) { window.history.pushState({ type: 'modal', id: modalId }, ''); }

window.addEventListener('popstate', () => {
  const pagePath = document.getElementById('page-path');
  if (pagePath && pagePath.classList.contains('active')) { handlePathBackAction(); return; }

  const tbGridDrawer = document.getElementById('tbGridDrawer');
  if (tbGridDrawer && tbGridDrawer.classList.contains('open')) { closeTestbookGridDrawer(); return; }

  const tbConfirm = document.getElementById('tbConfirmModal');
  if (tbConfirm && tbConfirm.classList.contains('open')) { closeTestbookConfirmModal(); return; }

  const tbReattempt = document.getElementById('tbReattemptChoiceModal');
  if (tbReattempt && tbReattempt.classList.contains('open')) { closeReattemptModal(); return; }

  const testSheet = document.getElementById('testSheet');
  if (testSheet && testSheet.classList.contains('open')) { closeTestSheet(); return; }

  const taskDrawer = document.getElementById('taskDrawer');
  if (taskDrawer && taskDrawer.classList.contains('open')) { taskDrawer.classList.remove('open'); return; }

  const newTaskModal = document.getElementById('newTaskModal');
  if (newTaskModal && newTaskModal.classList.contains('open')) { newTaskModal.classList.remove('open'); return; }

  const adminModal = document.getElementById('adminModal');
  if (adminModal && adminModal.classList.contains('open')) { closeAdminModal(); return; }

  const adminPwdModal = document.getElementById('adminPasswordModal');
  if (adminPwdModal && adminPwdModal.classList.contains('open')) { closeAdminPasswordModal(); return; }

  const profileModal = document.getElementById('profileModal');
  if (profileModal && profileModal.classList.contains('open')) { profileModal.classList.remove('open'); return; }

  const pageTest = document.getElementById('page-test');
  if (pageTest && pageTest.classList.contains('active')) { handleExamExit(); return; }

  const pageAnalysis = document.getElementById('page-analysis');
  if (pageAnalysis && pageAnalysis.classList.contains('active')) { switchPage('page-directory'); switchView('view-home'); return; }

  const activePanel = document.querySelector('.view-panel.active');
  if (activePanel) {
    if (activePanel.id === 'view-test-format') {
      if (currentSelectionContext.parent === 'science') switchView('view-science-branches');
      else switchView('view-tests');
      return;
    }
    if (activePanel.id === 'view-science-branches') { switchView('view-tests'); return; }
    if (activePanel.id === 'view-tests' || activePanel.id === 'view-notes') { switchView('view-home'); return; }
    if (activePanel.id === 'view-home') {
      const now = Date.now();
      if (now - lastBackPressTime < 2000) window.history.back();
      else {
        lastBackPressTime = now;
        showToast("Press back again to exit");
        window.history.pushState({ type: 'home_guard' }, '');
      }
      return;
    }
  }
});

function handleNavigationBack() { window.history.back(); }
/* =========================================================
   GYAAN TATTVA - UNIFIED MASTER JAVASCRIPT ENGINE (Part 2/5)
   Calendar Operations, Tasks, Notes & Navigation Views
========================================================= */

const IDB_CONFIG = { name: 'GyaanTattvaOfflineDB', store: 'tests_catalog', version: 1 };
let allTests = [];
let testHistory = purgeExpiredHistory();
let currentTestSolutions = [];
let isReviewMode = false;
let currentExamLanguage = 'hi';
const gtTranslationCache = {};

let activeTab = 'home', activeTest = null, currentQuestions = [], userResponses = {}, reviews = new Set(), seenQuestions = new Set(), currentIdx = 0, timeLeft = 120 * 60, timerRef = null;
let questionTimeSpent = {}, questionTimerRef = null, currentNotesFilter = 'All';

const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let today = new Date(), selectedDate = new Date(), currentViewDate = new Date(), calendarMode = 'weekly', studyTasks = {}, lastBackPressTime = 0;

try { studyTasks = JSON.parse(localStorage.getItem('gyaan_study_tasks')) || {}; } catch (e) { studyTasks = {}; }
let currentSelectionContext = { parent: 'subjects', selectedName: '' };

function getIDBInstance() {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(IDB_CONFIG.name, IDB_CONFIG.version);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_CONFIG.store)) db.createObjectStore(IDB_CONFIG.store, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadAllLocalTests() {
  const db = await getIDBInstance();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_CONFIG.store, 'readonly'), store = tx.objectStore(IDB_CONFIG.store), req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function saveLocalTest(testObj) {
  const db = await getIDBInstance();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_CONFIG.store, 'readwrite'), store = tx.objectStore(IDB_CONFIG.store);
    store.put(testObj);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function removeLocalTest(id) {
  const db = await getIDBInstance();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_CONFIG.store, 'readwrite'), store = tx.objectStore(IDB_CONFIG.store);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearLocalDatabase() {
  const db = await getIDBInstance();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_CONFIG.store, 'readwrite'), store = tx.objectStore(IDB_CONFIG.store);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function syncCloudTests() {
  if (typeof window.db === 'undefined') return;
  try {
    const snapshot = await window.db.collection("exam_papers").get();
    if (!snapshot.empty) {
      for (const doc of snapshot.docs) await saveLocalTest({ id: doc.id, ...doc.data() });
      allTests = await loadAllLocalTests();
    }
  } catch (err) { console.warn("Cloud sync deferred:", err.message); }
}

function switchPage(pageId) {
  document.querySelectorAll('.view-page').forEach(page => { page.classList.remove('active'); page.style.display = 'none'; });
  const target = document.getElementById(pageId);
  if (target) { target.classList.add('active'); target.style.display = 'flex'; }
  if (pageId === 'page-directory') {
    if (timerRef) clearInterval(timerRef);
    if (questionTimerRef) clearInterval(questionTimerRef);
    isReviewMode = false;
    loadUserProfile();
    renderNotesTab();
    switchView('view-home');
  }
}

function switchView(viewId) {
  document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (viewId === 'view-notes') renderNotesTab();
    pushNavigationState({ type: 'view', view: viewId });
  }
}

function saveRunningExamSession() {
  if (!activeTest || isReviewMode) return;
  const examState = {
    testId: activeTest.id,
    userResponses: userResponses,
    reviews: Array.from(reviews),
    seenQuestions: Array.from(seenQuestions),
    currentIdx: currentIdx,
    timeLeft: timeLeft,
    questionTimeSpent: questionTimeSpent,
    examLang: currentExamLanguage
  };
  localStorage.setItem('gt_active_exam_state', JSON.stringify(examState));
}

function clearRunningExamSession() {
  localStorage.removeItem('gt_active_exam_state');
}

function handleExamExit() {
  if (isReviewMode) switchPage('page-analysis');
  else {
    if (confirm("Exit test session? Unsaved progress will be lost.")) {
      clearRunningExamSession();
      if (timerRef) clearInterval(timerRef);
      if (questionTimerRef) clearInterval(questionTimerRef);
      switchPage('page-directory');
      switchView('view-tests');
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);
  closeTestSheet();

  allTests = (await loadAllLocalTests()) || [];
  const isLoggedIn = localStorage.getItem(STORAGE_AUTH_SESSION) === 'true';
  updateRoleUI();

  // AUTOMATIC RESTORE RUNNING EXAM ON REFRESH
  const savedSessionRaw = localStorage.getItem('gt_active_exam_state');
  if (savedSessionRaw && isLoggedIn) {
    try {
      const saved = JSON.parse(savedSessionRaw);
      const targetTest = allTests.find(t => t.id === saved.testId);
      if (targetTest) {
        activeTest = targetTest;
        currentQuestions = targetTest.questions || [];
        userResponses = saved.userResponses || {};
        reviews = new Set(saved.reviews || []);
        seenQuestions = new Set(saved.seenQuestions || []);
        currentIdx = saved.currentIdx || 0;
        timeLeft = saved.timeLeft || 120 * 60;
        questionTimeSpent = saved.questionTimeSpent || {};
        currentExamLanguage = saved.examLang || 'hi';

        document.getElementById('badgeMarkPos').innerText = `+${activeTest.posMark ?? 2.0}`;
        document.getElementById('badgeMarkNeg').innerText = activeTest.negMark > 0 ? `-${activeTest.negMark}` : '0.0';
        document.getElementById('active-test-title').innerText = activeTest.title;
        document.getElementById('timer-box').style.display = 'inline';

        switchPage('page-test');
        await renderQuestion(currentIdx);
        renderHorizontalPalette();
        startTimer();
        setTimeout(dismissGlobalLoader, 500);
        return;
      }
    } catch (e) {
      localStorage.removeItem('gt_active_exam_state');
    }
  }

  if (isLoggedIn) switchPage('page-directory');
  else switchPage('page-auth');

  loadUserProfile();
  renderNotesTab();
  setTimeout(() => { renderCalendar(); }, 50);
  syncCloudTests().catch(() => {});
  setTimeout(dismissGlobalLoader, 650);

  document.querySelectorAll('.dock-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');
      if (tab === 'profile') {
        const modal = $('profileModal');
        if (modal) { modal.classList.add('open'); pushModalState('profileModal'); }
        return;
      }
      document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      if (tab === 'home') switchView('view-home');
      else if (tab === 'tests') switchView('view-tests');
      else switchView(`view-${tab}`);
    });
  });

  const btnWeekly = $('btnWeekly'), btnMonthly = $('btnMonthly');
  if (btnWeekly && btnMonthly) {
    btnWeekly.addEventListener('click', () => { calendarMode = 'weekly'; btnWeekly.classList.add('active'); btnMonthly.classList.remove('active'); renderCalendar(); });
    btnMonthly.addEventListener('click', () => { calendarMode = 'monthly'; btnMonthly.classList.add('active'); btnWeekly.classList.remove('active'); renderCalendar(); });
  }

  const calPrevBtn = $('calPrevBtn'), calNextBtn = $('calNextBtn'), calTodayBtn = $('calTodayBtn');
  if (calPrevBtn) calPrevBtn.addEventListener('click', () => { if (calendarMode === 'weekly') currentViewDate.setDate(currentViewDate.getDate() - 7); else currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendar(); });
  if (calNextBtn) calNextBtn.addEventListener('click', () => { if (calendarMode === 'weekly') currentViewDate.setDate(currentViewDate.getDate() + 7); else currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendar(); });
  if (calTodayBtn) calTodayBtn.addEventListener('click', () => { today = new Date(); selectedDate = new Date(); currentViewDate = new Date(); renderCalendar(); });

  const closeProfileModal = $('closeProfileModal'), profileModal = $('profileModal');
  if (closeProfileModal && profileModal) {
    closeProfileModal.addEventListener('click', () => profileModal.classList.remove('open'));
    profileModal.addEventListener('click', (e) => { if (e.target === profileModal) profileModal.classList.remove('open'); });
  }

  const taskDrawer = $('taskDrawer'), openDrawerTriggerBtn = $('openDrawerTriggerBtn'), closeDrawerBtn = $('closeDrawerBtn');
  const quickAddTargetBtn = $('quickAddTargetBtn'), newTaskModal = $('newTaskModal'), closeTaskModalBtn = $('closeTaskModalBtn'), btnOpenNewTargetForm = $('btnOpenNewTargetForm');

  if (openDrawerTriggerBtn) openDrawerTriggerBtn.addEventListener('click', () => { renderTasksForDate(selectedDate); if (taskDrawer) { taskDrawer.classList.add('open'); pushModalState('taskDrawer'); } });
  if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', () => { if (taskDrawer) taskDrawer.classList.remove('open'); });
  if (quickAddTargetBtn && newTaskModal) quickAddTargetBtn.addEventListener('click', () => { $('modalTargetDateDesc').textContent = `Set focus for ${monthsList[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`; newTaskModal.classList.add('open'); pushModalState('newTaskModal'); });
  if (btnOpenNewTargetForm && newTaskModal) btnOpenNewTargetForm.addEventListener('click', () => { $('modalTargetDateDesc').textContent = `Set focus for ${monthsList[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`; newTaskModal.classList.add('open'); pushModalState('newTaskModal'); });
  if (closeTaskModalBtn && newTaskModal) closeTaskModalBtn.addEventListener('click', () => newTaskModal.classList.remove('open'));

  const newTaskForm = $('newTaskForm');
  if (newTaskForm) {
    newTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const subject = $('taskSubjectSelect').value, topic = $('taskTopicInput').value, time = $('taskTimeInput').value, key = getDateKey(selectedDate);
      if (!studyTasks[key]) studyTasks[key] = [];
      studyTasks[key].push({ id: 'task_' + Date.now(), subject, topic, time, completed: false });
      try { localStorage.setItem('gyaan_study_tasks', JSON.stringify(studyTasks)); } catch(err){}
      if (newTaskModal) newTaskModal.classList.remove('open');
      newTaskForm.reset();
      renderTasksForDate(selectedDate);
      renderCalendar();
      showToast("✓ Target added successfully!");
    });
  }

  const brandLogo = $('brandLogo');
  if (brandLogo) brandLogo.addEventListener('click', () => {
    document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));
    const homeDock = document.querySelector('.dock-item[data-tab="home"]');
    if (homeDock) homeDock.classList.add('active');
    switchView('view-home');
  });

  document.querySelectorAll('.topic-card').forEach(card => {
    card.addEventListener('click', () => {
      const subject = card.getAttribute('data-subject'), isScience = card.getAttribute('data-is-science') === 'true';
      if (isScience) { currentSelectionContext.parent = 'subjects'; switchView('view-science-branches'); }
      else { currentSelectionContext.parent = 'subjects'; currentSelectionContext.selectedName = subject; $('selectedModuleTitle').textContent = subject; $('formatBackLabel').textContent = 'Back to Subjects'; switchView('view-test-format'); }
    });
  });

  document.querySelectorAll('.branch-card').forEach(branch => {
    branch.addEventListener('click', () => {
      const branchName = branch.getAttribute('data-branch');
      currentSelectionContext.parent = 'science'; currentSelectionContext.selectedName = branchName; $('selectedModuleTitle').textContent = `Science: ${branchName}`; $('formatBackLabel').textContent = 'Back to Branches'; switchView('view-test-format');
    });
  });

  const btnChapterWise = $('btnChapterWise'), btnFullTest = $('btnFullTest');
  if (btnChapterWise) btnChapterWise.addEventListener('click', () => openTestSheet(currentSelectionContext.selectedName, 'chapter'));
  if (btnFullTest) btnFullTest.addEventListener('click', () => openTestSheet(currentSelectionContext.selectedName, 'full'));

  initTouchSwipe();
});

function getDateKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function isSameDay(d1, d2) { return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate(); }

function updateHeaderDisplays() {
  const calMonthEl = document.getElementById('calMonth'), calDateEl = document.getElementById('calDate'), calYearEl = document.getElementById('calYear'), selectedDateLabel = document.getElementById('selectedDateLabel');
  if (calMonthEl) calMonthEl.textContent = monthsList[currentViewDate.getMonth()];
  if (calDateEl) calDateEl.textContent = selectedDate.getDate();
  if (calYearEl) calYearEl.textContent = currentViewDate.getFullYear();
  if (selectedDateLabel) selectedDateLabel.textContent = `Target for ${monthsList[selectedDate.getMonth()].slice(0, 3)} ${selectedDate.getDate()}...`;
}

function renderWeeklyView() {
  const weekStrip = document.getElementById('weekStripContainer');
  if (!weekStrip) return;
  weekStrip.innerHTML = '';
  const startOfWeek = new Date(currentViewDate);
  startOfWeek.setDate(currentViewDate.getDate() - currentViewDate.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const col = document.createElement('div');
    col.className = 'cal-day-col';
    if (isSameDay(d, selectedDate)) col.classList.add('active');
    if (isSameDay(d, today)) col.classList.add('is-today');
    col.innerHTML = `<span class="d-label">${dayLabels[d.getDay()]}</span><span class="d-val">${d.getDate()}</span>`;
    col.addEventListener('click', () => { selectedDate = new Date(d); currentViewDate = new Date(d); updateHeaderDisplays(); renderWeeklyView(); });
    weekStrip.appendChild(col);
  }
}

function renderMonthlyView() {
  const monthDays = document.getElementById('monthDaysContainer');
  if (!monthDays) return;
  monthDays.innerHTML = '';
  const year = currentViewDate.getFullYear(), month = currentViewDate.getMonth(), firstDayIndex = new Date(year, month, 1).getDay(), totalDays = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDayIndex; i++) { const blank = document.createElement('div'); blank.className = 'cal-month-cell empty'; monthDays.appendChild(blank); }
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day), cell = document.createElement('div');
    cell.className = 'cal-month-cell'; cell.textContent = day;
    if (isSameDay(d, selectedDate)) cell.classList.add('active');
    if (isSameDay(d, today)) cell.classList.add('is-today');
    const key = getDateKey(d);
    if (studyTasks[key] && studyTasks[key].length > 0) { const dot = document.createElement('span'); dot.className = 'has-target-dot'; cell.appendChild(dot); }
    cell.addEventListener('click', () => { selectedDate = new Date(d); updateHeaderDisplays(); renderMonthlyView(); });
    monthDays.appendChild(cell);
  }
}

function renderCalendar() {
  updateHeaderDisplays();
  const weekStrip = document.getElementById('weekStripContainer'), monthGrid = document.getElementById('monthGridWrapper');
  if (calendarMode === 'weekly') { if (weekStrip) weekStrip.style.display = 'grid'; if (monthGrid) monthGrid.style.display = 'none'; renderWeeklyView(); }
  else { if (weekStrip) weekStrip.style.display = 'none'; if (monthGrid) monthGrid.style.display = 'block'; renderMonthlyView(); }
}

function renderTasksForDate(date) {
  const list = document.getElementById('taskTimelineList'), badge = document.getElementById('taskCompletionCount');
  if (!list) return;
  const key = getDateKey(date);
  list.innerHTML = '';
  const tasks = studyTasks[key] || [];
  if (tasks.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: var(--sky-dark-muted); padding: 28px 0; font-size: 13.5px; font-weight: 600;">No study targets set for this date.</div>`;
    if (badge) badge.textContent = `0/0 Completed`;
    return;
  }
  let completedCount = 0;
  tasks.forEach((t, idx) => {
    if (t.completed) completedCount++;
    const row = document.createElement('div');
    row.className = 'timeline-row';
    row.innerHTML = `
      <div class="timeline-card ${t.completed ? 'completed' : ''}">
        <div class="t-card-top-row">
          <span class="t-card-time">${t.time}</span>
          <span class="badge-tag">${t.subject}</span>
        </div>
        <h4 class="t-card-topic">${t.topic}</h4>
        <div class="t-card-actions-row">
          <button class="task-pillar-btn ${t.completed ? 'is-done' : ''}" data-key="${key}" data-idx="${idx}">
            ${t.completed ? '✓ Completed' : 'Mark Complete'}
          </button>
          <button class="task-delete-icon-btn" title="Delete Task" onclick="deleteStudyTask('${key}', ${idx})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>
    `;
    list.appendChild(row);
  });
  if (badge) badge.textContent = `${completedCount}/${tasks.length} Completed`;
  list.querySelectorAll('.task-pillar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.getAttribute('data-key'), i = parseInt(btn.getAttribute('data-idx'), 10);
      if (studyTasks[k] && studyTasks[k][i]) {
        studyTasks[k][i].completed = !studyTasks[k][i].completed;
        try { localStorage.setItem('gyaan_study_tasks', JSON.stringify(studyTasks)); } catch(e){}
        renderTasksForDate(selectedDate); renderCalendar();
      }
    });
  });
}

function deleteStudyTask(key, idx) {
  if (confirm("Remove this target?")) {
    if (studyTasks[key]) {
      studyTasks[key].splice(idx, 1);
      if (studyTasks[key].length === 0) delete studyTasks[key];
      try { localStorage.setItem('gyaan_study_tasks', JSON.stringify(studyTasks)); } catch(e){}
      renderTasksForDate(selectedDate);
      renderCalendar();
      showToast("Target removed.");
    }
  }
}

function loadUserProfile() {
  const storedName = localStorage.getItem(STORAGE_USER_NAME), inputEl = document.getElementById('profileNameInput');
  if (inputEl && storedName) inputEl.value = storedName;
}

function saveUserProfile() {
  const nameInput = document.getElementById('profileNameInput'), currentPwdInput = document.getElementById('profileCurrentPwd'), newPwdInput = document.getElementById('profileNewPwd');
  const valName = nameInput ? nameInput.value.trim() : '', currentPwd = currentPwdInput ? currentPwdInput.value.trim() : '', newPwd = newPwdInput ? newPwdInput.value.trim() : '';
  if (!valName) return alert("Please enter student name.");
  localStorage.setItem(STORAGE_USER_NAME, valName);
  if (newPwd) {
    const existingPwd = localStorage.getItem(STORAGE_USER_PWD) || '';
    if (existingPwd && existingPwd !== currentPwd) return alert("Current password incorrect.");
    localStorage.setItem(STORAGE_USER_PWD, newPwd);
    alert("Profile and password updated!");
  } else alert(`Profile updated as "${valName}"!`);
  const modal = document.getElementById('profileModal');
  if (modal) modal.classList.remove('open');
}

function setNotesFilter(subject) {
  currentNotesFilter = subject;
  document.querySelectorAll('.notes-filter-strip .filter-pill').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === subject.toLowerCase());
  });
  renderNotesTab();
}

function saveCurrentQuestionToNotes() {
  if (!currentQuestions || !currentQuestions[currentIdx]) return;
  const q = currentQuestions[currentIdx];
  let notes = getSavedNotes();
  const existsIndex = notes.findIndex(n => n.id === q.id), btn = document.getElementById('btnSaveToNotes'), txt = document.getElementById('saveNoteBtnText');
  if (existsIndex >= 0) {
    notes.splice(existsIndex, 1);
    if (btn) btn.classList.remove('saved');
    if (txt) txt.textContent = "Save to Notes";
    showToast("Removed from Notes");
  } else {
    notes.push({ id: q.id, testTitle: activeTest ? activeTest.title : "Practice Test", topic: activeTest ? activeTest.topic : "General", intro: q.intro, statements: q.statements, matchTable: q.matchTable || null, table: q.table || null, options: q.options, correct: q.correct, hint: q.hint, timestamp: Date.now() });
    if (btn) btn.classList.add('saved');
    if (txt) txt.textContent = "✓ Saved in Notes";
    showToast("✓ Question Saved to Notes!");
  }
  localStorage.setItem(STORAGE_SAVED_NOTES, JSON.stringify(notes));
  renderNotesTab();
}

function updateSaveNoteButtonState() {
  if (!currentQuestions || !currentQuestions[currentIdx]) return;
  const q = currentQuestions[currentIdx], notes = getSavedNotes(), isSaved = notes.some(n => n.id === q.id);
  const btn = document.getElementById('btnSaveToNotes'), txt = document.getElementById('saveNoteBtnText'), indicator = document.getElementById('qCurrentIndicator');
  if (indicator) indicator.textContent = `Question ${currentIdx + 1} of ${currentQuestions.length}`;
  if (btn && txt) {
    if (isSaved) { btn.classList.add('saved'); txt.textContent = "✓ Saved in Notes"; }
    else { btn.classList.remove('saved'); txt.textContent = "Save to Notes"; }
  }
}

function renderNotesTab() {
  const container = document.getElementById('savedNotesContainer'), countEl = document.getElementById('notesCountSubtitle');
  if (!container) return;
  const notes = getSavedNotes(), filteredNotes = currentNotesFilter === 'All' ? notes : notes.filter(n => (n.topic || '').toLowerCase() === currentNotesFilter.toLowerCase());
  if (countEl) countEl.textContent = `${filteredNotes.length} Saved Questions`;
  if (filteredNotes.length === 0) {
    container.innerHTML = `<div class="empty-state" style="min-height: 250px;"><p style="color:var(--sky-dark-muted);">No questions saved under <strong>${currentNotesFilter}</strong>.</p></div>`;
    return;
  }
  container.innerHTML = filteredNotes.map(item => `
    <div class="quote-card" style="text-align: left; padding: 16px; margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;"><span class="badge-tag">${item.topic || 'Subject'}</span><button class="back-pill-btn" style="padding: 4px 10px; font-size: 11px; color: #dc2626;" onclick="deleteSavedNote('${item.id}')">Remove</button></div>
      <div style="font-size: 14px; font-weight: 700; color: var(--sky-dark); line-height: 1.5;">${item.intro}</div>
      ${renderQuestionStatementsOrTable(item, true)}
      <div style="margin-top: 10px; font-size: 12.5px; color: #0284C7; font-weight: 800;">Correct: (${item.correct || 'N/A'})</div>
      ${item.hint ? `<div style="font-size: 12px; color: var(--sky-dark-muted); margin-top: 6px;">${item.hint}</div>` : ''}
    </div>
  `).join('');
}

function deleteSavedNote(qId) {
  let notes = getSavedNotes().filter(n => n.id !== qId);
  localStorage.setItem(STORAGE_SAVED_NOTES, JSON.stringify(notes));
  renderNotesTab();
}
/* =========================================================
   GYAAN TATTVA - UNIFIED MASTER JAVASCRIPT ENGINE (Part 3/5)
   Master Syllabus, Winding Highway & Deletion Actions
========================================================= */

const DEFAULT_PRELOADED_SYLLABUS = [
  {
    subject: "Polity",
    topics: [
      {
        id: "pol_top_1",
        title: "Historical Background & Constitutional Evolution",
        subtopics: [
          { id: "st_1", name: "Regulating Act 1773 & Pitt's India Act 1784" },
          { id: "st_2", name: "Charter Acts (1793, 1813, 1833, 1853)" },
          { id: "st_3", name: "Govt of India Acts 1858, 1909, 1919 & 1935" }
        ]
      },
      {
        id: "pol_top_2",
        title: "Constituent Assembly & Preamble",
        subtopics: [
          { id: "st_4", name: "Constituent Assembly Formation, Debates & Committees" },
          { id: "st_5", name: "Preamble Features, Significance & Landmark Cases" }
        ]
      },
      {
        id: "pol_top_3",
        title: "Fundamental Rights, DPSP & Duties",
        subtopics: [
          { id: "st_6", name: "Citizenship & Article 12-35 Fundamental Rights" },
          { id: "st_7", name: "DPSP, Fundamental Duties & FR vs DPSP Doctrine" }
        ]
      },
      {
        id: "pol_top_4",
        title: "Basic Structure & Amendments",
        subtopics: [
          { id: "st_8", name: "Amendment Procedure & Key Amendments" },
          { id: "st_9", name: "Basic Structure Doctrine & Kesavananda Bharati Case" }
        ]
      },
      {
        id: "pol_top_5",
        title: "Federalism & Centre-State Relations",
        subtopics: [
          { id: "st_10", name: "Legislative, Administrative & Financial Relations" },
          { id: "st_11", name: "Local Governance: 73rd & 74th Amendments (PRI & ULBs)" },
          { id: "st_12", name: "Inter-State Relations, River Disputes & Article 356" }
        ]
      },
      {
        id: "pol_top_6",
        title: "Union & State Organs: Executive, Legislature & Judiciary",
        subtopics: [
          { id: "st_13", name: "President, Governor, Prime Minister & Council of Ministers" },
          { id: "st_14", name: "Parliament: Structure, Budget, Committees & Privileges" },
          { id: "st_15", name: "Judiciary: Supreme Court, High Courts, Collegium & NJAC" }
        ]
      }
    ]
  },
  {
    subject: "Economics",
    topics: [
      {
        id: "eco_top_1",
        title: "Sectors of Economy & Post-Independence Development",
        subtopics: [
          { id: "st_16", name: "Sectors of Economy & Pre-Independence Backdrop" },
          { id: "st_17", name: "Five Year Plans, Green Revolution & 1991 LPG Reforms" },
          { id: "st_18", name: "Poverty, Unemployment & Jobless Growth" }
        ]
      },
      {
        id: "eco_top_2",
        title: "Macroeconomics, National Income & Inflation",
        subtopics: [
          { id: "st_19", name: "Demand-Supply Concepts, Stock-Flow & National Income" },
          { id: "st_20", name: "Inflation Types, Deflation & Monetary Policy Interface" }
        ]
      },
      {
        id: "eco_top_3",
        title: "Budgeting, Public Finance & Taxation",
        subtopics: [
          { id: "st_21", name: "Government Budgeting, Fiscal Consolidation & Deficits" },
          { id: "st_22", name: "Taxation Architecture, Direct/Indirect Taxes & GST" }
        ]
      },
      {
        id: "eco_top_4",
        title: "Monetary Policy & Indian Banking",
        subtopics: [
          { id: "st_23", name: "Monetary Policy Committee & Quantitative/Qualitative Tools" },
          { id: "st_24", name: "Banking Architecture, NPAs, IBC Code, CAR & Basel Accords" }
        ]
      }
    ]
  },
  {
    subject: "Geography",
    topics: [
      {
        id: "geo_top_1",
        title: "Geomorphology & Earth Dynamics",
        subtopics: [
          { id: "st_25", name: "Solar System, Latitudes, Longitudes & Time Zones" },
          { id: "st_26", name: "Continental Drift Theory & Plate Tectonics" },
          { id: "st_27", name: "Earthquakes, Volcanoes, Rocks & Landforms" }
        ]
      },
      {
        id: "geo_top_2",
        title: "Climatology & Weather Systems",
        subtopics: [
          { id: "st_28", name: "Atmospheric Layers, Heat Budget & Pressure Belts" },
          { id: "st_29", name: "Precipitation, Cyclones, Fronts & Urban Climates" }
        ]
      },
      {
        id: "geo_top_3",
        title: "Oceanography",
        subtopics: [
          { id: "st_30", name: "Ocean Relief, Salinity, Density & Temperature" },
          { id: "st_31", name: "Ocean Currents, Tides, Coral Reefs & Coral Bleaching" }
        ]
      },
      {
        id: "geo_top_4",
        title: "Indian Geography & Monsoon Dynamics",
        subtopics: [
          { id: "st_32", name: "Physiographic Divisions: Himalayas, Plains & Plateaus" },
          { id: "st_33", name: "Indian Drainage: Major River Systems & Basins" },
          { id: "st_34", name: "Mechanism of Indian Monsoon, El Nino & La Nina" }
        ]
      }
    ]
  },
  {
    subject: "History",
    topics: [
      {
        id: "his_top_1",
        title: "Ancient India & Art & Culture",
        subtopics: [
          { id: "st_35", name: "Prehistoric Period & Indus Valley Civilization" },
          { id: "st_36", name: "Vedic Civilization, Mahajanapadas, Jainism & Buddhism" },
          { id: "st_37", name: "Mauryan Empire, Post-Mauryan & Gupta Age" }
        ]
      },
      {
        id: "his_top_2",
        title: "Medieval India",
        subtopics: [
          { id: "st_38", name: "Delhi Sultanate, Bhakti & Sufi Movements" },
          { id: "st_39", name: "Vijayanagara Empire, Bahamani Kingdom & Mughals" }
        ]
      },
      {
        id: "his_top_3",
        title: "Modern History & Freedom Struggle",
        subtopics: [
          { id: "st_40", name: "1857 Revolt, Socio-Religious Reform Movements" },
          { id: "st_41", name: "Early Nationalism, Moderates, Extremists & Surat Split" },
          { id: "st_42", name: "Gandhian Phase: Non-Cooperation, CDM & Quit India" }
        ]
      }
    ]
  },
  {
    subject: "Environment",
    topics: [
      {
        id: "env_top_1",
        title: "Ecology & Biodiversity",
        subtopics: [
          { id: "st_43", name: "Ecology Levels, Energy Flow, Trophic Levels & Succession" },
          { id: "st_44", name: "Biodiversity Hotspots & Protected Area Networks" }
        ]
      },
      {
        id: "env_top_2",
        title: "Climate Change & Conventions",
        subtopics: [
          { id: "st_45", name: "Global Warming, Greenhouse Gases & IPCC Reports" },
          { id: "st_46", name: "UNFCCC, Paris Agreement, COP Summits & Ramsar Sites" }
        ]
      }
    ]
  },
  {
    subject: "Science & Tech",
    topics: [
      {
        id: "st_top_1",
        title: "Contemporary Technologies",
        subtopics: [
          { id: "st_47", name: "Space Tech: Orbits, Launch Vehicles & Gaganyaan Mission" },
          { id: "st_48", name: "Defense Tech: Missiles, Submarines & Nuclear Triad" },
          { id: "st_49", name: "Biotechnology: CRISPR, Genome Editing & DNA Technology" }
        ]
      }
    ]
  }
];

const ROAD_THEME_PALETTE = [
  { color: '#F8B133', stem: '#E59A1A', icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
  { color: '#56B949', stem: '#3F9B33', icon: '<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
  { color: '#E02B6D', stem: '#BA1752', icon: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
  { color: '#2788D9', stem: '#1B6BB3', icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
  { color: '#8E44AD', stem: '#71368A', icon: '<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/>' },
  { color: '#00A896', stem: '#028074', icon: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/>' }
];

let activePathSubject = null;

function getCurrentStudentUser() {
  return localStorage.getItem(STORAGE_USER_NAME) || 'GuestStudent';
}

function getUserSyllabusKey() {
  return `gt_path_syllabus_${getCurrentStudentUser()}`;
}

function getUserProgressKey() {
  return `gt_path_progress_${getCurrentStudentUser()}`;
}

function loadUserSyllabusData() {
  try {
    const raw = localStorage.getItem(getUserSyllabusKey());
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_PRELOADED_SYLLABUS));
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_PRELOADED_SYLLABUS));
  }
}

function saveUserSyllabusData(data) {
  localStorage.setItem(getUserSyllabusKey(), JSON.stringify(data));
}

function loadUserCheckedSubtopics() {
  try {
    const raw = localStorage.getItem(getUserProgressKey());
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveUserCheckedSubtopics(checkedMap) {
  localStorage.setItem(getUserProgressKey(), JSON.stringify(checkedMap));
}

function openPathSyllabusView() {
  document.getElementById('pathCurrentUserName').innerText = getCurrentStudentUser();
  document.getElementById('pathLevelSubjects').style.display = 'block';
  document.getElementById('pathLevelTopics').style.display = 'none';
  document.getElementById('pathBackBtnText').innerText = 'Back to Dashboard';
  renderPathSubjectsCanvas();
  switchPage('page-path');
  pushNavigationState({ type: 'page', page: 'page-path' });
}

function handlePathBackAction() {
  const topicsView = document.getElementById('pathLevelTopics');
  if (topicsView && topicsView.style.display !== 'none') {
    topicsView.style.display = 'none';
    document.getElementById('pathLevelSubjects').style.display = 'block';
    document.getElementById('pathBackBtnText').innerText = 'Back to Dashboard';
    renderPathSubjectsCanvas();
  } else {
    switchPage('page-directory');
  }
}

function renderPathSubjectsCanvas() {
  const container = document.getElementById('pathSubjectsContainer');
  if (!container) return;
  const syllabus = loadUserSyllabusData();
  const checkedMap = loadUserCheckedSubtopics();

  const totalItems = syllabus.length;
  const rowStepHeight = 110;
  const roadHeight = totalItems * rowStepHeight;

  let svgPathD = `M 80 40 `;
  for (let i = 0; i < totalItems; i++) {
    const y = 40 + (i * rowStepHeight);
    const targetX = (i % 2 === 0) ? 80 : 320;
    const nextY = y + rowStepHeight;
    const nextTargetX = ((i + 1) % 2 === 0) ? 80 : 320;
    svgPathD += `C ${targetX} ${y + 55}, ${nextTargetX} ${y + 55}, ${nextTargetX} ${nextY} `;
  }

  const svgRoadHtml = `
    <svg class="path-road-svg-bg" viewBox="0 0 400 ${roadHeight + 40}" preserveAspectRatio="none">
      <path d="${svgPathD}" fill="none" stroke="#D7DBE2" stroke-width="36" stroke-linecap="round" stroke-linejoin="round" />
      <path d="${svgPathD}" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-dasharray="10 10" stroke-linecap="round" />
    </svg>
  `;

  const rowsHtml = syllabus.map((sub, idx) => {
    let totalSubs = 0, completedSubs = 0;
    (sub.topics || []).forEach(t => {
      (t.subtopics || []).forEach(st => {
        totalSubs++;
        if (checkedMap[st.id]) completedSubs++;
      });
    });

    const isLeft = (idx % 2 === 0);
    const theme = ROAD_THEME_PALETTE[idx % ROAD_THEME_PALETTE.length];

    return `
      <div class="milestone-track-row ${isLeft ? 'side-left' : 'side-right'}" onclick="openSubjectTopicDrillDown('${sub.subject}')">
        <div class="milestone-pin-anchor">
          <div class="milestone-circle-badge" style="background: ${theme.color};">
            <div class="milestone-inner-icon-slot">
              <svg viewBox="0 0 24 24" fill="none" stroke="${theme.color}" stroke-width="2.2">${theme.icon}</svg>
            </div>
          </div>
          <div class="milestone-pin-stem" style="background: ${theme.stem};"></div>
          <div class="milestone-pin-shadow"></div>
        </div>

        <div class="milestone-info-card" style="border-bottom: 3.5px solid ${theme.color}; position: relative;">
          <button class="milestone-del-btn" title="Delete Subject" onclick="deletePathSubject(event, '${sub.subject}')">✕</button>
          <div class="mic-stage-label" style="color: ${theme.color};">
            <span class="mic-stage-arrow"></span>
            <span>STAGE 0${idx + 1}</span>
          </div>
          <div class="mic-subject-title">${sub.subject}</div>
          <div class="mic-subtext">${(sub.topics || []).length} Topics</div>
          <div class="mic-progress-pill">${completedSubs}/${totalSubs} Done</div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = svgRoadHtml + rowsHtml;
}

function deletePathSubject(event, subjectName) {
  event.stopPropagation();
  if (confirm(`Delete subject "${subjectName}" and all its roadmap topics?`)) {
    let syllabus = loadUserSyllabusData();
    syllabus = syllabus.filter(s => s.subject !== subjectName);
    saveUserSyllabusData(syllabus);
    renderPathSubjectsCanvas();
    showToast(`✓ Removed ${subjectName}`);
  }
}

function openSubjectTopicDrillDown(subjectName) {
  activePathSubject = subjectName;
  document.getElementById('pathLevelSubjects').style.display = 'none';
  document.getElementById('pathLevelTopics').style.display = 'block';
  document.getElementById('pathBackBtnText').innerText = 'Back to Milestones';
  document.getElementById('selectedSubjectTitle').innerText = subjectName;

  renderSubjectTopicsList();
}

function renderSubjectTopicsList() {
  const container = document.getElementById('topicsAccordionContainer');
  if (!container) return;

  const syllabus = loadUserSyllabusData();
  const currentSub = syllabus.find(s => s.subject === activePathSubject);
  if (!currentSub) return;

  const checkedMap = loadUserCheckedSubtopics();
  let totalSubs = 0, completedSubs = 0;

  container.innerHTML = (currentSub.topics || []).map((topic, tIdx) => {
    let tTotal = 0, tDone = 0;
    const subHtml = (topic.subtopics || []).map(st => {
      tTotal++; totalSubs++;
      const isDone = !!checkedMap[st.id];
      if (isDone) { tDone++; completedSubs++; }

      return `
        <div class="subtopic-item-row ${isDone ? 'completed' : ''}" onclick="toggleSubtopicStatus('${st.id}')">
          <div class="subtopic-left">
            <div class="subtopic-checkbox">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span class="subtopic-label">${st.name}</span>
          </div>
          <button class="topic-item-del-btn" title="Delete Subtopic" onclick="deleteRoadmapSubtopic(event, '${topic.id}', '${st.id}')">✕</button>
        </div>
      `;
    }).join('');

    return `
      <div class="topic-accordion-card open" id="tac_card_${tIdx}">
        <div class="tac-header" onclick="toggleTopicAccordion(${tIdx})">
          <span class="tac-title">${topic.title}</span>
          <div class="tac-meta">
            <span class="tac-count">${tDone}/${tTotal}</span>
            <button class="topic-item-del-btn" style="color:#DC2626; font-size:13px;" title="Delete Topic" onclick="deleteRoadmapTopic(event, '${topic.id}')">✕</button>
            <div class="tac-chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
        </div>
        <div class="tac-subtopics-tray">
          ${subHtml}
        </div>
      </div>
    `;
  }).join('');

  const pct = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;
  document.getElementById('selectedSubjectProgressText').innerText = `${completedSubs}/${totalSubs} Completed (${pct}%)`;
  document.getElementById('selectedSubjectProgressBar').style.width = `${pct}%`;
}

function toggleTopicAccordion(idx) {
  const card = document.getElementById(`tac_card_${idx}`);
  if (card) card.classList.toggle('open');
}

function toggleSubtopicStatus(stId) {
  const checkedMap = loadUserCheckedSubtopics();
  if (checkedMap[stId]) delete checkedMap[stId];
  else checkedMap[stId] = true;
  saveUserCheckedSubtopics(checkedMap);
  renderSubjectTopicsList();
}

function openAddSubjectPrompt() {
  const name = prompt("Enter new Subject / Module title (e.g. Ethics, Internal Security):");
  if (!name || !name.trim()) return;
  const syllabus = loadUserSyllabusData();
  syllabus.push({
    subject: name.trim(),
    topics: []
  });
  saveUserSyllabusData(syllabus);
  renderPathSubjectsCanvas();
  showToast("✓ Added new subject!");
}

function openAddTopicPrompt() {
  if (!activePathSubject) return;
  const title = prompt(`Add a new Topic under ${activePathSubject}:`);
  if (!title || !title.trim()) return;

  const syllabus = loadUserSyllabusData();
  const sub = syllabus.find(s => s.subject === activePathSubject);
  if (sub) {
    const newTopicId = `custom_top_${Date.now()}`;
    const firstSubName = prompt("Add first Sub-topic / Chapter item for this topic:") || "Chapter Core Concepts";
    sub.topics.push({
      id: newTopicId,
      title: title.trim(),
      subtopics: [
        { id: `st_cust_${Date.now()}`, name: firstSubName.trim() }
      ]
    });
    saveUserSyllabusData(syllabus);
    renderSubjectTopicsList();
    showToast("✓ Topic added!");
  }
}

function deleteRoadmapTopic(event, topicId) {
  event.stopPropagation();
  if (confirm("Delete this entire topic and all its chapters?")) {
    const syllabus = loadUserSyllabusData();
    const currentSub = syllabus.find(s => s.subject === activePathSubject);
    if (currentSub) {
      currentSub.topics = currentSub.topics.filter(t => t.id !== topicId);
      saveUserSyllabusData(syllabus);
      renderSubjectTopicsList();
      showToast("Topic deleted");
    }
  }
}

function deleteRoadmapSubtopic(event, topicId, subtopicId) {
  event.stopPropagation();
  const syllabus = loadUserSyllabusData();
  const currentSub = syllabus.find(s => s.subject === activePathSubject);
  if (currentSub) {
    const targetTopic = currentSub.topics.find(t => t.id === topicId);
    if (targetTopic) {
      targetTopic.subtopics = targetTopic.subtopics.filter(st => st.id !== subtopicId);
      saveUserSyllabusData(syllabus);
      renderSubjectTopicsList();
      showToast("Chapter removed");
    }
  }
}
/* =========================================================
   GYAAN TATTVA - UNIFIED MASTER JAVASCRIPT ENGINE (Part 4/5)
   Test Paper Openers, Universal Parsers & Admin Uploader
========================================================= */

function openTestSheet(topic, formatType = 'all') {
  const backdrop = document.getElementById('sheetBackdrop'),
        drawer = document.getElementById('testSheet'),
        container = document.getElementById('sheetTestsContainer');
  
  const typeLabel = formatType === 'chapter' ? 'Chapter Wise' : (formatType === 'full' ? 'Full Length' : '');
  document.getElementById('sheetBadge').innerText = typeLabel ? `${topic} • ${typeLabel}` : topic;
  document.getElementById('sheetTitle').innerText = `${topic} Papers`;

  const cleanTarget = (topic || '').trim().toLowerCase();
  
  const filtered = allTests.filter(t => {
    const curTopic = (t.topic || '').trim().toLowerCase();
    const matchesTopic = curTopic === cleanTarget || curTopic.includes(cleanTarget) || cleanTarget.includes(curTopic);
    if (formatType !== 'all') {
      const curFormat = t.formatType || 'full';
      return matchesTopic && curFormat === formatType;
    }
    return matchesTopic;
  });

  const currentHistory = purgeExpiredHistory();

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state" style="min-height: 200px;"><p style="color:var(--sky-dark-muted);">No ${typeLabel} test papers found under <strong>${topic}</strong>.</p></div>`;
  } else {
    container.innerHTML = filtered.map(t => {
      const hasAttempted = currentHistory.some(h => h.title === t.title || h.testId === t.id);

      let actionButtons = '';
      if (hasAttempted) {
        actionButtons = `
          <button class="cal-event-btn" style="padding: 6px 12px; font-size: 11.5px; background: var(--matte-blue-dark); color: #fff;" onclick="openReattemptFromSheet('${t.id}')">Re-attempt</button>
          <button class="back-pill-btn" style="padding: 6px 12px; font-size: 11.5px;" onclick="openAnalysisFromSheet('${t.id}')">Analysis</button>
        `;
      } else {
        actionButtons = `
          <button class="cal-event-btn" onclick="startSpecificTest('${t.id}')">Start</button>
        `;
      }

      return `
        <div class="topic-card" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:15px; font-weight:700; color:var(--sky-dark);">${t.title}</div>
            <div style="font-size:12px; color:var(--sky-dark-muted); margin-top:4px;">
              ${(t.questions || []).length} Qs &bull; +${t.posMark ?? 2.0} / -${t.negMark ?? 0.66}
              ${hasAttempted ? '<span style="color:#589D78; font-weight:800; margin-left:6px;">• Attempted</span>' : ''}
            </div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            ${actionButtons}
            <button class="back-pill-btn" style="padding:6px 10px; color:#dc2626;" onclick="deleteTest('${t.id}')">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }
  backdrop.classList.add('open');
  drawer.classList.add('open');
  pushModalState('testSheet');
}

function openReattemptFromSheet(testId) {
  closeTestSheet();
  startSpecificTest(testId);
}

function openAnalysisFromSheet(testId) {
  closeTestSheet();
  const test = allTests.find(t => t.id === testId);
  if (test) {
    activeTest = test;
    currentQuestions = test.questions || [];
  }
  switchPage('page-analysis');
  pushNavigationState({ type: 'page', page: 'page-analysis' });
}

function closeTestSheet() {
  const backdrop = document.getElementById('sheetBackdrop'), drawer = document.getElementById('testSheet');
  if (backdrop) backdrop.classList.remove('open');
  if (drawer) drawer.classList.remove('open');
}

function toggleAdminScienceBranches() {
  const sel = document.getElementById('adminTopicSelect'), branchDiv = document.getElementById('adminScienceBranchField');
  if (sel && branchDiv) branchDiv.style.display = sel.value === 'Science & tech' ? 'flex' : 'none';
}

function openAdminModal() {
  const el = document.getElementById('adminModal');
  if (el) { el.classList.add('open'); pushModalState('adminModal'); }
  toggleAdminScienceBranches();
}

function closeAdminModal() {
  const el = document.getElementById('adminModal');
  if (el) el.classList.remove('open');
}

function handleJsonFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      JSON.parse(e.target.result);
      document.getElementById('adminJsonInput').value = e.target.result;
      alert("JSON File Loaded! Now tap 'Save to Portal'.");
    } catch (err) { alert("Invalid JSON: " + err.message); event.target.value = ''; }
  };
  reader.readAsText(file);
}

function cleanTextVal(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function splitRawQuestionText(rawText) {
  if (!rawText || typeof rawText !== 'string') return { intro: '', statements: [], instruction: '' };

  const matchPoints = rawText.match(/(?:^|\s|\n)(1\.\s+[\s\S]+?)(?=(?:\s|\n)(?:Which of the|Select the|Who among the|In the light of|In how many)|$)/i);
  
  if (matchPoints) {
    const fullStatementsBlock = matchPoints[1].trim();
    const introPart = rawText.substring(0, rawText.indexOf(fullStatementsBlock)).trim();
    const afterPart = rawText.substring(rawText.indexOf(fullStatementsBlock) + fullStatementsBlock.length).trim();

    const pointsList = fullStatementsBlock
      .split(/(?=(?:^|\s|\n)\d+\.\s+)/)
      .map(s => s.trim())
      .filter(Boolean);

    if (pointsList.length >= 2) {
      return {
        intro: introPart,
        statements: pointsList,
        instruction: afterPart
      };
    }
  }

  return {
    intro: rawText.trim(),
    statements: [],
    instruction: ''
  };
}

function extractUniversalOptions(rawQ) {
  const normalized = [];
  const rawOpts = rawQ.options || rawQ.choices || rawQ.answers || rawQ.opts || null;

  if (rawOpts && typeof rawOpts === 'object' && !Array.isArray(rawOpts)) {
    const keys = Object.keys(rawOpts);
    keys.forEach((k, idx) => {
      let optKey = String(k).trim().toUpperCase();
      if (/^[1-9]$/.test(optKey)) optKey = String.fromCharCode(64 + parseInt(optKey));
      if (!/^[A-Z]$/.test(optKey)) optKey = String.fromCharCode(65 + idx);
      normalized.push({
        key: optKey,
        text: cleanTextVal(rawOpts[k]),
        hi: null
      });
    });
    return normalized;
  }

  if (Array.isArray(rawOpts) && rawOpts.length > 0) {
    rawOpts.forEach((opt, idx) => {
      let fallbackKey = String.fromCharCode(65 + idx);
      if (typeof opt === 'object' && opt !== null) {
        let explicitKey = opt.key || opt.option || opt.label || null;
        if (!explicitKey && opt.id !== undefined) {
          explicitKey = !isNaN(opt.id) ? String.fromCharCode(64 + parseInt(opt.id)) : String(opt.id);
        }
        let finalKey = explicitKey ? String(explicitKey).trim().toUpperCase() : fallbackKey;
        if (/^[1-9]$/.test(finalKey)) finalKey = String.fromCharCode(64 + parseInt(finalKey));
        let optText = opt.text || opt.title || opt.val || opt.value || opt.option_text || opt.label || '';
        normalized.push({ key: finalKey, text: cleanTextVal(optText), hi: opt.hi || null });
      } else {
        normalized.push({ key: fallbackKey, text: cleanTextVal(opt), hi: null });
      }
    });
    return normalized;
  }

  const alphabet = ['A', 'B', 'C', 'D', 'E'];
  alphabet.forEach((char, idx) => {
    const possibleKeys = [char, char.toLowerCase(), `opt_${char.toLowerCase()}`, `option_${char.toLowerCase()}`, `opt${idx + 1}`, `option${idx + 1}`];
    for (let k of possibleKeys) {
      if (rawQ[k] !== undefined) {
        normalized.push({ key: char, text: cleanTextVal(rawQ[k]), hi: null });
        break;
      }
    }
  });

  return normalized;
}

function extractUniversalAnswer(rawQ) {
  const possibleAnsKeys = [
    'correct_answer', 'correct_option', 'correct', 'answer', 'ans',
    'right_answer', 'correctAnswer', 'correctOption', 'right_option', 'key'
  ];

  let rawAns = null;
  for (let k of possibleAnsKeys) {
    if (rawQ[k] !== undefined && rawQ[k] !== null) {
      rawAns = rawQ[k];
      break;
    }
  }

  if (rawAns === null && Array.isArray(rawQ.correctValues) && rawQ.correctValues.length > 0) {
    rawAns = rawQ.correctValues[0];
  }

  if (rawAns === null || rawAns === undefined) return '';

  let str = String(rawAns).trim().toUpperCase();
  if (/^[1-9]$/.test(str)) return String.fromCharCode(64 + parseInt(str));
  const match = str.match(/[A-E]/i);
  return match ? match[0].toUpperCase() : str.charAt(0);
}

function extractUniversalMatchTable(rawQ) {
  if (rawQ.table && rawQ.table.rows) {
    return {
      headers: rawQ.table.headers || [],
      rows: rawQ.table.rows
    };
  }

  const list1Obj = rawQ.list_I || rawQ.list_1 || rawQ.list1 || rawQ.column_1 || rawQ.table_left || null;
  const list2Obj = rawQ.list_II || rawQ.list_2 || rawQ.list2 || rawQ.column_2 || rawQ.table_right || null;

  if (list1Obj && list2Obj && typeof list1Obj === 'object' && typeof list2Obj === 'object') {
    const keys1 = Object.keys(list1Obj);
    const keys2 = Object.keys(list2Obj);
    const maxLen = Math.max(keys1.length, keys2.length);
    const rows = [];
    for (let i = 0; i < maxLen; i++) {
      const k1 = keys1[i];
      const k2 = keys2[i];
      rows.push({
        item1: k1 ? `${k1}. ${list1Obj[k1]}` : '',
        item2: k2 ? `${k2}. ${list2Obj[k2]}` : ''
      });
    }
    return {
      col1Header: rawQ.list_I_heading || rawQ.list_1_heading || "List I",
      col2Header: rawQ.list_II_heading || rawQ.list_2_heading || "List II",
      rows: rows
    };
  }

  if (rawQ.matchTable && rawQ.matchTable.rows) return rawQ.matchTable;

  const statements = rawQ.statements || [];
  if (Array.isArray(statements) && statements.length >= 2) {
    const s1 = statements.find(s => /list\s*i\b/i.test(s));
    const s2 = statements.find(s => /list\s*ii\b/i.test(s));
    if (s1 && s2) {
      const header1 = (s1.match(/(List\s*I[^:]*):/i) || [])[1] || "List I";
      const header2 = (s2.match(/(List\s*II[^:]*):/i) || [])[1] || "List II";
      const raw1 = s1.substring(s1.indexOf(':') + 1).split(/[;•\n]+/).map(s => s.trim()).filter(Boolean);
      const raw2 = s2.substring(s2.indexOf(':') + 1).split(/[;•\n]+/).map(s => s.trim()).filter(Boolean);
      const maxLen = Math.max(raw1.length, raw2.length);
      const rows = [];
      for (let i = 0; i < maxLen; i++) {
        rows.push({ item1: raw1[i] || '', item2: raw2[i] || '' });
      }
      return { col1Header: header1.trim(), col2Header: header2.trim(), rows: rows };
    }
  }

  return null;
}

function normalizeQuestionPayload(rawQuestion, index) {
  const qId = rawQuestion.id || (rawQuestion.question_number ? `q${rawQuestion.question_number}` : `q${index + 1}`);
  let rawText = rawQuestion.question || rawQuestion.intro || rawQuestion.problem || rawQuestion.title || rawQuestion.q || '';
  
  let hint = rawQuestion.explanation || rawQuestion.hint || rawQuestion.solution || 
             rawQuestion.exp || rawQuestion.rationale || rawQuestion.desc || '';

  const options = extractUniversalOptions(rawQuestion);
  const correct = extractUniversalAnswer(rawQuestion);
  const matchTable = extractUniversalMatchTable(rawQuestion);

  let statements = rawQuestion.statements || [];
  let instruction = cleanTextVal(rawQuestion.instruction || rawQuestion.instruction_text || '');
  let intro = cleanTextVal(rawText);

  if (!statements || statements.length === 0) {
    const parsed = splitRawQuestionText(rawText);
    if (parsed.statements.length > 0) {
      intro = parsed.intro;
      statements = parsed.statements;
      instruction = parsed.instruction || instruction;
    }
  }

  return {
    id: String(qId),
    intro: intro,
    statements: Array.isArray(statements) ? statements : [statements],
    matchTable: matchTable,
    table: rawQuestion.table || null,
    instruction: rawQuestion.list_I ? '' : instruction,
    options: options,
    correct: correct,
    hint: cleanTextVal(hint),
    hi: rawQuestion.hi || null
  };
}

async function adminImportTest() {
  const titleInput = document.getElementById('adminTestTitle').value.trim();
  let topic = document.getElementById('adminTopicSelect').value;
  if (topic === 'Science & tech') topic = document.getElementById('adminScienceBranchSelect').value;
  
  const formatType = document.getElementById('adminTestTypeSelect')?.value || 'full';
  const raw = document.getElementById('adminJsonInput').value.trim();
  const posMark = parseFloat(document.getElementById('adminPosMark').value) || 2.0;
  const negMark = parseFloat(document.getElementById('adminNegMark').value) || 0.0;

  if (!raw) return alert("JSON Payload cannot be empty.");

  try {
    const data = JSON.parse(raw);
    let questionsRaw = [];

    if (Array.isArray(data)) questionsRaw = data;
    else if (Array.isArray(data.questions)) questionsRaw = data.questions;
    else if (Array.isArray(data.paper)) questionsRaw = data.paper;
    else if (Array.isArray(data.data)) questionsRaw = data.data;
    else if (Array.isArray(data.items)) questionsRaw = data.items;
    else if (typeof data === 'object' && data !== null) {
      if (data.question || data.intro || data.id || data.question_number || data.list_I) questionsRaw = [data];
    }

    if (!questionsRaw || questionsRaw.length === 0) return alert("Invalid structure: No questions found.");

    let derivedTitle = titleInput;
    if (!derivedTitle && data.test_metadata) {
      derivedTitle = `${data.test_metadata.institute || ''} ${data.test_metadata.series || ''} ${data.test_metadata.title || ''}`.trim();
    }
    if (!derivedTitle) derivedTitle = data.title || `${topic} Practice Set`;

    const parsedQuestions = questionsRaw.map((q, idx) => normalizeQuestionPayload(q, idx));

    const testRecord = {
      id: "test_" + Date.now().toString().slice(-6),
      title: derivedTitle,
      topic: topic,
      formatType: formatType,
      posMark: posMark,
      negMark: negMark,
      questions: parsedQuestions,
      createdAt: new Date().toISOString()
    };

    await saveLocalTest(testRecord);
    allTests = await loadAllLocalTests();

    if (typeof window.db !== 'undefined') {
      window.db.collection("exam_papers").doc(testRecord.id).set(testRecord).catch(e => console.warn(e));
    }

    closeAdminModal();
    openTestSheet(topic, formatType);
    alert(`Successfully loaded ${parsedQuestions.length} questions for "${testRecord.title}"!`);

  } catch (err) {
    alert("JSON Parsing Failed: " + err.message);
  }
}

async function clearAllData() {
  if (confirm("Reset everything? All tests wiped.")) {
    allTests = []; testHistory = []; await clearLocalDatabase();
    localStorage.removeItem(STORAGE_TEST_HISTORY);
    clearRunningExamSession();
    closeAdminModal(); closeTestSheet(); alert("Portal reset complete.");
  }
}

async function deleteTest(id) {
  if (confirm("Delete this test?")) {
    await removeLocalTest(id); allTests = await loadAllLocalTests();
    if (typeof window.db !== 'undefined') window.db.collection("exam_papers").doc(id).delete().catch(e => console.warn(e));
    closeTestSheet();
  }
}
/* =========================================================
   GYAAN TATTVA - UNIFIED MASTER JAVASCRIPT ENGINE (Part 5/5)
   Exam Engine, Auto-Translation, Timer & Safe Analysis Engine
========================================================= */

async function batchTranslateTexts(textArray, targetLang) {
  if (targetLang === 'en') return textArray;
  const toTranslateIndices = [], results = [...textArray];
  textArray.forEach((txt, idx) => {
    if (!txt || typeof txt !== 'string' || txt.trim() === '') { results[idx] = txt; return; }
    const cacheKey = `${targetLang}_${txt.trim()}`;
    if (gtTranslationCache[cacheKey]) results[idx] = gtTranslationCache[cacheKey];
    else toTranslateIndices.push(idx);
  });
  if (toTranslateIndices.length === 0) return results;
  const combinedPayload = toTranslateIndices.map(i => textArray[i].trim()).join(' ||| ');
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(combinedPayload)}`);
    const json = await res.json(), parts = json[0].map(item => item[0]).join('').split(/\s*\|\|\s*\|\s*|\s*\|\|\s*/).map(s => s.trim());
    toTranslateIndices.forEach((origIdx, i) => {
      const transText = parts[i] || textArray[origIdx];
      results[origIdx] = transText;
      gtTranslationCache[`${targetLang}_${textArray[origIdx].trim()}`] = transText;
    });
  } catch (err) { console.warn(err); }
  return results;
}

async function prepareQuestionLanguage(q, lang) {
  if (!q || lang === 'en' || q.hiTranslatedData || q.hi) return;
  const stList = Array.isArray(q.statements) ? q.statements : [];
  const pack = [
    q.intro || '', 
    q.instruction || '', 
    ...stList, 
    ...(q.options || []).map(o => o.text || '')
  ];
  const translated = await batchTranslateTexts(pack, lang);
  const stCount = stList.length;
  
  q.hiTranslatedData = { 
    intro: translated[0] || q.intro, 
    instruction: translated[1] || q.instruction, 
    statements: translated.slice(2, 2 + stCount), 
    options: (q.options || []).map((opt, i) => ({ 
      ...opt, 
      translatedText: translated[2 + stCount + i] || opt.text 
    })) 
  };
}

function startSpecificTest(id) {
  activeTest = allTests.find(t => t.id === id);
  if (!activeTest) return;
  closeTestSheet();
  isReviewMode = false;
  currentQuestions = activeTest.questions || [];
  userResponses = {}; reviews.clear(); seenQuestions.clear(); questionTimeSpent = {};
  currentIdx = 0; timeLeft = 120 * 60;
  document.getElementById('badgeMarkPos').innerText = `+${activeTest.posMark ?? 2.0}`;
  document.getElementById('badgeMarkNeg').innerText = activeTest.negMark > 0 ? `-${activeTest.negMark}` : '0.0';
  document.getElementById('active-test-title').innerText = activeTest.title;
  document.getElementById('timer-box').style.display = 'inline';
  setExamLanguage('hi');
  switchPage('page-test');
  pushNavigationState({ type: 'page', page: 'page-test' });
  renderQuestion(currentIdx);
  renderHorizontalPalette();
  saveRunningExamSession();
  startTimer();
}

function startTimer() {
  if (timerRef) clearInterval(timerRef);
  if (questionTimerRef) clearInterval(questionTimerRef);
  updateTimerUI();
  timerRef = setInterval(() => {
    if (timeLeft <= 0) { clearInterval(timerRef); clearInterval(questionTimerRef); alert("Time expired!"); executeFinalSubmission(); return; }
    timeLeft--;
    if (timeLeft % 5 === 0) saveRunningExamSession();
    updateTimerUI();
  }, 1000);
  questionTimerRef = setInterval(() => {
    if (isReviewMode) return;
    const currentQ = currentQuestions[currentIdx];
    if (currentQ) questionTimeSpent[currentQ.id] = (questionTimeSpent[currentQ.id] || 0) + 1;
  }, 1000);
}

function updateTimerUI() {
  const h = String(Math.floor(timeLeft / 3600)).padStart(2, '0'), m = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0'), s = String(timeLeft % 60).padStart(2, '0');
  const box = document.getElementById('timer-box');
  if (box) box.innerText = `${h}:${m}:${s}`;
}

function renderQuestionStatementsOrTable(q, isZoneA = false) {
  const tbl = q.table || q.matchTable;
  
  if (tbl && tbl.rows && tbl.rows.length) {
    const tableBg = isZoneA ? 'background: #FFFFFF; border-color: var(--sky-border);' : '';
    const thStyle = isZoneA ? 'background: #E8F4FA; color: var(--sky-dark); border-color: var(--sky-border);' : '';
    const tdStyle = isZoneA ? 'color: var(--sky-dark); border-color: var(--sky-border);' : '';

    let headersHtml = '';
    if (Array.isArray(tbl.headers) && tbl.headers.length > 0) {
      headersHtml = tbl.headers.map(h => `<th style="${thStyle}">${h}</th>`).join('');
    } else {
      headersHtml = `<th style="${thStyle}">${tbl.col1Header || 'List I'}</th><th style="${thStyle}">${tbl.col2Header || 'List II'}</th>`;
    }

    const rowsHtml = tbl.rows.map(r => {
      if (Array.isArray(r)) {
        return `<tr>${r.map(cell => `<td style="${tdStyle}">${cell}</td>`).join('')}</tr>`;
      } else {
        return `<tr><td style="${tdStyle}">${r.item1 || ''}</td><td style="${tdStyle}">${r.item2 || ''}</td></tr>`;
      }
    }).join('');

    return `
      <div class="table-scroll-wrapper" style="${tableBg}">
        <table class="match-grid-table" style="${tableBg}">
          <thead><tr>${headersHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }

  let activeStatements = q.statements || [];
  if (currentExamLanguage === 'hi') {
    if (q.hiTranslatedData?.statements && q.hiTranslatedData.statements.length > 0) {
      activeStatements = q.hiTranslatedData.statements;
    } else if (q.hi?.statements && q.hi.statements.length > 0) {
      activeStatements = q.hi.statements;
    }
  }

  if (activeStatements && activeStatements.length) {
    return `<div class="statement-box">${activeStatements.map(s => `<div class="statement-line">${s}</div>`).join('')}</div>`;
  }
  return '';
}

async function renderQuestion(index) {
  if (!currentQuestions[index]) return;
  const q = currentQuestions[index];
  currentIdx = index;
  seenQuestions.add(q.id);
  const viewportArea = document.getElementById('touchSwipeArea');
  if (viewportArea) viewportArea.scrollTop = 0;

  if (currentExamLanguage === 'hi' && !q.hiTranslatedData && !q.hi) {
    const qViewport = document.getElementById('qContainer');
    if (qViewport) qViewport.style.opacity = '0.35';
    await prepareQuestionLanguage(q, 'hi');
    if (qViewport) qViewport.style.opacity = '1';
  }

  let activeIntro = q.intro || '', activeInstruction = q.instruction || '', activeHint = q.hint || '';
  if (currentExamLanguage === 'hi') {
    if (q.hiTranslatedData) { 
      activeIntro = q.hiTranslatedData.intro; 
      activeInstruction = q.hiTranslatedData.instruction; 
    } else if (q.hi) { 
      activeIntro = q.hi.intro || q.hi.question || activeIntro; 
      activeInstruction = q.hi.instruction || activeInstruction; 
      activeHint = q.hi.hint || q.hi.explanation || activeHint; 
    }
  }

  const userAns = userResponses[q.id], correctAns = q.correct ? q.correct.toUpperCase() : null;
  const optionsHtml = (q.options || []).map(opt => {
    const isSelected = userAns === opt.key;
    let cardStyle = '', statusBadge = '', optText = opt.text;
    if (currentExamLanguage === 'hi' && q.hiTranslatedData?.options) {
      const m = q.hiTranslatedData.options.find(o => o.key === opt.key);
      if (m) optText = m.translatedText;
    } else if (opt.hi) optText = opt.hi;
    if (isReviewMode) {
      if (opt.key === correctAns) { 
        cardStyle = 'border: 2px solid #589D78 !important; background: rgba(88, 157, 120, 0.15) !important;'; 
        statusBadge = '<span style="margin-left:auto; color:#589D78; font-weight:800; font-size:11px;">✓ CORRECT</span>'; 
      } else if (isSelected && opt.key !== correctAns) { 
        cardStyle = 'border: 2px solid #D95D5D !important; background: rgba(217, 93, 93, 0.15) !important;'; 
        statusBadge = '<span style="margin-left:auto; color:#D95D5D; font-weight:800; font-size:11px;">✕ YOUR ANSWER</span>'; 
      }
    }
    return `<div class="option-clay-card ${isSelected ? 'selected' : ''}" style="${cardStyle}" onclick="${isReviewMode ? '' : `toggleAnswerOption('${q.id}', '${opt.key}')`}"><span class="opt-prefix">(${opt.key})</span><span class="opt-text-val">${optText}</span>${statusBadge}</div>`;
  }).join('');

  let solutionBox = '';
  if (isReviewMode) {
    solutionBox = `<div class="quote-card" style="margin-top: 24px; text-align: left; padding: 16px 18px; border-left: 4px solid var(--matte-blue); background:#FFFFFF !important; border: 1.5px solid var(--matte-border) !important; color:var(--matte-text-dark) !important;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;"><span style="font-weight: 800; font-size: 13.5px; color: var(--matte-blue-dark);">Detailed Solution</span><span style="font-size: 11.5px; font-weight: 700; color: #B58428;">⏱ Time: ${questionTimeSpent[q.id] || 0}s</span></div><div style="font-size: 13.5px; line-height: 1.6; color: var(--matte-text-dark);">${activeHint ? String(activeHint).replace(/\n/g, '<br>') : 'No extended explanation.'}</div></div>`;
  }

  const container = document.getElementById('qContainer');
  if (container) {
    container.innerHTML = `<div class="q-body-text">${String(activeIntro || '').replace(/\n/g, '<br>')}</div>${renderQuestionStatementsOrTable(q, false)}${activeInstruction ? `<div class="q-instruction-text">${activeInstruction}</div>` : ''}<div class="options-column">${optionsHtml}</div>${solutionBox}`;
  }

  updateSaveNoteButtonState();
  renderHorizontalPalette();
  const activeBubble = document.getElementById(`bubble_q_${currentIdx}`);
  if (activeBubble) activeBubble.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

function toggleAnswerOption(qId, key) {
  if (isReviewMode) return;
  if (userResponses[qId] === key) delete userResponses[qId];
  else userResponses[qId] = key;
  saveRunningExamSession();
  renderQuestion(currentIdx);
}

function renderHorizontalPalette() {
  const track = document.getElementById('paletteTrack');
  if (!track) return;
  track.innerHTML = currentQuestions.map((q, idx) => {
    const isCur = idx === currentIdx, userAns = userResponses[q.id], correctAns = q.correct ? q.correct.toUpperCase() : null;
    let cls = '', inlineStyle = '';
    if (isReviewMode) {
      if (!userAns) cls = '';
      else if (userAns === correctAns) inlineStyle = 'background: #7DBE9B !important; color: #FFFFFF !important; border-color: transparent !important;';
      else inlineStyle = 'background: #D95D5D !important; color: #FFFFFF !important; border-color: transparent !important;';
    } else {
      if (Boolean(userAns)) cls = 'answered';
      else if (reviews.has(q.id)) cls = 'reviewed';
    }
    if (isCur) cls += ' current';
    return `<button class="bubble-btn ${cls}" style="${inlineStyle}" id="bubble_q_${idx}" onclick="renderQuestion(${idx})">${idx + 1}</button>`;
  }).join('');
}

function initTouchSwipe() {
  const swipeArea = document.getElementById('touchSwipeArea');
  if (!swipeArea) return;
  let startX = 0, startY = 0;
  swipeArea.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].screenX; startY = e.changedTouches[0].screenY; }, { passive: true });
  swipeArea.addEventListener('touchend', (e) => {
    const diffX = e.changedTouches[0].screenX - startX, diffY = e.changedTouches[0].screenY - startY;
    if (Math.abs(diffY) > Math.abs(diffX)) return;
    if (diffX < -55 && currentIdx < currentQuestions.length - 1) renderQuestion(currentIdx + 1);
    else if (diffX > 55 && currentIdx > 0) renderQuestion(currentIdx - 1);
  }, { passive: true });
}

async function setExamLanguage(lang) {
  currentExamLanguage = lang;
  document.getElementById('langBtnHi')?.classList.toggle('active', lang === 'hi');
  document.getElementById('langBtnEn')?.classList.toggle('active', lang === 'en');
  saveRunningExamSession();
  if (currentQuestions && currentQuestions.length > 0) await renderQuestion(currentIdx);
}

function openTestbookGridDrawer() {
  let attempted = 0, marked = reviews.size, unseen = 0;
  currentQuestions.forEach(q => { if (userResponses[q.id]) attempted++; if (!seenQuestions.has(q.id)) unseen++; });
  document.getElementById('tbCountReview').innerText = marked;
  document.getElementById('tbCountAttempted').innerText = attempted;
  document.getElementById('tbCountUnattempted').innerText = currentQuestions.length - attempted;
  document.getElementById('tbCountUnseen').innerText = unseen;
  const gridContainer = document.getElementById('tbGridMatrixContainer');
  if (gridContainer) {
    gridContainer.innerHTML = currentQuestions.map((q, idx) => {
      let cls = '';
      if (reviews.has(q.id)) cls = 'reviewed';
      else if (userResponses[q.id]) cls = 'attempted';
      else if (seenQuestions.has(q.id)) cls = 'unattempted';
      return `<button class="tb-matrix-bubble ${cls}" onclick="jumpFromGridToQuestion(${idx})">${idx + 1}</button>`;
    }).join('');
  }
  document.getElementById('tbGridDrawerBackdrop').classList.add('open');
  document.getElementById('tbGridDrawer').classList.add('open');
  pushModalState('tbGridDrawer');
}

function closeTestbookGridDrawer() {
  document.getElementById('tbGridDrawerBackdrop').classList.remove('open');
  document.getElementById('tbGridDrawer').classList.remove('open');
}

function jumpFromGridToQuestion(idx) { closeTestbookGridDrawer(); renderQuestion(idx); }

function openTestbookConfirmModal() {
  closeTestbookGridDrawer();
  let attempted = 0;
  currentQuestions.forEach(q => { if (userResponses[q.id]) attempted++; });
  const h = String(Math.floor(timeLeft / 3600)).padStart(2, '0'), m = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0'), s = String(timeLeft % 60).padStart(2, '0');
  document.getElementById('tbConfirmTimeLeft').innerText = `${h}:${m}:${s}`;
  document.getElementById('tbConfirmAttempted').innerText = attempted;
  document.getElementById('tbConfirmUnattempted').innerText = currentQuestions.length - attempted;
  document.getElementById('tbConfirmMarked').innerText = reviews.size;
  document.getElementById('tbConfirmModal').classList.add('open');
  pushModalState('tbConfirmModal');
}

function closeTestbookConfirmModal() { document.getElementById('tbConfirmModal').classList.remove('open'); }

/* =========================================================
   SAFE & ROBUST FINAL SUBMISSION ENGINE (NO NULL ERRORS)
========================================================= */
function executeFinalSubmission() {
  closeTestbookConfirmModal();
  clearRunningExamSession();
  if (timerRef) clearInterval(timerRef);
  if (questionTimerRef) clearInterval(questionTimerRef);

  let correct = 0, incorrect = 0, unattempted = 0, totalTimeSpent = 0;
  currentTestSolutions = [];
  const posWeight = activeTest?.posMark ?? 2.0, negWeight = activeTest?.negMark ?? 0.66;

  currentQuestions.forEach((q, idx) => {
    const userAns = userResponses[q.id];
    const correctAns = q.correct ? q.correct.toUpperCase() : null;
    const qSec = questionTimeSpent[q.id] || 0;
    totalTimeSpent += qSec;

    let filterType = '', statusText = '';
    const shortSnippet = q.intro ? String(q.intro).slice(0, 75) + '...' : 'Question ' + (idx + 1);

    if (!userAns) {
      unattempted++;
      filterType = 'skipped';
      statusText = `Skipped &bull; Correct: (${correctAns || 'N/A'}) &bull; ⏱ ${qSec}s`;
    } else if (correctAns && userAns === correctAns) {
      correct++;
      filterType = 'correct';
      statusText = `Correct (+${posWeight}) &bull; Marked: (${userAns}) &bull; ⏱ ${qSec}s`;
    } else {
      incorrect++;
      filterType = 'incorrect';
      statusText = `Incorrect (-${negWeight}) &bull; Marked: (${userAns}) | Correct: (${correctAns}) &bull; ⏱ ${qSec}s`;
    }

    currentTestSolutions.push({
      type: filterType,
      index: idx,
      html: `
        <div class="quote-card" style="cursor:pointer; padding:14px 16px; text-align:left; background:#FFFFFF !important; border:1.5px solid var(--matte-border) !important; color:var(--matte-text-dark) !important;" onclick="jumpToQuestionReview(${idx})">
          <div style="font-weight:700; font-size:13px; display:flex; justify-content:space-between; color:var(--matte-blue-dark);">
            <span>Q${idx + 1}</span>
            <span style="font-size:11px;">${statusText}</span>
          </div>
          <div style="font-size:13.5px; font-weight:600; color:var(--matte-text-dark); margin-top:4px;">${shortSnippet}</div>
        </div>
      `
    });
  });

  const totalScore = (correct * posWeight) - (incorrect * negWeight);
  const totalAttempted = correct + incorrect;
  const accuracyPercent = totalAttempted > 0 ? Math.round((correct / totalAttempted) * 100) : 0;
  const avgTimePerQuestion = currentQuestions.length > 0 ? Math.round(totalTimeSpent / currentQuestions.length) : 0;

  testHistory = purgeExpiredHistory();
  testHistory.push({
    testId: activeTest?.id,
    title: activeTest?.title || "Practice Test",
    topic: activeTest?.topic || "General",
    score: totalScore,
    correct: correct,
    incorrect: incorrect,
    avgTime: avgTimePerQuestion,
    timestamp: Date.now()
  });
  localStorage.setItem(STORAGE_TEST_HISTORY, JSON.stringify(testHistory));

  // SAFE NULL-GUARDED DOM UPDATES
  const safeSetText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  safeSetText('analysisTestTitle', activeTest?.title || "Practice Test");
  safeSetText('res-score', totalScore.toFixed(2));
  safeSetText('res-accuracy-percent', `${accuracyPercent}%`);
  safeSetText('res-avg-time', `${avgTimePerQuestion}s`);

  // Direct 6-metrics counters
  safeSetText('res-correct-count', correct);
  safeSetText('res-incorrect-count', incorrect);
  safeSetText('res-skipped-count', unattempted);
  safeSetText('res-unattempted', unattempted); // Fallback

  // Filter Buttons dynamic counters
  safeSetText('tabFilterAll', `All (${currentQuestions.length})`);
  safeSetText('tabFilterCorrect', `Correct (${correct})`);
  safeSetText('tabFilterIncorrect', `Incorrect (${incorrect})`);
  safeSetText('tabFilterSkipped', `Skipped (${unattempted})`);

  filterSolutions('all');
  switchPage('page-analysis');
  pushNavigationState({ type: 'page', page: 'page-analysis' });
}

function openReattemptChoiceModal() {
  document.getElementById('tbReattemptChoiceModal').classList.add('open');
  pushModalState('tbReattemptChoiceModal');
}

function closeReattemptModal() { document.getElementById('tbReattemptChoiceModal').classList.remove('open'); }

function triggerReattemptMode(mode) {
  closeReattemptModal();
  if (!activeTest) return switchPage('page-directory');
  isReviewMode = false; seenQuestions.clear(); reviews.clear(); questionTimeSpent = {};
  if (mode === 'wrong_only') {
    const filtered = activeTest.questions.filter(q => {
      const ans = userResponses[q.id], correctAns = q.correct ? q.correct.toUpperCase() : null;
      return !ans || (correctAns && ans !== correctAns);
    });
    if (filtered.length === 0) return alert("All questions were correct in the previous attempt!");
    currentQuestions = filtered;
  } else currentQuestions = activeTest.questions || [];
  userResponses = {}; currentIdx = 0; timeLeft = Math.max(15 * 60, currentQuestions.length * 72);
  document.getElementById('active-test-title').innerText = `${activeTest.title} (Re-attempt)`;
  document.getElementById('timer-box').style.display = 'inline';
  switchPage('page-test');
  pushNavigationState({ type: 'page', page: 'page-test' });
  renderQuestion(0);
  renderHorizontalPalette();
  saveRunningExamSession();
  startTimer();
}

function jumpToQuestionReview(qIndex) {
  isReviewMode = true;
  document.getElementById('timer-box').style.display = 'none';
  switchPage('page-test');
  pushNavigationState({ type: 'page', page: 'page-test' });
  renderQuestion(qIndex);
}

function filterSolutions(filterType) {
  const container = document.getElementById('solutions-container');
  if (!container) return;
  const filtered = filterType === 'all' ? currentTestSolutions : currentTestSolutions.filter(item => item.type === filterType);
  container.innerHTML = filtered.length === 0 ? `<div style="text-align:center; padding:30px; color:var(--matte-text-muted); font-size:13px;">No questions in this category.</div>` : filtered.map(item => item.html).join('');
}