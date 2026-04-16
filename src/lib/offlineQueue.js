// Offline message queue using IndexedDB
// Queues failed messages and retries when connection is restored

const DB_NAME = 'mzansichat_offline';
const STORE_NAME = 'pending_messages';
const DB_VERSION = 1;

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Add a failed message to the queue
export const queueMessage = async (message) => {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.add({
            ...message,
            queuedAt: new Date().toISOString(),
            retries: 0,
        });
        return true;
    } catch (e) {
        console.warn('[OfflineQueue] Failed to queue message:', e);
        return false;
    }
};

// Get all pending messages
export const getPendingMessages = async () => {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        });
    } catch {
        return [];
    }
};

// Remove a successfully sent message from the queue
export const dequeueMessage = async (id) => {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
        return true;
    } catch {
        return false;
    }
};

// Retry all pending messages
export const retryPendingMessages = async (sendFn) => {
    const pending = await getPendingMessages();
    for (const msg of pending) {
        try {
            await sendFn(msg);
            await dequeueMessage(msg.id);
        } catch (e) {
            // Increment retry count, give up after 5 attempts
            if (msg.retries >= 5) {
                await dequeueMessage(msg.id);
            }
        }
    }
};

// Check if browser is online
export const isOnline = () => navigator.onLine;

// Setup online/offline listeners
export const setupConnectivityListeners = (onOnline, onOffline) => {
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
    };
};