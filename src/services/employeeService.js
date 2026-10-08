import { api } from './apiService';
import { getLocalCandidates, removeLocalCandidate, fileToDataUrl, saveLocalCandidate } from './storage';
import {
  getSubmittedApplications,
  getApplication,
  updateSubmittedApplication,
  removeSubmittedApplication,
} from './candidateApplicationService';


const SKILL_TO_ENUM = {
  'C++': 'CPP',
  'C#': 'CSHARP',
  '.NET': 'DOT_NET',
  'ASP.NET MVC': 'ASP_NET_MVC',
  'Spring Boot': 'SPRING_BOOT',
  'React.js': 'REACT_JS',
  'Node.js': 'NODE_JS',
  'JavaScript': 'JAVASCRIPT',
  'TypeScript': 'TYPESCRIPT',
  'MySQL': 'MYSQL',
  'SQL Server': 'SQL_SERVER',
  'MongoDB': 'MONGODB',
  'GitHub': 'GITHUB',
  'Manual Testing': 'MANUAL_TESTING',
  'Power BI': 'POWER_BI',
};

const ENUM_TO_SKILL = Object.fromEntries(
  Object.entries(SKILL_TO_ENUM).map(([label, value]) => [value, label])
);

const normalizeSkills = (candidate = {}) => {
  const source = candidate.skills
    ?? candidate.technicalSkills
    ?? candidate.selectedSkills
    ?? candidate.profile?.skills
    ?? candidate.profile?.technicalSkills
    ?? candidate.profile?.selectedSkills
    ?? candidate.review?.skills
    ?? candidate.review?.technicalSkills
    ?? candidate.review?.selectedSkills
    ?? [];
  const values = Array.isArray(source)
    ? source
    : typeof source === 'string'
      ? source.split(',')
      : [];

  return values
    .map((skill) => {
      if (typeof skill === 'string') {
        const value = skill.trim();
        return ENUM_TO_SKILL[value] || value;
      }
      const value = skill?.name ?? skill?.value ?? skill?.skill ?? '';
      return ENUM_TO_SKILL[value] || value;
    })
    .filter(Boolean);
};

const toTechnicalSkillEnums = (skills = []) =>
  (Array.isArray(skills) ? skills : [])
    .map((skill) => SKILL_TO_ENUM[skill] || String(skill).trim().toUpperCase().replaceAll('.', '').replaceAll(' ', '_'))
    .filter(Boolean);


const joinAddressParts = (...parts) => parts
  .flat()
  .map((value) => String(value ?? '').trim())
  .filter(Boolean)
  .filter((value, index, values) => values.indexOf(value) === index)
  .join(', ');

const buildPermanentAddress = (source = {}) => {
  if (source.permanentAddress) return source.permanentAddress;
  const main = [
    source.permanentAddressLine1 ?? source.permanentLine1,
    source.permanentAddressLine2 ?? source.permanentLine2,
    source.permanentAreaLocality ?? source.permanentArea,
    source.permanentCity,
    source.permanentDistrict,
    source.permanentState,
    source.permanentPincode,
  ].map((value) => String(value ?? '').trim()).filter(Boolean);
  return main.length ? joinAddressParts(main, source.permanentCountry) : '';
};

const buildCurrentAddress = (source = {}) => {
  const direct = source.currentResidentialAddress || source.currentAddress || source.currentLiveAddress;
  if (direct) return direct;
  const main = [
    source.currentAddressLine1 ?? source.currentLine1,
    source.currentAddressLine2 ?? source.currentLine2,
    source.currentAreaLocality ?? source.currentArea,
    source.currentCity,
    source.currentDistrict,
    source.currentState,
    source.currentPincode,
  ].map((value) => String(value ?? '').trim()).filter(Boolean);
  return main.length ? joinAddressParts(main, source.currentCountry) : '';
};

const hasCoordinates = (source = {}) => {
  const lat = source.currentLatitude ?? source.currentLiveLat ?? source.currentAddressLat;
  const lng = source.currentLongitude ?? source.currentLiveLng ?? source.currentAddressLng;
  return lat !== '' && lat != null && lng !== '' && lng != null;
};

