/* ── fbise-viewer.js: /fbise/notes/:class/:subject/:chapter  or  /fbise/books/:class/:subject/book-:id ── */

(function () {
  'use strict';

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

  function makePdfEmbedUrl(rawUrl) {
    if (!rawUrl) return null;
    const driveMatch = rawUrl.match(/\/file\/d\/([^/]+)/);
    if (driveMatch) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    if (rawUrl.endsWith('.pdf') || rawUrl.includes('pdf')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`;
    }
    return rawUrl;
  }

  function makeDownloadUrl(rawUrl) {
    const driveMatch = rawUrl.match(/\/file\/d\/([^/]+)/);
    if (driveMatch) {
      return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }
    return rawUrl;
  }

  function setMeta(data) {
    const { type, cls, subjectSlug, chapterSlug } = parsePath();
    const subjectName = data.subject || subjectSlug.replace(/-/g, ' ');
    const title = `${data.title} – FBISE Class ${cls} ${subjectName} | StudyLeem`;
    const desc  = `View and download: ${data.title}. Free FBISE ${subjectName} ${type === 'books' ? 'textbook' : 'notes'} for Class ${cls} Federal Board Pakistan.`;

    document.getElementById('pageTitle').textContent  = title;
    document.getElementById('pageDesc').content       = desc;
    document.getElementById('pageKeywords').content   = `FBISE ${subjectName} ${type === 'books' ? 'book' : 'notes'} class ${cls}, ${data.title}, Federal Board Pakistan PDF`;
    document.getElementById('pageCanonical').href     = `https://studyleem.vercel.app/fbise/${type}/${cls}/${subjectSlug}/${chapterSlug}`;
    document.getElementById('docTitle').textContent   = data.title;
  }

  async function initViewer() {
    const { type, cls, subjectSlug, chapterSlug } = parsePath();

    // Set back link
    document.getElementById('backLink').href = `/fbise/${type}/${cls}/${subjectSlug}`;

    let pdfUrl = null;
    let itemData = null;

    try {
      // ── Books: slug is "book-DOCID" so fetch directly by document ID ──
      if (type === 'books' && chapterSlug.startsWith('book-')) {
        const docId = chapterSlug.replace(/^book-/, '');
        const snap  = await db.collection('materials').doc(docId).get();
        if (snap.exists) {
          itemData = { id: snap.id, ...snap.data() };
        }
      } else {
        // ── Notes: fetch by chapterSlug as before ──
        const items = await DB.getByChapterSlug(cls, subjectSlug, chapterSlug, type);
        if (items && items.length > 0) {
          itemData = items[0];
        }
      }

      if (itemData) {
        pdfUrl = itemData.pdfLink;
        setMeta(itemData);
        document.getElementById('docTitle').textContent = itemData.title;
      } else {
        // Legacy query-param fallback
        const p = new URLSearchParams(window.location.search);
        pdfUrl  = p.get('url');
        const fallbackTitle = p.get('title') || chapterSlug;
        document.getElementById('docTitle').textContent = fallbackTitle;
        document.getElementById('pageTitle').textContent = `${fallbackTitle} – StudyLeem`;
      }
    } catch (err) {
      console.error('Firestore fetch error:', err);
      const p = new URLSearchParams(window.location.search);
      pdfUrl  = p.get('url');
      const fallbackTitle = p.get('title') || chapterSlug;
      document.getElementById('docTitle').textContent = fallbackTitle;
    }

    if (!pdfUrl) { showError(); return; }

    document.getElementById('downloadBtn').href  = makeDownloadUrl(pdfUrl);
    document.getElementById('openTabBtn').href   = pdfUrl;
    document.getElementById('fallbackOpen').href = pdfUrl;

    loadPdf(pdfUrl);
  }

  function loadPdf(rawUrl) {
    const embedUrl = makePdfEmbedUrl(rawUrl);
    const iframe   = document.getElementById('pdfIframe');
    const loading  = document.getElementById('pdfLoading');
    const errorDiv = document.getElementById('pdfError');

    if (!embedUrl) { showError(); return; }

    iframe.src = embedUrl;

    const timer = setTimeout(() => {
      if (iframe.style.display === 'none') {
        loading.style.display = 'none';
        showError();
      }
    }, 12000);

    iframe.onload = () => {
      clearTimeout(timer);
      loading.style.display = 'none';
      errorDiv.style.display = 'none';
      iframe.style.display   = 'block';
    };
  }

  function showError() {
    document.getElementById('pdfLoading').style.display = 'none';
    document.getElementById('pdfError').style.display   = 'flex';
    document.getElementById('pdfIframe').style.display  = 'none';
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initViewer, 400);
  });
})();
