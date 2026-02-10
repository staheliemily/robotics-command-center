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
  updateDoc,
  deleteDoc,
  query as fsQuery,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';

const STORAGE_PREFIX = 'robotics_team_';

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
  const settings = localGetAll('settings');
  const setting = settings.find(s => s.key === key);
  return setting ? setting.value : defaultValue;
}

function localSetSetting(key, value) {
  const settings = localGetAll('settings');
  const index = settings.findIndex(s => s.key === key);

  if (index === -1) {
    return localCreate('settings', { key, value });
  } else {
    return localUpdate('settings', settings[index].id, { value });
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
    const q = fsQuery(collection(db, 'settings'), where('key', '==', key));
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
    const q = fsQuery(collection(db, 'settings'), where('key', '==', key));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docRef = doc(db, 'settings', querySnapshot.docs[0].id);
      await updateDoc(docRef, { value, updated_at: serverTimestamp() });
      return { id: querySnapshot.docs[0].id, key, value };
    } else {
      const docRef = await addDoc(collection(db, 'settings'), {
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
  if (shouldUseFirestore()) {
    return firestoreGetAll(collectionName);
  }
  return localGetAll(collectionName);
}

/**
 * Get a single item by ID
 */
export async function getById(collectionName, id) {
  if (shouldUseFirestore()) {
    return firestoreGetById(collectionName, id);
  }
  return localGetById(collectionName, id);
}

/**
 * Create a new item
 */
export async function create(collectionName, data) {
  if (shouldUseFirestore()) {
    return firestoreCreate(collectionName, data);
  }
  return localCreate(collectionName, data);
}

/**
 * Update an existing item
 */
export async function update(collectionName, id, data) {
  if (shouldUseFirestore()) {
    return firestoreUpdate(collectionName, id, data);
  }
  return localUpdate(collectionName, id, data);
}

/**
 * Delete an item
 */
export async function remove(collectionName, id) {
  if (shouldUseFirestore()) {
    return firestoreRemove(collectionName, id);
  }
  return localRemove(collectionName, id);
}

/**
 * Query items with filters
 */
export async function queryItems(collectionName, filters = {}) {
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

/**
 * Initialize with sample data if empty (localStorage only)
 */
export async function initializeSampleData() {
  // Only initialize sample data in localStorage mode
  if (shouldUseFirestore()) {
    console.log('Using Firestore - sample data initialization skipped');
    return;
  }

  // Only initialize if no data exists
  if (localGetAll('tasks').length > 0) return;

  // Sample tasks
  const sampleTasks = [
    {
      title: 'Prototype intake',
      description: 'Build and test intake mechanism prototype',
      team: 'Unhatched Plan',
      category: 'FTC',
      department: 'ELECTRICAL',
      subsystem: 'Intake',
      assigned_to: '',
      start_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Not Started',
      priority: 'Medium',
      needs_mentor: false,
    },
    {
      title: 'Assemble arm subsystem',
      description: 'Complete assembly of robot arm',
      team: 'Unhatched Plan',
      category: 'FTC',
      department: 'UNASSIGNED',
      subsystem: 'Shooter',
      assigned_to: 'Morgan',
      start_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Not Started',
      priority: 'Medium',
      needs_mentor: false,
    },
    {
      title: 'Program autonomous mode',
      description: 'Implement autonomous navigation',
      team: 'Unhatched Plan',
      category: 'FTC',
      department: 'UNASSIGNED',
      subsystem: '',
      assigned_to: 'Jordan',
      start_date: new Date().toISOString(),
      status: 'In Progress',
      priority: 'High',
      needs_mentor: true,
    },
    {
      title: 'Build chassis prototype',
      description: 'Construct initial chassis design',
      team: 'Unhatched Plan',
      category: 'FTC',
      department: 'UNASSIGNED',
      subsystem: 'Shooter',
      assigned_to: 'Alex',
      start_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Not Started',
      priority: 'High',
      needs_mentor: false,
    },
    {
      title: 'Test drive train',
      description: 'Verify drivetrain performance',
      team: 'Weight on Our Shoulders',
      category: 'FTC',
      department: 'UNASSIGNED',
      subsystem: '',
      assigned_to: 'Casey',
      start_date: new Date().toISOString(),
      status: 'Not Started',
      priority: 'Medium',
      needs_mentor: false,
    },
    {
      title: 'Design intake mechanism',
      description: 'CAD design for intake system',
      team: 'Weight on Our Shoulders',
      category: 'FTC',
      department: 'UNASSIGNED',
      subsystem: '',
      assigned_to: 'Sam',
      start_date: new Date().toISOString(),
      status: 'In Progress',
      priority: 'Medium',
      needs_mentor: false,
    },
    {
      title: 'Wire electrical panel',
      description: 'Complete wiring for control panel',
      team: 'Icarus Innovated',
      category: 'FRC',
      department: 'UNASSIGNED',
      subsystem: '',
      assigned_to: 'Taylor',
      start_date: new Date().toISOString(),
      status: 'Not Started',
      priority: 'High',
      needs_mentor: true,
    },
    {
      title: 'Practice driver skills',
      description: 'Driver practice sessions',
      team: 'New Hawks',
      category: 'FRC',
      department: 'UNASSIGNED',
      subsystem: '',
      assigned_to: 'Jamie',
      start_date: new Date().toISOString(),
      status: 'Not Started',
      priority: 'Low',
      needs_mentor: false,
    },
  ];

  // Sample sponsors
  const sampleSponsors = [
    {
      name: 'Tech Corp Industries',
      amount: 5000,
      contact_email: 'sponsor@techcorp.com',
      status: 'Confirmed',
      date_received: new Date().toISOString(),
      notes: 'Annual sponsor since 2022',
    },
    {
      name: 'Local Hardware Store',
      amount: 500,
      contact_email: 'support@localhardware.com',
      status: 'Pending',
      date_received: null,
      notes: 'Waiting for confirmation',
    },
    {
      name: 'Engineering Foundation',
      amount: 2500,
      contact_email: 'grants@engfoundation.org',
      status: 'Received',
      date_received: new Date().toISOString(),
      notes: 'Grant for STEM education',
    },
  ];

  // Sample expenses
  const sampleExpenses = [
    {
      description: 'Motor controllers (4x)',
      amount: 320,
      category: 'Parts',
      team: 'Build Team',
      date: new Date().toISOString(),
      receipt_url: '',
    },
    {
      description: 'Competition registration',
      amount: 150,
      category: 'Registration',
      team: 'All Teams',
      date: new Date().toISOString(),
      receipt_url: '',
    },
    {
      description: 'Team t-shirts',
      amount: 450,
      category: 'Marketing',
      team: 'Outreach Team',
      date: new Date().toISOString(),
      receipt_url: '',
    },
  ];

  // Initialize sample data
  sampleTasks.forEach(task => localCreate('tasks', task));
  sampleSponsors.forEach(sponsor => localCreate('sponsors', sponsor));
  sampleExpenses.forEach(expense => localCreate('expenses', expense));

  // Initialize settings
  localSetSetting('total_budget', 10000);
  localSetSetting('banner_message', 'Welcome to the Robotics Team Dashboard! Competition season starts soon.');
}

// Export for backwards compatibility
export const query = queryItems;

// Export client object for convenient access
const firestoreClient = {
  getAll,
  getById,
  create,
  update,
  remove,
  query: queryItems,
  getSetting,
  setSetting,
  initializeSampleData,
};

export default firestoreClient;
