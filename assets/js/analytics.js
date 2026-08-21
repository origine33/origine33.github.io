// First-party analytics — logs pageviews and link clicks to the same
// Cloudflare Worker that powers the Eye (see eye-worker/src/index.js,
// POST /log). No third-party trackers, no cookies. Never blocks navigation:
// click events use sendBeacon so they fire even as the page unloads.

(function () {
  const ENDPOINT = "https://ask.josephdiaz.dev/log";

  function send(payload) {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    } else {
      fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(
        () => {}
      );
    }
  }

  send({ type: "pageview", path: location.pathname, referrer: document.referrer || "" });

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link || !link.href) return;
    const label = (link.textContent || link.href).trim().slice(0, 80);
    send({ type: "click", path: location.pathname, label: `${label} -> ${link.getAttribute("href")}` });
  });
})();
