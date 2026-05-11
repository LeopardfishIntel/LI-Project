 'use server';

import { db } from "@/firebase/server";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Resend } from 'resend';

// Initialize Resend (Ensure RESEND_API_KEY is in your .env)
const resend = new Resend(process.env.RESEND_API_KEY);

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

    // 3. LIVE TRANSMISSION (Resend)
    if (process.env.RESEND_API_KEY) {
      console.log("🚀 INITIATING LIVE TRANSMISSION TO:", email);
      
      try {
        // Send confirmation to the user
        const userEmail = await resend.emails.send({
          from: 'Leopardfish Intel <system@leopardfishintel.com>',
          to: [email],
          replyTo: 'roger@leopardfishintel.com',
          subject: `Enquiry Received: ${subject}`,
          text: `Hello ${name},\n\nYour enquiry has been received and logged in our system. Our team will review the details and get back to you shortly.\n\nSubject: ${subject}\n\nMessage:\n${message}\n\nRegards,\nThe Leopardfish Intel Team`,
        });
        console.log("✅ USER CONFIRMATION SENT:", userEmail);

        // Send notification to Roger
        const adminEmail = await resend.emails.send({
          from: 'Intelligence Desk <system@leopardfishintel.com>',
          to: ['roger@leopardfishintel.com'],
          subject: `🚨 NEW ENQUIRY: ${subject}`,
          text: `From: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
        });
        console.log("✅ ADMIN NOTIFICATION SENT:", adminEmail);
      } catch (resendError) {
        console.error("❌ RESEND API ERROR:", resendError);
        // We still return success: true because the enquiry was saved in Firestore, 
        // but we should know about the email failure.
      }
    } else {
      console.warn("⚠️ RESEND_API_KEY MISSING. Skipping live transmission.");
    }

    return {
      message: 'Intelligence received. Our agents will respond shortly.',
      error: null,
      success: true,
    };
  } catch (err) {
    console.error("🎯 Transmission Failure:", err);
    return {
      message: null,
      error: 'Operational Failure: Database write rejected. Please check your connection.',
      success: false,
    };
  }
}