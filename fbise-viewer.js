/* ── fbise-viewer.js: /fbise/notes/:class/:subject/:chapter ── */

(function () {
  'use strict';

  function parsePath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    // ['fbise', 'notes', '12', 'physics', 'chapter-1']
    return {
      type:        parts[1] || 'notes',
      cls:         parts[2] || '12',
      subjectSlug: parts[3] || '',
      chapterSlug: parts[4] || ''
    };
  }

  function makePdfEmbedUrl(rawUrl) {
    if (!rawUrl) return null;
    // Google Drive: convert share link to Google Docs Viewer / iframe embed
    // Pattern: https://drive.google.com/file/d/FILE_ID/view
    const driveMatch = rawUrl.match(/\/file\/d\/([^/]+)/);
    if (driveMatch) {
      const id = driveMatch[1];
      // Use Google Drive preview (works for large files, no download required)
      return `https://drive.google.com/file/d/${id}/preview`;
    }
    // Google Docs viewer for other URLs
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
    const desc  = `View and download: ${data.title}. Free FBISE ${subjectName} notes for Class ${cls} Federal Board Pakistan.`;

    document.getElementById('pageTitle').textContent  = title;
    document.getElementById('pageDesc').content       = desc;
    document.getElementById('pageKeywords').content   = `FBISE ${subjectName} notes class ${cls}, ${data.title}, Federal Board Pakistan PDF`;
    document.getElementById('pageCanonical').href     = `https://studyleem.vercel.app/fbise/${type}/${cls}/${subjectSlug}/${chapterSlug}`;
    document.getElementById('docTitle').textContent   = data.title;
  }

  async function initViewer() {
    const { type, cls, subjectSlug, chapterSlug } = parsePath();

    // Set back link
    const backLink = document.getElementById('backLink');
    backLink.href  = `/fbise/${type}/${cls}/${subjectSlug}`;

    // Fetch data from Firestore
    let pdfUrl = null;
    let title   = '';

    try {
      const items = await DB.getByChapterSlug(cls, subjectSlug, chapterSlug, type);
      if (items && items.length > 0) {
        const item = items[0];
        pdfUrl = item.pdfLink;
        title  = item.title;
        setMeta(item);
        document.getElementById('docTitle').textContent = item.title;
      } else {
        // Fallback: get from URL params (legacy support)
        const p = new URLSearchParams(window.location.search);
        pdfUrl  = p.get('url');
        title   = p.get('title') || chapterSlug;
        document.getElementById('docTitle').textContent = title;
        document.getElementById('pageTitle').textContent = `${title} – StudyLeem`;
      }
    } catch (err) {
      console.error('Firestore fetch error:', err);
      // Fallback to query params
      const p = new URLSearchParams(window.location.search);
      pdfUrl  = p.get('url');
      title   = p.get('title') || chapterSlug;
      document.getElementById('docTitle').textContent = title;
    }

    if (!pdfUrl) {
      showError();
      return;
    }

    // Set download + open buttons
    document.getElementById('downloadBtn').href = makeDownloadUrl(pdfUrl);
    document.getElementById('openTabBtn').href  = pdfUrl;
    document.getElementById('fallbackOpen').href = pdfUrl;

    // Embed PDF
    loadPdf(pdfUrl);
  }

  function loadPdf(rawUrl) {
    const embedUrl   = makePdfEmbedUrl(rawUrl);
    const iframe     = document.getElementById('pdfIframe');
    const loading    = document.getElementById('pdfLoading');
    const errorDiv   = document.getElementById('pdfError');

    if (!embedUrl) { showError(); return; }

    iframe.src = embedUrl;

    // Show iframe once loaded
    iframe.onload = () => {
      loading.style.display = 'none';
      errorDiv.style.display = 'none';
      iframe.style.display   = 'block';
    };

    // Timeout fallback: if iframe doesn't load in 12 seconds show error
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