const currentAddressSource = (source = {}) => {
  const hasGpsProof = Boolean(
    source.currentAddressPhotoAvailable
    || source.houseSelfieUploaded
    || source.currentLivePhoto
    || source.currentLiveAt
  );
  if (hasGpsProof) return 'GPS';
  if (buildCurrentAddress(source)) return 'MANUAL';
  return hasCoordinates(source) ? 'GPS' : '';
};

export const DOC_STATUS = { PENDING: 'PENDING', VERIFIED: 'VERIFIED', REJECTED: 'REJECTED' };

export function isSubmittedCandidate(candidate = {}) {
  // Current Address GPS photo is written to the backend only during the final
  // Submit Application flow. For server-backed HR rows it is therefore the
  // cross-browser submission marker; registered/incomplete candidates stay hidden.
  if (candidate.backendSubmissionReady) return true;
  if (candidate.backendContactChecked && !candidate.backendSubmissionReady && !candidate.submittedAt) return false;

  const status = String(candidate.status || candidate.verificationStatus || '').toUpperCase();
  const submittedStatus = [
    'SUBMITTED', 'PENDING_VERIFICATION', 'DOCUMENTS_VERIFIED',
    'APPROVED', 'REJECTED', 'RE_UPLOAD_REQUIRED', 'REUPLOAD_REQUIRED',
  ].some((value) => status.includes(value));
  if (!submittedStatus) return false;

  const required = Array.isArray(candidate.requiredDocumentNames) ? candidate.requiredDocumentNames : [];
  const documents = Array.isArray(candidate.documents) ? candidate.documents : [];
  const uploadedNames = new Set(documents.filter((doc) => doc?.fileName || doc?.data || doc?.id).map((doc) => doc.name));
  const documentsComplete = Number(candidate.documentCompletion) >= 100 || Number(candidate.overallCompletion) >= 100 ||
    (required.length > 0 && required.every((name) => uploadedNames.has(name)));

  return documentsComplete || Boolean(candidate.submittedAt) || status.includes('APPROVED') || status.includes('REJECTED') || status.includes('VERIFIED') || status.includes('RE_UPLOAD');
}

/* ------------------------------------------------------------------ */
/* localStorage-backed candidate source (used whenever the backend    */
/* API is unreachable, e.g. no server running).                       */
/* ------------------------------------------------------------------ */

function localDocsFromApplication(app = {}) {
  return Object.entries(app.requiredDocuments || {}).map(([name, info]) => ({
    id: `${app.identity}::${name}`,
    name,
    documentType: name,
    fileName: info?.fileName || '',
    status: info?.hrStatus || (info?.verificationStatus === 'VERIFIED' ? DOC_STATUS.VERIFIED : DOC_STATUS.PENDING),
    rejectionReason: info?.hrRejectionReason || '',
    verifiedAt: info?.hrVerifiedAt || '',
    verifiedBy: info?.hrVerifiedBy || '',
    data: info?.data || '',
    localOnly: true,
  }));
}

