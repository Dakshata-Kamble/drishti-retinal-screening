import { openDB } from 'idb';
import { Patient } from '../types';

/**
 * Service to fetch and save patient records.
 * Uses a true offline-first strategy with IndexedDB caching and sync queueing.
 */

const DB_NAME = 'DrishtiAI_DB';
const STORE_PATIENTS = 'patients';
const STORE_SYNC_QUEUE = 'sync_queue';

async function getIDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_PATIENTS)) {
        db.createObjectStore(STORE_PATIENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
      }
    },
  });
}

// ── Check if we are online ────────────────────────────────────────────────
function isOnline() {
  return navigator.onLine;
}

// ── Background Sync (when online) ──────────────────────────────────────────
export async function syncOfflineQueue() {
  if (!isOnline()) return;

  try {
    const db = await getIDB();
    const queuedItems = await db.getAll(STORE_SYNC_QUEUE);
    if (queuedItems.length === 0) return;

    for (const item of queuedItems) {
      try {
        const method = 'PUT'; // In a real system, track if it was POST or PUT
        const url = `/api/patients/${item.patient.id}`;
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.patient),
        });

        if (response.ok) {
          // Sync successful, remove from queue
          const tx = db.transaction([STORE_SYNC_QUEUE, STORE_PATIENTS], 'readwrite');
          await tx.objectStore(STORE_SYNC_QUEUE).delete(item.id);
          
          // Mark as synced in local store
          const syncedPatient = { ...item.patient, syncStatus: 'synced' };
          await tx.objectStore(STORE_PATIENTS).put(syncedPatient);
          await tx.done;
        }
      } catch (err) {
        console.warn('Sync failed for item', item.id, err);
      }
    }
  } catch (err) {
    console.error('Error during syncOfflineQueue', err);
  }
}

// Listen for online event to trigger sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncOfflineQueue);
}

// ── Fetch Patients (Network first, fallback to Cache) ─────────────────────
export async function fetchPatients(): Promise<Patient[]> {
  const db = await getIDB();
  
  if (isOnline()) {
    try {
      const response = await fetch('/api/patients');
      if (response.ok) {
        const data = await response.json();
        const patients = data.patients;
        
        // Update local cache
        const tx = db.transaction(STORE_PATIENTS, 'readwrite');
        for (const p of patients) {
          tx.store.put(p);
        }
        await tx.done;
        
        // Also trigger sync if there are pending items
        syncOfflineQueue();
        return patients;
      }
    } catch (err) {
      console.warn('Network fetch failed, falling back to IndexedDB', err);
    }
  }
  
  // Fallback to local IndexedDB
  return await db.getAll(STORE_PATIENTS);
}

// ── Save Patient (Offline first) ─────────────────────────────────────────
export async function savePatientRecord(patient: Patient): Promise<Patient> {
  const db = await getIDB();
  
  if (isOnline()) {
    try {
      const isExisting = await db.get(STORE_PATIENTS, patient.id);
      const method = isExisting ? 'PUT' : 'POST';
      const url = isExisting ? `/api/patients/${patient.id}` : '/api/patients';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient),
      });
      
      if (response.ok) {
        const data = await response.json();
        await db.put(STORE_PATIENTS, data.patient);
        return data.patient;
      }
    } catch (err) {
      console.warn('Network save failed, queueing for offline sync', err);
    }
  }
  
  // If offline or network failed, save locally and queue sync
  const offlinePatient = { ...patient, syncStatus: 'queued' };
  const tx = db.transaction([STORE_PATIENTS, STORE_SYNC_QUEUE], 'readwrite');
  await tx.objectStore(STORE_PATIENTS).put(offlinePatient);
  await tx.objectStore(STORE_SYNC_QUEUE).put({ 
    id: patient.id, 
    patient: offlinePatient,
    timestamp: Date.now() 
  });
  await tx.done;
  
  return offlinePatient as Patient;
}
