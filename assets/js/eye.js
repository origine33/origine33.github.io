// The Eye asks a Cloudflare Worker (which holds the Anthropic API key and
// the real knowledge as a system prompt) for an answer. This local
// KNOWLEDGE/answerFor() is only a fallback for when that endpoint is
// unreachable, so the page still answers something rather than erroring out.

const ASK_ENDPOINT = "https://ask.josephdiaz.dev/";

const KNOWLEDGE = [
  {
    keywords: ["who is joseph", "who are you", "about joseph", "who is he", "tell me about joseph"],
    answer: "Joseph Diaz walks among mortals as a Service Desk & Technical Analyst for Major League Baseball, wielding Python and Datadog against the chaos of downtime."
  },
  {
    keywords: ["what does he do", "what does joseph do", "his job", "his role", "his title", "occupation", "what is his job"],
    answer: "By day, Service Desk & Technical Analyst at Major League Baseball. By night, keeper of a home server and its autonomous agent."
  },
  {
    keywords: ["where does he live", "where is he based", "where is joseph", "his location", "what city", "new york"],
    answer: "He dwells in New York, NY — far from Mordor, but no less vigilant."
  },
  {
    keywords: ["what does he focus on", "his focus", "specialize", "specialty", "expertise", "focus area"],
    answer: "His gaze is fixed on AI/ML enablement, workplace technology, and platform engineering."
  },
  {
    keywords: ["education", "degree", "what school", "what college", "what university", "where did he study", "his major"],
    answer: "He was trained at Lehman College, earning a Bachelor of Science in Computer Information Systems."
  },
  {
    keywords: ["certifications", "certificates", "certified", "credentials", "coursera courses", "what courses"],
    answer: "Nine credentials mark his path — Prompt Engineering, Machine Learning, and Generative AI, from Vanderbilt University, DeepLearning.AI, Stanford Online, and Okta. The full accounting lies in the Archive's certifications log."
  },
  {
    keywords: ["skills", "his stack", "technologies", "what tools", "what languages", "python", "datadog skill"],
    answer: "His arsenal: Python, Datadog, Machine Learning, Claude Code, and the dark art of Prompt Engineering."
  },
  {
    keywords: ["experience", "career history", "how many years", "work history", "his background"],
    answer: "Five years and more in service to Major League Baseball — first as an Information Security Intern, then IT Service Desk & Data Analyst, and now Service Desk & Technical Analyst."
  },
  {
    keywords: ["current job", "current role", "works at mlb", "major league baseball", "present role", "works now"],
    answer: "Since November 2020, Service Desk & Technical Analyst at Major League Baseball — building Datadog observability pipelines and exploring predictive models for system downtime."
  },
  {
    keywords: ["homelab agent", "autonomous agent", "self maintaining", "ai agent", "the agent"],
    answer: "The home server tends itself — an autonomous agent built on Claude runs health checks, diagnoses failures, and fixes what it can, pausing only before anything irreversible."
  },
  {
    keywords: ["homelab", "home lab", "his server", "self hosted", "docker stack", "home server"],
    answer: "A fortress of his own making: a home server running a Docker stack, tending to media and sync services without complaint."
  },
  {
    keywords: ["printer agent", "printerlogic", "printer project", "printer fleet", "printers"],
    answer: "The Printer Agent: born from an existing PrinterLogic install, it watches an entire printer fleet through a Datadog dashboard, warns of empty cartridges, and answers IT's questions directly in Slack."
  },
  {
    keywords: ["contact", "email", "reach him", "get in touch", "how to hire", "his email"],
    answer: "Reach him at josephdiaz17@gmail.com, or seek him on LinkedIn and GitHub — the paths are laid out in the Archive."
  },
  {
    keywords: ["hiring", "open to work", "looking for a job", "new role", "job opportunity", "available for work"],
    answer: "He is open to new roles in AI/ML and platform engineering. Speak to him directly — the Eye cannot negotiate on his behalf."
  },
  {
    keywords: ["other projects", "more projects", "what else has he built", "side projects"],
    answer: "Beyond the homelab and the printer fleet, more is being forged. Return again — the Archive will grow."
  },
  {
    keywords: ["this website", "this site", "who built this", "who made this", "how was this built"],
    answer: "This very Archive — built with Claude Code, hosted on GitHub Pages, watched over by an Eye of no small vanity."
  },
  {
    keywords: ["hobbies", "hobby", "runescape", "basketball", "pokemon", "pokémon", "free time", "spare time", "outside of work"],
    answer: "Beyond the terminal: RuneScape (voldimordt), basketball (guard, 3-point shooter), and Pokémon (Water type, Squirtle is his favorite)."
  },
  {
    keywords: ["hello", "hi there", "hey", "greetings", "good morning", "good evening"],
    answer: "The Eye sees you. Ask, and it shall answer what it knows of Joseph."
  },
  {
    keywords: ["thank you", "thanks", "appreciate it"],
    answer: "The Eye accepts your gratitude in silence."
  }
];

