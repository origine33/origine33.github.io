// Scroll-reveal for [data-reveal] elements — fades/slides them in the first
// time they enter the viewport. Content is visible by default (progressive
// enhancement): the hidden pre-state only applies once this script confirms
// it's running and the visitor hasn't asked for reduced motion, so a
// blocked or failed script never hides content.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduceMotion) {
  document.documentElement.classList.add("js-reveal-ready");
}

document.addEventListener("DOMContentLoaded", () => {
  if (reduceMotion) return;

  const targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;

  // Stagger siblings that reveal together (list items) with a small
  // incremental delay based on position within their parent.
  const groupCounts = new Map();
  targets.forEach((el) => {
    const parent = el.parentElement;
    const i = groupCounts.get(parent) || 0;
    el.style.setProperty("--reveal-delay", `${Math.min(i * 60, 300)}ms`);
    groupCounts.set(parent, i + 1);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
});
