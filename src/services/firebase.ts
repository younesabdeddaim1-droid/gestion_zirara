import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';

// Fallback configuration for preview environments
import appletConfig from '../../firebase-applet-config.json';

import {
  initialSettings,
  initialUsers,
  initialFilieres,
  initialClasses,
  initialBeneficiaires,
  initialSeances,
  initialAbsences,
  initialMotifs,
  initialConvocations
} from '../data/mockData';

const getFirebaseConfigValue = (envVal: any, configVal: any): string => {
  if (
    typeof envVal === 'string' &&
    envVal.trim() !== '' &&
    envVal !== 'undefined' &&
    envVal !== 'null' &&
    !envVal.includes('placeholder') &&
    !envVal.includes('__VITE_')
  ) {
    return envVal;
  }
  return configVal || '';
};

const firebaseConfig = {
  apiKey: getFirebaseConfigValue(import.meta.env.VITE_FIREBASE_API_KEY, appletConfig.apiKey),
  authDomain: getFirebaseConfigValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, appletConfig.authDomain),
  projectId: getFirebaseConfigValue(import.meta.env.VITE_FIREBASE_PROJECT_ID, appletConfig.projectId),
  storageBucket: getFirebaseConfigValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, appletConfig.storageBucket),
  messagingSenderId: getFirebaseConfigValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, appletConfig.messagingSenderId),
  appId: getFirebaseConfigValue(import.meta.env.VITE_FIREBASE_APP_ID, appletConfig.appId)
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const customDbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || appletConfig.firestoreDatabaseId || "";
export const db = customDbId 
  ? initializeFirestore(app, {}, customDbId) 
  : initializeFirestore(app, {});


/**
 * Initializes collections with default data ONLY if they are completely empty.
 * This guarantees we never delete or overwrite any user-entered data!
 */
export async function initializeCollectionsIfEmpty() {
  try {
    // 1. settings / parametres
    const settingsRef = doc(db, 'settings', 'current_settings');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, initialSettings);
      console.log('Seeded settings');
    }

    // Helper to seed ONLY if empty
    const seedIfEmpty = async (colName: string, initialData: any[]) => {
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);
      
      if (snap.empty) {
        console.log(`Collection ${colName} is empty. Seeding default data...`);
        // Write default data in batches (max 500)
        if (initialData && initialData.length > 0) {
          const batchSet = writeBatch(db);
          initialData.forEach((item) => {
            if (item && item.id) {
              const docRef = doc(db, colName, item.id);
              batchSet.set(docRef, item);
            }
          });
          await batchSet.commit();
          console.log(`Successfully seeded collection: ${colName}`);
        }
      } else {
        console.log(`Collection ${colName} has ${snap.size} documents. Skipping seeding to preserve user data.`);
      }
    };

    // Seed empty collections only
    await seedIfEmpty('users', initialUsers);
    await seedIfEmpty('filieres', initialFilieres);
    await seedIfEmpty('classes', initialClasses);
    await seedIfEmpty('beneficiaires', initialBeneficiaires);
    await seedIfEmpty('seances', initialSeances);
    await seedIfEmpty('absences', initialAbsences);
    await seedIfEmpty('motifs', initialMotifs);
    await seedIfEmpty('convocations', initialConvocations);

    console.log('Database initialization check complete (preserves existing data).');
  } catch (error) {
    console.error('Error during database initialization:', error);
  }
}

// Seeding is triggered lazily upon authorized administrator login in AuthContext.tsx
