let allMaterials = [];
let currentFilter = 'all';
let downloadTimerInterval = null;
let currentPdfUrl = '';
let isDownloadAllowed = false;

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const classNum = params.get('class');
    const subject = params.get('subject');

    if (!classNum || !subject) {
        window.location.href = '/home';
        return;
    }

    setupMobileMenu();
    setupTabs();
    setupModal();

    setTimeout(() => {
        loadMaterials(classNum, subject);
    }, 500);

    document.getElementById('pageTitle').textContent = `${subject} - Class ${classNum} | StudyLeem`;
    document.getElementById('subjectTitle').textContent = subject;
});

function setupMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');
    if (btn && menu) {
        btn.onclick = (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
        };
        document.onclick = (e) => {
            if (!menu.contains(e.target) && !btn.contains(e.target)) {
                menu.classList.remove('active');
            }
        };
    }
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.type;
            filterMaterials();
        };
    });
}

function setupModal() {
    document.getElementById('closeModal').onclick = closeModal;
    document.getElementById('pdfModal').onclick = (e) => {
        if (e.target.id === 'pdfModal') closeModal();
    };
    document.getElementById('downloadBtn').onclick = handleDownloadClick;
}

async function loadMaterials(classNum, subject) {
    if (typeof DB === 'undefined') {
        console.error('❌ DB not initialized');
        document.getElementById('materialsGrid').innerHTML = '<p class="loading">Database not ready. Please refresh.</p>';
        return;
    }

    try {
        allMaterials = await DB.getBySubject(classNum, subject);
        allMaterials.sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0));
        filterMaterials();
    } catch (error) {
        console.error('❌ Load materials error:', error);
        document.getElementById('materialsGrid').innerHTML = '<p class="loading">Error loading materials.</p>';
    }
}

function filterMaterials() {
    const filtered = currentFilter === 'all'
        ? allMaterials
        : allMaterials.filter(m => m.type === currentFilter);

    const grid = document.getElementById('materialsGrid');

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="loading">No materials found</p>';
        return;
    }

    grid.innerHTML = filtered.map(m => `
        <div class="material-card">
            <div style="position:relative">
                <img src="${m.coverImage}"
                     alt="${escapeHtml(m.title)}"
                     class="material-cover"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27208%27 height=%27300%27%3E%3Crect fill=%27%23f3f4f6%27 width=%27208%27 height=%27300%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 dy=%27.3em%27 fill=%27%239ca3af%27 font-family=%27Arial%27 font-size=%2714%27%3ENo Image%3C/text%3E%3C/svg%3E'"
                     loading="lazy">
                <span class="material-type-badge">${m.type === 'books' ? '📚 Book' : '📝 Notes'}</span>
            </div>
            <div class="material-content">
                <h3 class="material-title">${escapeHtml(m.title)}</h3>
                <div class="material-meta">
                    <span>Class ${m.class}</span>
                    <span>${escapeHtml(m.subject)}</span>
                    ${m.chapterNumber ? `<span>Ch. ${m.chapterNumber}</span>` : ''}
                </div>
                <p class="material-description">${escapeHtml(m.description || '')}</p>
                <button class="btn btn-primary btn-sm" onclick='openPreview(${JSON.stringify(m.title)}, ${JSON.stringify(m.pdfLink)})'>👁 Preview &amp; Download</button>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.openPreview = function(title, url) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('pdfModal').classList.add('active');

    isDownloadAllowed = false;
    currentPdfUrl = url;

    const downloadBtn = document.getElementById('downloadBtn');
    const downloadText = document.getElementById('downloadText');
    downloadBtn.disabled = false;
    downloadText.textContent = '⏱ Start Download Timer';
    document.getElementById('timerDisplay').textContent = '';

    const iframe = document.getElementById('pdfViewer');
    const container = iframe.parentElement;

    container.innerHTML = '<div class="pdf-loading">Loading PDF preview...</div><iframe id="pdfViewer" title="PDF Viewer" frameborder="0"></iframe>';

    const fileId = extractGoogleDriveId(url);

    if (fileId) {
        const viewerUrl = `https://docs.google.com/viewer?url=https://drive.google.com/uc?export=download%26id=${fileId}&embedded=true`;
        setTimeout(() => {
            const newIframe = document.getElementById('pdfViewer');
            newIframe.src = viewerUrl;
            newIframe.style.cssText = 'width:100%;height:600px;border:none;display:block;';
            const loadingEl = container.querySelector('.pdf-loading');
            if (loadingEl) loadingEl.style.display = 'none';
            newIframe.onload = () => console.log('✅ PDF loaded');
            newIframe.onerror = () => {
                container.innerHTML = '<div class="pdf-error"><p>⚠️ Cannot preview PDF</p><p>Use download button below</p></div><iframe id="pdfViewer" title="PDF Viewer" frameborder="0"></iframe>';
            };
        }, 100);
    } else {
        const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
        setTimeout(() => {
            const newIframe = document.getElementById('pdfViewer');
            newIframe.src = viewerUrl;
            newIframe.style.cssText = 'width:100%;height:600px;border:none;display:block;';
            const loadingEl = container.querySelector('.pdf-loading');
            if (loadingEl) loadingEl.style.display = 'none';
        }, 100);
    }
};

function extractGoogleDriveId(url) {
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/open\?id=([a-zA-Z0-9_-]+)/,
        /\/uc\?.*id=([a-zA-Z0-9_-]+)/,
        /\/d\/([a-zA-Z0-9_-]+)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
}

function handleDownloadClick() {
    if (isDownloadAllowed) {
        actuallyDownload();
    } else {
        startDownloadTimer();
    }
}

function startDownloadTimer() {
    const btn = document.getElementById('downloadBtn');
    const downloadText = document.getElementById('downloadText');
    const display = document.getElementById('timerDisplay');

    btn.disabled = true;
    let seconds = 15;

    display.textContent = `Please wait ${seconds} seconds...`;
    display.style.color = '#2563eb';

    if (downloadTimerInterval) clearInterval(downloadTimerInterval);

    downloadTimerInterval = setInterval(() => {
        seconds--;
        display.textContent = `Please wait ${seconds} second${seconds !== 1 ? 's' : ''}...`;

        if (seconds <= 0) {
            clearInterval(downloadTimerInterval);
            isDownloadAllowed = true;
            btn.disabled = false;
            downloadText.textContent = '⬇ Download Now';
            display.textContent = '✅ Ready! Click to download';
            display.style.color = '#10b981';
        }
    }, 1000);
}

function actuallyDownload() {
    if (!currentPdfUrl) return;

    let downloadUrl = currentPdfUrl;
    const fileId = extractGoogleDriveId(currentPdfUrl);
    if (fileId) {
        downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'StudyLeem.pdf';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    isDownloadAllowed = false;
    document.getElementById('downloadText').textContent = '⏱ Start Timer Again';
    document.getElementById('timerDisplay').textContent = '';
}

function closeModal() {
    document.getElementById('pdfModal').classList.remove('active');
    const iframe = document.getElementById('pdfViewer');
    if (iframe) {
        iframe.src = '';
        iframe.style.display = 'none';
    }
    if (downloadTimerInterval) {
        clearInterval(downloadTimerInterval);
        downloadTimerInterval = null;
    }
    currentPdfUrl = '';
    isDownloadAllowed = false;
}
