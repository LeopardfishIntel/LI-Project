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
    emailSubject = 'Action Required: Complete your Leopardfish School Profile';
    emailBody = `Hello ${name},

Thanks for contacting Leopardfish Intel regarding your school’s membership.

To proceed with your Verified School Membership, please follow the steps below to set up your online profile. This ensures we have the correct data to showcase your school to our community.

Activate Account: You will shortly receive a separate invitation email. Follow the link to set up your login credentials.

Complete Profile: Once logged in, navigate to the 'School Profile' tab. Please complete all mandatory fields, including curriculum details, benefits, and media uploads.

Verification: Once your profile is 100% complete, our team will review the details and apply your Verified status.

Please aim to complete your profile within 3 working days to ensure there are no delays in your activation.

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
