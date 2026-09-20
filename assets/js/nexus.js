// Nexus asks a Cloudflare Worker (which holds the Anthropic API key and the
// real knowledge as a system prompt) for an answer. This local
// KNOWLEDGE/answerFor() is only a fallback for when that endpoint is
// unreachable, so the page still answers something rather than erroring out.

const ASK_ENDPOINT = "https://ask.josephdiaz.dev/";

const KNOWLEDGE = [
  {
    keywords: ["who is joseph", "who are you", "about joseph", "who is he", "tell me about joseph"],
    answer: "Joseph Diaz is a Service Desk & Technical Analyst at Major League Baseball, working in AI/ML enablement and platform engineering — and building things like me in his spare time."
  },
  {
    keywords: ["what does he do", "what does joseph do", "his job", "his role", "his title", "occupation", "what is his job"],
    answer: "By day: Service Desk & Technical Analyst at Major League Baseball. By night: running a home server and the AI agent that maintains it."
  },
  {
    keywords: ["where does he live", "where is he based", "where is joseph", "his location", "what city", "new york"],
    answer: "New York, NY."
  },
  {
    keywords: ["what does he focus on", "his focus", "specialize", "specialty", "expertise", "focus area"],
    answer: "AI/ML enablement, workplace technology, and platform engineering."
  },
  {
    keywords: ["education", "degree", "what school", "what college", "what university", "where did he study", "his major"],
    answer: "B.S. in Computer Information Systems from Lehman College."
  },
  {
    keywords: ["certifications", "certificates", "certified", "credentials", "coursera courses", "what courses"],
    answer: "Nine credentials so far — Prompt Engineering, Machine Learning, and Generative AI, from Vanderbilt University, DeepLearning.AI, Stanford Online, and Okta. Full list is in the portfolio's certifications log."
  },
  {
    keywords: ["skills", "his stack", "technologies", "what tools", "what languages", "python", "datadog skill"],
    answer: "Python, Datadog, Machine Learning, Claude Code, and Prompt Engineering."
  },
  {
    keywords: ["experience", "career history", "how many years", "work history", "his background"],
    answer: "Five-plus years at Major League Baseball — Information Security Intern, then IT Service Desk & Data Analyst, now Service Desk & Technical Analyst."
  },
  {
    keywords: ["current job", "current role", "works at mlb", "major league baseball", "present role", "works now"],
    answer: "Since November 2020, Service Desk & Technical Analyst at Major League Baseball — building Datadog observability pipelines and exploring predictive models for system downtime."
  },
  {
    keywords: ["homelab agent", "autonomous agent", "self maintaining", "ai agent", "the agent"],
    answer: "The home server runs itself: an AI agent built on Claude handles health checks, diagnoses failures, and fixes what it can — pausing only before anything irreversible."
  },
  {
    keywords: ["homelab", "home lab", "his server", "self hosted", "docker stack", "home server"],
    answer: "A home server running a Docker stack, tending to media and sync services."
  },
  {
    keywords: ["printer agent", "printerlogic", "printer project", "printer fleet", "printers"],
    answer: "The Printer Agent: built on an existing PrinterLogic install, it watches an entire printer fleet through a Datadog dashboard, flags empty cartridges, and answers IT's questions directly in Slack."
  },
  {
    keywords: ["contact", "email", "reach him", "get in touch", "how to hire", "his email"],
    answer: "josephdiaz17@gmail.com — or find him on LinkedIn and GitHub, both linked in the portfolio."
  },
  {
    keywords: ["hiring", "open to work", "looking for a job", "new role", "job opportunity", "available for work"],
    answer: "He's open to new roles in AI/ML and platform engineering. Reach out directly — I can't negotiate on his behalf."
  },
  {
    keywords: ["other projects", "more projects", "what else has he built", "side projects"],
    answer: "More in progress — check back."
  },
  {
    keywords: ["this website", "this site", "who built this", "who made this", "how was this built"],
    answer: "This interface, built with Claude Code and hosted on GitHub Pages."
  },
  {
    keywords: ["hobbies", "hobby", "runescape", "basketball", "pokemon", "pokémon", "free time", "spare time", "outside of work"],
    answer: "Outside of work: RuneScape (voldimordt), basketball (guard, 3-point shooter), and Pokémon (Water type, Squirtle is his favorite)."
  },
  {
    keywords: ["hello", "hi there", "hey", "greetings", "good morning", "good evening"],
    answer: "Hello — ask me anything about Joseph."
  },
  {
    keywords: ["thank you", "thanks", "appreciate it"],
    answer: "Anytime."
  }
];

const FALLBACK = "I don't have an answer for that one. Try asking about his work, his skills, the homelab, or how to reach him.";

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

// ---------- Reactive Orb (embedded Spline scene) ----------
// A remix of a community Spline scene, published at my.spline.design —
// purely decorative (nexus.css sets pointer-events:none
// on the embed so it never captures clicks/scroll for its own cursor-tracking
// or camera controls; the page scrolls normally no matter where the cursor
// is). It's a cross-origin iframe, so we can't tell when the 3D scene has
// actually finished rendering — the iframe's `load` event only means the
// Spline app's own shell has loaded, which shows a plain BLACK loading
// screen of its own before the scene (10-20s+ on a slow connection/GPU,
// worse on mobile) finally renders. Crossfading on `load` alone risked
// revealing that black loading screen instead of either our fallback image
// or the finished scene — which is exactly the "sometimes just shows black"
// bug. So: prefer to wait for `load` plus a minimum buffer — but `load`
// isn't guaranteed to fire (e.g. a mobile bfcache restore doesn't refire
// it), so a hard maximum timeout always reveals eventually regardless,
// rather than getting stuck showing the static fallback forever.
(function () {
  const embed = document.querySelector("[data-bot-embed]");
  if (!embed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const MIN_DELAY_MS = 3500;
  const MAX_WAIT_MS = 12000;
  const fallback = document.querySelector("[data-bot-fallback]");
  let loaded = false;
  let revealed = false;

  function reveal() {
    if (revealed) return;
    revealed = true;
    embed.classList.add("is-loaded");
    if (fallback) fallback.classList.add("is-hidden");
  }

  embed.addEventListener("load", () => {
    loaded = true;
  });

  const startedAt = Date.now();
  embed.src = embed.dataset.src;

  (function waitForReadyish() {
    const elapsed = Date.now() - startedAt;
    if ((loaded && elapsed >= MIN_DELAY_MS) || elapsed >= MAX_WAIT_MS) {
      reveal();
      return;
    }
    setTimeout(waitForReadyish, 300);
  })();
})();

// ---------- UI wiring ----------

document.addEventListener("DOMContentLoaded", () => {
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
    output.textContent = "querying the network…";
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
