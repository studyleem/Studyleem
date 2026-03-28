# StudyLeem — Vercel Deployment

## How to Deploy

### Option A: Vercel CLI (Recommended)
```bash
npm i -g vercel
cd studyleem_vercel
vercel --prod
```
When asked, set the project name to `studyleem` so the URL becomes `studyleem.vercel.app`.

### Option B: Vercel Dashboard (Drag & Drop)
1. Go to https://vercel.com/new
2. Drag the entire `studyleem_vercel` folder
3. Deploy — done!

### Option C: GitHub
1. Push this folder to a GitHub repo
2. Import it on https://vercel.com/new
3. No build command needed (static site)

---

## Clean URL Structure

| URL | Page |
|-----|------|
| `/` or `/home` | Homepage |
| `/9` | Class 9 subjects |
| `/10` | Class 10 subjects |
| `/11` | Class 11 subjects |
| `/12` | Class 12 subjects |
| `/12/biology` | Biology subjects for Class 12 |
| `/12/biology/chapter-1` | Chapter 1 of Biology Class 12 |
| `/about` | About page |
| `/contact` | Contact page |
| `/terms` | Terms of Service |
| `/privacy` | Privacy Policy |
| `/admin` | Admin Panel (Firebase Auth required) |

---

## Files Included

- `vercel.json` — Routing config (replaces .htaccess)
- `home.html` — Homepage
- `class.html` — Class subjects page
- `subject.html` — Subject materials page
- `about.html` — About page
- `contact.html` — Contact page (saves to Firebase + opens mailto)
- `terms.html` — Terms of Service
- `privacy.html` — Privacy Policy
- `admin.html` — Admin panel (Upload, Manage, Stats, Messages)
- `404.html` — Custom 404 page
- `firebase-config.js` — Firebase config (unchanged)
- `app.js` — Homepage logic
- `class.js` — Class page logic
- `subject.js` — Subject/materials page logic
- `admin.js` — Admin panel logic (now includes contact messages tab)
- `styles.css` — All styles (unchanged)
- `logo.png` — Logo
- `robots.txt` — Updated for studyleem.vercel.app
- `sitemap.xml` — Updated for studyleem.vercel.app

---

## What Was Changed from InfinityFree Version

1. ✅ All ad scripts removed (xadmart, adsterra, highperformanceformat, monetag popunders)
2. ✅ All canonical URLs updated from `studyleem.free.nf` → `studyleem.vercel.app`
3. ✅ `.htaccess` replaced with `vercel.json` rewrites
4. ✅ All internal links use clean paths (`/home`, `/9`, `/12/biology/chapter-1`)
5. ✅ New Contact page added with working JS (saves to Firebase + opens email client)
6. ✅ Admin panel extended with "Messages" tab to view/reply/delete contact submissions
7. ✅ Firebase config and all data remain unchanged — all existing materials intact
8. ✅ 404 page added
9. ✅ Navigation updated across all pages to include Contact link