function mergeLocalCandidate(local = {}, application = {}) {
  const identity = application.identity || local.email;
  const requiredDocumentNames = Array.isArray(application.requiredDocumentNames) && application.requiredDocumentNames.length
    ? application.requiredDocumentNames
    : Object.keys(application.requiredDocuments || {});
  return {
    id: identity,
    identity,
    fullName: application.fullName || local.fullName || '',
    email: application.email || local.email || '',
    phone: local.phone || '',
    photo: application.photo || application.photoUrl || local.photo || local.photoUrl || '',
    appliedRole: application.appliedRole || local.appliedRole || '',
    candidateType: String(application.candidateType || local.candidateType || 'FRESHER').toUpperCase(),
    skills: application.skills || local.skills || [],
    status: application.status || 'DRAFT',
    pan: application.panNumber || '',
    aadhaar: application.aadhaarNumber || '',
    uan: application.uanNumber || '',
    uanVerified: Boolean(application.uanVerified),
    uanVerifiedAt: application.uanVerifiedAt || '',
    uanVerifiedBy: application.uanVerifiedBy || '',
    employmentStatus: application.employmentStatus || '',
    currentlyEmployed: String(application.employmentStatus || '').toUpperCase().includes('CURRENT') ? 'YES' : '',
    submittedAt: application.submittedAt || '',
    updatedAt: application.updatedAt || '',
    createdAt: local.createdAt || application.submittedAt || '',
    tenth: application.tenth,
    twelfth: application.twelfth,
    degree: application.degree,
    master: application.master,
    currentEmployer: application.currentEmployer,
    previousEmployer: application.previousEmployer,
    permanentAddress: buildPermanentAddress(application) || buildPermanentAddress(local) || '',
    currentResidentialAddress: buildCurrentAddress(application) || buildCurrentAddress(local) || '',
    emergencyContactNumber: application.emergencyContactNumber || local.emergencyContactNumber || '',
    referenceNumber: application.referenceNumber || local.referenceNumber || '',
    currentLatitude: application.currentLatitude ?? application.currentLiveLat ?? application.currentAddressLat ?? local.currentLatitude ?? '',
    currentLongitude: application.currentLongitude ?? application.currentLiveLng ?? application.currentAddressLng ?? local.currentLongitude ?? '',
    houseSelfieUploaded: Boolean(application.houseSelfieUploaded || application.currentLivePhoto || local.houseSelfieUploaded),
    currentAddressSource: currentAddressSource(application) || currentAddressSource(local),
    // Exact list of documents this candidate was actually asked for on the
    // Candidate Portal (varies: 3 for Fresher, 6 for currently-working
    // Experienced, 7 for not-working Experienced). HR screens must use this
    // instead of a hardcoded list so the count always matches what the
    // candidate saw and uploaded.
    requiredDocumentNames,
    documents: localDocsFromApplication(application),
    localOnly: true,
  };
}

export function getLocalCandidateList() {
  const byIdentity = new Map();

  getLocalCandidates().forEach((local) => {
    const key = String(local.email || '').toLowerCase();
    if (key) byIdentity.set(key, { local });
  });

  getSubmittedApplications().forEach((application) => {
    const key = String(application.email || application.identity || '').toLowerCase();
    const existing = byIdentity.get(key) || {};
    byIdentity.set(key, { ...existing, application });
  });

  return Array.from(byIdentity.values()).map(({ local, application }) =>
    mergeLocalCandidate(local || {}, application || {})
  );
}

function findLocalCandidateById(id) {
  return getLocalCandidateList().find((candidate) => String(candidate.id) === String(id)) || null;
}

function setLocalDocumentStatus(identity, docName, patch) {
  const app = getApplication(identity) || getSubmittedApplications().find((item) => item.identity === identity);
  if (!app) throw new Error('This application was not found in local storage.');
  const nextDocs = {
    ...(app.requiredDocuments || {}),
    [docName]: { ...(app.requiredDocuments?.[docName] || {}), ...patch },
  };
  updateSubmittedApplication(identity, { requiredDocuments: nextDocs });
}

const DOCUMENT_TYPE_LABELS = {
  RESUME: 'Resume',
  CURRENT_OFFERLETTER: 'Current Offer / Appointment Letter',
  SALARY_SLIP: 'Latest Salary Slip',
  PAN_CARD: 'PAN Card',
  AADHAAR_CARD: 'Aadhaar Card',
  UAN_PROOF: 'UAN Proof',
  EXPERIENCE_LETTER: 'Experience Letter',
  RELIEVING_LETTER: 'Relieving Letter',
  PASSPORT: 'Passport',
  VISA: 'Visa',
};

const normalizeDocument = (d = {}) => {
  const id = d.id ?? d.documentId;
  return {
    ...d,
    id,
    name: d.name ?? DOCUMENT_TYPE_LABELS[d.documentType] ?? String(d.documentType || '').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
    documentType: d.documentType,
    fileName: d.fileName || '',
    status: d.status || DOC_STATUS.PENDING,
    data: d.data || (id ? `http://localhost:8080/upload/view/${id}` : ''),
  };
};

