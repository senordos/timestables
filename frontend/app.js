// State Management
let selectedTables = new Set();
let questionPool = [];
let currentQuestionIndex = 0;
let score = 0;
let currentQuestion = null;
let loggedInUser = null;
let isGuest = false;
let authMode = null; 
let sessionDetails = []; 
let currentVisibleScreen = null;
let adultPin = "";
let isTransitioning = false;

// DOM Elements
const configScreen = document.getElementById('config-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const authScreen = document.getElementById('auth-screen');
const passcodeScreen = document.getElementById('passcode-screen');
const resetConfirmScreen = document.getElementById('reset-confirm-screen');
const adultLockScreen = document.getElementById('adult-lock-screen');

const userDisplay = document.getElementById('user-display');
const settingsIcon = document.getElementById('settings-icon');
const globalResetBtn = document.getElementById('global-reset-btn');

const tableBtns = document.querySelectorAll('.table-btn');
const startBtn = document.getElementById('start-btn');

const questionEl = document.getElementById('question');
const questionNumEl = document.getElementById('question-num');
const scoreEl = document.getElementById('score');
const answerInput = document.getElementById('answer');
const submitBtn = document.getElementById('submit-btn');
const feedbackEl = document.getElementById('feedback');

const finalScoreEl = document.getElementById('final-score');
const statsSummary = document.getElementById('stats-summary');
const last5AvgEl = document.getElementById('last-5-avg');
const tableStatsGrid = document.getElementById('table-stats-grid');
const anotherGoBtn = document.getElementById('another-go-btn');
const resetBtn = document.getElementById('reset-btn');

const keypadBtns = document.querySelectorAll('.key-btn');
const passKeypadBtns = document.querySelectorAll('.pass-key-btn');
const adultKeypadBtns = document.querySelectorAll('.adult-key-btn');

const usernameInput = document.getElementById('username-input');
const loginModeBtn = document.getElementById('login-mode-btn');
const registerModeBtn = document.getElementById('register-mode-btn');
const guestBtn = document.getElementById('guest-btn');

const passcodeTitle = document.getElementById('passcode-title');
const passcodeInput = document.getElementById('passcode-input');
const submitAuthBtn = document.getElementById('submit-auth-btn');
const backAuthBtn = document.getElementById('back-auth-btn');
const authFeedbackEl = document.getElementById('auth-feedback');
const authNameFeedbackEl = document.getElementById('auth-name-feedback');

const confirmResetYes = document.getElementById('confirm-reset-yes');
const confirmResetNo = document.getElementById('confirm-reset-no');

const adultPinDisplay = document.getElementById('adult-pin-display');
const adultLockFeedback = document.getElementById('adult-lock-feedback');
const adultLockCancel = document.getElementById('adult-lock-cancel');

// --- API Helper ---
async function callApi(endpoint, body) {
    try {
        const response = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-App-Source': 'TimestablesApp' },
            body: JSON.stringify(body)
        });
        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, data };
    } catch (e) {
        return { ok: false, data: { message: "Connection error! 🌐" } };
    }
}

function showMsg(el, text, isError = false) {
    el.textContent = text;
    el.className = 'feedback-area ' + (isError ? 'wrong' : 'correct');
}

// --- Screen Navigation ---
function showScreen(screen) {
    [configScreen, quizScreen, resultsScreen, authScreen, passcodeScreen, resetConfirmScreen, adultLockScreen].forEach(s => s.style.display = 'none');
    
    if (screen === resetConfirmScreen || screen === adultLockScreen) {
        screen.style.display = 'flex';
    } else {
        screen.style.display = 'block';
        currentVisibleScreen = screen;
    }

    const isLogin = [authScreen, passcodeScreen, resetConfirmScreen, adultLockScreen].includes(screen);
    settingsIcon.style.display = isLogin ? 'none' : 'flex';
    globalResetBtn.style.display = isLogin ? 'none' : 'flex';
}

