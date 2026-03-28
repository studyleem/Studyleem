// ============================================
// STUDYLEEM - MAIN JAVASCRIPT
// Firebase Configuration & Global Functions
// ============================================

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
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const auth = firebase.auth();

  // Enable offline persistence
  db.enablePersistence().catch(err => {
    console.log('Persistence error:', err.code);
  });

  console.log('✅ Firebase initialized successfully');
} else {
  console.error('❌ Firebase SDK not loaded');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get URL parameters
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Toggle chapter accordion
function toggleChapter(element) {
  const content = element.nextElementSibling;
  content.classList.toggle('expanded');
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `alert alert-${type}`;
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '9999';
  notification.style.minWidth = '300px';
  notification.style.animation = 'slideIn 0.3s ease';
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

console.log('StudyLeem - Main JavaScript Loaded ✅');
