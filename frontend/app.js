// State Management
let selectedTables = new Set();
let questionPool = [];
let currentQuestionIndex = 0;
let score = 0;
let currentQuestion = null;
let loggedInUser = null;
let authMode = null; 
let sessionDetails = []; // Array of {table, correct}

// DOM Elements
const configScreen = document.getElementById('config-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');
const authScreen = document.getElementById('auth-screen');
const passcodeScreen = document.getElementById('passcode-screen');

const userDisplay = document.getElementById('user-display');
const loginIcon = document.getElementById('login-icon');

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

const usernameInput = document.getElementById('username-input');
const loginModeBtn = document.getElementById('login-mode-btn');
const registerModeBtn = document.getElementById('register-mode-btn');
const cancelAuthBtn = document.getElementById('cancel-auth-btn');

const passcodeTitle = document.getElementById('passcode-title');
const passcodeInput = document.getElementById('passcode-input');
const submitAuthBtn = document.getElementById('submit-auth-btn');
const backAuthBtn = document.getElementById('back-auth-btn');
const authFeedbackEl = document.getElementById('auth-feedback');

// --- Screen Navigation ---
function showScreen(screen) {
    [configScreen, quizScreen, resultsScreen, authScreen, passcodeScreen].forEach(s => s.style.display = 'none');
    screen.style.display = 'block';
}

// --- Auth Logic ---
loginIcon.addEventListener('click', () => {
    usernameInput.value = '';
    showScreen(authScreen);
});

cancelAuthBtn.addEventListener('click', () => showScreen(configScreen));

loginModeBtn.addEventListener('click', () => startAuth('login'));
registerModeBtn.addEventListener('click', () => startAuth('register'));

function startAuth(mode) {
    const name = usernameInput.value.trim();
    if (!name) {
        alert("Please enter a fun name!");
        return;
    }
    authMode = mode;
    passcodeTitle.textContent = mode === 'register' ? 'Create Passcode' : 'Enter Passcode';
    passcodeInput.value = '';
    authFeedbackEl.textContent = '';
    showScreen(passcodeScreen);
}

backAuthBtn.addEventListener('click', () => showScreen(authScreen));

passKeypadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.textContent;
        if (val === 'C') {
            passcodeInput.value = '';
        } else if (val === '⌫') {
            passcodeInput.value = passcodeInput.value.slice(0, -1);
        } else if (passcodeInput.value.length < 6) {
            passcodeInput.value += val;
        }
    });
});

async function submitAuth() {
    const name = usernameInput.value.trim();
    const passcode = passcodeInput.value;

    if (passcode.length < 4) {
        showAuthFeedback("Passcode must be at least 4 numbers!", "wrong");
        return;
    }

    showAuthFeedback("Working... ⏳", "");

    try {
        const response = await fetch('/api/AuthUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: authMode, username: name, passcode: passcode })
        });

        const data = await response.json();

        if (response.ok) {
            loggedInUser = data.user;
            userDisplay.textContent = `Playing as: ${loggedInUser}`;
            showScreen(configScreen);
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

// --- Quiz Logic ---
function createQuestionPool() {
    let pool = [];
    selectedTables.forEach(t => {
        // t is the "Tested Table" (the second number per requirement)
        // Multipliers 2-12 (No 1x)
        for (let i = 2; i <= 12; i++) {
            // Formula: i x t = ? (e.g., 4 x 2)
            pool.push({ a: i, b: t, answer: i * t });
        }
    });
    // Shuffle the pool
    return pool.sort(() => Math.random() - 0.5);
}

function startQuiz() {
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
    
    // Store details for stats (b is the tested table per requirement)
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

    if (loggedInUser) {
        try {
            const response = await fetch('/api/SaveSession', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: loggedInUser, 
                    score: score, 
                    details: sessionDetails 
                })
            });
            const stats = await response.json();
            renderStats(stats);
        } catch (e) {
            console.error("Error saving stats:", e);
        }
    }
    
    showScreen(resultsScreen);
}

function renderStats(stats) {
    last5AvgEl.textContent = stats.last5Avg;
    tableStatsGrid.innerHTML = '';
    
    // Create items for tables 2-12
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
        
        item.innerHTML = `
            <span>${i}x</span>
            <span class="stat-val ${colorClass}">${displayVal}</span>
        `;
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
        if (val === 'C') {
            answerInput.value = '';
        } else if (val === '⌫') {
            answerInput.value = answerInput.value.slice(0, -1);
        } else {
            answerInput.value += val;
        }
    });
});

submitBtn.addEventListener('click', checkAnswer);

// Handle Enter key
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (quizScreen.style.display === 'block') checkAnswer();
        else if (passcodeScreen.style.display === 'block') submitAuth();
    }
});

// --- Actions ---
startBtn.addEventListener('click', startQuiz);
anotherGoBtn.addEventListener('click', startQuiz);
resetBtn.addEventListener('click', () => {
    selectedTables.clear();
    tableBtns.forEach(b => b.classList.remove('selected'));
    startBtn.disabled = true;
    showScreen(configScreen);
});
