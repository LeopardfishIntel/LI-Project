import admin from 'firebase-admin';
import { db as clientDb } from './server';
import {
  collection,
  getDocs,
  doc,
  writeBatch,
  updateDoc,
  getDoc,
  setDoc,
  addDoc
} from 'firebase/firestore';

let adminDb: any = null;

try {
  if (typeof window === 'undefined') {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-2840117705-12faa'
      });
    }
    adminDb = admin.firestore();
  }
} catch (err: any) {
  console.warn("Firebase Admin SDK initialization bypassed/failed. Falling back to client-side Firestore:", err.message || err);
}

const useAdmin = () => adminDb !== null;

// 1. Get All Documents from a Collection
export async function getCollectionDocs(colName: string) {
  if (useAdmin()) {
    const snap = await adminDb.collection(colName).get();
    return snap.docs.map((d: any) => ({
      id: d.id,
      data: () => d.data(),
      exists: () => true
    }));
  } else {
    const snap = await getDocs(collection(clientDb, colName));
    return snap.docs;
  }
}

// 2. Get a single document
export async function getDocument(colName: string, docId: string) {
  if (useAdmin()) {
    const docRef = adminDb.collection(colName).doc(docId);
    const snap = await docRef.get();
    return {
      exists: () => snap.exists,
      id: snap.id,
      data: () => snap.data()
    };
  } else {
    const docRef = doc(clientDb, colName, docId);
    const snap = await getDoc(docRef);
    return snap;
  }
}

// 3. Set a document
export async function setDocument(colName: string, docId: string, data: any, options: { merge?: boolean } = {}) {
  if (useAdmin()) {
    const docRef = adminDb.collection(colName).doc(docId);
    await docRef.set(data, options);
  } else {
    const docRef = doc(clientDb, colName, docId);
    await setDoc(docRef, data, options);
  }
}

// 4. Update a document
export async function updateDocument(colName: string, docId: string, data: any) {
  if (useAdmin()) {
    const docRef = adminDb.collection(colName).doc(docId);
    await docRef.update(data);
  } else {
    const docRef = doc(clientDb, colName, docId);
    await updateDoc(docRef, data);
  }
}

// 5. Add a document
export async function addDocument(colName: string, data: any) {
  if (useAdmin()) {
    const ref = await adminDb.collection(colName).add(data);
    return { id: ref.id };
  } else {
    const ref = await addDoc(collection(clientDb, colName), data);
    return { id: ref.id };
  }
}

// 6. Batch operations helper
export class DatabaseBatch {
  private batch: any;
  private isAdmin: boolean;

  constructor() {
    this.isAdmin = useAdmin();
    this.batch = this.isAdmin ? adminDb.batch() : writeBatch(clientDb);
  }

  set(colName: string, docId: string, data: any, options: { merge?: boolean } = {}) {
    if (this.isAdmin) {
      const ref = adminDb.collection(colName).doc(docId);
      this.batch.set(ref, data, options);
    } else {
      const ref = doc(clientDb, colName, docId);
      this.batch.set(ref, data, options);
    }
  }

  update(colName: string, docId: string, data: any) {
    if (this.isAdmin) {
      const ref = adminDb.collection(colName).doc(docId);
      this.batch.update(ref, data);
    } else {
      const ref = doc(clientDb, colName, docId);
      this.batch.update(ref, data);
    }
  }

  async commit() {
    await this.batch.commit();
  }
}

export function getAdminDb() {
  return adminDb || clientDb;
}
