# joseph@homelab

Personal portfolio site. Plain HTML/CSS/JS, no build step, no framework — deploys as static files to anything.

## Structure

```
index.html                     the whole (single-page) site
assets/css/style.css           all styles, dark-only terminal theme
assets/js/status.js            optional live-status fetch for the #homelab section
assets/fonts/                  JetBrains Mono (display) + IBM Plex Mono (body), self-hosted WOFF2
favicon.svg
```

## Before you publish — fill in the placeholders

Search `index.html` for `<!-- TODO -->` comments. They mark everything that's
still a stand-in from the design mockup:

- hero tagline / role
- about section bio, location, focus
- the two non-homelab project entries
- contact links (email, GitHub, resume)

Everything else (the homelab architecture tree, the sample status table, the
agent write-up) is real and already filled in.

## Preview locally

Any static file server works, e.g.:

```
cd portfolio-site
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

Pick one — all are free for a static site like this:

- **Netlify / Vercel**: connect the repo (or drag-and-drop the folder in Netlify's
  dashboard), no build command needed, publish directory is the repo root.
- **GitHub Pages**: push this folder to a repo, enable Pages on the `main`
  branch / root in repo settings.

Once deployed, point your purchased domain's DNS at the host (Netlify/Vercel/GitHub
Pages all give you the exact A/CNAME records to add) — this is the same regardless
of which host you pick.

## Wiring up live status (later)

`assets/js/status.js` is already built to poll a JSON endpoint and update the
status table on the `#homelab` section — it just isn't pointed at anything yet
(`STATUS_URL` is empty), so the page currently shows the static sample data.

To make it live without exposing your home network directly:

1. Run a small script/container on the home server that reports service health
   as JSON, shaped like:
   ```json
   { "services": [
       { "id": "media-stack", "status": "up", "uptime": "4d" },
       { "id": "sync-service", "status": "up", "uptime": "4d" },
       { "id": "homelab-agent", "status": "up", "uptime": "39d" }
   ] }
   ```
2. Expose *only* that endpoint publicly with a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
   (free, outbound-only from the home server — no router port-forwarding, and
   nothing else on the home network becomes reachable).
3. Set `STATUS_URL` in `assets/js/status.js` to that tunnel's public URL.

If the endpoint is ever unreachable, the widget shows an honest "unavailable"
state rather than silently freezing on stale data.

## Font licensing

JetBrains Mono and IBM Plex Mono are both SIL Open Font License 1.1 — license
text is included alongside the font files in `assets/fonts/`.
