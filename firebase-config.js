// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCsT4j__ioR0SS5nASTnj9QJH4QjUexBqA",
    authDomain: "studyleem786.firebaseapp.com",
    projectId: "studyleem786",
    storageBucket: "studyleem786.firebasestorage.app",
    messagingSenderId: "419874765733",
    appId: "1:419874765733:web:adba313054d7d6c3b9064c",
    measurementId: "G-ZNNDTM33RB"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = typeof firebase.auth === 'function' ? firebase.auth() : null;

// ── Slug helpers ──────────────────────────────────────────────────────────────
function toSlug(str) {
    return String(str)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function chapterSlug(type, num, exerciseNum) {
    if (type === 'exercise') {
        return `exercise-${num}${exerciseNum ? '-' + exerciseNum : ''}`;
    }
    return `chapter-${num}`;
}

// ── Database helpers ──────────────────────────────────────────────────────────
const DB = {
    async create(data) {
        try {
            // Auto-generate slugs
            data.subjectSlug  = toSlug(data.subject);
            if (data.type === 'notes' || data.type === 'exercise') {
                data.chapterSlug = chapterSlug(
                    data.contentType || 'chapter',
                    data.chapterNumber,
                    data.exerciseNumber
                );
            } else {
                data.chapterSlug = null;
            }
            const ref = await db.collection('materials').add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Created:', ref.id);
            return ref.id;
        } catch (e) { console.error('❌ Create:', e); throw e; }
    },

    async getAll() {
        try {
            const snap = await db.collection('materials').get();
            if (snap.empty) return [];
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => {
                const tA = a.createdAt ? a.createdAt.toMillis() : 0;
                const tB = b.createdAt ? b.createdAt.toMillis() : 0;
                return tB - tA;
            });
            return items;
        } catch (e) { console.error('❌ GetAll:', e); return []; }
    },

    async getByClass(classNum) {
        try {
            const snap = await db.collection('materials')
                .where('class', '==', String(classNum)).get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) { console.error('❌ GetByClass:', e); return []; }
    },

    async getBySubject(classNum, subject) {
        try {
            const snap = await db.collection('materials')
                .where('class', '==', String(classNum))
                .where('subject', '==', subject).get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) { console.error('❌ GetBySubject:', e); return []; }
    },

    async getBySubjectSlug(classNum, subjectSlug, type) {
        try {
            // Primary: query by stored subjectSlug field
            let q = db.collection('materials')
                .where('class', '==', String(classNum))
                .where('subjectSlug', '==', subjectSlug);
            if (type && type !== 'all') q = q.where('type', '==', type);
            let snap = await q.get();
            let results = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Fallback: docs uploaded manually may not have subjectSlug field.
            // Query by class+type and filter client-side by slugifying subject name.
            if (!results.length) {
                let fq = db.collection('materials').where('class', '==', String(classNum));
                if (type && type !== 'all') fq = fq.where('type', '==', type);
                const fsnap = await fq.get();
                results = fsnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(d => toSlug(d.subject || '') === subjectSlug);
            }
            return results;
        } catch (e) { console.error('❌ GetBySlug:', e); return []; }
    },

    async getByChapterSlug(classNum, subjectSlug, chapterSlug, type) {
        try {
            // Primary: query by stored slugs
            let q = db.collection('materials')
                .where('class', '==', String(classNum))
                .where('subjectSlug', '==', subjectSlug)
                .where('chapterSlug', '==', chapterSlug);
            if (type && type !== 'all') q = q.where('type', '==', type);
            let snap = await q.get();
            let results = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Fallback: manually-added docs lack slug fields.
            // Derive chapter number from slug like "chapter-21" → 21.
            if (!results.length) {
                let fq = db.collection('materials').where('class', '==', String(classNum));
                if (type && type !== 'all') fq = fq.where('type', '==', type);
                const fsnap = await fq.get();
                const all = fsnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const chNumMatch = chapterSlug.match(/chapter-(\d+)/);
                const chNum = chNumMatch ? Number(chNumMatch[1]) : null;
                results = all.filter(d => {
                    if (toSlug(d.subject || '') !== subjectSlug) return false;
                    if (chNum !== null) return Number(d.chapterNumber) === chNum;
                    return toSlug(d.chapterTitle || '') === chapterSlug;
                });
            }
            return results;
        } catch (e) { console.error('❌ GetByChapterSlug:', e); return []; }
    },

    async update(id, data) {
        try {
            if (data.subject) data.subjectSlug = toSlug(data.subject);
            await db.collection('materials').doc(id).update(data);
        } catch (e) { console.error('❌ Update:', e); throw e; }
    },

    async delete(id) {
        try {
            await db.collection('materials').doc(id).delete();
        } catch (e) { console.error('❌ Delete:', e); throw e; }
    },

    async getStats() {
        try {
            const items = await this.getAll();
            const stats = {
                total: items.length,
                books: items.filter(m => m.type === 'books').length,
                notes: items.filter(m => m.type === 'notes').length,
                byClass: { '9': 0, '10': 0, '11': 0, '12': 0 }
            };
            items.forEach(m => {
                if (stats.byClass[String(m.class)] !== undefined)
                    stats.byClass[String(m.class)]++;
            });
            return stats;
        } catch (e) { return { total: 0, books: 0, notes: 0, byClass: {} }; }
    }
};

console.log('✅ Firebase + DB ready');
