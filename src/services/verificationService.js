import { api } from './apiService';
import { updateSubmittedApplication } from './candidateApplicationService';
const normalizeApplicationStatus = (status) => {
  const normalized = String(status || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    PENDING: "PENDING_VERIFICATION",
    VERIFIED: "DOCUMENTS_VERIFIED",
    DOCUMENT_VERIFIED: "DOCUMENTS_VERIFIED",
    REUPLOAD_REQUIRED: "RE_UPLOAD_REQUIRED"
  };

  return aliases[normalized] || normalized;
};

export const updateStatus = async (id, status, remarks = "") => {
  if (!id) return Promise.reject(new Error("Candidate ID is required to update status."));
  const normalizedStatus = normalizeApplicationStatus(status);
  const normalizedRemarks = String(remarks || "").trim();
  try {
    return await api.updateStatus(id, { status: normalizedStatus, remarks: normalizedRemarks });
  } catch {
    const updated = updateSubmittedApplication(id, { status: normalizedStatus, remarks: normalizedRemarks, statusUpdatedAt: new Date().toISOString() });
    if (!updated) throw new Error('Unable to update candidate status.');
    return updated;
  }
};
export function createRejectionMail(candidate,remarks){return `To: ${candidate.email}\nSubject: Candidate Verification Status - Rejected\n\nDear ${candidate.fullName},\n\nYour application has been rejected.\n\nReason/Remarks: ${remarks||'Documents/profile did not match the verification requirements.'}\n\nRegards,\nHR Team\nVerify-X`;}
