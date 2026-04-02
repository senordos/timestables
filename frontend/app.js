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
let currentGame = null; // 'times_tables' or 'story_maths'
let storyDifficulty = 'easy';
let userGames = {}; // Stores all game configs from API

// DOM Elements
const configScreen = document.getElementById('config-screen');
const storyConfigScreen = document.getElementById('story-config-screen');
const gameSelectionScreen = document.getElementById('game-selection-screen');
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
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const startBtn = document.getElementById('start-btn');
const startStoryBtn = document.getElementById('start-story-btn');

const questionEl = document.getElementById('question');
const questionNumEl = document.getElementById('question-num');
const questionTotalEl = document.getElementById('question-total');
const scoreEl = document.getElementById('score');
const answerInput = document.getElementById('answer');
const submitBtn = document.getElementById('submit-btn');
const feedbackEl = document.getElementById('feedback');

const finalScoreEl = document.getElementById('final-score');
const resultTotalEl = document.getElementById('result-total');
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

// --- Story Questions ---
const STORY_POOL = [
    { text: "Nutty the Squirrel has 10 nuts. He hides 4 in a tree and 3 in a hole. A bird gives him 2 more. How many nuts now?", answer: 5, difficulty: 'hard' },
    { text: "Captain Barnaby has 12 coins. He gives 5 to Polly. Then he finds 3 more on the beach. How many coins now?", answer: 10, difficulty: 'easy' },
    { text: "There are 6 astronauts. 2 float out. Then 4 aliens hop inside. How many friends inside now?", answer: 8, difficulty: 'easy' },
    { text: "A baker makes 15 cupcakes. A hungry giant eats 8. The baker bakes 5 more. How many ready to sell?", answer: 12, difficulty: 'easy' },
    { text: "9 bees are sleeping. 4 fly out. Later, 2 fly back. How many bees in the hive now?", answer: 7, difficulty: 'easy' },
    { text: "There are 20 toys. You take out 10. You put 3 back because they are sleepy. How many toys are still out?", answer: 7, difficulty: 'easy' },
    { text: "8 T-Rexes are dancing. 3 go home. Then 6 Triceratops arrive. How many dinosaurs now?", answer: 11, difficulty: 'easy' },
    { text: "A basket has 7 apples and 7 oranges. You eat 4 apples. Then you add 2 more oranges. How many fruit total?", answer: 12, difficulty: 'easy' },
    { text: "12 fish are swimming. 5 hide. Then 3 more swim out. How many fish can you see swimming now?", answer: 10, difficulty: 'easy' },
    { text: "10 people are on a bus. 4 get off. At the next stop, 7 get on. How many people now?", answer: 13, difficulty: 'easy' }
];

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
    } catch (e) { return { ok: false, data: { message: "Connection error! 🌐" } }; }
}

function showMsg(el, text, isError = false) {
    el.textContent = text;
    el.className = 'feedback-area ' + (isError ? 'wrong' : 'correct');
}

// --- Screen Navigation ---
function showScreen(screen) {
    [configScreen, storyConfigScreen, gameSelectionScreen, quizScreen, resultsScreen, authScreen, passcodeScreen, resetConfirmScreen, adultLockScreen].forEach(s => s.style.display = 'none');
    
    if ([resetConfirmScreen, adultLockScreen].includes(screen)) {
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
    isGuest = true; loggedInUser = null; userGames = {};
    userDisplay.textContent = 'Playing as Guest';
    showScreen(gameSelectionScreen);
});

function startAuth(mode) {
    const name = usernameInput.value.trim();
    if (!name) return showMsg(authNameFeedbackEl, "Please enter a fun name! 🤖", true);
    if (name.length > 15) return showMsg(authNameFeedbackEl, "Name too long! (Max 15) 📏", true);
    authNameFeedbackEl.textContent = "";
    authMode = mode;
    passcodeTitle.textContent = mode === 'register' ? 'Create Passcode' : 'Enter Passcode';
    passcodeInput.value = ''; authFeedbackEl.textContent = '';
    showScreen(passcodeScreen);
}

