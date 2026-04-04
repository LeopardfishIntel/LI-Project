'use server';

import { db } from "@/firebase";
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
  const inquiryType = formData.get('inquiryType') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const organisation = formData.get('organisation') as string;
  const message = formData.get('message') as string;

  // 🛡️ Validation
  if (!inquiryType || !name || !email || !organisation || !message) {
    return {
      message: null,
      error: 'All intelligence parameters are required for transmission.',
      success: false,
    };
  }

  try {
    // 1. DATABASE LOGGING (Firestore Backup)
    await addDoc(collection(db, "inquiries"), {
      name,
      email,
      organisation,
      type: inquiryType,
      message,
      status: "new",
      timestamp: serverTimestamp(),
    });

    // 2. DEFINE NEUTRAL RESPONSES
    let emailSubject = '';
    let emailBody = '';

    if (inquiryType === 'teacher') {
      emailSubject = 'Intelligence Request Acknowledged | Leopardfish Intel';
      emailBody = `Hello ${name},\n\nYour request for independent teacher intelligence has been received. \n\nLeopardfish Intel operates as a neutral data resource for the international community. Our team will review your inquiry and contact you shortly regarding your requirements.\n\nRegards,\n\nThe Leopardfish Intel Team`;
    } else if (inquiryType === 'school') {
      emailSubject = 'Verification Inquiry Received | Leopardfish Intel';
      emailBody = `Hello ${name},\n\nWe have received your inquiry regarding the Leopardfish Verified School Profile for ${organisation}.\n\nOur team maintains strict, independent verification standards. We will review your provided data and contact you shortly to discuss the next steps in the verification process.\n\nRegards,\n\nThe Leopardfish Intel Team`;
    } else {
      emailSubject = 'Service Provider Inquiry | Leopardfish Intel';
      emailBody = `Hello ${name},\n\nYour inquiry regarding service provider integration has been logged. \n\nWe focus exclusively on high-utility services that provide verified value to the international community. A member of our team will contact you to discuss your support for educators.\n\nRegards,\n\nThe Leopardfish Intel Team`;
    }

    // 3. LIVE TRANSMISSION
    if (process.env.RESEND_API_KEY) {
      // Send confirmation to the user
      await resend.emails.send({
        from: 'Leopardfish Intel <system@leopardfishintel.com>',
        to: [email],
        subject: emailSubject,
        text: emailBody,
      });

      // Send notification to Roger
      await resend.emails.send({
        from: 'Intelligence Desk <system@leopardfishintel.com>',
        to: ['roger@leopardfishintel.com'],
        subject: `🚨 NEW INQUIRY: ${inquiryType.toUpperCase()} - ${organisation}`,
        text: `Source: ${name}\nEmail: ${email}\nOrganisation: ${organisation}\n\nMessage Detail:\n${message}`,
      });
    }

    return {
      message: 'Transmission Successful. Your request has been logged and our team will contact you shortly.',
      error: null,
      success: true,
    };

  } catch (err) {
    console.error('Transmission Error:', err);
    return {
      message: null,
      error: 'Critical transmission failure. Please verify your connection or contact roger@leopardfishintel.com directly.',
      success: false,
    };
  }
}