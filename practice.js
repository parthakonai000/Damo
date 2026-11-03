/* ==========================================================
   P. K PRACTICE — Practice Quiz with Sound & Vibration (practice.js)
   ========================================================== */
(() => {
  'use strict';

  const KEYS = {
    streak: 'pk_streak',
    theme: 'pk_theme',
    masteredVerbs: 'pk_mastered_verbs'
  };
  const QUIZ_LEN = 10;
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
     SOUND & VIBRATION ENGINE (সাউন্ড এবং ভাইব্রেশন)
     ========================================================== */
  function vibrateDevice(pattern) {
    try {
      if (navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // ব্রাউজার বা ডিভাইস ভাইব্রেশন সাপোর্ট না করলে ইগনোর করবে
    }
  }

  const HAPTIC = {
    tap: () => vibrateDevice(25),                 // বাটন বা সাউন্ডে ক্লিক করলে হালকা ভাইব্রেশন
    correct: () => vibrateDevice(60),             // সঠিক উত্তরে স্মুথ সিঙ্গেল ভাইব্রেশন
    wrong: () => vibrateDevice([100, 50, 120]),   // ভুল উত্তরে ডাবল বাজ ভাইব্রেশন
    finish: () => vibrateDevice([60, 40, 100])    // কুইজ শেষ হলে সেলিব্রেশন ভাইব্রেশন
  };

  function speakText(text, withVibrate = false) {
    if (withVibrate) HAPTIC.tap();

    if (!('speechSynthesis' in window)) {
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
      question: $('#quizQuestion'),
      result: $('#quizResult')
    },
    qCounter: $('#qCounter'),
    qScore: $('#qScore'),
    progressBar: $('#progressBar'),
    qBengali: $('#qBengali'),
    options: $('#options'),
    feedback: $('#feedback'),
    nextBtn: $('#nextBtn')
  };

  /* ---------- Theme ---------- */
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

  /* ---------- Streak ---------- */
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
    dom.streakNote.textContent = data.last === todayKey() ? 'Done for today ✓' : 'Finish quiz to count!';
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

  /* ---------- Load Data ---------- */
  const isValidVerb = v =>
    v && ['verb', 'bengaliMeaning', 'englishMeaning', 'example'].every(k => typeof v[k] === 'string' && v[k].trim());

  async function loadVerbs() {
    dom.status.replaceChildren(el('div', { class: 'spinner' }), el('p', { text: 'Loading quiz...' }));
    dom.panels.question.classList.remove('active');
    try {
      const res = await fetch(DATA_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const valid = (Array.isArray(json) ? json : []).filter(isValidVerb);
      if (valid.length < 4) throw new Error('Need at least 4 valid phrasal verbs in data.json');
      state.verbs = valid;
      dom.status.replaceChildren();
      startQuiz();
    } catch (err) {
      console.error(err);
      dom.status.replaceChildren(
        el('p', { text: '⚠️ Could not load quiz data.' }),
        el('p', { class: 'muted', text: err.message })
      );
    }
  }

  function showPanel(name) {
    Object.entries(dom.panels).forEach(([k, p]) => p.classList.toggle('active', k === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- Quiz Logic ---------- */
  function startQuiz() {
    const total = Math.min(QUIZ_LEN, state.verbs.length);
    const pool = shuffle(state.verbs).slice(0, total);
    const questions = pool.map(item => {
      const distractors = shuffle(state.verbs.filter(v => v.verb !== item.verb)).slice(0, 3);
      const options = shuffle([item, ...distractors]).map(v => v.verb);
      return { item, options };
    });
    state.quiz = { questions, index: 0, answers: [], locked: false };
    showPanel('question');
    renderQuestion();
  }

  const scoreCount = () => state.quiz.answers.filter(a => a.correct).length;

  function renderQuestion() {
    const q = state.quiz;
    const cur = q.questions[q.index];
    const total = q.questions.length;
    q.locked = false;

    dom.qCounter.textContent = `Question ${q.index + 1} of ${total}`;
    dom.qScore.textContent = `Score: ${scoreCount()}`;
    dom.progressBar.style.width = `${(q.index / total) * 100}%`;
    dom.qBengali.textContent = cur.item.bengaliMeaning;

    dom.options.replaceChildren();
    cur.options.forEach((text, i) => {
      // প্রতিটি অপশনের পাশে স্পিকার বাটন
      const speakBtn = el('span', {
        class: 'opt-speak-btn',
        role: 'button',
        tabindex: '0',
        title: `${text}-এর উচ্চারণ শুনুন`,
        'aria-label': `Listen to ${text}`
      }, ['🔊']);

      speakBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // স্পিকারে টিপলে যেন উত্তর সিলেক্ট না হয়ে যায়, শুধু সাউন্ড হয়
        speakText(text, true);
      });

      const btn = el('button', { class: 'option', type: 'button' }, [
        el('span', { class: 'opt-left' }, [
          el('span', { class: 'badge', text: 'ABCD'[i] }),
          el('span', { class: 'opt-text', text })
        ]),
        el('span', { class: 'opt-right' }, [
          speakBtn,
          el('span', { class: 'mark', 'aria-hidden': 'true' })
        ])
      ]);

      btn.addEventListener('click', () => selectAnswer(i));
      dom.options.append(btn);
    });

    dom.feedback.hidden = true;
    dom.nextBtn.hidden = true;
    dom.nextBtn.textContent = q.index === total - 1 ? 'See Results →' : 'Next →';
  }

  function selectAnswer(i) {
    const q = state.quiz;
    if (!q || q.locked) return;
    q.locked = true;

    const cur = q.questions[q.index];
    const selected = cur.options[i];
    const correct = selected === cur.item.verb;
    q.answers.push({ item: cur.item, selected, correct });

    // ১. সঠিক বা ভুল উত্তর অনুযায়ী মোবাইল ভাইব্রেট করবে
    if (correct) {
      HAPTIC.correct();
      // সঠিক উত্তর দিলে mastered লিস্টেও সেভ করে নেবে
      const mastered = new Set(readJSON(KEYS.masteredVerbs, []));
      mastered.add(cur.item.verb);
      writeJSON(KEYS.masteredVerbs, Array.from(mastered));
    } else {
      HAPTIC.wrong();
    }

    // ২. সাথে সাথে সঠিক উত্তরটির উচ্চারণ শুনিয়ে দেবে
    speakText(cur.item.verb, false);

    $$('.option', dom.options).forEach((btn, idx) => {
      const text = cur.options[idx];
      btn.setAttribute('aria-disabled', 'true');
      const mark = $('.mark', btn);
      if (text === cur.item.verb) { btn.classList.add('correct'); mark.textContent = '✓'; }
      else if (idx === i) { btn.classList.add('wrong'); mark.textContent = '✗'; }
      else btn.classList.add('dim');
    });

    dom.qScore.textContent = `Score: ${scoreCount()}`;
    dom.progressBar.style.width = `${((q.index + 1) / q.questions.length) * 100}%`;

    // ফিডব্যাক বক্সে আবার শোনার বাটন
    const listenFullBtn = el('button', {
      class: 'fb-speak-btn',
      type: 'button',
      title: 'আবার শুনুন'
    }, ['🔊 Listen Again']);

    listenFullBtn.addEventListener('click', () => {
      speakText(`${cur.item.verb}. Meaning ${cur.item.englishMeaning}. Example: ${cur.item.example}`, true);
    });

    dom.feedback.className = `feedback ${correct ? 'good' : 'bad'}`;
    dom.feedback.replaceChildren(
      el('div', { class: 'fb-head' }, [
        el('div', { class: 'fb-title', text: correct ? '✓ Correct! দারুণ!' : `✗ সঠিক উত্তর: “${cur.item.verb}”` }),
        listenFullBtn
      ]),
      el('div', { class: 'fb-line', text: `${cur.item.verb} = ${cur.item.englishMeaning}` }),
      el('div', { class: 'fb-example', text: `“${cur.item.example}”` })
    );
    dom.feedback.hidden = false;
    dom.nextBtn.hidden = false;
  }

  function nextQuestion() {
    const q = state.quiz;
    if (!q || !q.locked) return;
    HAPTIC.tap();
    if (q.index >= q.questions.length - 1) finishQuiz();
    else { q.index++; renderQuestion(); }
  }

  function finishQuiz() {
    HAPTIC.finish();
    const streakRes = recordPractice();
    renderStreak(streakRes.changed);

    const answers = state.quiz.answers;
    const total = answers.length;
    const correct = answers.filter(a => a.correct).length;
    const pct = Math.round((correct / total) * 100);

    let headline = 'Keep Practicing! 💪';
    if (pct === 100) headline = 'Perfect Score! 🏆';
    else if (pct >= 80) headline = 'Awesome Job! 🎉';
    else if (pct >= 50) headline = 'Good Effort! 👍';

    const root = dom.panels.result;
    root.replaceChildren();

    root.append(el('div', { class: 'card-lg result-hero practice-wrap' }, [
      el('div', { class: 'score-ring', style: `--pct:${pct}` }, [
        el('div', { class: 'score-inner' }, [
          el('span', { class: 'score-num', text: `${correct}/${total}` }),
          el('span', { class: 'score-pct', text: `${pct}%` })
        ])
      ]),
      el('h2', { text: headline }),
      el('p', {
        class: 'muted',
        text: streakRes.changed
          ? `🔥 Streak updated to ${streakRes.count} ${streakRes.count === 1 ? 'day' : 'days'}!`
          : `🔥 You're on a ${streakRes.count}-day streak!`
      })
    ]));

    // রেজাল্ট পেজে প্রতিটি প্রশ্নের রিভিউ এবং সাউন্ড বাটন
    const reviewWrap = el('div', { class: 'practice-wrap', style: 'margin-top: 16px;' });
    answers.forEach(a => {
      const spk = el('button', { class: 'opt-speak-btn', type: 'button', title: 'উচ্চারণ শুনুন' }, ['🔊']);
      spk.addEventListener('click', () => speakText(a.item.verb, true));

      reviewWrap.append(el('div', { class: 'review-item' }, [
        el('div', {}, [
          el('strong', { text: `${a.correct ? '✅' : '❌'} ${a.item.verb} ` }),
          el('span', { class: 'muted', lang: 'bn', text: `(${a.item.bengaliMeaning})` }),
          !a.correct ? el('div', { class: 'muted', style: 'font-size:0.82rem;', text: `You picked: ${a.selected}` }) : null
        ]),
        spk
      ]));
    });
    root.append(reviewWrap);

    const again = el('button', { class: 'btn btn-primary', type: 'button', text: '🔄 Practice Again' });
    again.addEventListener('click', () => { HAPTIC.tap(); startQuiz(); });

    const home = el('a', { href: 'index.html', class: 'btn btn-secondary', text: '🏠 Back to Home' });
    root.append(el('div', { class: 'result-actions practice-wrap' }, [again, home]));

    showPanel('result');
  }

  function init() {
    $('#year').textContent = new Date().getFullYear();
    initTheme();
    renderStreak();
    dom.nextBtn.addEventListener('click', nextQuestion);
    loadVerbs();
  }

  init();
})();
