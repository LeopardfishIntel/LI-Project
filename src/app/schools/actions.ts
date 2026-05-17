'use server';

import { db } from "@/firebase/server";
import { doc, getDoc } from "firebase/firestore";

/**
 * 🛰️ Server-side loader for Teacher Requirements (bypasses Firestore Security Rules)
 */
export async function getCountryRequirements(countryId: string) {
  try {
    const docRef = doc(db, "teacher_requirements", countryId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("❌ SERVER ACTION ERROR (getCountryRequirements):", error);
    return null;
  }
}
