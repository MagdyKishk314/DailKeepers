# Dialkeepers website

The site for [dialkeepers.pro](https://dialkeepers.pro). Plain HTML, CSS and JS in `public/`, plus a small Node server that emails the audit form to you.

## Run locally

```bash
npm install
cp .env.example .env   # fill in SMTP_USER and SMTP_PASS
npm start              # http://localhost:3000
```

## Files

| Path | What it is |
| --- | --- |
| `public/` | The website. Edit `index.html` to change the copy. |
| `lead.js` | Handles the audit form (`POST /api/lead`) and emails it with Nodemailer. |
| `server.js` | Local server: serves `public/` and calls `lead.js`. |
| `api/lead.js` | The same form handler, as a Vercel function. |

## Deploy to Vercel

Import the repo at vercel.com/new. Add `SMTP_USER`, `SMTP_PASS` and `LEAD_EMAIL_TO` under Settings > Environment Variables, then deploy. For Gmail, `SMTP_PASS` must be an App Password.
