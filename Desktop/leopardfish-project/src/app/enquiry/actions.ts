'use server';

export type InquiryState = {
  message: string | null;
  error: string | null;
  success: boolean;
};

export async function submitInquiry(
  prevState: InquiryState,
  formData: FormData
): Promise<InquiryState> {
  const name = formData.get('name');
  const email = formData.get('email');
  const subject = formData.get('subject');
  const message = formData.get('message');

  if (!name || !email || !subject || !message) {
    return {
      message: null,
      error: 'Please fill out all fields.',
      success: false,
    };
  }

  const emailSubject = `New Enquiry: ${subject}`;
  const emailBody = `Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}`;

  // In a real application, you would send an email here.
  // For now, we'll just log it to the console.
  console.log('--- Sending General Inquiry Email ---');
  console.log(`To: admin@leopardfishintel.com`);
  console.log(`Subject: ${emailSubject}`);
  console.log(`Body:\n${emailBody}`);
  console.log('-----------------------------');

  return {
    message: 'Thank you for your enquiry. We will get back to you shortly.',
    error: null,
    success: true,
  };
}