backAuthBtn.addEventListener('click', () => showScreen(authScreen));

async function submitAuth() {
    const passcode = passcodeInput.value;
    if (passcode.length < 4) return showMsg(authFeedbackEl, "Passcode must be 4 numbers! 🔒", true);
    showMsg(authFeedbackEl, "Working... ⏳");
    const { ok, data } = await callApi('AuthUser', { mode: authMode, username: usernameInput.value.trim(), passcode });
    if (ok) {
        loggedInUser = data.user; isGuest = false; userGames = data.games || {};
        userDisplay.textContent = `Playing as: ${loggedInUser}`;
        showScreen(gameSelectionScreen);
    } else showMsg(authFeedbackEl, data.message || "Error", true);
}

submitAuthBtn.addEventListener('click', submitAuth);

// --- Game Selection ---
document.getElementById('play-tt-btn').addEventListener('click', () => {
    currentGame = 'times_tables';
    const config = userGames.times_tables?.config || {};
    if (Object.keys(config).length > 0) {
        applyConfig(config);
        startQuiz();
    } else showScreen(configScreen);
});

document.getElementById('play-story-btn').addEventListener('click', () => {
    currentGame = 'story_maths';
    const config = userGames.story_maths?.config || {};
    if (config.difficulty) {
        storyDifficulty = config.difficulty;
        difficultyBtns.forEach(b => b.classList.toggle('selected', b.dataset.value === storyDifficulty));
        startQuiz();
    } else showScreen(storyConfigScreen);
});

document.querySelectorAll('.back-to-selection').forEach(btn => {
    btn.addEventListener('click', () => showScreen(gameSelectionScreen));
});

// --- Configuration Logic ---
tableBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.value);
        selectedTables.has(val) ? selectedTables.delete(val) : selectedTables.add(val);
        btn.classList.toggle('selected');
        startBtn.disabled = selectedTables.size === 0;
    });
});

difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        storyDifficulty = btn.dataset.value;
        difficultyBtns.forEach(b => b.classList.toggle('selected', b === btn));
    });
});

function applyConfig(config) {
    selectedTables.clear();
    tableBtns.forEach(btn => {
        const val = btn.dataset.value;
        if (config[val]) { selectedTables.add(parseInt(val)); btn.classList.add('selected'); }
        else btn.classList.remove('selected');
    });
    startBtn.disabled = selectedTables.size === 0;
}

// --- Adult Lock Logic ---
settingsIcon.addEventListener('click', () => {
    adultPin = ""; adultPinDisplay.textContent = ""; adultLockFeedback.textContent = "";
    showScreen(adultLockScreen);
});

adultLockCancel.addEventListener('click', () => showScreen(currentVisibleScreen));

// --- Reset Logic ---
globalResetBtn.addEventListener('click', () => showScreen(resetConfirmScreen));
confirmResetNo.addEventListener('click', () => showScreen(currentVisibleScreen));
confirmResetYes.addEventListener('click', () => {
    isGuest = false; loggedInUser = null; selectedTables.clear();
    tableBtns.forEach(b => b.classList.remove('selected'));
    startBtn.disabled = true; userDisplay.textContent = ''; usernameInput.value = '';
    showScreen(authScreen);
});

// --- Quiz Logic ---
function startQuiz() {
    if (currentGame === 'times_tables' && selectedTables.size === 0) return showScreen(configScreen);
    
    if (loggedInUser && !isGuest) {
        const config = currentGame === 'times_tables' ? {} : { difficulty: storyDifficulty };
        if (currentGame === 'times_tables') {
            for (let i = 2; i <= 12; i++) config[i] = selectedTables.has(i);
        }
        callApi('UpdateConfig', { username: loggedInUser, gameType: currentGame, config });
        if (!userGames[currentGame]) userGames[currentGame] = {};
        userGames[currentGame].config = config;
    }

    isTransitioning = false; score = 0; currentQuestionIndex = 0; sessionDetails = [];
    scoreEl.textContent = '0';

    if (currentGame === 'times_tables') {
        questionPool = Array.from(selectedTables).flatMap(t => 
            Array.from({length: 11}, (_, i) => ({ a: i+2, b: t, answer: (i+2)*t }))
        ).sort(() => Math.random() - 0.5);
        questionTotalEl.textContent = "10";
    } else {
        questionPool = STORY_POOL.filter(q => q.difficulty === 'easy' || storyDifficulty === 'hard')
            .sort(() => Math.random() - 0.5).slice(0, 5);
        questionTotalEl.textContent = "5";
    }

    showQuestion();
    showScreen(quizScreen);
}

