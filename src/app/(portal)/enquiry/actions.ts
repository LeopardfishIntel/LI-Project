 'use server';

import { db } from "@/firebase"; // 🛰️ Pointing to your unified Mission Control
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type InquiryState = {
  message: string | null;
  error: string | null;
  success: boolean;
};

export async function submitInquiry(
  prevState: InquiryState,
  formData: FormData
): Promise<InquiryState> {
  const name = formData.get('name')?.toString();
  const email = formData.get('email')?.toString();
  const subject = formData.get('subject')?.toString();
  const message = formData.get('message')?.toString();

  // 1. Validation Guard
  if (!name || !email || !subject || !message) {
    return {
      message: null,
      error: 'Tactical Error: All intelligence fields must be populated.',
      success: false,
    };
  }

  try {
    // 2. Persistence Layer: Ensure data is logged in Firestore
    await addDoc(collection(db, "enquiries"), {
      name,
      email,
      subject,
      message,
      status: 'pending',
      receivedAt: serverTimestamp(),
    });

    // 3. Simulated/Internal Log
    console.log(`--- Intelligence Logged: Enquiry from ${name} ---`);

    return {
      message: 'Intelligence received. Our agents will respond shortly.',
      error: null,
      success: true,
    };
  } catch (err) {
    console.error("🎯 Persistence Failure:", err);
    return {
      message: null,
      error: 'Operational Failure: Database write rejected. Please check your connection.',
      success: false,
    };
  }
}