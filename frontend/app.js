let currentAnswer;
let score = 0;

const questionEl = document.getElementById('question');
const answerInput = document.getElementById('answer');
const submitBtn = document.getElementById('submit-btn');
const feedbackEl = document.getElementById('feedback');
const scoreEl = document.getElementById('score');
const keyBtns = document.querySelectorAll('.key-btn');

function handleKeypadPress(key) {
    if (key === 'C') {
        answerInput.value = '';
    } else if (key === '⌫') {
        answerInput.value = answerInput.value.slice(0, -1);
    } else {
        answerInput.value += key;
    }
    answerInput.focus();
}

keyBtns.forEach(btn => {
    btn.addEventListener('click', () => handleKeypadPress(btn.textContent));
});

function generateQuestion() {
    const num1 = Math.floor(Math.random() * 12) + 1;
    const num2 = Math.floor(Math.random() * 12) + 1;
    currentAnswer = num1 * num2;
    questionEl.textContent = `${num1} x ${num2} = ?`;
    answerInput.value = '';
    answerInput.focus();
}

function checkAnswer() {
    const userAnswer = parseInt(answerInput.value);
    
    if (isNaN(userAnswer)) return;

    if (userAnswer === currentAnswer) {
        score++;
        scoreEl.textContent = score;
        showFeedback('Correct! 🌟', 'correct');
        setTimeout(generateQuestion, 1000);
    } else {
        showFeedback('Try again! 🔄', 'wrong');
        answerInput.value = '';
        answerInput.focus();
    }
}

function showFeedback(text, className) {
    feedbackEl.textContent = text;
    feedbackEl.className = 'feedback-area ' + className;
    setTimeout(() => {
        feedbackEl.textContent = '';
    }, 1000);
}

submitBtn.addEventListener('click', checkAnswer);

answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        checkAnswer();
    }
});

// Start the quiz
generateQuestion();
