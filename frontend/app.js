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
let currentGame = null; 
let storyDifficulty = 'easy';
let userGames = {}; 

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
const quizKeypad = document.getElementById('quiz-keypad');

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
    // EASY (2 Steps)
    { 
        text: "Captain Barnaby has {0} coins. He gives {1} to Polly. Then he finds {2} more on the beach. How many coins now?", 
        sets: [{v:[12,5,3], a:10}, {v:[15,6,4], a:13}, {v:[10,4,5], a:11}], difficulty: 'easy' 
    },
    { 
        text: "There are {0} astronauts. {1} float out. Then {2} aliens hop inside. How many friends inside now?", 
        sets: [{v:[6,2,4], a:8}, {v:[8,3,5], a:10}, {v:[5,1,6], a:10}], difficulty: 'easy' 
    },
    { 
        text: "A baker makes {0} cupcakes. A hungry giant eats {1}. The baker bakes {2} more. How many ready to sell?", 
        sets: [{v:[15,8,5], a:12}, {v:[20,12,6], a:14}, {v:[12,5,4], a:11}], difficulty: 'easy' 
    },
    { 
        text: "{0} bees are sleeping. {1} fly out. Later, {2} fly back. How many bees in the hive now?", 
        sets: [{v:[9,4,2], a:7}, {v:[12,5,3], a:10}, {v:[15,7,4], a:12}], difficulty: 'easy' 
    },
    { 
        text: "There are {0} toys. You take out {1}. You put {2} back because they are sleepy. How many toys are still out?", 
        sets: [{v:[20,10,3], a:13}, {v:[15,8,4], a:11}, {v:[25,15,5], a:15}], difficulty: 'easy' 
    },
    { 
        text: "{0} T-Rexes are dancing. {1} go home. Then {2} Triceratops arrive. How many dinosaurs now?", 
        sets: [{v:[8,3,6], a:11}, {v:[10,4,5], a:11}, {v:[6,2,8], a:12}], difficulty: 'easy' 
    },
    { 
        text: "{0} fish are swimming. {1} hide. Then {2} more swim out. How many fish can you see swimming now?", 
        sets: [{v:[12,5,3], a:10}, {v:[10,4,6], a:12}, {v:[15,8,4], a:11}], difficulty: 'easy' 
    },
    { 
        text: "{0} people are on a bus. {1} get off. At the next stop, {2} get on. How many people now?", 
        sets: [{v:[10,4,7], a:13}, {v:[15,6,8], a:17}, {v:[12,5,5], a:12}], difficulty: 'easy' 
    },
    
    // MEDIUM (3 Steps)
    { 
        text: "A basket has {0} apples and {1} oranges. You eat {2} apples. Then you add {3} more oranges. How many fruit total?", 
        sets: [{v:[7,7,4,2], a:12}, {v:[6,8,3,4], a:15}, {v:[5,10,2,5], a:18}], difficulty: 'medium' 
    },
    { 
        text: "Nutty the Squirrel has {0} nuts. He hides {1} in a tree and {2} in a hole. A bird gives him {3} more. How many nuts now?", 
        sets: [{v:[10,4,3,2], a:5}, {v:[15,5,5,4], a:9}, {v:[12,4,4,3], a:7}], difficulty: 'medium' 
    },
    { 
        text: "You have {0} lego bricks. You use {1} for a car and {2} for a plane. Then you find {3} more. How many bricks now?", 
        sets: [{v:[15,5,4,6], a:12}, {v:[20,8,6,10], a:16}, {v:[25,10,10,5], a:10}], difficulty: 'medium' 
    },
    { 
        text: "A tree has {0} birds. {1} fly away. {2} more land. Then {3} more fly away. How many birds now?", 
        sets: [{v:[8,3,5,2], a:8}, {v:[10,4,6,3], a:9}, {v:[12,5,8,4], a:11}], difficulty: 'medium' 
    },
    { 
        text: "A pirate finds {0} gems. He loses {1} in the sand. He finds {2} more. Then he gives {3} to a monkey. How many now?", 
        sets: [{v:[15,6,4,2], a:11}, {v:[20,8,5,4], a:13}, {v:[12,5,6,3], a:10}], difficulty: 'medium' 
    },
    { 
        text: "You have {0} markers. {1} dry up. You buy a pack of {2}. Then you give {3} to a friend. How many markers now?", 
        sets: [{v:[12,4,8,3], a:13}, {v:[10,3,6,2], a:11}, {v:[15,5,10,5], a:15}], difficulty: 'medium' 
    },
    { 
        text: "There are {0} frogs on a log. {1} jump off. {2} more jump on. Then {3} more jump off. How many frogs on the log?", 
        sets: [{v:[9,3,6,4], a:8}, {v:[12,4,5,3], a:10}, {v:[10,2,4,5], a:7}], difficulty: 'medium' 
    },
    
    // HARD (4 Steps)
    { 
        text: "You have {0} sweets. You give {1} to your sister and {2} to your brother. Your mum gives you {3} more. Then you eat {4}. How many left?", 
        sets: [{v:[20,5,5,8,3], a:15}, {v:[25,6,6,10,5], a:18}, {v:[15,3,3,6,4], a:11}], difficulty: 'hard' 
    },
    { 
        text: "A shelf has {0} books. You take {1} out. Your friend puts {2} back. A teacher takes {3} books. Then you find {4} more. How many now?", 
        sets: [{v:[12,4,6,2,1], a:13}, {v:[15,5,8,3,2], a:17}, {v:[10,3,5,2,4], a:14}], difficulty: 'hard' 
    },
    { 
        text: "There are {0} red flowers and {1} blue flowers. Wind blows away {2} red. You plant {3} yellow. Then {4} blue wilt. How many now?", 
        sets: [{v:[7,7,3,5,2], a:14}, {v:[10,10,4,6,3], a:19}, {v:[6,6,2,8,2], a:16}], difficulty: 'hard' 
    },
    { 
        text: "15 balloons are at a party. {1} balloons pop! You blow up {2} more. {3} balloons fly out. A friend brings {4} more. How many now?", 
        sets: [{v:[15,4,6,2,3], a:18}, {v:[20,5,8,4,2], a:21}, {v:[12,3,5,1,4], a:17}], difficulty: 'hard' 
    },
    { 
        text: "A farm has {0} animals. {1} cows go to the barn. {2} pigs go to the field. {3} sheep arrive. {4} cow comes back. How many now?", 
        sets: [{v:[10,3,2,5,1], a:11}, {v:[15,4,3,8,2], a:18}, {v:[12,5,4,6,3], a:12}], difficulty: 'hard' 
    },
    { 
        text: "There are {0} kids at a park. {1} go home. {2} more arrive. {3} go to the slides. Then {4} leave. How many kids left?", 
        sets: [{v:[20,6,4,3,2], a:13}, {v:[15,4,5,2,3], a:11}, {v:[25,10,8,5,4], a:14}], difficulty: 'hard' 
    },
    { 
        text: "A shop has {0} robot toys. It sells {1}. It gets {2} more in a box. {3} are broken and taken away. Then {4} more are sold. How many now?", 
        sets: [{v:[20,8,10,5,2], a:15}, {v:[15,5,12,4,3], a:15}, {v:[25,10,15,6,4], a:20}], difficulty: 'hard' 
    },
    { 
        text: "A castle has {0} knights. {1} go on a quest. {2} new knights arrive. {3} go to sleep. Then {4} come back from the quest. How many ready?", 
        sets: [{v:[12,4,6,3,2], a:13}, {v:[15,5,8,4,3], a:17}, {v:[10,3,5,2,1], a:11}], difficulty: 'hard' 
    }
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
        // Filter and BAKE story questions
        const filtered = STORY_POOL.filter(q => {
            if (storyDifficulty === 'easy') return q.difficulty === 'easy';
            if (storyDifficulty === 'medium') return q.difficulty === 'easy' || q.difficulty === 'medium';
            return true;
        }).sort(() => Math.random() - 0.5).slice(0, 5);

        questionPool = filtered.map(q => {
            const set = q.sets[Math.floor(Math.random() * q.sets.length)];
            let text = q.text;
            set.v.forEach((val, i) => {
                text = text.replace(`{${i}}`, val);
            });
            return { text, answer: set.a, difficulty: q.difficulty };
        });
        questionTotalEl.textContent = "5";
    }

    showQuestion();
    showScreen(quizScreen);
}

function showQuestion() {
    currentQuestion = questionPool[currentQuestionIndex];
    questionEl.textContent = currentGame === 'times_tables' ? `${currentQuestion.a} x ${currentQuestion.b} = ?` : currentQuestion.text;
    questionNumEl.textContent = currentQuestionIndex + 1;
    answerInput.value = ''; 
    feedbackEl.textContent = '';
    feedbackEl.style.display = 'none';
    quizKeypad.style.display = 'block';
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

    quizKeypad.style.display = 'none';
    feedbackEl.style.display = 'block';
    feedbackEl.style.height = '180px'; // Approx height of keypad
    feedbackEl.style.display = 'flex';
    feedbackEl.style.alignItems = 'center';
    feedbackEl.style.justifyContent = 'center';
    feedbackEl.style.fontSize = '2em';

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
