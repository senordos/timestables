// Timestables App - Simplified & Modular
window.onerror = (msg, url, line) => alert(`Script Error: ${msg}\nLine: ${line}`);

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    const state = {
        selectedTables: new Set(),
        questionPool: [],
        currentQuestionIndex: 0,
        score: 0,
        currentQuestion: null,
        loggedInUser: null,
        isGuest: false,
        authMode: null,
        sessionDetails: [],
        currentVisibleScreen: null,
        adultPin: "",
        isTransitioning: false,
        currentGame: null,
        storyDifficulty: 'easy',
        userGames: {},
        storyPool: []
    };

    // --- DOM Elements ---
    const $ = id => document.getElementById(id);
    const $$ = selector => document.querySelectorAll(selector);

    const screens = {
        config: $('config-screen'),
        storyConfig: $('story-config-screen'),
        selection: $('game-selection-screen'),
        quiz: $('quiz-screen'),
        results: $('results-screen'),
        auth: $('auth-screen'),
        passcode: $('passcode-screen'),
        resetConfirm: $('reset-confirm-screen'),
        adultLock: $('adult-lock-screen')
    };

    const ui = {
        userDisplay: $('user-display'),
        question: $('question'),
        questionNum: $('question-num'),
        questionTotal: $('question-total'),
        score: $('score'),
        answerInput: $('answer'),
        feedback: $('feedback'),
        quizKeypad: $('quiz-keypad'),
        finalScore: $('final-score'),
        resultTotal: $('result-total'),
        statsSummary: $('stats-summary'),
        tableStatsGrid: $('table-stats-grid')
    };

    // --- Helpers ---
    const showScreen = (screen) => {
        if (!screen) return;
        Object.values(screens).forEach(s => { if(s) s.style.display = 'none'; });
        if ([screens.resetConfirm, screens.adultLock].includes(screen)) {
            screen.style.display = 'flex';
        } else {
            screen.style.display = 'block';
            state.currentVisibleScreen = screen;
        }
    };

    const showMsg = (el, text, isError = false) => {
        if (!el) return;
        el.textContent = text;
        el.className = 'feedback-area ' + (isError ? 'wrong' : 'correct');
    };

    const callApi = async (endpoint, body) => {
        try {
            const res = await fetch(`/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-App-Source': 'TimestablesApp' },
                body: JSON.stringify(body)
            });
            return { ok: res.ok, data: await res.json().catch(() => ({})) };
        } catch (e) { return { ok: false, data: { message: "Connection error! 🌐" } }; }
    };

    // --- Data Loading ---
    const loadStoryPool = async () => {
        try {
            const res = await fetch('questions.json');
            state.storyPool = await res.json();
            console.log("Story pool loaded:", state.storyPool.length);
        } catch (e) { console.error("Failed to load stories", e); }
    };

    // --- Auth ---
    const startAuth = (mode) => {
        state.authMode = mode;
        const name = $('username-input').value.trim();
        if (!name) return showMsg($('auth-name-feedback'), "Please enter a fun name! 🤖", true);
        
        $('passcode-title').textContent = mode === 'register' ? 'Create Passcode' : 'Enter Passcode';
        $('passcode-input').value = '';
        showMsg($('auth-feedback'), "");
        showScreen(screens.passcode);
    };

    const submitAuth = async () => {
        const passcode = $('passcode-input').value;
        if (passcode.length < 4) return showMsg($('auth-feedback'), "Need 4 numbers! 🔒", true);
        
        showMsg($('auth-feedback'), "Working... ⏳");
        const name = $('username-input').value.trim();
        const { ok, data } = await callApi('AuthUser', { mode: state.authMode, username: name, passcode });
        
        if (ok) {
            state.loggedInUser = data.user;
            state.isGuest = false;
            state.userGames = data.games || {};
            ui.userDisplay.textContent = `Playing as: ${state.loggedInUser}`;
            showScreen(screens.selection);
        } else showMsg($('auth-feedback'), data.message || "Error", true);
    };

    // --- Quiz Logic ---
    const startQuiz = () => {
        if (state.currentGame === 'times_tables' && state.selectedTables.size === 0) return showScreen(screens.config);

        state.isTransitioning = false;
        state.score = 0;
        state.currentQuestionIndex = 0;
        state.sessionDetails = [];
        ui.score.textContent = '0';

        if (state.currentGame === 'times_tables') {
            state.questionPool = Array.from(state.selectedTables).flatMap(t => 
                Array.from({length: 11}, (_, i) => ({ a: i+2, b: t, answer: (i+2)*t }))
            ).sort(() => Math.random() - 0.5);
            ui.questionTotal.textContent = "10";
        } else {
            const filtered = state.storyPool.filter(q => {
                if (state.storyDifficulty === 'easy') return q.difficulty === 'easy';
                if (state.storyDifficulty === 'medium') return q.difficulty === 'easy' || q.difficulty === 'medium';
                return true;
            }).sort(() => Math.random() - 0.5).slice(0, 5);

            state.questionPool = filtered.map(q => {
                const set = q.sets[Math.floor(Math.random() * q.sets.length)];
                let text = q.text;
                set.v.forEach((val, i) => text = text.replace(`{${i}}`, val));
                return { text, answer: set.a };
            });
            ui.questionTotal.textContent = "5";
        }

        showQuestion();
        showScreen(screens.quiz);
    };

    const showQuestion = () => {
        state.currentQuestion = state.questionPool[state.currentQuestionIndex];
        ui.question.textContent = state.currentGame === 'times_tables' 
            ? `${state.currentQuestion.a} x ${state.currentQuestion.b} = ?` 
            : state.currentQuestion.text;
        ui.questionNum.textContent = state.currentQuestionIndex + 1;
        ui.answerInput.value = '';
        ui.feedback.style.display = 'none';
        ui.quizKeypad.style.display = 'block';
    };

    const checkAnswer = () => {
        if (state.isTransitioning) return;
        const userAnswer = parseInt(ui.answerInput.value);
        if (isNaN(userAnswer)) return;

        state.isTransitioning = true;
        const isCorrect = userAnswer === state.currentQuestion.answer;
        state.sessionDetails.push({ table: state.currentQuestion.b, correct: isCorrect });

        if (isCorrect) {
            state.score++;
            ui.score.textContent = state.score;
            showMsg(ui.feedback, 'Correct! 🌟');
        } else showMsg(ui.feedback, `Oops! It was ${state.currentQuestion.answer} 🔄`, true);

        ui.quizKeypad.style.display = 'none';
        ui.feedback.style.display = 'flex';
        ui.feedback.style.height = '180px';
        ui.feedback.style.alignItems = 'center';
        ui.feedback.style.justifyContent = 'center';
        ui.feedback.style.fontSize = '2em';

        setTimeout(() => {
            state.isTransitioning = false;
            const total = state.currentGame === 'times_tables' ? 10 : 5;
            if (++state.currentQuestionIndex < total && state.currentQuestionIndex < state.questionPool.length) {
                showQuestion();
            } else finishSession();
        }, 1500);
    };

    const finishSession = async () => {
        const total = state.currentGame === 'times_tables' ? 10 : 5;
        ui.finalScore.textContent = state.score;
        ui.resultTotal.textContent = total;
        ui.statsSummary.style.display = 'none';
        
        if (state.loggedInUser && !state.isGuest) {
            const { ok, data } = await callApi('SaveSession', { 
                username: state.loggedInUser, gameType: state.currentGame, score: state.score, details: state.sessionDetails 
            });
            if (ok && state.currentGame === 'times_tables') renderStats(data);
        }
        showScreen(screens.results);
    };

    const renderStats = (stats) => {
        if ($('last-5-avg')) $('last-5-avg').textContent = stats.last5Avg;
        ui.tableStatsGrid.innerHTML = '';
        for (let i = 2; i <= 12; i++) {
            const val = stats.tableBreakdown[i];
            const item = document.createElement('div');
            item.className = 'stat-item';
            const colorClass = val === null ? 'stat-none' : (val >= 80 ? 'stat-good' : (val < 50 ? 'stat-bad' : ''));
            item.innerHTML = `<span>${i}x</span><span class="stat-val ${colorClass}">${val !== null ? val + '%' : '-'}</span>`;
            ui.tableStatsGrid.appendChild(item);
        }
        ui.statsSummary.style.display = 'block';
    };

    // --- Inputs ---
    const setupKeypad = (btns, actionFn) => {
        btns.forEach(btn => btn.addEventListener('click', () => {
            if (state.isTransitioning && btns === $$('.key-btn')) return;
            actionFn(btn.textContent);
        }));
    };

    setupKeypad($$('.key-btn'), (val) => {
        if (val === 'C') ui.answerInput.value = '';
        else if (val === '⌫') ui.answerInput.value = ui.answerInput.value.slice(0, -1);
        else if (ui.answerInput.value.length < 3) ui.answerInput.value += val;
    });

    setupKeypad($$('.pass-key-btn'), (val) => {
        const input = $('passcode-input');
        if (val === 'C') input.value = '';
        else if (val === '⌫') input.value = input.value.slice(0, -1);
        else if (input.value.length < 4) input.value += val;
    });

    setupKeypad($$('.adult-key-btn'), (val) => {
        if (val === 'C') state.adultPin = "";
        else if (val === '⌫') state.adultPin = state.adultPin.slice(0, -1);
        else if (state.adultPin.length < 6) state.adultPin += val;
        
        $('adult-pin-display').textContent = "•".repeat(state.adultPin.length);
        if (state.adultPin.length === 6) {
            if (state.adultPin === "123321") {
                showScreen(state.currentGame === 'story_maths' ? screens.storyConfig : screens.config);
            } else {
                showMsg($('adult-lock-feedback'), "Wrong PIN! ❌", true);
                state.adultPin = "";
                setTimeout(() => { $('adult-pin-display').textContent = ""; $('adult-lock-feedback').textContent = ""; }, 1000);
            }
        }
    });

    // --- Events ---
    $('login-mode-btn').onclick = () => startAuth('login');
    $('register-mode-btn').onclick = () => startAuth('register');
    $('guest-btn').onclick = () => {
        state.isGuest = true;
        ui.userDisplay.textContent = 'Playing as Guest';
        showScreen(screens.selection);
    };
    
    $('submit-auth-btn').onclick = submitAuth;
    $('back-auth-btn').onclick = () => showScreen(screens.auth);

    $('play-tt-btn').onclick = () => {
        state.currentGame = 'times_tables';
        const config = state.userGames.times_tables?.config || {};
        if (Object.values(config).some(v => v === true)) {
            state.selectedTables = new Set(Object.keys(config).filter(k => config[k]).map(Number));
            startQuiz();
        } else showScreen(screens.config);
    };

    $('play-story-btn').onclick = () => {
        state.currentGame = 'story_maths';
        const config = state.userGames.story_maths?.config || {};
        if (config.difficulty) {
            state.storyDifficulty = config.difficulty;
            $$('.difficulty-btn').forEach(b => b.classList.toggle('selected', b.dataset.value === state.storyDifficulty));
            startQuiz();
        } else showScreen(screens.storyConfig);
    };

    $$('.back-to-selection').forEach(btn => btn.onclick = () => showScreen(screens.selection));

    $$('.table-btn').forEach(btn => btn.onclick = () => {
        const val = parseInt(btn.dataset.value);
        state.selectedTables.has(val) ? state.selectedTables.delete(val) : state.selectedTables.add(val);
        btn.classList.toggle('selected');
        $('start-btn').disabled = state.selectedTables.size === 0;
    });

    $$('.difficulty-btn').forEach(btn => btn.onclick = () => {
        state.storyDifficulty = btn.dataset.value;
        $$('.difficulty-btn').forEach(b => b.classList.toggle('selected', b === btn));
    });

    $('settings-icon').onclick = () => {
        state.adultPin = ""; 
        $('adult-pin-display').textContent = ""; 
        showScreen(screens.adultLock);
    };

    $('global-reset-btn').onclick = () => showScreen(screens.resetConfirm);
    $('confirm-reset-no').onclick = () => showScreen(state.currentVisibleScreen);
    $('confirm-reset-yes').onclick = () => location.reload();

    $('submit-btn').onclick = checkAnswer;
    $('start-btn').onclick = startQuiz;
    $('start-story-btn').onclick = startQuiz;
    $('another-go-btn').onclick = startQuiz;
    $('reset-btn').onclick = () => showScreen(screens.selection);

    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (screens.quiz.style.display === 'block') checkAnswer();
            else if (screens.passcode.style.display === 'block') submitAuth();
        }
    });

    // --- Init ---
    loadStoryPool();
    showScreen(screens.auth);
});