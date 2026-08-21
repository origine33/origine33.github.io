// Live status widget for the #homelab section.
//
// Points at a small public JSON endpoint exposed from the homelab via a
// Cloudflare Tunnel (never expose the actual services directly). Until that
// endpoint exists, STATUS_URL is left empty and the page just shows the
// static sample data already baked into the HTML.
//
// Expected response shape:
// {
//   "services": [
//     { "id": "media-stack", "status": "up" | "down", "uptime": "4d" },
//     { "id": "sync-service", "status": "up" | "down", "uptime": "4d" },
//     { "id": "homelab-agent", "status": "up" | "down", "uptime": "39d" }
//   ]
// }

const STATUS_URL = ''; // e.g. 'https://status.yourdomain.com/api/status.json'
const FETCH_TIMEOUT_MS = 4000;

async function loadStatus() {
  if (!STATUS_URL) return;

  const table = document.querySelector('[data-status-table]');
  const caption = document.querySelector('[data-status-caption]');
  if (!table) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(STATUS_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`status endpoint returned ${res.status}`);
    const data = await res.json();

    for (const svc of data.services ?? []) {
      const row = table.querySelector(`[data-service="${svc.id}"]`);
      if (!row) continue;

      const pill = row.querySelector('[data-pill]');
      const uptime = row.querySelector('[data-uptime]');
      const isUp = svc.status === 'up';

      pill.className = `pill ${isUp ? 'up' : 'down'}`;
      pill.textContent = isUp ? 'up' : 'down';
      if (uptime) uptime.textContent = svc.uptime ?? '—';
    }

    if (caption) caption.textContent = `live — last updated ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    // The endpoint is configured but unreachable right now — say so rather
    // than silently leaving stale sample data looking like a live reading.
    if (caption) caption.textContent = 'status endpoint unreachable — retry shortly';
    table.querySelectorAll('[data-pill]').forEach((pill) => {
      pill.className = 'pill unknown';
      pill.textContent = '—';
    });
  } finally {
    clearTimeout(timeout);
  }
}

loadStatus();
