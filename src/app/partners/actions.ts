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
  const inquiryType = formData.get('inquiryType');
  const name = formData.get('name');
  const email = formData.get('email');
  const organization = formData.get('organization');
  const message = formData.get('message');

  if (!inquiryType || !name || !email || !organization || !message) {
    return {
      message: null,
      error: 'Please fill out all fields.',
      success: false,
    };
  }

  let emailSubject = '';
  let emailBody = '';

  if (inquiryType === 'school') {
    emailSubject = 'Your Verified School Profile is Now Live 🐾';
    emailBody = `Hello ${name},

Your Leopardfish Intel Verified School Profile is now live.

Our team has completed the final review of your data and your school is now visible to our global teaching community. You can view your live profile here: [Link to Profile]

Next Steps:

Review: Please take a moment to ensure all links and information are correct.

Updates: You can update your profile, vacancy links, or media at any time via your [Dashboard Link].

Verified Status: Your profile now carries the Leopardfish Verified badge, confirming your commitment to the international teaching community.

Thank you for joining our network.

Regards,

The Leopardfish Intel Team`;
  } else {
    emailSubject = 'Your Service Provider Profile is Now Live';
    emailBody = `Hello ${name},

Your Service Provider Profile is now live on Leopardfish Intel.

Your services are now visible to our network of international schools and educators. You can view your listing here: [Link to Profile]

Next Steps:

Check Your Listing: Ensure your contact details and links are functioning correctly.

Manage Content: To make changes to your description or branding, please log in to your [Account Dashboard].

Enquiries: Any enquiries generated through your profile will be sent directly to the email address provided in your setup.

We look forward to a successful partnership.

Regards,

The Leopardfish Intel Team`;
  }

  // In a real application, you would send an email here.
  // For now, we'll just log it to the console.
  console.log('--- Sending Inquiry Email ---');
  console.log(`To: ${email}`);
  console.log(`Subject: ${emailSubject}`);
  console.log(`Body:\n${emailBody}`);
  console.log('-----------------------------');

  return {
    message: 'Success! Your profile is now live. Please check your email for details.',
    error: null,
    success: true,
  };
}
