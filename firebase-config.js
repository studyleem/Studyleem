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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// Only initialize auth if firebase-auth is loaded (admin page)
const auth = typeof firebase.auth === 'function' ? firebase.auth() : null;

// Database helper functions
const DB = {
    async create(data) {
        try {
            const docRef = await db.collection('materials').add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Material created:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('❌ Create error:', error);
            throw error;
        }
    },

    async getAll() {
        try {
            console.log('📥 Fetching all materials...');
            const snapshot = await db.collection('materials').get();

            if (snapshot.empty) {
                console.log('⚠️ No materials found');
                return [];
            }

            const materials = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort client-side (newest first)
            materials.sort((a, b) => {
                const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            });

            console.log(`✅ Fetched ${materials.length} materials`);
            return materials;
        } catch (error) {
            console.error('❌ GetAll error:', error);
            console.error('Error details:', error.message);
            return [];
        }
    },

    async getByClass(classNum) {
        try {
            console.log(`📥 Fetching class ${classNum}...`);
            const snapshot = await db.collection('materials')
                .where('class', '==', String(classNum))
                .get();

            const materials = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log(`✅ Found ${materials.length} materials for class ${classNum}`);
            return materials;
        } catch (error) {
            console.error('❌ GetByClass error:', error);
            console.error('Error details:', error.message);
            return [];
        }
    },

    async getBySubject(classNum, subject) {
        try {
            console.log(`📥 Fetching class ${classNum}, subject: ${subject}...`);
            const snapshot = await db.collection('materials')
                .where('class', '==', String(classNum))
                .where('subject', '==', subject)
                .get();

            const materials = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log(`✅ Found ${materials.length} materials`);
            return materials;
        } catch (error) {
            console.error('❌ GetBySubject error:', error);
            console.error('Error details:', error.message);
            return [];
        }
    },

    async update(id, data) {
        try {
            await db.collection('materials').doc(id).update(data);
            console.log('✅ Updated:', id);
        } catch (error) {
            console.error('❌ Update error:', error);
            throw error;
        }
    },

    async delete(id) {
        try {
            await db.collection('materials').doc(id).delete();
            console.log('✅ Deleted:', id);
        } catch (error) {
            console.error('❌ Delete error:', error);
            throw error;
        }
    },

    async getStats() {
        try {
            const materials = await this.getAll();
            const stats = {
                total: materials.length,
                books: materials.filter(m => m.type === 'books').length,
                notes: materials.filter(m => m.type === 'notes').length,
                byClass: { '9': 0, '10': 0, '11': 0, '12': 0 }
            };
            materials.forEach(m => {
                const classKey = String(m.class);
                if (stats.byClass[classKey] !== undefined) {
                    stats.byClass[classKey]++;
                }
            });
            return stats;
        } catch (error) {
            console.error('❌ GetStats error:', error);
            return { total: 0, books: 0, notes: 0, byClass: { '9': 0, '10': 0, '11': 0, '12': 0 } };
        }
    }
};

console.log('✅ Firebase initialized');
console.log('📊 Database ready');
