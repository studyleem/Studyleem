/* ── fbise-viewer.js ──────────────────────────────────────────────────────────
   Route: /fbise/notes/:class/:subject/:chapter
          /fbise/books/:class/:subject/book-:id
   Features:
     • Google Drive iframe embed (primary viewer, browser-safe)
     • Chapter switcher: tabs + prev/next arrows (Study++ style)
     • Anti-download overlay covering GDrive's built-in DL button
     • 15-second countdown modal before download link fires
     • Fallback to pdf.js viewer if GDrive iframe is blocked
────────────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  /* ── State ── */
  let _downloadUrl  = null;   // direct download URL
  let _rawPdfUrl    = null;   // raw Google Drive / PDF URL
  let _dlTimer      = null;   // setInterval ref for countdown
  let _timerCount   = 15;
  let _allChapters  = [];     // sibling chapters for the nav
  let _currentIdx   = -1;     // index of current chapter in _allChapters
  const TIMER_SEC   = 15;
  const CIRCUMFERENCE = 213.6; // 2π × 34 (r=34)

  /* ── Path parser ── */
  function parsePath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    // ['fbise', 'notes', '12', 'physics', 'chapter-1']
    // ['fbise', 'books', '12', 'chemistry', 'book-DOCID']
    return {
      type:        parts[1] || 'notes',
      cls:         parts[2] || '12',
      subjectSlug: parts[3] || '',
      chapterSlug: parts[4] || ''
    };
  }

  /* ── URL helpers ── */
  function driveId(url) {
    if (!url) return null;
    const m = url.match(/\/file\/d\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  function makePdfEmbedUrl(rawUrl) {
    if (!rawUrl) return null;
    const id = driveId(rawUrl);
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
    if (rawUrl.includes('.pdf') || rawUrl.includes('pdf')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`;
    }
    return rawUrl;
  }

  function makeDownloadUrl(rawUrl) {
    if (!rawUrl) return '#';
    const id = driveId(rawUrl);
    return id
      ? `https://drive.google.com/uc?export=download&id=${id}`
      : rawUrl;
  }

  /* ── Meta updater ── */
  function setMeta(data) {
    const { type, cls, subjectSlug, chapterSlug } = parsePath();
    const subjectName = data.subject || subjectSlug.replace(/-/g, ' ');
    const isBook = type === 'books';
    const title = `${data.title} – FBISE Class ${cls} ${subjectName} | StudyLeem`;
    const desc  = `View and download: ${data.title}. Free FBISE ${subjectName} ${isBook ? 'textbook' : 'notes'} for Class ${cls} Federal Board Pakistan.`;
    const kw    = `FBISE ${subjectName} ${isBook ? 'book' : 'notes'} class ${cls}, ${data.title}, Federal Board Pakistan PDF`;

    document.getElementById('pageTitle').textContent    = title;
    document.getElementById('pageDesc').content         = desc;
    document.getElementById('pageKeywords').content     = kw;
    document.getElementById('pageCanonical').href       = `https://studyleem.vercel.app/fbise/${type}/${cls}/${subjectSlug}/${chapterSlug}`;
    document.getElementById('docTitle').textContent     = data.title;

    // Breadcrumb
    const clsLabel  = `Class ${cls}`;
    const subLabel  = subjectName.replace(/\b\w/g, c => c.toUpperCase());
    const chLabel   = data.title;
    document.getElementById('bcClass').textContent = clsLabel;
    document.getElementById('bcClass').href        = `/fbise/${type}/${cls}`;
    document.getElementById('bcSubject').textContent = subLabel;
    document.getElementById('bcSubject').href        = `/fbise/${type}/${cls}/${subjectSlug}`;
    document.getElementById('bcChapter').textContent  = chLabel;
  }

  /* ── Chapter switcher ── */
  function buildChapterNav(chapters, currentSlug) {
    _allChapters = chapters;
    _currentIdx  = chapters.findIndex(c => (c.chapterSlug || makeSlug(c)) === currentSlug);

    const nav  = document.getElementById('chapterNav');
    const tabs = document.getElementById('chapterTabs');
    if (!chapters.length) return;

    nav.style.display = 'flex';

    tabs.innerHTML = chapters.map((ch, i) => {
      const slug   = ch.chapterSlug || makeSlug(ch);
      const href   = `/fbise/${parsePath().type}/${parsePath().cls}/${parsePath().subjectSlug}/${slug}`;
      const isEx   = ch.contentType === 'exercise';
      const label  = isEx
        ? `Ex ${ch.chapterNumber}.${ch.exerciseNumber || ''}`
        : `Ch ${ch.chapterNumber}`;
      const active = i === _currentIdx ? 'active' : '';
      return `<a href="${href}" class="chapter-tab ${active}" data-idx="${i}"
                title="${escHtml(ch.title)}">
                <span class="ch-num">${label}</span>
                <span class="ch-name">${escHtml(shortTitle(ch.title, 12))}</span>
              </a>`;
    }).join('');

    // Scroll active tab into view
    const activeTab = tabs.querySelector('.active');
    if (activeTab) {
      requestAnimationFrame(() => activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }));
    }

    // Prev / Next arrows
    const prevBtn = document.getElementById('prevChBtn');
    const nextBtn = document.getElementById('nextChBtn');

    if (_currentIdx > 0) {
      const prev = chapters[_currentIdx - 1];
      const prevSlug = prev.chapterSlug || makeSlug(prev);
      prevBtn.href = `/fbise/${parsePath().type}/${parsePath().cls}/${parsePath().subjectSlug}/${prevSlug}`;
      prevBtn.classList.remove('disabled');
    } else {
      prevBtn.removeAttribute('href');
      prevBtn.classList.add('disabled');
    }

    if (_currentIdx < chapters.length - 1) {
      const next = chapters[_currentIdx + 1];
      const nextSlug = next.chapterSlug || makeSlug(next);
      nextBtn.href = `/fbise/${parsePath().type}/${parsePath().cls}/${parsePath().subjectSlug}/${nextSlug}`;
      nextBtn.classList.remove('disabled');
    } else {
      nextBtn.removeAttribute('href');
      nextBtn.classList.add('disabled');
    }
  }

  function makeSlug(ch) {
    if (ch.contentType === 'exercise') {
      return `exercise-${ch.chapterNumber}${ch.exerciseNumber ? '-' + ch.exerciseNumber : ''}`;
    }
    return `chapter-${ch.chapterNumber}`;
  }

  function shortTitle(title, max) {
    if (!title) return '';
    return title.length > max ? title.slice(0, max) + '…' : title;
  }

  function escHtml(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  /* ── PDF loading ── */
  function loadPdf(rawUrl) {
    _rawPdfUrl   = rawUrl;
    const embedUrl = makePdfEmbedUrl(rawUrl);
    const iframe   = document.getElementById('pdfIframe');
    const loading  = document.getElementById('pdfLoading');
    const errorDiv = document.getElementById('pdfError');
    const overlay  = document.getElementById('antiDlOverlay');

    if (!embedUrl) { showError(); return; }

    iframe.src = embedUrl;

    // Timeout fallback: if iframe doesn't fire onload in 14s → show error
    const timeout = setTimeout(() => {
      if (iframe.style.display === 'none') showError();
    }, 14000);

    iframe.onload = () => {
      clearTimeout(timeout);
      loading.style.display  = 'none';
      errorDiv.style.display = 'none';
      iframe.style.display   = 'block';
      overlay.style.display  = 'block'; // activate anti-DL overlay after load
    };

    iframe.onerror = () => {
      clearTimeout(timeout);
      showError();
    };
  }

  function showError() {
    document.getElementById('pdfLoading').style.display = 'none';
    document.getElementById('pdfError').style.display   = 'flex';
    document.getElementById('pdfIframe').style.display  = 'none';
    document.getElementById('antiDlOverlay').style.display = 'none';
  }

  /* ── Download modal with 15s countdown ── */
  window.startDownload = function () {
    if (!_downloadUrl) return;
    openModal();
    runTimer();
  };

  window.cancelDownload = function () {
    clearInterval(_dlTimer);
    closeModal();
    resetTimer();
  };

  window.doDownload = function () {
    clearInterval(_dlTimer);
    closeModal();
    resetTimer();
    // Fire the download
    const a = document.createElement('a');
    a.href     = _downloadUrl;
    a.target   = '_blank';
    a.rel      = 'noopener';
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  function openModal() {
    document.getElementById('dlBackdrop').classList.add('open');
  }

  function closeModal() {
    document.getElementById('dlBackdrop').classList.remove('open');
  }

  function resetTimer() {
    _timerCount = TIMER_SEC;
    document.getElementById('timerNum').textContent = TIMER_SEC;
    document.getElementById('timerCircle').style.strokeDashoffset = '0';
    document.getElementById('dlGoBtn').disabled = true;
    document.getElementById('dlGoBtn').textContent = 'Download Now';
  }

  function runTimer() {
    resetTimer();
    _timerCount = TIMER_SEC;

    _dlTimer = setInterval(() => {
      _timerCount--;
      const numEl    = document.getElementById('timerNum');
      const circleEl = document.getElementById('timerCircle');
      const goBtn    = document.getElementById('dlGoBtn');

      if (numEl) numEl.textContent = Math.max(_timerCount, 0);

      // Update SVG progress ring (drains from full to 0)
      const fraction = _timerCount / TIMER_SEC;
      if (circleEl) circleEl.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - fraction));

      if (_timerCount <= 0) {
        clearInterval(_dlTimer);
        if (numEl) numEl.textContent = '✓';
        if (goBtn) { goBtn.disabled = false; goBtn.textContent = '⬇ Download Now'; }
        if (circleEl) circleEl.style.stroke = '#22c55e'; // green when ready
      }
    }, 1000);
  }

  /* Close modal on backdrop click */
  document.getElementById('dlBackdrop').addEventListener('click', function(e) {
    if (e.target === this) window.cancelDownload();
  });

  /* ── Main init ── */
  async function initViewer() {
    const { type, cls, subjectSlug, chapterSlug } = parsePath();

    document.getElementById('backLink').href = `/fbise/${type}/${cls}/${subjectSlug}`;

    let pdfUrl   = null;
    let itemData = null;

    try {
      if (type === 'books' && chapterSlug.startsWith('book-')) {
        const docId = chapterSlug.replace(/^book-/, '');
        const snap  = await db.collection('materials').doc(docId).get();
        if (snap.exists) itemData = { id: snap.id, ...snap.data() };
      } else {
        const items = await DB.getByChapterSlug(cls, subjectSlug, chapterSlug, type);
        if (items && items.length) itemData = items[0];
      }

      if (itemData) {
        pdfUrl = itemData.pdfLink;
        setMeta(itemData);
        // Load sibling chapters for the switcher
        loadSiblingChapters(type, cls, subjectSlug, chapterSlug);
      } else {
        // Legacy query-param fallback
        const p   = new URLSearchParams(window.location.search);
        pdfUrl    = p.get('url');
        const ft  = p.get('title') || chapterSlug.replace(/-/g, ' ');
        document.getElementById('docTitle').textContent    = ft;
        document.getElementById('pageTitle').textContent   = `${ft} – StudyLeem`;
        document.getElementById('bcChapter').textContent   = ft;
      }
    } catch (err) {
      console.error('Firestore error:', err);
      const p  = new URLSearchParams(window.location.search);
      pdfUrl   = p.get('url');
      const ft = p.get('title') || chapterSlug.replace(/-/g, ' ');
      document.getElementById('docTitle').textContent = ft;
    }

    if (!pdfUrl) { showError(); return; }

    _downloadUrl = makeDownloadUrl(pdfUrl);
    document.getElementById('openTabBtn').href   = pdfUrl;
    document.getElementById('fallbackOpen').href = pdfUrl;

    loadPdf(pdfUrl);
  }

  /* Load all siblings to build chapter nav */
  async function loadSiblingChapters(type, cls, subjectSlug, currentSlug) {
    try {
      const all = await DB.getBySubjectSlug(cls, subjectSlug, type);
      if (!all || all.length < 2) return; // no nav needed for single item
      // Sort by chapterNumber then exerciseNumber
      all.sort((a, b) => {
        const na = Number(a.chapterNumber) || 0;
        const nb = Number(b.chapterNumber) || 0;
        if (na !== nb) return na - nb;
        return (Number(a.exerciseNumber) || 0) - (Number(b.exerciseNumber) || 0);
      });
      buildChapterNav(all, currentSlug);
    } catch (e) {
      console.warn('Chapter nav load failed:', e);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Hide overlay initially (shown after iframe loads)
    document.getElementById('antiDlOverlay').style.display = 'none';
    setTimeout(initViewer, 300);
  });

})();
