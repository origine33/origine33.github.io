# joseph@homelab

Personal site. Plain HTML/CSS/JS, no build step, no framework — deploys as static files to anything. Live at [josephdiaz.dev](https://josephdiaz.dev), hosted on GitHub Pages.

## Structure

```
index.html                     landing page — "The Eye", a Q&A gate (ask questions about Joseph)
portfolio.html                 the full site: about, experience, projects, homelab, printer-agent, contact
assets/css/style.css           styles for portfolio.html — dark terminal theme
assets/css/eye.css             styles for index.html — fire/ember theme, self-contained
assets/js/status.js            live-status fetch for portfolio.html's #homelab section
assets/js/eye.js               fire animation + Q&A wiring for index.html
assets/fonts/                  JetBrains Mono (display) + IBM Plex Mono (body), self-hosted WOFF2
favicon.svg
CNAME                          josephdiaz.dev (GitHub Pages custom domain)
```

## Preview locally

```
cd portfolio-site
python3 -m http.server 8000
```

Then open `http://localhost:8000` (the Eye) or `http://localhost:8000/portfolio.html` (the full site).

## Deploy

Pushing to `main` auto-deploys via GitHub Pages (repo: [`origine33/origine33.github.io`](https://github.com/origine33/origine33.github.io)). DNS for `josephdiaz.dev` lives in Cloudflare, pointed at GitHub Pages' A records with HTTPS enforced.

## Live status (`portfolio.html` → `#homelab`)

`assets/js/status.js` polls `https://status.josephdiaz.dev/api/status.json`. That endpoint is a small Python server on the home Mac ([`~/homelab-status`](https://github.com/origine33/homelab-status), reading real Docker container state), exposed *only* through a Cloudflare Tunnel — no ports opened on the home network. Both the status server and the tunnel run as LaunchAgents (`~/Library/LaunchAgents/com.joseph.homelab-status.plist` and `com.joseph.cloudflared-homelab-status.plist`) so they survive reboots.

## The Eye (`index.html`)

The landing page's Q&A is answered by a Cloudflare Worker (separate project at [`~/eye-worker`](https://github.com/origine33/eye-worker), not part of this repo), reachable at `https://ask.josephdiaz.dev`. The Worker holds an Anthropic API key as a secret and a system prompt containing everything true about Joseph that's on this site — it can't invent facts beyond that. Rate-limited per IP and with a global daily cap (both enforced via a Workers KV namespace) to bound cost from abuse.

If that endpoint is ever unreachable, `assets/js/eye.js` falls back to a small local keyword-matched FAQ (`KNOWLEDGE` array in that file) so the page never just errors out.

To redeploy the Worker after changing its code:
```
cd ~/eye-worker
npx wrangler deploy
```

## Analytics

`assets/js/analytics.js` beacons every pageview and link click (on both pages) to
the same Worker's `POST /log` endpoint. Combined with each Eye question, everything
lands in a Cloudflare D1 database (`eye-analytics`) with IP, country, and timestamp.
There's no public stats page — query it yourself:

```
~/eye-worker/stats.sh            # summary counts
~/eye-worker/stats.sh visitors   # by IP: event count, country, first/last seen
~/eye-worker/stats.sh pages      # pageviews by path
~/eye-worker/stats.sh questions  # recent Eye questions + answers, with IP
~/eye-worker/stats.sh clicks     # recent link clicks, with IP
~/eye-worker/stats.sh recent     # everything, newest first
```

## Font licensing

JetBrains Mono and IBM Plex Mono are both SIL Open Font License 1.1 — license text is included alongside the font files in `assets/fonts/`.
