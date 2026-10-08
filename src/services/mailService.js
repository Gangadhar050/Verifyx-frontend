import emailjs from "@emailjs/browser";

const SERVICE_ID = "service_thf7j6o";
const TEMPLATE_ID = "template_fe9hgqe";
const PUBLIC_KEY = "yOUYYD57OvpnpV5H6";

const APPLICATION_URL = import.meta.env.VITE_APPLICATION_URL || `${window.location.origin}/candidate`;

const send = (params) => emailjs.send(SERVICE_ID, TEMPLATE_ID, { company_name: 'Verify-X', ...params }, PUBLIC_KEY);

const getHrNotificationEmail = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('verifyx_hr_profile') || 'null');
    if (saved?.email) return saved.email;
  } catch { /* use configured fallback */ }
  return import.meta.env.VITE_HR_NOTIFICATION_EMAIL || 'hr@verifyx.com';
};

export async function sendStatusMail(candidate, status, remarks = "") {
  if (!candidate?.email) throw new Error("Candidate email not found");
  return send({
    to_name: candidate.fullName || candidate.name || "Candidate",
    to_email: candidate.email,
    application_status: status,
    remarks: `${remarks || "No remarks added."}\n\nApplication link: ${APPLICATION_URL}`,
    application_link: APPLICATION_URL,
  });
}

export async function sendWelcomeMail(candidate) {
  if (!candidate?.email) return false;
  return send({
    to_name: candidate.fullName || 'Candidate',
    to_email: candidate.email,
    application_status: 'WELCOME',
    remarks: `Welcome to Verify-X. Your candidate account is registered. Please login and complete your education, employment and required-document profile for ${candidate.appliedRole || 'your applied role'}.`,
  });
}

export async function sendHrCandidateRegisteredMail(candidate) {
  return send({
    to_name: 'HR Team',
    to_email: getHrNotificationEmail(),
    application_status: 'NEW CANDIDATE REGISTERED',
    remarks: `${candidate.fullName || candidate.name || 'A candidate'} (${candidate.email || 'email unavailable'}) registered for ${candidate.appliedRole || 'a role'}. The candidate will appear in the HR dashboard only after completing and submitting the required profile and documents.`,
  });
}

export async function sendProfileCompletionReminder(candidate, force = false) {
  if (!candidate?.email) return false;
  const reminderKey = `verifyx_profile_reminder_mail_${String(candidate.email).trim().toLowerCase()}`;
  const lastSent = Number(localStorage.getItem(reminderKey) || 0);
  if (!force && Date.now() - lastSent < 24 * 60 * 60 * 1000) return false;
  const result = await send({
    to_name: candidate.fullName || candidate.name || 'Candidate',
    to_email: candidate.email,
    application_status: 'PROFILE INCOMPLETE',
    remarks: 'Your Verify-X profile is not complete yet. Please login and complete your education, employment details and all required document uploads, then submit the application for HR review.',
  });
  localStorage.setItem(reminderKey, String(Date.now()));
  return result;
}

export async function sendApplicationSubmittedMail(candidate, application) {
  if (!candidate?.email) return false;
  return send({
    to_name: candidate.fullName || candidate.name || 'Candidate',
    to_email: candidate.email,
    application_status: 'APPLICATION SUBMITTED',
    remarks: `Your Verify-X application ${application?.applicationId || ''} has been submitted successfully and is ready for HR review. You can login anytime to view your application and verification status.`,
  });
}

export async function sendInterviewInvitationMail(candidate, slots = []) {
  if (!candidate?.email) throw new Error('Candidate email not found');
  const slotLines = slots.map((slot, index) => { const parsed = new Date(slot); const display = Number.isNaN(parsed.getTime()) ? slot : parsed.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); return `${index + 1}. ${display}`; }).join('\n');
  return send({ to_name: candidate.fullName || candidate.name || 'Candidate', to_email: candidate.email, application_status: 'BGV APPROVED - HR INTERVIEW', remarks: `Your background verification has been completed and approved successfully.\n\nPlease choose one of the following HR interview time slots from your Verify-X Candidate Portal:\n${slotLines}\n\nCandidate Portal: ${APPLICATION_URL}`, application_link: APPLICATION_URL });
}
export async function sendInterviewSlotSelectedMail(candidate, selectedSlot) {
  const parsed = new Date(selectedSlot); const display = Number.isNaN(parsed.getTime()) ? selectedSlot : parsed.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  return send({ to_name: 'HR Team', to_email: getHrNotificationEmail(), application_status: 'HR INTERVIEW SLOT SELECTED', remarks: `${candidate.fullName || candidate.name || 'Candidate'} (${candidate.email || 'Email unavailable'}) selected ${display} for the HR interview for ${candidate.appliedRole || 'the applied role'}.` });
}
export async function sendInterviewConfirmedMail(candidate) {
  if (!candidate?.email) return false;
  const parsed = new Date(candidate.selectedSlot);
  const display = Number.isNaN(parsed.getTime()) ? candidate.selectedSlot : parsed.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  return send({ to_name: candidate.fullName || candidate.name || 'Candidate', to_email: candidate.email, application_status: 'HR INTERVIEW CONFIRMED', remarks: `Your HR interview has been confirmed for ${display}. Please be available at the selected time. HR will update your result after the discussion.` });
}
export async function sendInterviewDecisionMail(candidate, decision, remarks = '') {
  if (!candidate?.email) return false; const approved = String(decision || '').toUpperCase() === 'APPROVED';
  return send({ to_name: candidate.fullName || candidate.name || 'Candidate', to_email: candidate.email, application_status: approved ? 'HR INTERVIEW APPROVED' : 'HR INTERVIEW REJECTED', remarks: approved ? 'Congratulations. You have successfully completed the HR interview. Your profile is now approved for offer-letter release.' : `Your HR interview was not approved.${remarks ? `\n\nRemarks: ${remarks}` : ''}` });
}
export async function sendOfferReleasedMail(candidate) {
  if (!candidate?.email) return false;
  return send({ to_name: candidate.fullName || candidate.name || 'Candidate', to_email: candidate.email, application_status: 'OFFER LETTER RELEASED', remarks: `Congratulations. Your offer-letter process has been released for ${candidate.appliedRole || 'the applied role'}. HR will share the final offer-letter details with you through the configured recruitment process.` });
}