const FALLBACK = "The Eye does not perceive an answer to that riddle. Ask of his work, his skills, his homelab, or how to reach him.";

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function scoreEntry(input, entry) {
  let score = 0;
  for (const phrase of entry.keywords) {
    if (input.includes(phrase)) {
      score += phrase.split(" ").length; // longer, more specific phrases win ties
    }
  }
  return score;
}

function answerFor(question) {
  const input = normalize(question);
  if (!input) return null;

  let best = null;
  let bestScore = 0;
  for (const entry of KNOWLEDGE) {
    const score = scoreEntry(input, entry);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best ? best.answer : FALLBACK;
}

// ---------- fire (original pixel-fire simulation, no external assets) ----------

function startFire(canvas) {
  const ctx = canvas.getContext("2d");
  const cols = 100;
  const rows = 60;
  const cells = new Uint8Array(cols * rows);
  const MAX = 36;

  // deep red -> ember orange -> pale gold, biased dark/red (not a yellow campfire)
  const palette = [];
  for (let i = 0; i <= MAX; i++) {
    const t = i / MAX;
    let r, g, b;
    if (t < 0.5) {
      const k = t / 0.5;
      r = Math.round(10 + k * 150);
      g = Math.round(2 + k * 20);
      b = 2;
    } else if (t < 0.85) {
      const k = (t - 0.5) / 0.35;
      r = Math.round(160 + k * 90);
      g = Math.round(22 + k * 90);
      b = Math.round(2 + k * 20);
    } else {
      const k = (t - 0.85) / 0.15;
      r = 250;
      g = Math.round(112 + k * 110);
      b = Math.round(22 + k * 140);
    }
    palette.push(`rgb(${r},${g},${b})`);
  }

  for (let x = 0; x < cols; x++) {
    cells[(rows - 1) * cols + x] = MAX;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function step() {
    for (let x = 0; x < cols; x++) {
      for (let y = 1; y < rows; y++) {
        const src = y * cols + x;
        const decay = Math.floor(Math.random() * 3);
        const drift = Math.floor(Math.random() * 3) - 1;
        const dstX = Math.min(cols - 1, Math.max(0, x + drift));
        const dst = (y - 1) * cols + dstX;
        cells[dst] = Math.max(0, cells[src] - decay);
      }
    }
  }

  function render() {
    const cw = canvas.width / cols;
    const ch = canvas.height / rows;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = cells[y * cols + x];
        if (v === 0) continue;
        ctx.fillStyle = palette[v];
        ctx.fillRect(x * cw, y * ch, cw + 1, ch + 1);
      }
    }
  }

  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  if (reduceMotion) {
    for (let i = 0; i < 40; i++) step();
    render();
    return;
  }

  function loop() {
    step();
    render();
    requestAnimationFrame(loop);
  }
  loop();
}

// ---------- UI wiring ----------

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.querySelector("[data-fire]");
  if (canvas) startFire(canvas);

  const form = document.querySelector("[data-ask-form]");
  const input = document.querySelector("[data-ask-input]");
  const output = document.querySelector("[data-ask-output]");
  const chips = document.querySelectorAll("[data-chip]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  async function fetchLiveAnswer(question) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(ASK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (!data.answer) throw new Error("empty answer");
      return data.answer;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function ask(question) {
    if (!question.trim()) return;
    output.classList.remove("visible");
    output.textContent = "consulting the flame…";
    output.classList.add("visible", "pending");

    let answer;
    try {
      answer = await fetchLiveAnswer(question);
    } catch {
      answer = answerFor(question); // Worker unreachable — fall back to local matching
    }

    output.classList.remove("pending");
    if (reduceMotion) {
      output.textContent = answer;
      return;
    }
    typeOut(output, answer);
  }

  function typeOut(el, text) {
    el.textContent = "";
    let i = 0;
    function tick() {
      el.textContent = text.slice(0, i);
      i += 2;
      if (i <= text.length) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = text;
      }
    }
    tick();
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      ask(input.value);
    });
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      input.value = chip.textContent;
      ask(chip.textContent);
      input.focus();
    });
  });
});
