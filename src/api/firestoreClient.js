/**
 * Base44 Client - Firestore-based CRUD operations
 * Falls back to localStorage when Firebase is not configured
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query as fsQuery,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';

const STORAGE_PREFIX = 'robotics_team_';

// ============== Organization scoping ==============

// Accounts and organizations live at the top level. Everything else belongs to
// one organization and is stored under orgs/{orgId}/..., which is what keeps
// one group's data out of another's.
const GLOBAL_COLLECTIONS = ['users', 'orgs'];

let currentOrgId = null;

export function setOrgScope(orgId) {
  currentOrgId = orgId || null;
}

function scoped(collectionName) {
  // A full path (e.g. orgs/{orgId}/members) names its organization itself
  if (GLOBAL_COLLECTIONS.includes(collectionName) || collectionName.includes('/')) return collectionName;
  if (!currentOrgId) throw new Error('No organization selected');
  return `orgs/${currentOrgId}/${collectionName}`;
}

// ============== LocalStorage Fallback Functions ==============

function localGetAll(collectionName) {
  const key = `${STORAGE_PREFIX}${collectionName}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function localGetById(collectionName, id) {
  const items = localGetAll(collectionName);
  return items.find(item => item.id === id) || null;
}

function localCreate(collectionName, data) {
  const items = localGetAll(collectionName);
  const newItem = {
    ...data,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  items.push(newItem);
  localStorage.setItem(`${STORAGE_PREFIX}${collectionName}`, JSON.stringify(items));
  return newItem;
}

function localUpdate(collectionName, id, data) {
  const items = localGetAll(collectionName);
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return null;

  items[index] = {
    ...items[index],
    ...data,
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(`${STORAGE_PREFIX}${collectionName}`, JSON.stringify(items));
  return items[index];
}

// Create or merge into the item with this exact id
function localSet(collectionName, id, data) {
  const items = localGetAll(collectionName);
  const index = items.findIndex(item => item.id === id);
  const now = new Date().toISOString();
  const item = index === -1
    ? { ...data, id, created_at: now, updated_at: now }
    : { ...items[index], ...data, updated_at: now };
  if (index === -1) items.push(item);
  else items[index] = item;
  localStorage.setItem(`${STORAGE_PREFIX}${collectionName}`, JSON.stringify(items));
  return item;
}

function localRemove(collectionName, id) {
  const items = localGetAll(collectionName);
  const filteredItems = items.filter(item => item.id !== id);
  if (filteredItems.length === items.length) return false;

  localStorage.setItem(`${STORAGE_PREFIX}${collectionName}`, JSON.stringify(filteredItems));
  return true;
}

function localQuery(collectionName, filters = {}) {
  let items = localGetAll(collectionName);

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      items = items.filter(item => {
        if (Array.isArray(value)) {
          return value.includes(item[key]);
        }
        return item[key] === value;
      });
    }
  });

  return items;
}

function localGetSetting(key, defaultValue = null) {
  const settings = localGetAll(scoped('settings'));
  const setting = settings.find(s => s.key === key);
  return setting ? setting.value : defaultValue;
}

function localSetSetting(key, value) {
  const settings = localGetAll(scoped('settings'));
  const index = settings.findIndex(s => s.key === key);

  if (index === -1) {
    return localCreate(scoped('settings'), { key, value });
  } else {
    return localUpdate(scoped('settings'), settings[index].id, { value });
  }
}

// ============== Firestore Functions ==============

/**
 * Get all items from a Firestore collection
 */
async function firestoreGetAll(collectionName) {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(`Error getting ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get a single item by ID from Firestore
 */
async function firestoreGetById(collectionName, id) {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error(`Error getting ${collectionName}/${id}:`, error);
    throw error;
  }
}

/**
 * Create a new item in Firestore
 */
async function firestoreCreate(collectionName, data) {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error creating in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Update an existing item in Firestore
 */
async function firestoreUpdate(collectionName, id, data) {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updated_at: serverTimestamp(),
    });

    return {
      id,
      ...data,
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error updating ${collectionName}/${id}:`, error);
    throw error;
  }
}

/**
 * Create or merge into the Firestore document with this exact id
 */
