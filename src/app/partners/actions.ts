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
    emailSubject = 'School Partnership Inquiry: Next Steps';
    emailBody = `Hello ${name},

Thanks for contacting Leopardfish Intel regarding a potential partnership.

We have received your enquiry to join our Verified Membership program.

Our team will now review the information you provided to ensure it aligns with our current member requirements. We aim to get back to you within 3 working days to discuss the next steps for your campus.

In the meantime, if you have a media kit or further documentation, please feel free to reply directly to this email.

Regards,

The Leopardfish Intel Team`;
  } else {
    emailSubject = 'Service Partnership Inquiry: Next Steps';
    emailBody = `Hello ${name},

Thanks for contacting Leopardfish Intel regarding a potential partnership.

We have received your enquiry to showcase your services to our international teaching community.

Our team will now review the information you provided to ensure it aligns with our current member requirements. We aim to get back to you within 3 working days to discuss any potential collaboration.

In the meantime, if you have a media kit or further documentation, please feel free to reply directly to this email.

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
    message: 'Your inquiry has been submitted successfully! We will get back to you shortly.',
    error: null,
    success: true,
  };
}