showScreen(authScreen);

// --- Auth Logic ---
loginModeBtn.addEventListener('click', () => startAuth('login'));
registerModeBtn.addEventListener('click', () => startAuth('register'));

guestBtn.addEventListener('click', () => {
    isGuest = true; loggedInUser = null;
    userDisplay.textContent = 'Playing as Guest';
    showScreen(configScreen);
});

function startAuth(mode) {
    const name = usernameInput.value.trim();
    if (!name) return showMsg(authNameFeedbackEl, "Please enter a fun name! 🤖", true);
    if (name.length > 15) return showMsg(authNameFeedbackEl, "Name too long! (Max 15) 📏", true);
    
    authNameFeedbackEl.textContent = "";
    authMode = mode;
    passcodeTitle.textContent = mode === 'register' ? 'Create Passcode' : 'Enter Passcode';
    passcodeInput.value = '';
    authFeedbackEl.textContent = '';
    showScreen(passcodeScreen);
}

backAuthBtn.addEventListener('click', () => showScreen(authScreen));

async function submitAuth() {
    const passcode = passcodeInput.value;
    if (passcode.length < 4) return showMsg(authFeedbackEl, "Passcode must be 4 numbers! 🔒", true);

    showMsg(authFeedbackEl, "Working... ⏳");
    const { ok, data } = await callApi('AuthUser', { mode: authMode, username: usernameInput.value.trim(), passcode });

    if (ok) {
        loggedInUser = data.user; isGuest = false;
        userDisplay.textContent = `Playing as: ${loggedInUser}`;
        if (data.config && Object.keys(data.config).length > 0) {
            applyConfig(data.config);
            startQuiz();
        } else showScreen(configScreen);
    } else showMsg(authFeedbackEl, data.message || "Error", true);
}

submitAuthBtn.addEventListener('click', submitAuth);

// --- Configuration Logic ---
tableBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.value);
        selectedTables.has(val) ? selectedTables.delete(val) : selectedTables.add(val);
        btn.classList.toggle('selected');
        startBtn.disabled = selectedTables.size === 0;
    });
});

function applyConfig(config) {
    selectedTables.clear();
    tableBtns.forEach(btn => {
        const val = btn.dataset.value;
        if (config[val]) {
            selectedTables.add(parseInt(val));
            btn.classList.add('selected');
        } else btn.classList.remove('selected');
    });
    startBtn.disabled = selectedTables.size === 0;
}

// --- Adult Lock Logic ---
settingsIcon.addEventListener('click', () => {
    adultPin = ""; adultPinDisplay.textContent = ""; adultLockFeedback.textContent = "";
    showScreen(adultLockScreen);
});

adultLockCancel.addEventListener('click', () => showScreen(currentVisibleScreen));

adultKeypadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.textContent;
        if (val === 'C') adultPin = "";
        else if (val === '⌫') adultPin = adultPin.slice(0, -1);
        else if (adultPin.length < 6) adultPin += val;
        
        adultPinDisplay.textContent = "•".repeat(adultPin.length);

        if (adultPin.length === 6) {
            if (adultPin === "123321") showScreen(configScreen);
            else {
                showMsg(adultLockFeedback, "Wrong PIN! ❌", true);
                adultPin = "";
                setTimeout(() => { adultPinDisplay.textContent = ""; adultLockFeedback.textContent = ""; }, 1000);
            }
        }
    });
});

// --- Reset Logic ---
globalResetBtn.addEventListener('click', () => showScreen(resetConfirmScreen));
confirmResetNo.addEventListener('click', () => showScreen(currentVisibleScreen));
confirmResetYes.addEventListener('click', () => {
    isGuest = false; loggedInUser = null;
    selectedTables.clear();
    tableBtns.forEach(b => b.classList.remove('selected'));
    startBtn.disabled = true;
    userDisplay.textContent = ''; usernameInput.value = '';
    showScreen(authScreen);
});

