// ===== FIREBASE AUTH + FIRESTORE =====
// FGF Demos - Firebase Integration

// Firebase SDKs via CDN
const FIREBASE_SCRIPTS = [
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js'
];

function loadFirebaseScripts() {
    return new Promise((resolve, reject) => {
        let loaded = 0;
        FIREBASE_SCRIPTS.forEach(src => {
            if (document.querySelector(`script[src="${src}"]`)) { loaded++; if (loaded === FIREBASE_SCRIPTS.length) resolve(); return; }
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => { loaded++; if (loaded === FIREBASE_SCRIPTS.length) resolve(); };
            s.onerror = () => reject(new Error('Failed to load ' + src));
            document.head.appendChild(s);
        });
    });
}

// Initialize Firebase
let fbApp = null, fbAuth = null, fbDb = null;

async function initFirebase() {
    await loadFirebaseScripts();
    fbApp = firebase.initializeApp(firebaseConfig);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
    return { app: fbApp, auth: fbAuth, db: fbDb };
}

// ===== AUTH HELPERS =====
async function fbRegister(email, password, displayName) {
    const cred = await fbAuth.createUserWithEmailAndPassword(email, password);
    if (displayName) await cred.user.updateProfile({ displayName });
    return cred.user;
}

async function fbLogin(email, password) {
    const cred = await fbAuth.signInWithEmailAndPassword(email, password);
    return cred.user;
}

async function fbLogout() {
    await fbAuth.signOut();
}

function fbCurrentUser() {
    return fbAuth ? fbAuth.currentUser : null;
}

function fbOnAuthChange(callback) {
    if (fbAuth) fbAuth.onAuthStateChanged(callback);
}

// ===== FIRESTORE HELPERS =====

// Save store data (products, config, etc.)
async function fbSaveStore(userId, storeId, data) {
    return fbDb.collection('users').doc(userId).collection('stores').doc(storeId).set(data, { merge: true });
}

// Load store data
async function fbLoadStore(userId, storeId) {
    const doc = await fbDb.collection('users').doc(userId).collection('stores').doc(storeId).get();
    return doc.exists ? doc.data() : null;
}

// Save demo (before client claims it)
async function fbSaveDemo(demoId, data) {
    return fbDb.collection('demos').doc(demoId).set(data, { merge: true });
}

// Load demo
async function fbLoadDemo(demoId) {
    const doc = await fbDb.collection('demos').doc(demoId).get();
    return doc.exists ? doc.data() : null;
}

// Client claims a demo - copies it to their account
async function fbClaimDemo(userId, demoId) {
    const demoData = await fbLoadDemo(demoId);
    if (!demoData) throw new Error('Demo no encontrada');
    await fbSaveStore(userId, demoId, demoData);
    // Mark demo as claimed
    await fbDb.collection('demos').doc(demoId).update({ claimedBy: userId, claimedAt: firebase.firestore.FieldValue.serverTimestamp() });
    return demoData;
}

// Save a single collection (products, orders, etc.)
async function fbSaveCollection(userId, storeId, collection, data) {
    return fbDb.collection('users').doc(userId).collection('stores').doc(storeId).collection(collection).doc('data').set(data, { merge: true });
}

// Load a single collection
async function fbLoadCollection(userId, storeId, collection) {
    const doc = await fbDb.collection('users').doc(userId).collection('stores').doc(storeId).collection(collection).doc('data').get();
    return doc.exists ? doc.data() : null;
}

// Save products
async function fbSaveProducts(userId, storeId, products) {
    return fbSaveCollection(userId, storeId, 'products', { items: products, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
}

// Load products
async function fbLoadProducts(userId, storeId) {
    const data = await fbLoadCollection(userId, storeId, 'products');
    return data ? data.items : null;
}

// Save orders
async function fbSaveOrders(userId, storeId, orders) {
    return fbSaveCollection(userId, storeId, 'orders', { items: orders, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
}

// Load orders
async function fbLoadOrders(userId, storeId) {
    const data = await fbLoadCollection(userId, storeId, 'orders');
    return data ? data.items : null;
}

// Save config
async function fbSaveConfig(userId, storeId, config) {
    return fbSaveCollection(userId, storeId, 'config', { ...config, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
}

// Load config
async function fbLoadConfig(userId, storeId) {
    return fbLoadCollection(userId, storeId, 'config');
}

// ===== REALTIME LISTENER =====
function fbListenStore(userId, storeId, callback) {
    return fbDb.collection('users').doc(userId).collection('stores').doc(storeId)
        .onSnapshot(doc => {
            if (doc.exists) callback(doc.data());
        });
}

console.log('🔥 FGF Firebase module loaded');
