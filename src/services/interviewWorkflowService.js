const INTERVIEW_KEY = 'verifyx_hr_interview_workflows';
const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const nowIso = () => new Date().toISOString();
const readAll = () => { try { const value = JSON.parse(localStorage.getItem(INTERVIEW_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
const writeAll = (items) => { localStorage.setItem(INTERVIEW_KEY, JSON.stringify(items)); window.dispatchEvent(new CustomEvent('verifyx-interview-workflow-updated')); return items; };
const recordKey = (candidate = {}) => normalizeEmail(candidate.email) || String(candidate.id || candidate.identity || '');
export function getInterviewWorkflows() { return readAll(); }
export function getCandidateInterviewWorkflow(candidateOrEmail) {
  const email = normalizeEmail(typeof candidateOrEmail === 'string' ? candidateOrEmail : candidateOrEmail?.email);
  const id = typeof candidateOrEmail === 'object' ? String(candidateOrEmail?.id || candidateOrEmail?.identity || '') : '';
  return readAll().find((item) => (email && normalizeEmail(item.email) === email) || (id && String(item.candidateId || item.identity || '') === id)) || null;
}
export function scheduleHrInterview(candidate, slots = []) {
  const cleanSlots = slots.map((slot) => String(slot || '').trim()).filter(Boolean);
  if (!candidate?.email) throw new Error('Candidate Email Is Required To Schedule An HR Interview.');
  if (cleanSlots.length < 2) throw new Error('Please Provide At Least Two Interview Time Slots.');
  const key = recordKey(candidate); const existing = getCandidateInterviewWorkflow(candidate) || {};
  const record = { ...existing, workflowId: existing.workflowId || `INT-${Date.now()}`, candidateId: candidate.id || candidate.candidateId || candidate.identity || existing.candidateId || '', identity: candidate.identity || existing.identity || '', applicationId: candidate.applicationId || existing.applicationId || '', fullName: candidate.fullName || candidate.name || existing.fullName || 'Candidate', email: normalizeEmail(candidate.email), phone: candidate.phone || candidate.mobile || existing.phone || '', appliedRole: candidate.appliedRole || existing.appliedRole || '', candidateType: candidate.candidateType || existing.candidateType || '', bgvStatus: 'COMPLETED', interviewStatus: 'AWAITING_CANDIDATE_SLOT', interviewSlots: cleanSlots, selectedSlot: '', selectedAt: '', finalDecision: '', finalDecisionAt: '', rejectionReason: '', offerStatus: existing.offerStatus || 'NOT_RELEASED', interviewInvitedAt: nowIso(), updatedAt: nowIso() };
  const next = readAll().filter((item) => recordKey(item) !== key); next.unshift(record); writeAll(next); return record;
}
export function selectHrInterviewSlot(candidateOrEmail, slot) {
  const current = getCandidateInterviewWorkflow(candidateOrEmail); if (!current) throw new Error('Interview Invitation Not Found.');
  if (!current.interviewSlots?.includes(slot)) throw new Error('Please Select One Of The Available Interview Time Slots.');
  const updated = { ...current, selectedSlot: slot, selectedAt: nowIso(), interviewStatus: 'SLOT_SELECTED', updatedAt: nowIso() };
  writeAll(readAll().map((item) => item.workflowId === current.workflowId ? updated : item)); return updated;
}
export function confirmHrInterview(candidateOrWorkflow) {
  const current = typeof candidateOrWorkflow === 'object' && candidateOrWorkflow?.workflowId ? readAll().find((item) => item.workflowId === candidateOrWorkflow.workflowId) : getCandidateInterviewWorkflow(candidateOrWorkflow);
  if (!current) throw new Error('Interview Candidate Not Found.');
  if (!current.selectedSlot) throw new Error('Candidate Must Select A Time Slot Before HR Can Confirm The Interview.');
  if (current.interviewStatus === 'INTERVIEW_CONFIRMED') return current;
  if (current.finalDecision) throw new Error('Interview Decision Has Already Been Recorded.');
  const updated = { ...current, interviewStatus: 'INTERVIEW_CONFIRMED', interviewConfirmedAt: nowIso(), updatedAt: nowIso() };
  writeAll(readAll().map((item) => item.workflowId === current.workflowId ? updated : item)); return updated;
}
export function decideHrInterview(candidateOrWorkflow, decision, reason = '') {
  const current = typeof candidateOrWorkflow === 'object' && candidateOrWorkflow?.workflowId ? readAll().find((item) => item.workflowId === candidateOrWorkflow.workflowId) : getCandidateInterviewWorkflow(candidateOrWorkflow);
  if (!current) throw new Error('Interview Candidate Not Found.'); const normalizedDecision = String(decision || '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(normalizedDecision)) throw new Error('Invalid Interview Decision.');
  if (!current.selectedSlot) throw new Error('Candidate Must Select A Time Slot Before HR Can Record The Interview Decision.');
  if (current.interviewStatus !== 'INTERVIEW_CONFIRMED' && !current.interviewConfirmedAt) throw new Error('HR Must Confirm The Interview Slot Before Recording The Final Decision.');
  const updated = { ...current, interviewStatus: normalizedDecision === 'APPROVED' ? 'INTERVIEW_APPROVED' : 'INTERVIEW_REJECTED', finalDecision: normalizedDecision, finalDecisionAt: nowIso(), rejectionReason: normalizedDecision === 'REJECTED' ? String(reason || '').trim() : '', updatedAt: nowIso() };
  writeAll(readAll().map((item) => item.workflowId === current.workflowId ? updated : item)); return updated;
}
export function markOfferReleased(candidateOrWorkflow) {
  const current = typeof candidateOrWorkflow === 'object' && candidateOrWorkflow?.workflowId ? readAll().find((item) => item.workflowId === candidateOrWorkflow.workflowId) : getCandidateInterviewWorkflow(candidateOrWorkflow);
  if (!current) throw new Error('Approved Candidate Not Found.');
  if (current.finalDecision !== 'APPROVED') throw new Error('Only HR-Interview Approved Candidates Can Receive An Offer Letter.');
  if (current.offerStatus === 'RELEASED' || current.offerReleasedAt) throw new Error('The Offer Letter Has Already Been Released For This Candidate.');
  const updated = { ...current, offerLetterFileName: candidateOrWorkflow?.offerLetterFileName || current.offerLetterFileName || '', offerLetterReference: candidateOrWorkflow?.offerLetterReference || current.offerLetterReference || '', offerLetterGeneratedAt: candidateOrWorkflow?.offerLetterGeneratedAt || current.offerLetterGeneratedAt || nowIso(), offerStatus: 'RELEASED', offerReleasedAt: nowIso(), updatedAt: nowIso() };
  writeAll(readAll().map((item) => item.workflowId === current.workflowId ? updated : item)); return updated;
}
export function removeInterviewWorkflow(candidateOrWorkflow) {
  const current = typeof candidateOrWorkflow === 'object' && candidateOrWorkflow?.workflowId ? candidateOrWorkflow : getCandidateInterviewWorkflow(candidateOrWorkflow);
  if (!current) return false; writeAll(readAll().filter((item) => item.workflowId !== current.workflowId)); return true;
}
export function formatInterviewSlot(slot) { if (!slot) return 'Not Selected'; const parsed = new Date(slot); if (Number.isNaN(parsed.getTime())) return String(slot); return parsed.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
