import { api } from './apiService';

export const getReport = async () => api.dashboardReport();

export const candidateStatus = (candidate = {}) =>
  String(candidate.status || candidate.applicationStatus || candidate.verificationStatus || 'PENDING_VERIFICATION').toUpperCase();

export const candidateType = (candidate = {}) =>
  String(candidate.candidateType || 'FRESHER').toUpperCase();

export const buildCandidateSummary = (candidates = []) => ({
  total: candidates.length,
  verified: candidates.filter((candidate) => {
    const status = candidateStatus(candidate);
    return status.includes('VERIFIED') || status.includes('DOCUMENTS_VERIFIED');
  }).length,
  rejected: candidates.filter((candidate) => {
    const status = candidateStatus(candidate);
    return status.includes('REJECTED') || status.includes('RE_UPLOAD_REQUIRED');
  }).length,
  approved: candidates.filter((candidate) => candidateStatus(candidate).includes('APPROVED')).length,
  freshers: candidates.filter((candidate) => candidateType(candidate).includes('FRESHER')).length,
  experienced: candidates.filter((candidate) => candidateType(candidate).includes('EXPERIENCED')).length,
});