const normalize = (c = {}) => {
  const profile = c.profile || {};
  const employment = c.employment || {};
  const review = c.review || {};
  const documentsSource = Array.isArray(c.documents)
    ? c.documents
    : Array.isArray(review.documents)
      ? review.documents
      : [];

  return {
    ...profile,
    ...employment,
    ...c,
    id: c.id ?? c.candidateId ?? profile.id ?? profile.candidateId,
    fullName: c.fullName ?? c.username ?? c.candidateName ?? review.candidateName ?? profile.username ?? profile.fullName,
    email: c.email ?? review.email ?? profile.email,
    phone: c.phone ?? c.phoneNumber ?? profile.phoneNumber ?? profile.phone,
    photo: c.photo ?? c.photoUrl ?? c.profilePhoto ?? c.profilePhotoUrl ?? profile.photo ?? profile.photoUrl,
    candidateType: String(c.candidateType ?? profile.candidateType ?? 'FRESHER').toUpperCase(),
    appliedRole: c.appliedRole ?? profile.appliedRole,
    skills: normalizeSkills(c),
    status: c.status ?? c.workflowStatus ?? profile.workflowStatus ?? c.applicationStatus ?? review.applicationStatus ?? 'DRAFT',
    profileStep: c.profileStep ?? profile.profileStep ?? 1,
    remarks: c.remarks ?? '',
    pan: c.pan ?? c.panNumber ?? review.panNumber ?? profile.panNumber,
    aadhaar: c.aadhaar ?? c.aadhaarNumber ?? review.aadhaarNumber ?? profile.aadhaarNumber,
    uan: c.uan ?? c.uanNumber ?? review.uanNumber ?? employment.uanNumber,
    uanVerified: c.uanVerified ?? review.uanVerified ?? employment.uanVerified ?? false,
    uanVerificationStatus: c.uanVerificationStatus ?? review.uanVerificationStatus ?? employment.uanVerificationStatus ?? (c.uanVerified ? "VERIFIED" : "PENDING"),
    permanentAddress: buildPermanentAddress(c) || buildPermanentAddress(profile) || '',
    currentResidentialAddress: buildCurrentAddress(c) || buildCurrentAddress(profile) || '',
    emergencyContactNumber: c.emergencyContactNumber ?? profile.emergencyContactNumber ?? '',
    referenceNumber: c.referenceNumber ?? profile.referenceNumber ?? '',
    currentLatitude: c.currentLatitude ?? profile.currentLatitude ?? '',
    currentLongitude: c.currentLongitude ?? profile.currentLongitude ?? '',
    houseSelfieUploaded: Boolean(c.houseSelfieUploaded ?? profile.houseSelfieUploaded),
    currentAddressSource: c.currentAddressSource || profile.currentAddressSource || currentAddressSource(c) || currentAddressSource(profile),
    documents: documentsSource.map(normalizeDocument),
    review,
  };
};

