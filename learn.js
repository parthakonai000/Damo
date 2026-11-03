/* ==========================================================
   P. K PRACTICE — Learn Page Logic with Vibration (learn.js)
   ========================================================== */
(() => {
  'use strict';

  const KEYS = {
    streak: 'pk_streak',
    theme: 'pk_theme',
    completedLessons: 'pk_completed_lessons',
    masteredVerbs: 'pk_mastered_verbs'
  };

  const LESSON_SIZE = 10; // প্রতি লেসনে ১০টি করে ফ্রেজাল ভার্ব
  const PASS_PERCENT = 80; // লেসন কমপ্লিট করতে হলে ৮০% নম্বর পেতে হবে
  const DATA_URL = 'data.json';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    }
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c === null || c === undefined) return;
      node.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return node;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function readJSON(key, fallback = null) {
    try {
      const val = JSON.parse(localStorage.getItem(key));
      return val !== null ? val : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  /* ==========================================================
     VIBRATION & SPEECH ENGINE (ভাইব্রেশন এবং সাউন্ড)
     ========================================================== */
  function vibrateDevice(pattern) {
    try {
      if (navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // ডিভাইস ভাইব্রেশন সাপোর্ট না করলে ইগনোর করবে
    }
  }

  const HAPTIC = {
    tap: () => vibrateDevice(25),                 // যেকোনো বাটনে ক্লিক করলে হালকা ভাইব্রেশন
    correct: () => vibrateDevice(60),             // সঠিক উত্তরে স্মুথ সিঙ্গেল ভাইব্রেশন
    wrong: () => vibrateDevice([100, 50, 120]),   // ভুল উত্তরে ডাবল বাজ ভাইব্রেশন
    finish: () => vibrateDevice([60, 40, 100])    // লেসন শেষ হলে সেলিব্রেশন ভাইব্রেশন
  };

  function speakText(text, withVibrate = false) {
    if (withVibrate) HAPTIC.tap();

    if (!('speechSynthesis' in window)) {
      alert('আপনার ব্রাউজার অডিও সাপোর্ট করে না।');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }

  /* ---------- State & DOM ---------- */
  const state = {
    verbs: [],
    lessons: [],
    currentLessonIdx: 0,
    cardIdx: 0,
    quiz: null
  };

  const dom = {
    html: document.documentElement,
    themeToggle: $('#themeToggle'),
    streak: $('#streak'),
    streakCount: $('#streakCount'),
    streakLabel: $('#streakLabel'),
    streakNote: $('#streakNote'),
    status: $('#status'),
    panels: {
      list: $('#lessonListPanel'),
      study: $('#studyPanel'),
      checkpoint: $('#checkpointPanel'),
      result: $('#lessonResultPanel')
    },
    overallMeta: $('#overallMeta'),
    overallPct: $('#overallPct'),
    overallBar: $('#overallBar'),
    lessonGrid: $('#lessonGrid'),
    // Study DOM
    studyCounter: $('#studyCounter'),
    studyBar: $('#studyBar'),
    backToLessonsBtn: $('#backToLessonsBtn'),
    avatarImg: $('#avatarImg'),
    speakVerbBtn: $('#speakVerbBtn'),
    speakAllBtn: $('#speakAllBtn'),
    studyVerb: $('#studyVerb'),
    studyBn: $('#studyBn'),
    studyEn: $('#studyEn'),
    studyEx: $('#studyEx'),
    prevCardBtn: $('#prevCardBtn'),
    nextCardBtn: $('#nextCardBtn'),
    // Checkpoint DOM
    cpCounter: $('#cpCounter'),
    cpScore: $('#cpScore'),
    cpBar: $('#cpBar'),
    cpAvatarImg: $('#cpAvatarImg'),
    cpBengali: $('#cpBengali'),
    cpOptions: $('#cpOptions'),
    cpFeedback: $('#cpFeedback'),
    cpQuitBtn: $('#cpQuitBtn'),
    cpNextBtn: $('#cpNextBtn')
  };

  /* ==========================================================
     THEME & STREAK
     ========================================================== */
  function applyTheme(theme, persist) {
    dom.html.setAttribute('data-theme', theme);
    dom.themeToggle.checked = theme === 'dark';
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0a12' : '#ffffff');
    if (persist) { try { localStorage.setItem(KEYS.theme, theme); } catch {} }
  }

  function initTheme() {
    applyTheme(dom.html.getAttribute('data-theme') || 'light', false);
    dom.themeToggle.addEventListener('change', () => {
      HAPTIC.tap();
      applyTheme(dom.themeToggle.checked ? 'dark' : 'light', true);
    });
  }

  const pad = n => String(n).padStart(2, '0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayKey = () => dateKey(new Date());
  const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d); };

  function loadStreak() {
    const raw = readJSON(KEYS.streak);
    if (raw && Number.isInteger(raw.count) && raw.count >= 0) {
      return { count: raw.count, last: raw.last, best: raw.best || raw.count };
    }
    return { count: 0, last: null, best: 0 };
  }

  function activeStreak(data = loadStreak()) {
    if (data.last === todayKey() || data.last === yesterdayKey()) return data.count;
    return 0;
  }

  function streakLevel(n) {
    if (n <= 0) return 0;
    if (n < 3) return 1;
    if (n < 7) return 2;
    if (n < 14) return 3;
    if (n < 30) return 4;
    return 5;
  }

  function renderStreak(animate = false) {
    const data = loadStreak();
    const count = activeStreak(data);
    dom.streak.dataset.level = String(streakLevel(count));
    dom.streakCount.textContent = String(count);
    dom.streakLabel.textContent = count === 1 ? 'day streak' : 'days streak';
    dom.streakNote.textContent = data.last === todayKey() ? 'Done for today ✓' : 'Complete a lesson!';
    if (animate) {
      dom.streak.classList.remove('pop');
      void dom.streak.offsetWidth;
      dom.streak.classList.add('pop');
    }
  }

  function recordPractice() {
    const data = loadStreak();
    const today = todayKey();
    if (data.last === today) return { count: activeStreak(data), changed: false };
    data.count = data.last === yesterdayKey() ? data.count + 1 : 1;
    data.last = today;
    data.best = Math.max(data.best || 0, data.count);
    writeJSON(KEYS.streak, data);
    return { count: data.count, changed: true };
  }

  /* ==========================================================
     PROGRESS STORAGE (Auto Lesson & Mastered Tracking)
     ========================================================== */
  function getCompletedLessons() {
    const arr = readJSON(KEYS.completedLessons, []);
    return Array.isArray(arr) ? arr : [];
  }

  function markLessonCompleted(lessonIndex, verbsInLesson) {
    const completed = new Set(getCompletedLessons());
    completed.add(lessonIndex);
    writeJSON(KEYS.completedLessons, Array.from(completed));

    const mastered = new Set(readJSON(KEYS.masteredVerbs, []));
    verbsInLesson.forEach(v => mastered.add(v.verb));
    writeJSON(KEYS.masteredVerbs, Array.from(mastered));
  }

  /* ==========================================================
     LOAD DATA & BUILD LESSONS
     ========================================================== */
  const isValidVerb = v =>
    v && ['verb', 'bengaliMeaning', 'englishMeaning', 'example'].every(k => typeof v[k] === 'string' && v[k].trim());

  async function loadData() {
    dom.status.replaceChildren(el('div', { class: 'spinner' }), el('p', { text: 'Loading lessons...' }));
    try {
      const res = await fetch(DATA_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const valid = (Array.isArray(json) ? json : []).filter(isValidVerb);
      if (!valid.length) throw new Error('No valid phrasal verbs found in data.json');

      state.verbs = valid;
      buildLessons();
      dom.status.replaceChildren();
      renderLessonList();
    } catch (err) {
      console.error(err);
      dom.status.replaceChildren(
        el('p', { text: '⚠️ Could not load data.json.' }),
        el('p', { class: 'muted', text: err.message })
      );
    }
  }

  function buildLessons() {
    state.lessons = [];
    for (let i = 0; i < state.verbs.length; i += LESSON_SIZE) {
      state.lessons.push(state.verbs.slice(i, i + LESSON_SIZE));
    }
  }

  function showPanel(name) {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    Object.entries(dom.panels).forEach(([key, panel]) => {
      if (panel) panel.classList.toggle('active', key === name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ==========================================================
     1. LESSON LIST DASHBOARD
     ========================================================== */
  function renderLessonList() {
    const completed = getCompletedLessons();
    const totalLessons = state.lessons.length;
    const doneCount = completed.filter(idx => idx < totalLessons).length;
    const pct = totalLessons ? Math.round((doneCount / totalLessons) * 100) : 0;

    dom.overallPct.textContent = `${pct}%`;
    dom.overallBar.style.width = `${pct}%`;
    dom.overallMeta.textContent = `${totalLessons}টি লেসনের মধ্যে ${doneCount}টি সম্পন্ন হয়েছে (${state.verbs.length}টি ফ্রেজাল ভার্ব)`;

    let firstIncomplete = 0;
    for (let i = 0; i < totalLessons; i++) {
      if (!completed.includes(i)) {
        firstIncomplete = i;
        break;
      }
    }

    dom.lessonGrid.replaceChildren();

    state.lessons.forEach((group, idx) => {
      const isDone = completed.includes(idx);
      const isCurrent = !isDone && idx === firstIncomplete;

      const sampleVerbs = group.slice(0, 3).map(v => v.verb).join(', ');
      const badgeText = isDone ? '✓ Completed' : isCurrent ? '🔥 Start Next' : 'Open';
      const badgeClass = isDone ? 'done' : isCurrent ? 'now' : 'open';

      const card = el('button', {
        class: `lesson-card ${isDone ? 'completed' : ''} ${isCurrent ? 'current' : ''}`,
        type: 'button'
      }, [
        el('div', { class: 'lesson-left' }, [
          el('div', { class: 'lesson-num', text: isDone ? '✓' : String(idx + 1) }),
          el('div', { class: 'lesson-info' }, [
            el('h3', { text: `Lesson ${idx + 1}` }),
            el('p', { text: `${group.length} verbs • ${sampleVerbs}...` })
          ])
        ]),
        el('span', { class: `lesson-badge ${badgeClass}`, text: badgeText })
      ]);

      card.addEventListener('click', () => {
        HAPTIC.tap();
        openLessonStudy(idx);
      });
      dom.lessonGrid.append(card);
    });

    showPanel('list');
  }

  /* ==========================================================
     2. STUDY MODE
     ========================================================== */
  function openLessonStudy(lessonIdx) {
    state.currentLessonIdx = lessonIdx;
    state.cardIdx = 0;
    showPanel('study');
    renderStudyCard(true);
  }

  function renderStudyCard(autoSpeak = false) {
    const lesson = state.lessons[state.currentLessonIdx];
    const item = lesson[state.cardIdx];
    const total = lesson.length;

    dom.studyCounter.textContent = `Lesson ${state.currentLessonIdx + 1} • Card ${state.cardIdx + 1} of ${total}`;
    dom.studyBar.style.width = `${((state.cardIdx + 1) / total) * 100}%`;

    dom.studyVerb.textContent = item.verb;
    dom.studyBn.textContent = item.bengaliMeaning;
    dom.studyEn.textContent = item.englishMeaning;
    dom.studyEx.textContent = `“${item.example}”`;

    dom.prevCardBtn.disabled = state.cardIdx === 0;
    dom.nextCardBtn.textContent = state.cardIdx === total - 1 ? 'Take Lesson Quiz 🎯' : 'Next →';

    if (autoSpeak) {
      setTimeout(() => speakText(item.verb, false), 250);
    }
  }

  /* ==========================================================
     3. LESSON CHECKPOINT QUIZ
     ========================================================== */
  function startCheckpointQuiz() {
    const lesson = state.lessons[state.currentLessonIdx];
    const pool = shuffle(lesson);

    const questions = pool.map(item => {
      const distractors = shuffle(state.verbs.filter(v => v.verb !== item.verb)).slice(0, 3);
      const options = shuffle([item, ...distractors]).map(v => v.verb);
      return { item, options };
    });

    state.quiz = { questions, index: 0, answers: [], locked: false };
    showPanel('checkpoint');
    renderCheckpointQuestion();
  }

  const cpScoreCount = () => state.quiz.answers.filter(a => a.correct).length;

  function renderCheckpointQuestion() {
    const q = state.quiz;
    const cur = q.questions[q.index];
    const total = q.questions.length;
    q.locked = false;

    dom.cpCounter.textContent = `Lesson ${state.currentLessonIdx + 1} Quiz • ${q.index + 1} of ${total}`;
    dom.cpScore.textContent = `Score: ${cpScoreCount()}`;
    dom.cpBar.style.width = `${(q.index / total) * 100}%`;
    dom.cpBengali.textContent = cur.item.bengaliMeaning;

    dom.cpOptions.replaceChildren();
    cur.options.forEach((text, i) => {
      const btn = el('button', { class: 'option', type: 'button' }, [
        el('span', { class: 'badge', text: 'ABCD'[i] }),
        el('span', { class: 'opt-text', text }),
        el('span', { class: 'mark', 'aria-hidden': 'true' })
      ]);
      btn.addEventListener('click', () => answerCheckpoint(i));
      dom.cpOptions.append(btn);
    });

    dom.cpFeedback.hidden = true;
    dom.cpNextBtn.hidden = true;
    dom.cpNextBtn.textContent = q.index === total - 1 ? 'Finish Lesson →' : 'Next →';
  }

  function answerCheckpoint(i) {
    const q = state.quiz;
    if (!q || q.locked) return;
    q.locked = true;

    const cur = q.questions[q.index];
    const selected = cur.options[i];
    const correct = selected === cur.item.verb;
    q.answers.push({ item: cur.item, selected, correct });

    // সঠিক বা ভুল উত্তর অনুযায়ী ভাইব্রেশন
    if (correct) {
      HAPTIC.correct();
    } else {
      HAPTIC.wrong();
    }

    $$('.option', dom.cpOptions).forEach((btn, idx) => {
      const text = cur.options[idx];
      btn.setAttribute('aria-disabled', 'true');
      const mark = $('.mark', btn);
      if (text === cur.item.verb) { btn.classList.add('correct'); mark.textContent = '✓'; }
      else if (idx === i) { btn.classList.add('wrong'); mark.textContent = '✗'; }
      else btn.classList.add('dim');
    });

    speakText(cur.item.verb, false);

    dom.cpScore.textContent = `Score: ${cpScoreCount()}`;
    dom.cpBar.style.width = `${((q.index + 1) / q.questions.length) * 100}%`;

    dom.cpFeedback.className = `feedback ${correct ? 'good' : 'bad'}`;
    dom.cpFeedback.replaceChildren(
      el('div', { class: 'fb-title', text: correct ? '✓ দারুণ! সঠিক উত্তর!' : `✗ সঠিক উত্তর হলো: “${cur.item.verb}”` }),
      el('div', { class: 'fb-line', text: `${cur.item.verb} = ${cur.item.englishMeaning}` })
    );
    dom.cpFeedback.hidden = false;
    dom.cpNextBtn.hidden = false;
  }

  function finishCheckpoint() {
    HAPTIC.finish();

    const answers = state.quiz.answers;
    const total = answers.length;
    const correct = answers.filter(a => a.correct).length;
    const pct = Math.round((correct / total) * 100);
    const passed = pct >= PASS_PERCENT;

    // কুইজের সব প্রশ্ন শেষ করলেই আজকের স্ট্রিক কাউন্ট হয়ে যাবে
    const streakRes = recordPractice();
    renderStreak(streakRes.changed);

    // ৮০% বা তার বেশি পেলে লেসনটি Completed হিসেবে সেভ হবে
    if (passed) {
      markLessonCompleted(state.currentLessonIdx, state.lessons[state.currentLessonIdx]);
    }

    const root = dom.panels.result;
    root.replaceChildren();

    root.append(el('div', { class: 'card-lg result-hero study-wrap' }, [
      el('div', { class: 'score-ring', style: `--pct:${pct}` }, [
        el('div', { class: 'score-inner' }, [
          el('span', { class: 'score-num', text: `${correct}/${total}` }),
          el('span', { class: 'score-pct', text: `${pct}%` })
        ])
      ]),
      el('h2', { text: passed ? `🎉 Lesson ${state.currentLessonIdx + 1} Mastered!` : 'Almost there! 💪' }),
      el('p', {
        class: 'muted',
        lang: 'bn',
        text: passed
          ? 'অভিনন্দন! এই লেসনটি স্বয়ংক্রিয়ভাবে কমপ্লিট হিসেবে সেভ হয়ে গেছে।'
          : `আজকের স্ট্রিক কাউন্ট হয়েছে! তবে লেসনটি কমপ্লিট করতে অন্তত ${PASS_PERCENT}% স্কোর প্রয়োজন।`
      })
    ]));

    const actions = el('div', { class: 'result-actions study-wrap' });

    if (passed && state.currentLessonIdx + 1 < state.lessons.length) {
      const nextLessonBtn = el('button', { class: 'btn btn-primary', type: 'button', text: `Start Lesson ${state.currentLessonIdx + 2} →` });
      nextLessonBtn.addEventListener('click', () => {
        HAPTIC.tap();
        openLessonStudy(state.currentLessonIdx + 1);
      });
      actions.append(nextLessonBtn);
    } else {
      const retryBtn = el('button', { class: 'btn btn-primary', type: 'button', text: '🔄 Review & Try Again' });
      retryBtn.addEventListener('click', () => {
        HAPTIC.tap();
        openLessonStudy(state.currentLessonIdx);
      });
      actions.append(retryBtn);
    }

    const allLessonsBtn = el('button', { class: 'btn btn-secondary', type: 'button', text: '📋 All Lessons' });
    allLessonsBtn.addEventListener('click', () => {
      HAPTIC.tap();
      renderLessonList();
    });
    actions.append(allLessonsBtn);

    root.append(actions);
    showPanel('result');
  }

  /* ==========================================================
     INIT
     ========================================================== */
  function init() {
    $('#year').textContent = new Date().getFullYear();
    initTheme();
    renderStreak();

    // Home বাটনে ক্লিক করলে ভাইব্রেশন
    const homeBtn = $('a[href="index.html"]');
    if (homeBtn) homeBtn.addEventListener('click', () => HAPTIC.tap());

    dom.backToLessonsBtn.addEventListener('click', () => {
      HAPTIC.tap();
      renderLessonList();
    });

    dom.speakVerbBtn.addEventListener('click', () => {
      const item = state.lessons[state.currentLessonIdx][state.cardIdx];
      speakText(item.verb, true);
    });

    dom.speakAllBtn.addEventListener('click', () => {
      const item = state.lessons[state.currentLessonIdx][state.cardIdx];
      speakText(`${item.verb}. Meaning ${item.englishMeaning}. Example: ${item.example}`, true);
    });

    dom.prevCardBtn.addEventListener('click', () => {
      if (state.cardIdx > 0) {
        HAPTIC.tap();
        state.cardIdx--;
        renderStudyCard(true);
      }
    });

    dom.nextCardBtn.addEventListener('click', () => {
      HAPTIC.tap();
      const lesson = state.lessons[state.currentLessonIdx];
      if (state.cardIdx < lesson.length - 1) {
        state.cardIdx++;
        renderStudyCard(true);
      } else {
        startCheckpointQuiz();
      }
    });

    dom.cpQuitBtn.addEventListener('click', () => {
      HAPTIC.tap();
      showPanel('study');
      renderStudyCard(false);
    });

    dom.cpNextBtn.addEventListener('click', () => {
      const q = state.quiz;
      if (!q || !q.locked) return;
      HAPTIC.tap();
      if (q.index >= q.questions.length - 1) finishCheckpoint();
      else {
        q.index++;
        renderCheckpointQuestion();
      }
    });

    loadData();
  }

  init();
})();
