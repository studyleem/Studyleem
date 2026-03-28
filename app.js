document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Loading homepage...');
    setupMobileMenu();
    setupSearch();

    // Wait for Firebase to be ready
    setTimeout(() => {
        loadData();
    }, 500);
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

        menu.querySelectorAll('a').forEach(link => {
            link.onclick = () => menu.classList.remove('active');
        });
    }
}

function setupSearch() {
    const input = document.getElementById('searchInput');
    const btn = document.getElementById('searchBtn');

    if (!input || !btn) return;

    const performSearch = async () => {
        const query = input.value.trim().toLowerCase();

        if (!query) {
            alert('Please enter a search term');
            return;
        }

        try {
            const materials = await DB.getAll();
            const results = materials.filter(m =>
                (m.title && m.title.toLowerCase().includes(query)) ||
                (m.subject && m.subject.toLowerCase().includes(query)) ||
                (m.chapterTitle && m.chapterTitle.toLowerCase().includes(query)) ||
                (m.description && m.description.toLowerCase().includes(query))
            );

            if (results.length === 0) {
                alert('No results found for: ' + query);
                return;
            }

            const first = results[0];
            window.location.href = `/${first.class}/${encodeURIComponent(first.subject.toLowerCase().replace(/ /g, '-'))}`;

        } catch (error) {
            console.error('Search error:', error);
            alert('Search failed. Please try again.');
        }
    };

    btn.addEventListener('click', performSearch);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

async function loadData() {
    const latestContainer = document.getElementById('latestMaterials');
    const subjectsContainer = document.getElementById('subjectsGrid');

    if (typeof DB === 'undefined') {
        console.error('❌ DB not initialized');
        if (latestContainer) latestContainer.innerHTML = '<p class="loading">Database not ready. Please refresh.</p>';
        if (subjectsContainer) subjectsContainer.innerHTML = '<p class="loading">Database not ready. Please refresh.</p>';
        return;
    }

    try {
        console.log('📥 Loading data...');

        if (latestContainer) latestContainer.innerHTML = '<div class="loading">Loading materials...</div>';
        if (subjectsContainer) subjectsContainer.innerHTML = '<div class="loading">Loading subjects...</div>';

        const materials = await DB.getAll();

        console.log(`✅ Loaded ${materials.length} materials`);

        if (materials.length === 0) {
            console.warn('⚠️ No materials in database');
            if (latestContainer) latestContainer.innerHTML = '<p class="loading">No materials available yet.</p>';
            if (subjectsContainer) subjectsContainer.innerHTML = '<p class="loading">No subjects available yet.</p>';
            updateStats([]);
            return;
        }

        loadLatestMaterials(materials);
        loadPopularSubjects(materials);
        updateStats(materials);

    } catch (error) {
        console.error('❌ Load data error:', error);
        console.error('Error stack:', error.stack);

        if (latestContainer) {
            latestContainer.innerHTML = '<p class="loading">Error loading materials. Check console for details.</p>';
        }
        if (subjectsContainer) {
            subjectsContainer.innerHTML = '<p class="loading">Error loading subjects. Check console for details.</p>';
        }
    }
}

function loadLatestMaterials(materials) {
    const container = document.getElementById('latestMaterials');
    if (!container) return;

    const latest = materials.slice(0, 6);

    container.innerHTML = latest.map(m => `
        <div class="material-card" onclick="window.location.href='/${m.class}/${encodeURIComponent(m.subject.toLowerCase().replace(/ /g, \"-\"))}'">
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
                <p class="material-description">${escapeHtml((m.description || '').substring(0, 80))}...</p>
            </div>
        </div>
    `).join('');
}

function loadPopularSubjects(materials) {
    const container = document.getElementById('subjectsGrid');
    if (!container) return;

    const subjectCounts = {};

    materials.forEach(m => {
        const key = `${m.class}-${m.subject}`;
        if (!subjectCounts[key]) {
            subjectCounts[key] = {
                class: m.class,
                subject: m.subject,
                count: 0
            };
        }
        subjectCounts[key].count++;
    });

    const subjects = Object.values(subjectCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    container.innerHTML = subjects.map(s => `
        <a href="/${s.class}/${encodeURIComponent(s.subject.toLowerCase().replace(/ /g, '-'))}" class="subject-card">
            <h3>${escapeHtml(s.subject)}</h3>
            <p>Class ${s.class}</p>
            <p>${s.count} material${s.count !== 1 ? 's' : ''}</p>
        </a>
    `).join('');
}

function updateStats(materials) {
    const stats = {
        total: materials.length,
        books: materials.filter(m => m.type === 'books').length,
        notes: materials.filter(m => m.type === 'notes').length
    };

    const elements = [
        { id: 'totalMaterials', value: stats.total },
        { id: 'totalBooks', value: stats.books },
        { id: 'totalNotes', value: stats.notes }
    ];

    elements.forEach(({ id, value }) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