export const allCandidates = async () => {
  // Always read whatever has been submitted from the Candidate Portal and
  // saved to this browser's localStorage. This is merged in below no matter
  // what happens with the backend call, so a candidate's data is never
  // missing from the HR portal just because the backend responded (even
  // with an empty/partial list) instead of throwing an error.
  const localList = getLocalCandidateList();

  let backendList = [];
  try {
    const result = await api.candidates();
    const list = Array.isArray(result)
      ? result
      : Array.isArray(result?.content)
        ? result.content
        : Array.isArray(result?.candidates)
          ? result.candidates
          : Array.isArray(result?.items)
            ? result.items
            : [];

    // The HR candidates list endpoint does not embed uploaded documents.
    // Fetch each candidate's document-review record in parallel so that
    // anything a candidate has uploaded shows up immediately on the HR
    // "Uploaded Candidate Documents" screen instead of appearing empty.
    const withDocuments = await Promise.all(
      list.map(async (candidate) => {
        const id = candidate.id ?? candidate.candidateId;
        if (!id) return candidate;
        const [review, permanentContact, currentContact] = await Promise.all([
          api.reviewDocuments(id).catch(() => null),
          api.hrPermanentAddress(id).catch(() => null),
          api.hrCurrentAddress(id).catch(() => null),
        ]);
        const contact = { ...(permanentContact || {}), ...(currentContact || {}) };
        const permanentAddress = permanentContact
          ? [permanentContact.permanentAddressLine1, permanentContact.permanentAddressLine2, permanentContact.permanentAreaLocality, permanentContact.permanentCity, permanentContact.permanentDistrict, permanentContact.permanentState, permanentContact.permanentPincode, permanentContact.permanentCountry].filter(Boolean).join(', ')
          : '';
        return {
          ...candidate,
          review,
          contact,
          documents: review?.documents || candidate.documents || [],
          permanentAddress: permanentAddress || buildPermanentAddress(candidate),
          currentResidentialAddress: buildCurrentAddress(contact || {}) || buildCurrentAddress(candidate),
          emergencyContactNumber: contact?.emergencyContactNumber || candidate.emergencyContactNumber,
          referenceNumber: contact?.referralContactNumber || candidate.referenceNumber,
          currentLatitude: contact?.currentLatitude ?? candidate.currentLatitude,
          currentLongitude: contact?.currentLongitude ?? candidate.currentLongitude,
          houseSelfieUploaded: contact?.currentAddressPhotoAvailable ?? candidate.houseSelfieUploaded ?? false,
          currentAddressSource: hasCoordinates(contact || {}) ? 'GPS' : (candidate.currentAddressSource || currentAddressSource(candidate)),
          backendSubmissionReady: Boolean(contact?.currentAddressPhotoAvailable || buildCurrentAddress(contact || {})),
          backendContactChecked: true,
        };
      })
    );

    backendList = withDocuments.map(normalize);
  } catch {
    backendList = [];
  }

  if (!backendList.length) return localList;

  // Merge: a candidate already returned by the backend wins for its core
  // profile fields (it's the source of truth once a real server is
  // connected). BUT documents that were uploaded through the local
  // fallback (because the upload/document endpoints weren't reachable,
  // even though the candidate list endpoint was) must not be silently
  // dropped just because the candidate also exists on the backend. So we
  // enrich each backend candidate with its matching local record's
  // documents / requiredDocumentNames whenever the backend didn't return
  // any of its own for that candidate.
  const localByEmail = new Map(
    localList.map((c) => [String(c.email || '').toLowerCase(), c])
  );

  const mergedBackend = backendList.map((candidate) => {
    const local = localByEmail.get(String(candidate.email || '').toLowerCase());
    if (!local) return candidate;

    const hasBackendDocs = Array.isArray(candidate.documents) && candidate.documents.length > 0;
    const hasBackendRequiredNames = Array.isArray(candidate.requiredDocumentNames) && candidate.requiredDocumentNames.length > 0;

    return {
      ...candidate,
      documents: hasBackendDocs ? candidate.documents : (local.documents || []),
      requiredDocumentNames: hasBackendRequiredNames ? candidate.requiredDocumentNames : (local.requiredDocumentNames || []),
      // Candidate type / employment status drive which documents are
      // required — prefer whatever the candidate actually selected on the
      // Portal (local) if the backend didn't send it.
      candidateType: candidate.candidateType || local.candidateType,
      appliedRole: candidate.appliedRole || local.appliedRole,
      skills: Array.isArray(candidate.skills) && candidate.skills.length ? candidate.skills : (local.skills || []),
      // The HR summary endpoint can return blank identity-number fields even
      // when the candidate already entered them during onboarding. Preserve
      // backend values when present, otherwise enrich the row from the
      // submitted candidate application so PAN/Aadhaar/UAN are visible.
      pan: candidate.pan || candidate.panNumber || local.pan || local.panNumber || '',
      aadhaar: candidate.aadhaar || candidate.aadhaarNumber || local.aadhaar || local.aadhaarNumber || '',
      uan: candidate.uan || candidate.uanNumber || local.uan || local.uanNumber || '',
      uanVerified: candidate.uanVerified ?? local.uanVerified ?? false,
      uanVerificationStatus: candidate.uanVerificationStatus || local.uanVerificationStatus || (local.uanVerified ? 'VERIFIED' : 'PENDING'),
      employmentStatus: candidate.employmentStatus || local.employmentStatus,
      currentlyEmployed: candidate.currentlyEmployed || local.currentlyEmployed,
      permanentAddress: buildPermanentAddress(candidate) || buildPermanentAddress(local) || '',
      currentResidentialAddress: buildCurrentAddress(candidate) || buildCurrentAddress(local) || '',
      emergencyContactNumber: candidate.emergencyContactNumber || local.emergencyContactNumber || '',
      referenceNumber: candidate.referenceNumber || local.referenceNumber || '',
      currentLatitude: candidate.currentLatitude ?? local.currentLatitude ?? '',
      currentLongitude: candidate.currentLongitude ?? local.currentLongitude ?? '',
      houseSelfieUploaded: candidate.houseSelfieUploaded ?? local.houseSelfieUploaded ?? false,
      currentAddressSource: candidate.currentAddressSource || currentAddressSource(candidate) || local.currentAddressSource || currentAddressSource(local),
    };
  });

  const backendEmails = new Set(
    backendList.map((c) => String(c.email || '').toLowerCase()).filter(Boolean)
  );
  const onlyLocal = localList.filter(
    (c) => !backendEmails.has(String(c.email || '').toLowerCase())
  );

  return [...mergedBackend, ...onlyLocal];
};

