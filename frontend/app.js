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

const API_HEADERS = { 
    'Content-Type': 'application/json',
    'X-App-Source': 'TimestablesApp' 
};

// --- Screen Navigation ---
function showScreen(screen) {
    [configScreen, quizScreen, resultsScreen, authScreen, passcodeScreen, resetConfirmScreen, adultLockScreen].forEach(s => s.style.display = 'none');
    
    if (screen === resetConfirmScreen || screen === adultLockScreen) {
        screen.style.display = 'flex';
    } else {
        screen.style.display = 'block';
        currentVisibleScreen = screen;
    }

    // Nav Icons visibility
    if (screen === authScreen || screen === passcodeScreen || screen === resetConfirmScreen || screen === adultLockScreen) {
        settingsIcon.style.display = 'none';
        globalResetBtn.style.display = 'none';
    } else {
        settingsIcon.style.display = 'flex';
        globalResetBtn.style.display = 'flex';
    }
}

showScreen(authScreen);

// --- Auth Logic ---
loginModeBtn.addEventListener('click', () => startAuth('login'));
registerModeBtn.addEventListener('click', () => startAuth('register'));

guestBtn.addEventListener('click', () => {
    isGuest = true;
    loggedInUser = null;
    userDisplay.textContent = 'Playing as Guest';
    showScreen(configScreen);
});

function startAuth(mode) {
    const name = usernameInput.value.trim();
    if (!name) {
        authNameFeedbackEl.textContent = "Please enter a fun name! 🤖";
        authNameFeedbackEl.className = "feedback-area wrong";
        return;
    }
    if (name.length > 15) {
        authNameFeedbackEl.textContent = "Name too long! (Max 15) 📏";
        authNameFeedbackEl.className = "feedback-area wrong";
        return;
    }
    authNameFeedbackEl.textContent = "";
    authMode = mode;
    passcodeTitle.textContent = mode === 'register' ? 'Create Passcode' : 'Enter Passcode';
    passcodeInput.value = '';
    authFeedbackEl.textContent = '';
    showScreen(passcodeScreen);
}

backAuthBtn.addEventListener('click', () => showScreen(authScreen));

async function submitAuth() {
    const name = usernameInput.value.trim();
    const passcode = passcodeInput.value;

    if (passcode.length < 4) {
        showAuthFeedback("Passcode must be 4 numbers! 🔒", "wrong");
        return;
    }

    showAuthFeedback("Working... ⏳", "");

    try {
        const response = await fetch('/api/AuthUser', {
            method: 'POST',
            headers: API_HEADERS,
            body: JSON.stringify({ mode: authMode, username: name, passcode: passcode })
        });

        const data = await response.json();

        if (response.ok) {
            loggedInUser = data.user;
            isGuest = false;
            userDisplay.textContent = `Playing as: ${loggedInUser}`;
            
            // Check for existing config
            if (data.config && Object.keys(data.config).length > 0) {
                applyConfig(data.config);
                startQuiz();
            } else {
                showScreen(configScreen);
            }
        } else {
            showAuthFeedback(data.message || response.statusText, "wrong");
        }
    } catch (error) {
        showAuthFeedback("Connection error! 🌐", "wrong");
    }
}

submitAuthBtn.addEventListener('click', submitAuth);

function showAuthFeedback(text, className) {
    authFeedbackEl.textContent = text;
    authFeedbackEl.className = 'feedback-area ' + className;
}

// --- Configuration Logic ---
tableBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.value);
        if (selectedTables.has(val)) {
            selectedTables.delete(val);
            btn.classList.remove('selected');
        } else {
            selectedTables.add(val);
            btn.classList.add('selected');
        }
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
        } else {
            btn.classList.remove('selected');
        }
    });
    startBtn.disabled = selectedTables.size === 0;
}

async function saveConfig() {
    if (!loggedInUser || isGuest) return;
    
    const config = {};
    for (let i = 2; i <= 12; i++) {
        config[i] = selectedTables.has(i);
    }

    try {
        await fetch('/api/UpdateConfig', {
            method: 'POST',
            headers: API_HEADERS,
            body: JSON.stringify({ username: loggedInUser, config: config })
        });
    } catch (e) { console.error("Failed to save config", e); }
}