function showQuestion() {
    currentQuestion = questionPool[currentQuestionIndex];
    questionEl.textContent = currentGame === 'times_tables' ? `${currentQuestion.a} x ${currentQuestion.b} = ?` : currentQuestion.text;
    questionNumEl.textContent = currentQuestionIndex + 1;
    answerInput.value = ''; feedbackEl.textContent = '';
}

function checkAnswer() {
    if (isTransitioning) return;
    const userAnswer = parseInt(answerInput.value);
    if (isNaN(userAnswer)) return;

    isTransitioning = true;
    const isCorrect = userAnswer === currentQuestion.answer;
    if (currentGame === 'times_tables') sessionDetails.push({ table: currentQuestion.b, correct: isCorrect });
    else sessionDetails.push({ correct: isCorrect });

    if (isCorrect) {
        score++; scoreEl.textContent = score;
        showMsg(feedbackEl, 'Correct! 🌟');
    } else showMsg(feedbackEl, `Oops! It was ${currentQuestion.answer} 🔄`, true);

    setTimeout(() => {
        isTransitioning = false;
        const total = currentGame === 'times_tables' ? 10 : 5;
        if (++currentQuestionIndex < total && currentQuestionIndex < questionPool.length) showQuestion();
        else finishSession();
    }, 1500);
}

async function finishSession() {
    const total = currentGame === 'times_tables' ? 10 : 5;
    finalScoreEl.textContent = score;
    resultTotalEl.textContent = total;
    statsSummary.style.display = 'none';
    if (loggedInUser && !isGuest) {
        const { ok, data } = await callApi('SaveSession', { username: loggedInUser, gameType: currentGame, score, details: sessionDetails });
        if (ok && currentGame === 'times_tables') renderStats(data);
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
function setupKeypad(btns, actionFn) {
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isTransitioning && btns === keypadBtns) return;
            actionFn(btn.textContent);
        });
    });
}

setupKeypad(keypadBtns, (val) => {
    if (val === 'C') answerInput.value = '';
    else if (val === '⌫') answerInput.value = answerInput.value.slice(0, -1);
    else if (answerInput.value.length < 3) answerInput.value += val;
});

setupKeypad(passKeypadBtns, (val) => {
    if (val === 'C') passcodeInput.value = '';
    else if (val === '⌫') passcodeInput.value = passcodeInput.value.slice(0, -1);
    else if (passcodeInput.value.length < 4) passcodeInput.value += val;
});

setupKeypad(adultKeypadBtns, (val) => {
    if (val === 'C') adultPin = "";
    else if (val === '⌫') adultPin = adultPin.slice(0, -1);
    else if (adultPin.length < 6) adultPin += val;
    adultPinDisplay.textContent = "•".repeat(adultPin.length);
    if (adultPin.length === 6) {
        if (adultPin === "123321") showScreen(currentGame === 'story_maths' ? storyConfigScreen : configScreen);
        else {
            showMsg(adultLockFeedback, "Wrong PIN! ❌", true);
            adultPin = "";
            setTimeout(() => { adultPinDisplay.textContent = ""; adultLockFeedback.textContent = ""; }, 1000);
        }
    }
});

submitBtn.addEventListener('click', checkAnswer);
startBtn.addEventListener('click', startQuiz);
startStoryBtn.addEventListener('click', startQuiz);
anotherGoBtn.addEventListener('click', startQuiz);
resetBtn.addEventListener('click', () => showScreen(gameSelectionScreen));

document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (quizScreen.style.display === 'block') checkAnswer();
        else if (passcodeScreen.style.display === 'block') submitAuth();
    }
});