export const findCandidate = async (id) => {
  if (!id) throw new Error('Candidate ID is missing.');
  const localById = findLocalCandidateById(id);
  try {
    const [details, review, candidateListResult, permanentContact, currentContact] = await Promise.all([
      api.candidate(id),
      api.reviewDocuments(id).catch(() => null),
      api.candidates().catch(() => null),
      api.hrPermanentAddress(id).catch(() => null),
      api.hrCurrentAddress(id).catch(() => null),
    ]);
    const contact = { ...(permanentContact || {}), ...(currentContact || {}) };
    if (!details) throw new Error('Candidate not found on backend.');

    const candidateList = Array.isArray(candidateListResult)
      ? candidateListResult
      : Array.isArray(candidateListResult?.content)
        ? candidateListResult.content
        : Array.isArray(candidateListResult?.candidates)
          ? candidateListResult.candidates
          : Array.isArray(candidateListResult?.items)
            ? candidateListResult.items
            : [];
    const summaryCandidate = candidateList.find(
      (candidate) => String(candidate.id ?? candidate.candidateId ?? '') === String(id)
    );

    const normalized = normalize({
      ...(summaryCandidate || {}),
      ...details,
      candidateId: Number(id),
      // Preserve skills from the HR candidate-list response when the detail
      // endpoint omits them. The detail response still wins for all fields it
      // actually returns.
      skills: details.skills
        ?? details.technicalSkills
        ?? details.selectedSkills
        ?? details.profile?.skills
        ?? details.profile?.technicalSkills
        ?? summaryCandidate?.skills
        ?? summaryCandidate?.technicalSkills
        ?? summaryCandidate?.selectedSkills,
      review,
      documents: review?.documents || details?.documents || [],
    });

    // Candidate profile/detail endpoints may omit technical skills even though
    // they were selected and submitted from the Candidate Welcome page.
    // Match the submitted/local application by id or email and use its skills
    // only when the backend detail did not return any, so backend data remains
    // the source of truth whenever it is available.
    const localByEmail = getLocalCandidateList().find(
      (candidate) => String(candidate.email || '').toLowerCase() === String(normalized.email || '').toLowerCase()
    );
    const local = localById || localByEmail;

    if ((!Array.isArray(normalized.skills) || normalized.skills.length === 0) && Array.isArray(local?.skills)) {
      normalized.skills = local.skills;
    }

    // Candidate detail/review responses can omit these values even though
    // they were captured on the Candidate Welcome page. Use the matching
    // submitted application only as a fallback; non-empty backend data still
    // remains authoritative.
    normalized.pan = normalized.pan || normalized.panNumber || local?.pan || local?.panNumber || '';
    normalized.aadhaar = normalized.aadhaar || normalized.aadhaarNumber || local?.aadhaar || local?.aadhaarNumber || '';
    normalized.uan = normalized.uan || normalized.uanNumber || local?.uan || local?.uanNumber || '';
    normalized.uanVerified = normalized.uanVerified ?? local?.uanVerified ?? false;
    normalized.uanVerificationStatus = normalized.uanVerificationStatus || local?.uanVerificationStatus || (normalized.uanVerified ? 'VERIFIED' : 'PENDING');
    normalized.permanentAddress = buildPermanentAddress(normalized) || buildPermanentAddress(local || {}) || '';
    normalized.currentResidentialAddress = buildCurrentAddress(normalized) || buildCurrentAddress(local || {}) || '';
    normalized.emergencyContactNumber = normalized.emergencyContactNumber || local?.emergencyContactNumber || '';
    normalized.referenceNumber = normalized.referenceNumber || local?.referenceNumber || '';
    normalized.currentLatitude = normalized.currentLatitude ?? local?.currentLatitude ?? '';
    normalized.currentLongitude = normalized.currentLongitude ?? local?.currentLongitude ?? '';
    normalized.houseSelfieUploaded = contact?.currentAddressPhotoAvailable ?? normalized.houseSelfieUploaded ?? local?.houseSelfieUploaded ?? false;
    normalized.currentAddressSource = hasCoordinates(contact || {}) ? 'GPS' : (normalized.currentAddressSource || currentAddressSource(normalized) || local?.currentAddressSource || currentAddressSource(local || {}));
    if (contact) {
      normalized.permanentAddress = buildPermanentAddress(contact) || normalized.permanentAddress;
      normalized.currentResidentialAddress = buildCurrentAddress(contact) || normalized.currentResidentialAddress;
      normalized.emergencyContactNumber = contact.emergencyContactNumber || normalized.emergencyContactNumber;
      normalized.referenceNumber = contact.referralContactNumber || normalized.referenceNumber;
      normalized.currentLatitude = contact.currentLatitude ?? normalized.currentLatitude;
      normalized.currentLongitude = contact.currentLongitude ?? normalized.currentLongitude;
    }

    return normalized;
  } catch {
    if (!localById) throw new Error('Candidate not found.');
    return localById;
  }
};

