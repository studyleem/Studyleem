let currentEditId = null;
let allMaterials = [];
let allMessages = [];

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) showDashboard();
        else showLogin();
    });
});

function showLogin() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('dashboardPage').style.display = 'none';

    document.getElementById('loginForm').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('loginError');
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            errorEl.textContent = error.message;
        }
    };
}

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboardPage').style.display = 'flex';
    setupNavigation();
    setupForms();
    setupMobileMenu();
    loadMaterials();
    loadStats();
}

function setupNavigation() {
    document.querySelectorAll('.admin-nav-link[data-page]').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
            document.getElementById(`${page}Page`).classList.add('active');
            const titles = { upload: 'Upload Material', manage: 'Manage Materials', stats: 'Statistics', messages: 'Contact Messages' };
            document.getElementById('pageTitle').textContent = titles[page] || page;
            if (page === 'manage') loadMaterials();
            if (page === 'stats') loadStats();
            if (page === 'messages') loadMessages();
        };
    });

    document.getElementById('logoutBtn').onclick = async (e) => {
        e.preventDefault();
        if (confirm('Logout?')) { await auth.signOut(); location.reload(); }
    };
}

function setupForms() {
    document.querySelectorAll('input[name="materialType"]').forEach(radio => {
        radio.onchange = (e) => {
            const isNotes = e.target.value === 'notes';
            document.getElementById('chapterGroup').style.display = isNotes ? 'block' : 'none';
            document.getElementById('chapterTitleGroup').style.display = isNotes ? 'block' : 'none';
            document.getElementById('chapterNumber').required = isNotes;
            document.getElementById('chapterTitle').required = isNotes;
            if (!isNotes) { document.getElementById('chapterNumber').value = ''; document.getElementById('chapterTitle').value = ''; }
        };
    });

    document.getElementById('uploadForm').onsubmit = async (e) => {
        e.preventDefault();
        const statusEl = document.getElementById('uploadStatus');
        const btnText = document.getElementById('uploadBtnText');
        const form = e.target;
        const type = document.querySelector('input[name="materialType"]:checked').value;
        const data = {
            type,
            title: document.getElementById('title').value.trim(),
            class: document.getElementById('class').value,
            subject: document.getElementById('subject').value.trim(),
            coverImage: document.getElementById('coverImage').value.trim(),
            pdfLink: document.getElementById('pdfLink').value.trim(),
            description: document.getElementById('description').value.trim()
        };
        if (type === 'notes') {
            data.chapterNumber = parseInt(document.getElementById('chapterNumber').value);
            data.chapterTitle = document.getElementById('chapterTitle').value.trim();
        }
        const errors = [];
        if (!data.title) errors.push('Title is required');
        if (!data.class) errors.push('Class is required');
        if (!data.subject) errors.push('Subject is required');
        if (!data.coverImage) errors.push('Cover image URL is required');
        if (!data.pdfLink) errors.push('PDF link is required');
        if (!data.description) errors.push('Description is required');
        if (type === 'notes') {
            if (!data.chapterNumber || isNaN(data.chapterNumber)) errors.push('Chapter number is required for notes');
            if (!data.chapterTitle) errors.push('Chapter title is required for notes');
        }
        if (errors.length > 0) { statusEl.textContent = '❌ ' + errors.join(', '); statusEl.className = 'status-message error'; return; }
        try {
            btnText.textContent = 'Uploading...';
            form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = true);
            await DB.create(data);
            statusEl.textContent = '✅ Material uploaded successfully!';
            statusEl.className = 'status-message success';
            form.reset();
            document.querySelector('input[name="materialType"][value="notes"]').checked = true;
            document.getElementById('chapterGroup').style.display = 'block';
            document.getElementById('chapterTitleGroup').style.display = 'block';
            setTimeout(() => { statusEl.textContent = ''; statusEl.className = ''; }, 5000);
        } catch (error) {
            statusEl.textContent = '❌ Upload failed: ' + error.message;
            statusEl.className = 'status-message error';
        } finally {
            btnText.textContent = 'Upload Material';
            form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = false);
        }
    };

    document.getElementById('editForm').onsubmit = async (e) => {
        e.preventDefault();
        if (!currentEditId) return;
        const type = document.getElementById('editType').value;
        const updates = {
            title: document.getElementById('editTitle').value.trim(),
            class: document.getElementById('editClass').value,
            subject: document.getElementById('editSubject').value.trim(),
            coverImage: document.getElementById('editCoverImage').value.trim(),
            pdfLink: document.getElementById('editPdfLink').value.trim(),
            description: document.getElementById('editDescription').value.trim()
        };
        if (type === 'notes') {
            updates.chapterNumber = parseInt(document.getElementById('editChapterNumber').value);
            updates.chapterTitle = document.getElementById('editChapterTitle').value.trim();
        }
        try {
            await DB.update(currentEditId, updates);
            document.getElementById('editModal').classList.remove('active');
            loadMaterials();
            alert('Material updated successfully!');
        } catch (error) { alert('Update failed: ' + error.message); }
    };

    document.getElementById('closeEditModal').onclick = () => document.getElementById('editModal').classList.remove('active');
    document.getElementById('closeViewMessage').onclick = () => document.getElementById('viewMessageModal').classList.remove('active');
    document.getElementById('searchMaterials').oninput = filterTable;
    document.getElementById('filterClass').onchange = filterTable;
    document.getElementById('filterType').onchange = filterTable;
    document.getElementById('searchMessages').oninput = filterMessages;
    document.getElementById('filterMessageStatus').onchange = filterMessages;
}

