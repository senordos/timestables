// State Management
let selectedTables = new Set();
let questionPool = [];
let currentQuestionIndex = 0;
let score = 0;
let currentQuestion = null;

// DOM Elements
const configScreen = document.getElementById('config-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');

const tableBtns = document.querySelectorAll('.table-btn');
const startBtn = document.getElementById('start-btn');

const questionEl = document.getElementById('question');
const questionNumEl = document.getElementById('question-num');
const scoreEl = document.getElementById('score');
const answerInput = document.getElementById('answer');
const submitBtn = document.getElementById('submit-btn');
const feedbackEl = document.getElementById('feedback');

const finalScoreEl = document.getElementById('final-score');
const anotherGoBtn = document.getElementById('another-go-btn');
const resetBtn = document.getElementById('reset-btn');

const keypadBtns = document.querySelectorAll('.key-btn');

// --- Screen Navigation ---
function showScreen(screen) {
    [configScreen, quizScreen, resultsScreen].forEach(s => s.style.display = 'none');
    screen.style.display = 'block';
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
        // Multipliers 2-12 (No 1x)
        for (let i = 2; i <= 12; i++) {
            pool.push({ a: t, b: i, answer: t * i });
        }
    });
    // Shuffle the pool
    return pool.sort(() => Math.random() - 0.5);
}

function startQuiz() {
    questionPool = createQuestionPool();
    currentQuestionIndex = 0;
    score = 0;
    
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

    if (userAnswer === currentQuestion.answer) {
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
            showResults();
        }
    }, 1500);
}

function showFeedback(text, className) {
    feedbackEl.textContent = text;
    feedbackEl.className = 'feedback-area ' + className;
}

function showResults() {
    finalScoreEl.textContent = score;
    showScreen(resultsScreen);
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

// Handle Enter key for non-keypad users
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && quizScreen.style.display === 'block') {
        checkAnswer();
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