export async function addCandidate(candidate) {
  const normalized = {
    ...candidate,
    fullName: candidate.fullName || candidate.name,
    appliedRole: candidate.appliedRole || candidate.role || 'Candidate',
    candidateType: String(candidate.candidateType || candidate.experience || 'FRESHER').toUpperCase().includes('EXPER') ? 'EXPERIENCED' : 'FRESHER',
  };
  try {
    await api.candidateRegister({
      username: normalized.fullName,
      email: normalized.email,
      phoneNumber: normalized.phone,
      password: candidate.password || 'Verify@123',
      appliedRole: normalized.appliedRole,
      candidateType: normalized.candidateType,
    });
    return normalized;
  } catch {
    return saveLocalCandidate({ ...normalized, id: `local-${Date.now()}`, emailVerified: true }, candidate.password || 'Verify@123');
  }
}

export const deleteCandidate = async (id) => {
  try {
    return await api.deleteCandidate(id);
  } catch {
    const local = findLocalCandidateById(id);
    if (local?.email) removeLocalCandidate(local.email);
    removeSubmittedApplication(id);
    return true;
  }
};

export async function updateCandidate(id, patch) {
  const body = {
    username: patch.fullName || patch.username || '',
    email: patch.email || '',
    phoneNumber: patch.phone || patch.phoneNumber || '',
    address: patch.address || '',
    panNumber: String(patch.pan || patch.panNumber || '').toUpperCase(),
    aadhaarNumber: patch.aadhaar || patch.aadhaarNumber || '',
    appliedRole: patch.appliedRole || '',
    candidateType: String(patch.candidateType || 'FRESHER').toUpperCase().includes('EXPER') ? 'EXPERIENCED' : 'FRESHER',
    technicalSkills: toTechnicalSkillEnums(patch.skills),
    profileStep: patch.profileStep || 1,
    workflowStatus: patch.status || patch.workflowStatus || 'Draft',
  };
  try {
    const saved = await api.updateCandidateProfile(body);
    return normalize({ ...patch, ...saved, id });
  } catch {
    const saved = updateSubmittedApplication(id, {
      ...patch,
      fullName: patch.fullName || patch.username || '',
      phone: patch.phone || patch.phoneNumber || '',
      panNumber: String(patch.pan || patch.panNumber || '').toUpperCase(),
      aadhaarNumber: patch.aadhaar || patch.aadhaarNumber || '',
      skills: Array.isArray(patch.skills) ? patch.skills : [],
    });
    if (!saved) throw new Error('Candidate could not be updated.');
    return normalize({ ...saved, id });
  }
}

export const verifyCandidateUan = async (id) => {
  try {
    return await api.verifyUan(id);
  } catch {
    updateSubmittedApplication(id, {
      uanVerified: true,
      uanVerifiedBy: 'HR',
      uanVerifiedAt: new Date().toISOString(),
    });
    return true;
  }
};

export const verifyCandidateDocument = async (candidateId, doc) => {
  try {
    return await api.verifyDocument(doc.id || doc.documentId);
  } catch {
    setLocalDocumentStatus(candidateId, doc.name, {
      hrStatus: DOC_STATUS.VERIFIED,
      hrVerifiedBy: 'HR',
      hrVerifiedAt: new Date().toISOString(),
      hrRejectionReason: '',
    });
    return true;
  }
};