function setupMobileMenu() {
    document.getElementById('sidebarToggle').onclick = () => document.getElementById('adminSidebar').classList.add('active');
    document.getElementById('sidebarClose').onclick = () => document.getElementById('adminSidebar').classList.remove('active');
}

async function loadMaterials() {
    const tbody = document.getElementById('materialsTableBody');
    try {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading materials...</td></tr>';
        allMaterials = await DB.getAll();
        renderTable(allMaterials);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Error loading materials</td></tr>';
    }
}

function renderTable(materials) {
    const tbody = document.getElementById('materialsTableBody');
    if (materials.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="loading">No materials found</td></tr>'; return; }
    tbody.innerHTML = materials.map(m => `
        <tr>
            <td><img src="${m.coverImage}" class="material-cover-thumb" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2760%27 height=%2760%27%3E%3Crect fill=%27%23f3f4f6%27 width=%2760%27 height=%2760%27/%3E%3C/svg%3E'"></td>
            <td>${escapeHtml(m.title)}</td>
            <td>${m.type === 'books' ? '📚 Book' : '📝 Notes'}</td>
            <td>Class ${m.class}</td>
            <td>${escapeHtml(m.subject)}</td>
            <td>${m.chapterNumber || '-'}</td>
            <td><div class="table-actions">
                <button class="btn btn-secondary btn-sm" onclick="editMaterial('${m.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteMaterial('${m.id}')">Delete</button>
            </div></td>
        </tr>`).join('');
}

function filterTable() {
    const search = document.getElementById('searchMaterials').value.toLowerCase();
    const classFilter = document.getElementById('filterClass').value;
    const typeFilter = document.getElementById('filterType').value;
    let filtered = allMaterials;
    if (classFilter) filtered = filtered.filter(m => m.class === classFilter);
    if (typeFilter) filtered = filtered.filter(m => m.type === typeFilter);
    if (search) filtered = filtered.filter(m =>
        (m.title && m.title.toLowerCase().includes(search)) ||
        (m.subject && m.subject.toLowerCase().includes(search)) ||
        (m.chapterTitle && m.chapterTitle.toLowerCase().includes(search))
    );
    renderTable(filtered);
}

async function loadStats() {
    try {
        const stats = await DB.getStats();
        document.getElementById('totalMaterialsStat').textContent = stats.total;
        document.getElementById('totalBooksStat').textContent = stats.books;
        document.getElementById('totalNotesStat').textContent = stats.notes;
        document.getElementById('class9Count').textContent = stats.byClass['9'] || 0;
        document.getElementById('class10Count').textContent = stats.byClass['10'] || 0;
        document.getElementById('class11Count').textContent = stats.byClass['11'] || 0;
        document.getElementById('class12Count').textContent = stats.byClass['12'] || 0;
    } catch (error) { console.error('Stats error:', error); }
}

async function loadMessages() {
    const tbody = document.getElementById('messagesTableBody');
    try {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading messages...</td></tr>';
        const snapshot = await db.collection('contact_messages').orderBy('sentAt', 'desc').get();
        allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderMessages(allMessages);
    } catch (error) {
        console.error('Load messages error:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Error loading messages. Make sure Firestore index exists.</td></tr>';
    }
}

function renderMessages(messages) {
    const tbody = document.getElementById('messagesTableBody');
    if (messages.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="loading">No contact messages yet.</td></tr>'; return; }
    tbody.innerHTML = messages.map(m => {
        const date = m.sentAt ? new Date(m.sentAt.toMillis()).toLocaleDateString('en-GB') : 'N/A';
        const preview = (m.message || '').substring(0, 50) + ((m.message || '').length > 50 ? '...' : '');
        const unread = !m.read;
        return `<tr style="${unread ? 'font-weight:600;background:#f0f7ff;' : ''}">
            <td>${unread ? '🔵 New' : '✅ Read'}</td>
            <td>${escapeHtml(m.name || '')}</td>
            <td><a href="mailto:${escapeHtml(m.email || '')}">${escapeHtml(m.email || '')}</a></td>
            <td>${escapeHtml(m.subject || 'general')}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(preview)}</td>
            <td>${date}</td>
            <td><div class="table-actions">
                <button class="btn btn-secondary btn-sm" onclick="viewMessage('${m.id}')">View</button>
                <button class="btn btn-danger btn-sm" onclick="deleteMessage('${m.id}')">Delete</button>
            </div></td>
        </tr>`;
    }).join('');
}

function filterMessages() {
    const search = document.getElementById('searchMessages').value.toLowerCase();
    const status = document.getElementById('filterMessageStatus').value;
    let filtered = allMessages;
    if (status === 'unread') filtered = filtered.filter(m => !m.read);
    if (status === 'read') filtered = filtered.filter(m => m.read);
    if (search) filtered = filtered.filter(m =>
        (m.name && m.name.toLowerCase().includes(search)) ||
        (m.email && m.email.toLowerCase().includes(search)) ||
        (m.message && m.message.toLowerCase().includes(search))
    );
    renderMessages(filtered);
}

window.viewMessage = async function(id) {
    const msg = allMessages.find(m => m.id === id);
    if (!msg) return;
    const date = msg.sentAt ? new Date(msg.sentAt.toMillis()).toLocaleString('en-GB') : 'N/A';
    document.getElementById('viewMessageBody').innerHTML = `
        <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:0.4rem 0;color:#6b7280;width:100px"><strong>From:</strong></td><td>${escapeHtml(msg.name || '')}</td></tr>
            <tr><td style="padding:0.4rem 0;color:#6b7280"><strong>Email:</strong></td><td><a href="mailto:${escapeHtml(msg.email || '')}">${escapeHtml(msg.email || '')}</a></td></tr>
            <tr><td style="padding:0.4rem 0;color:#6b7280"><strong>Class:</strong></td><td>${escapeHtml(msg.class || 'N/A')}</td></tr>
            <tr><td style="padding:0.4rem 0;color:#6b7280"><strong>Type:</strong></td><td>${escapeHtml(msg.subject || '')}</td></tr>
            <tr><td style="padding:0.4rem 0;color:#6b7280"><strong>Date:</strong></td><td>${date}</td></tr>
        </table>
        <hr style="margin:1rem 0;border:1px solid #e5e7eb;">
        <p style="line-height:1.8;white-space:pre-wrap;color:#1f2937">${escapeHtml(msg.message || '')}</p>
        <div style="margin-top:1.5rem">
            <a href="mailto:${escapeHtml(msg.email || '')}?subject=Re: StudyLeem - ${encodeURIComponent(msg.subject || 'Your Message')}" class="btn btn-primary">↩ Reply via Email</a>
        </div>`;
    document.getElementById('viewMessageModal').classList.add('active');
    if (!msg.read) {
        try {
            await db.collection('contact_messages').doc(id).update({ read: true });
            const idx = allMessages.findIndex(m => m.id === id);
            if (idx !== -1) allMessages[idx].read = true;
            renderMessages(allMessages);
        } catch (e) { console.error('Mark read error:', e); }
    }
};

window.deleteMessage = async function(id) {
    if (!confirm('Delete this message permanently?')) return;
    try {
        await db.collection('contact_messages').doc(id).delete();
        allMessages = allMessages.filter(m => m.id !== id);
        renderMessages(allMessages);
    } catch (error) { alert('Delete failed: ' + error.message); }
};

window.editMaterial = async function(id) {
    const material = allMaterials.find(m => m.id === id);
    if (!material) return;
    currentEditId = id;
    document.getElementById('editId').value = id;
    document.getElementById('editType').value = material.type;
    document.getElementById('editTitle').value = material.title;
    document.getElementById('editClass').value = material.class;
    document.getElementById('editSubject').value = material.subject;
    document.getElementById('editCoverImage').value = material.coverImage;
    document.getElementById('editPdfLink').value = material.pdfLink;
    document.getElementById('editDescription').value = material.description;
    const chapterRow = document.getElementById('editChapterRow');
    if (material.type === 'notes') {
        chapterRow.style.display = 'grid';
        document.getElementById('editChapterNumber').value = material.chapterNumber;
        document.getElementById('editChapterTitle').value = material.chapterTitle;
    } else { chapterRow.style.display = 'none'; }
    document.getElementById('editModal').classList.add('active');
};

window.deleteMaterial = async function(id) {
    if (!confirm('Delete this material permanently?')) return;
    try {
        await DB.delete(id);
        loadMaterials();
        loadStats();
        alert('Material deleted successfully!');
    } catch (error) { alert('Delete failed: ' + error.message); }
};

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