async function firestoreSet(collectionName, id, data) {
  try {
    await setDoc(doc(db, collectionName, id), { ...data, updated_at: serverTimestamp() }, { merge: true });
    return { id, ...data };
  } catch (error) {
    console.error(`Error setting ${collectionName}/${id}:`, error);
    throw error;
  }
}

/**
 * Delete an item from Firestore
 */
async function firestoreRemove(collectionName, id) {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error deleting ${collectionName}/${id}:`, error);
    throw error;
  }
}

/**
 * Query items with filters from Firestore
 */
async function firestoreQuery(collectionName, filters = {}) {
  try {
    let q = collection(db, collectionName);
    const constraints = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        constraints.push(where(key, '==', value));
      }
    });

    if (constraints.length > 0) {
      q = fsQuery(q, ...constraints);
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get a settings value from Firestore
 */
async function firestoreGetSetting(key, defaultValue = null) {
  try {
    const q = fsQuery(collection(db, scoped('settings')), where('key', '==', key));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data().value;
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set a settings value in Firestore
 */
async function firestoreSetSetting(key, value) {
  try {
    const q = fsQuery(collection(db, scoped('settings')), where('key', '==', key));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docRef = doc(db, scoped('settings'), querySnapshot.docs[0].id);
      await updateDoc(docRef, { value, updated_at: serverTimestamp() });
      return { id: querySnapshot.docs[0].id, key, value };
    } else {
      const docRef = await addDoc(collection(db, scoped('settings')), {
        key,
        value,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return { id: docRef.id, key, value };
    }
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    throw error;
  }
}

// ============== Unified API ==============

const shouldUseFirestore = () => isFirebaseConfigured() && db;

/**
 * Get all items from a collection
 */
export async function getAll(collectionName) {
  collectionName = scoped(collectionName);
  if (shouldUseFirestore()) {
    return firestoreGetAll(collectionName);
  }
  return localGetAll(collectionName);
}

/**
 * Get a single item by ID
 */
export async function getById(collectionName, id) {
  collectionName = scoped(collectionName);
  if (shouldUseFirestore()) {
    return firestoreGetById(collectionName, id);
  }
  return localGetById(collectionName, id);
}

/**
 * Create a new item
 */
export async function create(collectionName, data) {
  collectionName = scoped(collectionName);
  if (shouldUseFirestore()) {
    return firestoreCreate(collectionName, data);
  }
  return localCreate(collectionName, data);
}

/**
 * Update an existing item
 */
export async function update(collectionName, id, data) {
  collectionName = scoped(collectionName);
  if (shouldUseFirestore()) {
    return firestoreUpdate(collectionName, id, data);
  }
  return localUpdate(collectionName, id, data);
}

/**
 * Create an item under a chosen id, or merge into it if it exists
 */
export async function setById(collectionName, id, data) {
  collectionName = scoped(collectionName);
  if (shouldUseFirestore()) {
    return firestoreSet(collectionName, id, data);
  }
  return localSet(collectionName, id, data);
}

/**
 * Delete an item
 */
export async function remove(collectionName, id) {
  collectionName = scoped(collectionName);
  if (shouldUseFirestore()) {
    return firestoreRemove(collectionName, id);
  }
  return localRemove(collectionName, id);
}

/**
 * Query items with filters
 */
export async function queryItems(collectionName, filters = {}) {
  collectionName = scoped(collectionName);
  if (shouldUseFirestore()) {
    return firestoreQuery(collectionName, filters);
  }
  return localQuery(collectionName, filters);
}

/**
 * Get a settings value
 */
export async function getSetting(key, defaultValue = null) {
  if (shouldUseFirestore()) {
    return firestoreGetSetting(key, defaultValue);
  }
  return localGetSetting(key, defaultValue);
}

/**
 * Set a settings value
 */
export async function setSetting(key, value) {
  if (shouldUseFirestore()) {
    return firestoreSetSetting(key, value);
  }
  return localSetSetting(key, value);
}

// Export for backwards compatibility
export const query = queryItems;

// Export client object for convenient access
const firestoreClient = {
  getAll,
  getById,
  create,
  setById,
  update,
  remove,
  query: queryItems,
  getSetting,
  setSetting,
  setOrgScope,
};

export default firestoreClient;