export const rejectCandidateDocument = async (candidateId, doc, reason) => {
  try {
    return await api.rejectDocument(doc.id || doc.documentId, reason);
  } catch {
    setLocalDocumentStatus(candidateId, doc.name, {
      hrStatus: DOC_STATUS.REJECTED,
      hrRejectionReason: reason,
      hrVerifiedBy: '',
      hrVerifiedAt: '',
    });
    return true;
  }
};

const FIELD_NAMES = {
  'Resume': 'resume',
  'Offer Letter': 'offerLetter',
  'Last Month Salary Slip': 'salarySlip',
  'Relieving Letter': 'relievingLetter',
  'Experience Letter': 'experienceLetter',
  'PAN Card': 'panCard',
  'Aadhaar Card': 'aadhaarCard',
  'UAN Proof': 'uanProof',
};

export async function uploadCandidateDocument(candidateId, document) {
  const fieldName = document.fieldName || FIELD_NAMES[document.name];
  if (!fieldName) throw new Error(`${document.name} upload is not supported by the backend yet.`);

  try {
    const form = new FormData();
    form.append(fieldName, document.file);
    if (document.reUpload) await api.updateDocuments(form);
    else await api.uploadDocuments(form);
    const documents = await api.myDocuments();
    return (Array.isArray(documents) ? documents : []).map(normalizeDocument);
  } catch (err) {
    // No backend reachable — fall back to local storage so the upload is
    // still saved and immediately visible on the HR document review screen
    // (same browser/session), instead of silently failing.
    const app = getApplication(candidateId) || getSubmittedApplications().find((item) => item.identity === candidateId);
    if (!app) throw err;

    const dataUrl = await fileToDataUrl(document.file);
    const nextDocs = {
      ...(app.requiredDocuments || {}),
      [document.name]: {
        fileName: document.file.name,
        data: dataUrl,
        hrStatus: DOC_STATUS.PENDING,
        hrRejectionReason: '',
        hrVerifiedAt: '',
        hrVerifiedBy: '',
        uploadedAt: new Date().toISOString(),
      },
    };
    updateSubmittedApplication(candidateId, { requiredDocuments: nextDocs });
    return localDocsFromApplication({ ...app, requiredDocuments: nextDocs, identity: candidateId });
  }
}

export const getDocumentReviewSummary = (documents = []) => ({
  total: documents.length,
  verified: documents.filter((d) => d.status === 'VERIFIED').length,
  rejected: documents.filter((d) => d.status === 'REJECTED').length,
  pending: documents.filter((d) => !d.status || d.status === 'PENDING').length,
});

export async function openCandidateDocument(doc) {
  if (doc?.localOnly) {
    if (doc.data) {
      window.open(doc.data, "_blank", "noopener,noreferrer");
      return;
    }
    alert(
      `${doc.fileName || doc.name} was uploaded from the Candidate Portal, but no preview is ` +
      `available for it yet (no backend server is running to store the actual file).`
    );
    return;
  }
  if (!doc?.id) throw new Error("Document ID is missing.");
  const blob = await api.documentBlob(doc.id);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Resolves an in-browser previewable URL (blob: or data:) for a document,
// without opening a new tab, so it can be embedded in an on-page viewer.
export async function getHrDocumentPreviewUrl(doc) {
  if (doc?.localOnly) return doc.data || '';
  const id = doc?.id || doc?.documentId;
  if (!id) return '';
  const blob = await api.reviewDocumentBlob(id);
  return URL.createObjectURL(blob);
}

export async function openHrCandidateDocument(doc) {
  if (doc?.localOnly) {
    return openCandidateDocument(doc);
  }
  const id = doc?.id || doc?.documentId;
  if (!id) throw new Error('Document ID is missing.');

  // Open the preview tab immediately from the click event. Opening only after
  // awaiting the authenticated blob request is blocked by some browsers.
  const previewWindow = window.open('about:blank', '_blank');
  try {
    const blob = await api.reviewDocumentBlob(id);
    const url = URL.createObjectURL(blob);
    if (previewWindow) {
      previewWindow.location.href = url;
    } else {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
}