// --- Adult Lock Logic ---
settingsIcon.addEventListener('click', () => {
    adultPin = "";
    adultPinDisplay.textContent = "";
    adultLockFeedback.textContent = "";
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
            if (adultPin === "123321") {
                showScreen(configScreen);
            } else {
                adultLockFeedback.textContent = "Wrong PIN! ❌";
                adultLockFeedback.className = "feedback-area wrong";
                adultPin = "";
                setTimeout(() => { 
                    adultPinDisplay.textContent = ""; 
                    adultLockFeedback.textContent = "";
                }, 1000);
            }
        }
    });
});

// --- Reset Logic ---
globalResetBtn.addEventListener('click', () => showScreen(resetConfirmScreen));
confirmResetNo.addEventListener('click', () => showScreen(currentVisibleScreen));
confirmResetYes.addEventListener('click', () => resetToStart());

function resetToStart() {
    loggedInUser = null;
    isGuest = false;
    selectedTables.clear();
    tableBtns.forEach(b => b.classList.remove('selected'));
    startBtn.disabled = true;
    userDisplay.textContent = '';
    usernameInput.value = '';
    showScreen(authScreen);
}

// --- Quiz Logic ---
function createQuestionPool() {
    let pool = [];
    selectedTables.forEach(t => {
        for (let i = 2; i <= 12; i++) {
            pool.push({ a: i, b: t, answer: i * t });
        }
    });
    return pool.sort(() => Math.random() - 0.5);
}

function startQuiz() {
    if (selectedTables.size === 0) return;
    saveConfig(); // Persist selection
    questionPool = createQuestionPool();
    currentQuestionIndex = 0;
    score = 0;
    sessionDetails = [];
    scoreEl.textContent = '0';
    showQuestion();
    showScreen(quizScreen);
}

function showQuestion() {
    currentQuestion = questionPool[currentQuestionIndex];
    questionEl.textContent = `${currentQuestion.a} x ${currentQuestion.b} = ?`;
    questionNumEl.textContent = currentQuestionIndex + 1;
    answerInput.value = '';
    feedbackEl.textContent = '';
}

function checkAnswer() {
    const userAnswer = parseInt(answerInput.value);
    if (isNaN(userAnswer)) return;

    const isCorrect = userAnswer === currentQuestion.answer;
    sessionDetails.push({ table: currentQuestion.b, correct: isCorrect });

    if (isCorrect) {
        score++;
        scoreEl.textContent = score;
        showFeedback('Correct! 🌟', 'correct');
    } else {
        showFeedback(`Oops! It was ${currentQuestion.answer} 🔄`, 'wrong');
    }

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < 10 && currentQuestionIndex < questionPool.length) {
            showQuestion();
        } else {
            finishSession();
        }
    }, 1500);
}

async function finishSession() {
    finalScoreEl.textContent = score;
    statsSummary.style.display = 'none';

    if (loggedInUser && !isGuest) {
        try {
            const response = await fetch('/api/SaveSession', {
                method: 'POST',
                headers: API_HEADERS,
                body: JSON.stringify({ 
                    username: loggedInUser, 
                    score: score, 
                    details: sessionDetails 
                })
            });
            const stats = await response.json();
            renderStats(stats);
        } catch (e) { console.error("Error saving stats:", e); }
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
        let colorClass = 'stat-none';
        let displayVal = '-';
        if (val !== null) {
            displayVal = val + '%';
            colorClass = val >= 80 ? 'stat-good' : (val < 50 ? 'stat-bad' : '');
        }
        item.innerHTML = `<span>${i}x</span><span class="stat-val ${colorClass}">${displayVal}</span>`;
        tableStatsGrid.appendChild(item);
    }
    statsSummary.style.display = 'block';
}

function showFeedback(text, className) {
    feedbackEl.textContent = text;
    feedbackEl.className = 'feedback-area ' + className;
}

// --- Keypad & Inputs ---
keypadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.textContent;
        if (val === 'C') answerInput.value = '';
        else if (val === '⌫') answerInput.value = answerInput.value.slice(0, -1);
        else answerInput.value += val;
    });
});

passKeypadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.textContent;
        if (val === 'C') passcodeInput.value = '';
        else if (val === '⌫') passcodeInput.value = passcodeInput.value.slice(0, -1);
        else if (passcodeInput.value.length < 4) passcodeInput.value += val;
    });
});

submitBtn.addEventListener('click', checkAnswer);

document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (quizScreen.style.display === 'block') checkAnswer();
        else if (passcodeScreen.style.display === 'block') submitAuth();
    }
});

startBtn.addEventListener('click', startQuiz);
anotherGoBtn.addEventListener('click', startQuiz);
resetBtn.addEventListener('click', () => showScreen(configScreen));
