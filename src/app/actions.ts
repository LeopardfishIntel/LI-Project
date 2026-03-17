'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';

export interface AIPrompt {
  id?: string;
  title: string;
  content: string;
  createdAt?: any;
}

export async function getTacticalPrompts(): Promise<AIPrompt[]> {
  try {
    const q = query(collection(db, 'ai_prompts'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AIPrompt[];
  } catch (e) {
    console.error('Tactical Fetch Error:', e);
    return [];
  }
}

export async function saveTacticalPrompt(fd: FormData) {
  try {
    await addDoc(collection(db, 'ai_prompts'), {
      title: fd.get('title'),
      content: fd.get('content'),
      createdAt: Timestamp.now(),
    });
    return { success: true };
  } catch (e) { return { success: false }; }
}