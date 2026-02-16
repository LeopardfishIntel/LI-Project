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
    emailSubject = 'Leopardfish Intel: School Profile Essentials';
    emailBody = `Hello ${name},

Thank you for your interest in our Verified School Membership. Please complete the following details to finalise your profile. Once finished, please return this information by replying to our initial email.

1. School Overview
- Official School Name:
- City & Country:
- Website URL:
- Curriculum Offered: (e.g., National Curriculum for England, IB, US, etc.)
- Ages Taught: (e.g., 3–18)

2. Accreditation & Governance
- Accrediting Bodies: (e.g., CIS, COBIS, BSME, FOBISIA, etc.)
- Inspection Report Link: (Optional, but recommended for Verified status)

3. Recruitment & HR Contact
- Lead Recruitment Contact Name:
- Direct Email for Enquiries:
- Current Vacancies Page Link:

4. Profile Content
- School Summary (Max 150 words): A concise overview of your school’s ethos and what you offer prospective teachers.
- Staff Benefits: (e.g., Housing allowance, medical insurance, annual flights, etc.)

5. Media Requirements
- School Logo: Please attach a high-resolution version (PNG or SVG preferred).
- Hero Image: Please attach one high-quality landscape photo of your campus or learning environment.

Note: Verified status is subject to the review of the information provided above.

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