// --- Quiz Logic ---
function startQuiz() {
    if (selectedTables.size === 0) return showScreen(configScreen);
    if (loggedInUser && !isGuest) {
        const config = {};
        for (let i = 2; i <= 12; i++) config[i] = selectedTables.has(i);
        callApi('UpdateConfig', { username: loggedInUser, config });
    }
    isTransitioning = false;
    questionPool = selectedTables.size > 0 ? Array.from(selectedTables).flatMap(t => 
        Array.from({length: 11}, (_, i) => ({ a: i+2, b: t, answer: (i+2)*t }))
    ).sort(() => Math.random() - 0.5) : [];
    
    currentQuestionIndex = 0; score = 0; sessionDetails = [];
    scoreEl.textContent = '0';
    showQuestion();
    showScreen(quizScreen);
}

function showQuestion() {
    currentQuestion = questionPool[currentQuestionIndex];
    questionEl.textContent = `${currentQuestion.a} x ${currentQuestion.b} = ?`;
    questionNumEl.textContent = currentQuestionIndex + 1;
    answerInput.value = ''; feedbackEl.textContent = '';
}

function checkAnswer() {
    if (isTransitioning) return;
    const userAnswer = parseInt(answerInput.value);
    if (isNaN(userAnswer)) return;

    isTransitioning = true;
    const isCorrect = userAnswer === currentQuestion.answer;
    sessionDetails.push({ table: currentQuestion.b, correct: isCorrect });

    if (isCorrect) {
        score++; scoreEl.textContent = score;
        showMsg(feedbackEl, 'Correct! 🌟');
    } else showMsg(feedbackEl, `Oops! It was ${currentQuestion.answer} 🔄`, true);

    setTimeout(() => {
        isTransitioning = false;
        if (++currentQuestionIndex < 10 && currentQuestionIndex < questionPool.length) showQuestion();
        else finishSession();
    }, 1500);
}

async function finishSession() {
    finalScoreEl.textContent = score;
    statsSummary.style.display = 'none';
    if (loggedInUser && !isGuest) {
        const { ok, data } = await callApi('SaveSession', { username: loggedInUser, score, details: sessionDetails });
        if (ok) renderStats(data);
    }
    showScreen(resultsScreen);
}

function renderStats(stats) {
    last5AvgEl.textContent = stats.last5Avg;
    tableStatsGrid.innerHTML = '';
    for (let i = 2; i <= 12; i++) {
        const val = stats.tableBreakdown[i];
        const item = document.createElement('div');
        item.className = 'stat-item';
        let colorClass = val === null ? 'stat-none' : (val >= 80 ? 'stat-good' : (val < 50 ? 'stat-bad' : ''));
        item.innerHTML = `<span>${i}x</span><span class="stat-val ${colorClass}">${val !== null ? val + '%' : '-'}</span>`;
        tableStatsGrid.appendChild(item);
    }
    statsSummary.style.display = 'block';
}

// --- Keypad Inputs ---
function setupKeypad(btns, inputEl, max = 999) {
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.textContent;
            if (val === 'C') inputEl.value = '';
            else if (val === '⌫') inputEl.value = inputEl.value.slice(0, -1);
            else if (inputEl.value.length < (inputEl.maxLength || max)) inputEl.value += val;
        });
    });
}

setupKeypad(keypadBtns, answerInput);
setupKeypad(passKeypadBtns, passcodeInput, 4);
setupKeypad(adultKeypadBtns, { value: "" }); // PIN handled in custom listener

submitBtn.addEventListener('click', checkAnswer);
startBtn.addEventListener('click', startQuiz);
anotherGoBtn.addEventListener('click', startQuiz);
resetBtn.addEventListener('click', () => showScreen(configScreen));

document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (quizScreen.style.display === 'block') checkAnswer();
        else if (passcodeScreen.style.display === 'block') submitAuth();
    }
});
