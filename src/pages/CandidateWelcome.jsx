import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { api } from '../services/apiService';
import { automaticallyVerifyCandidateDocument } from '../services/automaticDocumentVerificationService';
import { findLocalCandidate } from '../services/localStorage/storage';
import { saveApplication, submitApplication } from '../services/candidateApplicationService';
import { sendApplicationSubmittedMail, sendProfileCompletionReminder } from '../services/mailService';
import { addNotification, ensureRegistrationReminder } from '../services/notificationService';
import { IT_SKILLS, IT_TOOLS, getRoleRecommendations } from '../utils/constants';
import SkillMultiSelect from '../components/SkillMultiSelect';
import './CandidateWelcome.css';
import verifyXLogo from '../assets/verify-x-full-logo.png';

const educationTemplate = {
  institution: '', boardUniversity: '', location: '', registrationNumber: '',
  startYear: '', endYear: '', passingYear: '', percentage: '', specialization: '', degree: '', marksheetName: ''
};

const documentTemplate = {};

const empty = {
  fullName: '',
  appliedRole: '',
  skills: [],
  tools: [],
  candidateType: 'Fresher',
  employmentStatus: '',
  tenth: { ...educationTemplate },
  twelfth: { ...educationTemplate },
  degree: { ...educationTemplate },
  master: { ...educationTemplate },
  panNumber: '', aadhaarNumber: '', uanNumber: '',
  permanentLine1: '', permanentLine2: '', permanentArea: '', permanentCity: '', permanentDistrict: '', permanentState: '', permanentPincode: '', permanentCountry: 'India',
  currentLine1: '', currentLine2: '', currentArea: '', currentCity: '', currentDistrict: '', currentState: '', currentPincode: '', currentCountry: 'India',
  emergencyContactNumber: '', referralContactNumber: '',
  hasPassport: '', passportDocument: null,
  hasVisa: '', visaDocument: null,
  currentEmployer: '', currentDesignation: '', currentFrom: '', currentCtc: '', expectedCtc: '',
  servingNoticePeriod: '', lastWorkingDate: '', noticePeriodDuration: '',
  previousEmployer: '', previousDesignation: '', previousFrom: '', previousTo: '', previousCtc: '',
  offerLetters: [],
  requiredDocuments: { ...documentTemplate },
};

const FRESHER_DOCUMENTS = [
  { name: 'Resume', hint: 'PDF, DOC or DOCX', accept: '.pdf,.doc,.docx' },
  { name: 'Aadhaar Card', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'PAN Card', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
];

const CURRENT_EMPLOYEE_DOCUMENTS = [
  { name: 'Resume', hint: 'PDF, DOC or DOCX', accept: '.pdf,.doc,.docx' },
  { name: 'Aadhaar Card', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'PAN Card', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'Current Offer / Appointment Letter', hint: 'Completely optional • does not block submission', accept: '.pdf,.png,.jpg,.jpeg', optional: true },
  { name: 'Latest Salary Slip', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'UAN Proof', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
];

const NOT_WORKING_DOCUMENTS = [
  { name: 'Resume', hint: 'PDF, DOC or DOCX', accept: '.pdf,.doc,.docx' },
  { name: 'Aadhaar Card', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'PAN Card', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'Experience Letter', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'Relieving Letter', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'Last Salary Slip', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
  { name: 'UAN Proof', hint: 'PDF, JPG or PNG', accept: '.pdf,.png,.jpg,.jpeg' },
];

const yearOnly = (value) => String(value || '').replace(/\D/g, '').slice(0, 4);
const numberOnly = (value) => String(value || '').replace(/[^0-9.]/g, '').slice(0, 12);
const hasValue = (value) => Boolean(String(value || '').trim());
const panOnly = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
const digitsOnly = (value, max = 12) => String(value || '').replace(/\D/g, '').slice(0, max);
const phoneOnly = (value) => digitsOnly(value, 10);
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^\d{12}$/;
const UAN_REGEX = /^\d{12}$/;
const PHONE_REGEX = /^\d{10}$/;
const PINCODE_REGEX = /^\d{6}$/;

const BACKEND_SKILL_ALIASES = {
  'C++': 'CPP', 'C#': 'CSHARP', 'HTML5': 'HTML', 'CSS3': 'CSS',
  'React.js': 'REACT_JS', 'Next.js': 'NEXT_JS', 'Vue.js': 'VUE_JS', 'Nuxt.js': 'NUXT_JS',
  'Spring Boot': 'SPRING_BOOT', 'Spring MVC': 'SPRING_MVC', 'Spring Security': 'SPRING_SECURITY',
  'Hibernate/JPA': 'JPA', 'Node.js': 'NODE_JS', 'Express.js': 'EXPRESS_JS', 'FastAPI': 'FAST_API',
  '.NET': 'DOT_NET', 'ASP.NET Core': 'ASP_NET_CORE', 'ASP.NET MVC': 'ASP_NET_MVC',
  'REST API Development': 'REST_API', 'WebSockets': 'WEBSOCKET', 'OAuth 2.0': 'OAUTH2',
  'SQL Server': 'SQL_SERVER', 'Oracle Database': 'ORACLE', 'Google Cloud Platform': 'GOOGLE_CLOUD',
  'AWS Lambda': 'AWS_LAMBDA', 'Azure Functions': 'AZURE_FUNCTIONS', 'GitHub Actions': 'GITHUB_ACTIONS',
  'Manual Testing': 'MANUAL_TESTING', 'Automation Testing': 'AUTOMATION_TESTING',
  'Machine Learning': 'MACHINE_LEARNING', 'Deep Learning': 'DEEP_LEARNING',
  'Natural Language Processing': 'NATURAL_LANGUAGE_PROCESSING', 'Computer Vision': 'COMPUTER_VISION',
  'Generative AI': 'GENERATIVE_AI', 'Large Language Models': 'LARGE_LANGUAGE_MODELS',
  'Prompt Engineering': 'PROMPT_ENGINEERING', 'Power BI': 'POWER_BI', 'Material UI': 'MATERIAL_UI',
};
const toBackendSkill = (skill='') => BACKEND_SKILL_ALIASES[skill] || String(skill).trim().toUpperCase()
  .replace(/&/g, ' AND ').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');


const BACKEND_DOCUMENT_FIELDS = {
  'Resume': 'resume',
  'Current Offer / Appointment Letter': 'offerLetter',
  'Latest Salary Slip': 'salarySlip',
  'Last Salary Slip': 'salarySlip',
  'PAN Card': 'panCard',
  'Aadhaar Card': 'aadhaarCard',
  'UAN Proof': 'uanProof',
  'Experience Letter': 'experienceLetter',
  'Relieving Letter': 'relievingLetter',
};

export default function CandidateWelcome() {
  const { session, logout } = useAuth();
  const nav = useNavigate();
  const identity = session?.id || session?.email;
  const key = `verifyx_welcome_profile_${identity}`;
  const startedKey = `verifyx_welcome_started_${identity}`;
  const completeKey = `verifyx_welcome_complete_${identity}`;
  const portalAccessKey = `verifyx_portal_access_${identity}`;
  const [form, setForm] = useState(empty);
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    const local = findLocalCandidate(session?.email) || {};
    setForm({
      ...empty,
      ...saved,
      fullName: saved?.fullName || local.fullName || session?.name || '',
      appliedRole: saved?.appliedRole || local.appliedRole || session?.appliedRole || '',
      skills: Array.isArray(saved?.skills) ? saved.skills : (Array.isArray(local.skills) ? local.skills : []),
      tools: Array.isArray(saved?.tools) ? saved.tools : (Array.isArray(local.tools) ? local.tools : []),
      candidateType: session?.candidateType || local.candidateType || saved?.candidateType || 'Fresher', // locked to registration source
      employmentStatus: saved?.employmentStatus || '',
      panNumber: saved?.panNumber || local.panNumber || local.pan || '',
      aadhaarNumber: saved?.aadhaarNumber || local.aadhaarNumber || local.aadhaar || '',
      uanNumber: saved?.uanNumber || local.uanNumber || local.uan || '',
      tenth: { ...educationTemplate, ...(saved?.tenth || {}) },
      twelfth: { ...educationTemplate, ...(saved?.twelfth || {}) },
      degree: { ...educationTemplate, ...(saved?.degree || {}) },
      master: { ...educationTemplate, ...(saved?.master || {}) },
      offerLetters: Array.isArray(saved?.offerLetters) ? saved.offerLetters : [],
      requiredDocuments: { ...(saved?.requiredDocuments || {}) },
    });
  }, [key, session?.email, session?.name, session?.candidateType]);

  useEffect(() => { ensureRegistrationReminder({ email: session?.email }); }, [session?.email]);

  // Address fields are manual-only. Document/marks-card extraction remains unchanged.

  useEffect(() => {
    if (!identity || !form.fullName) return;
    const timer = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify({ ...form, lastSavedAt: new Date().toISOString() }));
      localStorage.setItem(startedKey, 'true');
      setSavedMessage('Draft Saved Automatically');
      setTimeout(() => setSavedMessage(''), 1400);
    }, 450);
    return () => clearTimeout(timer);
  }, [form, identity, key, startedKey]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setEmploymentStatus = (status) => setForm((f) => {
    if (status === 'NOT_WORKING') {
      return {
        ...f,
        employmentStatus: status,
        currentEmployer: '',
        currentDesignation: '',
        currentFrom: '',
        currentCtc: '',
        servingNoticePeriod: '',
        lastWorkingDate: '',
        noticePeriodDuration: '',
      };
    }

    if (status === 'CURRENTLY_WORKING') {
      return {
        ...f,
        employmentStatus: status,
        previousEmployer: '',
        previousDesignation: '',
        previousFrom: '',
        previousTo: '',
        previousCtc: '',
        expectedCtc: '',
      };
    }

    return { ...f, employmentStatus: status };
  });
  const setServingNoticePeriod = (value) => setForm((f) => ({
    ...f,
    servingNoticePeriod: value,
    lastWorkingDate: value === 'YES' ? f.lastWorkingDate : '',
    noticePeriodDuration: value === 'NO' ? f.noticePeriodDuration : '',
  }));
  const setIdentityNumber = (field, value, docName) => setForm((f) => ({
    ...f,
    [field]: value,
    requiredDocuments: f.requiredDocuments?.[docName]
      ? { ...f.requiredDocuments, [docName]: { ...f.requiredDocuments[docName], verificationStatus: 'VERIFYING', verificationMessage: 'Re-checking automatically…', verifiedAt: '' } }
      : f.requiredDocuments,
  }));
  const setEdu = (section, field, value) => setForm((f) => ({ ...f, [section]: { ...f[section], [field]: value } }));

  // Address entry is intentionally manual-only. No GPS, map lookup, camera capture,
  // reverse geocoding or pincode-based address auto-fill is used here.
  const onPincodeInput = (which, rawValue) => {
    if (!['permanent', 'current'].includes(which)) return;
    const value = digitsOnly(rawValue, 6);
    setForm((f) => ({ ...f, [`${which}Pincode`]: value }));
  };

  const setHasPassport = (value) => setForm((f) => ({ ...f, hasPassport: value, ...(value !== 'YES' ? { passportDocument: null } : {}) }));
  const setHasVisa = (value) => setForm((f) => ({ ...f, hasVisa: value, ...(value !== 'YES' ? { visaDocument: null } : {}) }));

  const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const uploadOptionalDocument = async (field, file) => {
    if (!file) return;
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) { setSavedMessage(`${field === 'passportDocument' ? 'Passport' : 'Visa'} document must be 5 MB or smaller.`); return; }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((f) => ({ ...f, [field]: { fileName: file.name, size: file.size, type: file.type || '', dataUrl, uploadedAt: new Date().toISOString() } }));
      setSavedMessage(`${file.name} uploaded.`);
    } catch { setSavedMessage('Unable to read that file. Please try again.'); }
  };
  const removeOptionalDocument = (field) => setForm((f) => ({ ...f, [field]: null }));

  const extractEducationFile = async (section, documentType, file) => {
    if (!file) return;
    setExtracting(true);
    setMessage(`Reading ${section === 'tenth' ? '10th / SSLC' : section === 'twelfth' ? '12th / PUC' : 'Degree'} document and filling available fields…`);
    setEdu(section, 'marksheetName', file.name);
    try {
      const data = await api.educationAutoFill(documentType, file);
      setForm((f) => ({
        ...f,
        tenth: section === 'tenth' ? { ...f.tenth, institution: data.tenthSchoolName || f.tenth.institution, boardUniversity: data.tenthBoard || f.tenth.boardUniversity, location: data.tenthSchoolLocation || f.tenth.location, registrationNumber: data.tenthRollNumber || f.tenth.registrationNumber, passingYear: data.tenthPassingYear ? String(data.tenthPassingYear) : f.tenth.passingYear, percentage: data.tenthPercentage != null ? String(data.tenthPercentage) : f.tenth.percentage, marksheetName: file.name } : f.tenth,
        twelfth: section === 'twelfth' ? { ...f.twelfth, institution: data.twelfthInstitutionName || f.twelfth.institution, boardUniversity: data.twelfthBoardUniversity || f.twelfth.boardUniversity, location: data.twelfthLocation || f.twelfth.location, registrationNumber: data.twelfthRegistrationNumber || f.twelfth.registrationNumber, passingYear: data.twelfthPassingYear ? String(data.twelfthPassingYear) : f.twelfth.passingYear, percentage: data.twelfthPercentage != null ? String(data.twelfthPercentage) : f.twelfth.percentage, marksheetName: file.name } : f.twelfth,
        degree: section === 'degree' ? { ...f.degree, degree: data.degreeName || f.degree.degree, specialization: data.specialization || f.degree.specialization, institution: data.collegeName || f.degree.institution, boardUniversity: data.universityName || f.degree.boardUniversity, location: data.degreeLocation || f.degree.location, registrationNumber: data.usnNumber || f.degree.registrationNumber, startYear: data.degreeStartYear ? String(data.degreeStartYear) : f.degree.startYear, endYear: data.degreeEndYear ? String(data.degreeEndYear) : f.degree.endYear, percentage: data.degreePercentage != null ? String(data.degreePercentage) : f.degree.percentage, marksheetName: file.name } : f.degree,
      }));
      setMessage('Document uploaded and available education fields were filled automatically. Please review them.');
    } catch (error) {
      setMessage(error.message || 'Unable to extract this document automatically.');
    } finally { setExtracting(false); }
  };

  const readTenthMarksheet = (file) => extractEducationFile('tenth', 'TENTH_MARKS_CARD', file);
  const selectEducationFile = (section, file) => {
    if (section === 'twelfth') return extractEducationFile('twelfth', 'TWELFTH_MARKS_CARD', file);
    if (section === 'degree') return extractEducationFile('degree', 'DEGREE_CERTIFICATE', file);
    if (!file) return;
    setEdu(section, 'marksheetName', file.name);
  };

  const addOfferLetter = () => setForm((f) => ({
    ...f,
    offerLetters: [...f.offerLetters, { id: (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`), companyName: '', designation: '', offeredCtc: '', offeredDate: '', joiningDate: '', referenceNumber: '', fileName: '' }],
  }));
  const updateOffer = (id, field, value) => setForm((f) => ({
    ...f,
    offerLetters: f.offerLetters.map((offer) => offer.id === id ? { ...offer, [field]: value } : offer),
  }));
  const removeOffer = (id) => setForm((f) => ({ ...f, offerLetters: f.offerLetters.filter((offer) => offer.id !== id) }));

  const normalizedCandidateType = String(form.candidateType || '').toUpperCase();
  const isExperienced = normalizedCandidateType.includes('EXPER');

  const educationCompletion = useMemo(() => {
    const required = [
      form.tenth.institution, form.tenth.boardUniversity, form.tenth.registrationNumber, form.tenth.passingYear, form.tenth.percentage,
      form.twelfth.institution, form.twelfth.boardUniversity, form.twelfth.registrationNumber, form.twelfth.passingYear, form.twelfth.percentage,
      form.degree.degree, form.degree.institution, form.degree.boardUniversity, form.degree.registrationNumber, form.degree.endYear, form.degree.percentage,
    ];
    const filled = required.filter(hasValue).length;
    return Math.round((filled / required.length) * 100);
  }, [form]);

  const employmentComplete = useMemo(() => {
    if (!isExperienced) return true;
    if (!form.employmentStatus) return false;
    if (form.employmentStatus === 'CURRENTLY_WORKING') {
      const baseComplete = [form.currentEmployer, form.currentDesignation, form.currentFrom, form.currentCtc, form.servingNoticePeriod].every(hasValue);
      if (!baseComplete) return false;
      if (form.servingNoticePeriod === 'YES') return hasValue(form.lastWorkingDate);
      if (form.servingNoticePeriod === 'NO') return hasValue(form.noticePeriodDuration);
      return false;
    }
    return [form.previousEmployer, form.previousDesignation, form.previousFrom, form.previousTo, form.previousCtc].every(hasValue);
  }, [form, isExperienced]);

  const skillsComplete = Array.isArray(form.skills) && form.skills.length > 0;

  const emergencyContactValid = PHONE_REGEX.test(String(form.emergencyContactNumber || '').replace(/\D/g, ''));
  const referralContactValid = !hasValue(form.referralContactNumber) || PHONE_REGEX.test(String(form.referralContactNumber || '').replace(/\D/g, ''));
  const permanentAddressComplete = hasValue(form.permanentLine1) && hasValue(form.permanentCity) && hasValue(form.permanentState) && PINCODE_REGEX.test(form.permanentPincode || '');
  // Both permanent and current addresses are entered manually.
  const currentAddressFieldsComplete = hasValue(form.currentLine1) && hasValue(form.currentCity) && hasValue(form.currentState) && PINCODE_REGEX.test(form.currentPincode || '');
  const currentAddressComplete = currentAddressFieldsComplete;
  // Address is only a required gate once the candidate starts filling it in — an entirely
  // untouched address section does not block progress, but a partially filled one must be completed.
  const addressTouched = [form.permanentLine1, form.permanentCity, form.permanentState, form.permanentPincode, form.currentLine1, form.currentCity, form.currentState, form.currentPincode, form.emergencyContactNumber].some(hasValue);
  const addressComplete = !addressTouched || (permanentAddressComplete && currentAddressComplete && emergencyContactValid && referralContactValid);

  // Passport & Visa are optional to possess, but once the candidate selects Yes,
  // the matching document becomes mandatory before submission.
  const passportSelectionValid = form.hasPassport !== 'YES' || Boolean(form.passportDocument?.fileName);
  const visaSelectionValid = form.hasVisa !== 'YES' || Boolean(form.visaDocument?.fileName);

  // Unlocking the document checklist depends only on the information the checklist
  // actually needs: Education + Employment (for experienced candidates) + Skills.
  // Address/contact completion is still mandatory for final application submission,
  // but it must not keep the Required Documents section locked.
  const documentChecklistUnlocked = educationCompletion === 100 && employmentComplete && skillsComplete;
  const informationComplete = documentChecklistUnlocked && addressComplete;
  const roleRecommendations = useMemo(() => getRoleRecommendations(form.appliedRole), [form.appliedRole]);

  const requiredDocumentList = useMemo(() => {
    if (!documentChecklistUnlocked) return [];
    if (!isExperienced) return FRESHER_DOCUMENTS;
    if (!form.employmentStatus) return [];
    return form.employmentStatus === 'CURRENTLY_WORKING' ? CURRENT_EMPLOYEE_DOCUMENTS : NOT_WORKING_DOCUMENTS;
  }, [documentChecklistUnlocked, isExperienced, form.employmentStatus]);

  const documentCompletion = useMemo(() => {
    if (!requiredDocumentList.length) return 0;
    const requiredDocs = requiredDocumentList.filter((doc) => !doc.optional);
    if (!requiredDocs.length) return 100;
    const filled = requiredDocs.filter((doc) => hasValue(form.requiredDocuments?.[doc.name]?.fileName)).length;
    return Math.round((filled / requiredDocs.length) * 100);
  }, [requiredDocumentList, form.requiredDocuments]);

  const identityNumbersValid = useMemo(() => {
    const panValid = PAN_REGEX.test(String(form.panNumber || '').toUpperCase());
    const aadhaar = String(form.aadhaarNumber || '').replace(/\D/g, '');
    const aadhaarValid = AADHAAR_REGEX.test(aadhaar) && !/^(\d)\1{11}$/.test(aadhaar);
    const uanValid = !isExperienced || UAN_REGEX.test(String(form.uanNumber || '').replace(/\D/g, ''));
    return { panValid, aadhaarValid, uanValid, allValid: panValid && aadhaarValid && uanValid };
  }, [form.panNumber, form.aadhaarNumber, form.uanNumber, isExperienced]);

  const requiredVerificationDocuments = useMemo(() => requiredDocumentList.filter((doc) => !doc.optional), [requiredDocumentList]);
  const verifiedDocumentCount = useMemo(() => requiredVerificationDocuments.filter((doc) => form.requiredDocuments?.[doc.name]?.verificationStatus === 'VERIFIED').length, [requiredVerificationDocuments, form.requiredDocuments]);
  const documentVerificationComplete = Boolean(requiredVerificationDocuments.length) && verifiedDocumentCount === requiredVerificationDocuments.length && identityNumbersValid.allValid;

  const runAutomaticVerification = async (name, file = null, numbers = null) => {
    const snapshot = numbers || {
      panNumber: form.panNumber,
      aadhaarNumber: form.aadhaarNumber,
      uanNumber: form.uanNumber,
    };
    const metadata = form.requiredDocuments?.[name] || {};
    const result = await automaticallyVerifyCandidateDocument({
      documentName: name,
      file,
      metadata,
      ...snapshot,
    });
    setForm((f) => {
      const existing = f.requiredDocuments?.[name];
      if (!existing?.fileName) return f;
      return {
        ...f,
        requiredDocuments: {
          ...f.requiredDocuments,
          [name]: {
            ...existing,
            verificationStatus: result.ok ? 'VERIFIED' : 'FAILED',
            verificationMessage: result.message,
            verificationSource: result.source || 'automatic-check',
            verifiedAt: result.ok ? new Date().toISOString() : '',
          },
        },
      };
    });
    return result;
  };

  useEffect(() => {
    const identityDocs = [
      ['PAN Card', form.panNumber],
      ['Aadhaar Card', form.aadhaarNumber],
      ['UAN Proof', form.uanNumber],
    ];
    const timer = setTimeout(() => {
      identityDocs.forEach(([name]) => {
        if (form.requiredDocuments?.[name]?.fileName) {
          runAutomaticVerification(name, null, {
            panNumber: form.panNumber,
            aadhaarNumber: form.aadhaarNumber,
            uanNumber: form.uanNumber,
          });
        }
      });
    }, 550);
    return () => clearTimeout(timer);
  // Re-run only when identity values change; requiredDocuments is intentionally excluded.
  }, [form.panNumber, form.aadhaarNumber, form.uanNumber]);

  const overallCompletion = useMemo(() => {
    const infoWeight = Math.round((educationCompletion * 0.68) + (employmentComplete ? 22 : 0) + (skillsComplete ? 10 : 0));
    if (!informationComplete) return Math.min(80, infoWeight);
    return Math.round(80 + (documentCompletion * 0.2));
  }, [educationCompletion, employmentComplete, skillsComplete, informationComplete, documentCompletion]);

  const addRequiredDocument = async (name, file) => {
    if (!file) return;
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setSavedMessage(`${name} must be 5 MB or smaller.`);
      return;
    }
    const numbers = { panNumber: form.panNumber, aadhaarNumber: form.aadhaarNumber, uanNumber: form.uanNumber };
    setForm((f) => ({
      ...f,
      requiredDocuments: {
        ...f.requiredDocuments,
        [name]: { fileName: file.name, size: file.size, type: file.type || '', selectedAt: new Date().toISOString(), verificationStatus: 'VERIFYING', verificationMessage: 'Checking automatically…' },
      },
    }));
    setSavedMessage(`${name} uploaded. Automatic verification is running…`);
    const result = await automaticallyVerifyCandidateDocument({ documentName: name, file, metadata: { fileName: file.name, size: file.size, type: file.type || '' }, ...numbers });

    const backendField = BACKEND_DOCUMENT_FIELDS[name];
    if (backendField) {
      try {
        const backendForm = new FormData();
        backendForm.append(backendField, file);
        await api.uploadDocuments(backendForm);
      } catch (uploadError) {
        console.warn(`Unable To Upload ${name} To Backend:`, uploadError);
      }
    }

    setForm((f) => ({
      ...f,
      requiredDocuments: {
        ...f.requiredDocuments,
        [name]: {
          ...f.requiredDocuments[name],
          verificationStatus: result.ok ? 'VERIFIED' : 'FAILED',
          verificationMessage: result.message,
          verificationSource: result.source || 'automatic-check',
          verifiedAt: result.ok ? new Date().toISOString() : '',
        },
      },
    }));
    setSavedMessage(result.ok ? `${name} Verified Automatically.` : `${name}: ${result.message}`);
  };

  const removeRequiredDocument = (name) => setForm((f) => {
    const next = { ...f.requiredDocuments };
    delete next[name];
    return { ...f, requiredDocuments: next };
  });

  const persist = (complete = false) => {
    localStorage.setItem(key, JSON.stringify({ ...form, lastSavedAt: new Date().toISOString(), ...(complete ? { completedAt: new Date().toISOString() } : {}) }));
    localStorage.setItem(startedKey, 'true');
    if (complete) localStorage.setItem(completeKey, 'true');
  };

  const saveAndExit = async () => {
    persist(false);
    saveApplication(identity, { ...form, status: 'DRAFT', informationComplete, documentCompletion, overallCompletion, requiredDocumentNames: requiredVerificationDocuments.map((doc) => doc.name) });
    ensureRegistrationReminder({ email: session?.email });
    sendProfileCompletionReminder({ email: session?.email, fullName: form.fullName || session?.name }).catch(() => {});
    await logout();
    nav('/candidate-login', { replace: true, state: { message: 'Draft Saved. Please Login Again When You Are Ready To Complete Your Registration.' } });
  };
  const continueToPortal = async (e) => {
    e.preventDefault();
    if (!informationComplete) {
      setSavedMessage(isExperienced
        ? 'Complete The Required Address, Education, Employment And Technical Skills Information, Or Use Save Draft & Exit.'
        : 'Complete The Required Address, 10th, 12th, Degree and Technical Skills Information, Or Use Save Draft & Exit.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!passportSelectionValid) {
      const message = 'Passport Document Is Required Because You Selected Yes For Passport.';
      setSavedMessage(message);
      window.alert(message);
      document.getElementById('passport-visa-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!visaSelectionValid) {
      const message = 'Visa Document Is Required Because You Selected Yes For Visa.';
      setSavedMessage(message);
      window.alert(message);
      document.getElementById('passport-visa-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (documentCompletion < 100) {
      setSavedMessage('Upload All Required Documents Before Submitting The Application, Or Use Save Draft & Exit.');
      document.getElementById('required-documents')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!documentVerificationComplete) {
      setSavedMessage('Automatic Verification Must Pass For PAN, Aadhaar, UAN (If Applicable) And Every Required Document Before Submission.');
      document.getElementById('required-documents')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // Persist the mandatory manually entered address/contact block.
    // Backend stores permanent and current addresses through separate endpoints.
    try {
      const permanentAddressPayload = {
        permanentAddressLine1: String(form.permanentLine1 || '').trim(),
        permanentAddressLine2: String(form.permanentLine2 || '').trim(),
        permanentAreaLocality: String(form.permanentArea || '').trim(),
        permanentPincode: String(form.permanentPincode || '').trim(),
        permanentCity: String(form.permanentCity || '').trim(),
        permanentDistrict: String(form.permanentDistrict || '').trim(),
        permanentState: String(form.permanentState || '').trim(),
        permanentCountry: String(form.permanentCountry || 'India').trim(),
        emergencyContactNumber: String(form.emergencyContactNumber || '').replace(/\D/g, ''),
        referralContactNumber: String(form.referenceNumber || form.referralContactNumber || '').replace(/\D/g, ''),
      };

      const currentAddressPayload = {
        currentAddressLine1: String(form.currentLine1 || '').trim(),
        currentAddressLine2: String(form.currentLine2 || '').trim(),
        currentAreaLocality: String(form.currentArea || '').trim(),
        currentPincode: String(form.currentPincode || '').trim(),
        currentCity: String(form.currentCity || '').trim(),
        currentDistrict: String(form.currentDistrict || '').trim(),
        currentState: String(form.currentState || '').trim(),
        currentCountry: String(form.currentCountry || 'India').trim(),
      };

      try {
        await api.updatePermanentAddress(permanentAddressPayload);
      } catch (updateError) {
        await api.createPermanentAddress(permanentAddressPayload);
      }

      try {
        await api.updateCurrentAddress(currentAddressPayload);
      } catch (updateError) {
        await api.createCurrentAddress(currentAddressPayload);
      }
    } catch (addressSyncError) {
      console.error('Unable To Store Address Details:', addressSyncError);
      const message = addressSyncError?.message || 'Unable To Store The Address Details. Please Retry Before Submitting.';
      setSavedMessage(message);
      window.alert(message);
      document.getElementById('current-address-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Persist the verified identity numbers to the backend before submission.
    // HR dashboard/profile endpoints read PAN/Aadhaar from the Candidate record
    // and UAN from Employment, so saving only in browser storage caused the
    // values to appear as "Not Added" for HR.
    try {
      await api.updateCandidateIdentity({
        panNumber: String(form.panNumber || '').toUpperCase(),
        aadhaarNumber: String(form.aadhaarNumber || '').replace(/\D/g, ''),
        uanNumber: isExperienced ? String(form.uanNumber || '').replace(/\D/g, '') : '',
      });
    } catch (identityError) {
      console.warn('Unable To Sync PAN/Aadhaar/UAN To Backend:', identityError);
    }

    // Keep HR dashboard skills in sync with what the candidate selected.
    // Clear the old backend selection first, then add valid skills individually.
    // This means a frontend-only label cannot prevent the supported skills from being saved.
    try {
      await api.updateTechnicalSkills([]);
      for (const skill of (form.skills || [])) {
        try {
          await api.addTechnicalSkills([toBackendSkill(skill)]);
        } catch (skillError) {
          console.warn(`Backend does not support technical skill: ${skill}`, skillError);
        }
      }
    } catch (skillError) {
      console.warn('Unable To Sync Technical Skills To Backend:', skillError);
    }

    persist(true);
    const localCandidate = findLocalCandidate(session?.email) || {};
    const submitted = submitApplication(identity, {
      ...form,
      appliedRole: session?.appliedRole || localCandidate.appliedRole || '',
      informationComplete: true,
      documentCompletion: 100,
      overallCompletion: 100,
      requiredDocumentNames: requiredVerificationDocuments.map((doc) => doc.name),
    }, session);
    localStorage.setItem(portalAccessKey, 'true');
    localStorage.setItem(completeKey, 'true');
    addNotification({ audience: 'CANDIDATE', recipient: session?.email, type: 'SUBMISSION_SUCCESS', applicationId: submitted.applicationId, title: 'Documents submitted successfully', message: `Your application ${submitted.applicationId} and all required documents were submitted successfully for HR review.` });
    addNotification({ audience: 'HR', type: 'NEW_CANDIDATE', applicationId: submitted.applicationId, title: 'New candidate registered', message: `${form.fullName || session?.name || 'A candidate'} submitted documents for ${submitted.appliedRole || 'the applied role'}. Application ${submitted.applicationId} is ready for review.` });
    setSavedMessage('Documents submitted successfully. You will be logged out securely…');
    sendApplicationSubmittedMail({ ...localCandidate, ...session, fullName: form.fullName }, submitted).catch(() => {});
    setTimeout(async () => {
      await logout();
      nav('/candidate-login', { replace: true, state: { message: `Documents submitted successfully. Application ${submitted.applicationId} was sent to HR for review.` } });
    }, 1800);
  };


  return <div className="candidate-onboarding-page">
    <header className="onboarding-topbar">
      <div className="onboarding-brand"><img className="onboarding-brand-logo" src={verifyXLogo} alt="VerifyX" /><div><b>Verify-X</b><small>Candidate Onboarding</small></div></div>
      <div className="onboarding-save-state"><span className="save-dot" />{savedMessage || 'Your Progress Is Saved'}</div>
      <div className="onboarding-topbar-actions">
        <button type="button" className="btn profile-topbar-btn" onClick={() => nav('/candidate')}>View Profile</button>
        <button type="button" className="btn ghost onboarding-exit" onClick={saveAndExit}>Save Draft & Logout</button>
      </div>
    </header>

    <main className="onboarding-shell">
      <section className="onboarding-hero page-enter">
        <div><span className="welcome-kicker">Candidate Application</span><h1>Welcome, {form.fullName || 'Candidate'}</h1><p>Complete Your Education And Employment Information First. Once The Required Details Are Complete, Verify-X Will Show The Documents Required For Your Candidate Type And Employment Status.</p></div>
        <div className="profile-meter"><div><b>{overallCompletion}%</b><span>Application Progress</span></div><div className="meter-track"><i style={{ width: `${overallCompletion}%` }} /></div></div>
      </section>

      <form className="welcome-form page-enter" onSubmit={continueToPortal}>
        <section className="welcome-section candidate-type-section">
          <div className="section-title"><span>00</span><div><h2>Candidate Type</h2><p>This Controls The Employment Information And Required-Document Checklist.</p></div></div>
          <div className="candidate-type-options candidate-type-locked">
            <div className="selected candidate-type-readonly"><div><b>{isExperienced ? 'Experienced' : 'Fresher'}</b><span>{isExperienced ? 'Candidate Type Selected During Registration • Has Current Or Previous Employment' : 'Candidate Type Selected During Registration • No Previous Full-Time Employment'}</span></div><small>Locked From Registration</small></div>
          </div>
        </section>

        <section className="welcome-section address-emergency-section">
          <div className="section-title"><span>01</span><div><h2>Address &amp; Emergency Contact</h2><p>Enter Both Permanent And Current Address Manually. Location, Map And Address-Photo Capture Are Disabled.</p></div></div>

          <AddressBlock
            which="permanent" label="Permanent Address" form={form} set={set}
            onPincodeInput={(v) => onPincodeInput('permanent', v)}
          />

          <div id="current-address-section" className="current-address-section">
            <AddressBlock
              which="current" label="Current Address" form={form} set={set}
              onPincodeInput={(v) => onPincodeInput('current', v)}
            />
          </div>

          <div className="welcome-grid emergency-contact-grid">
            <label><span>Emergency Contact Number *</span><input inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" value={form.emergencyContactNumber} onChange={(e) => set('emergencyContactNumber', phoneOnly(e.target.value))} /><small className={emergencyContactValid ? 'valid' : ''}>{emergencyContactValid ? '✓ Valid number' : 'Enter exactly 10 digits'}</small></label>
            <label><span>Referral Contact Number <em>(Optional)</em></span><input inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" value={form.referralContactNumber} onChange={(e) => set('referralContactNumber', phoneOnly(e.target.value))} /><small className={form.referralContactNumber && referralContactValid ? 'valid' : ''}>{form.referralContactNumber ? (referralContactValid ? '✓ Valid number' : 'Enter exactly 10 digits') : 'Leave Empty If Not Applicable'}</small></label>
          </div>
        </section>

        <section id="passport-visa-section" className="welcome-section passport-section">
          <div className="section-title"><span>02</span><div><h2>Passport &amp; Visa <small>(Optional)</small></h2><p>Passport And Visa Are Optional. If You Select Yes, Uploading The Corresponding Document Is Required Before Submission.</p></div></div>
          <div className="passport-visa-grid">
            <div className={`passport-visa-card ${form.hasPassport === 'YES' && !form.passportDocument?.fileName ? 'conditional-document-missing' : ''}`}>
              <div className="welcome-grid passport-grid">
                <label><span>Do You Have A Passport?</span>
                  <select value={form.hasPassport} onChange={(e) => setHasPassport(e.target.value)}>
                    <option value="">Select An Option</option>
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                  </select>
                </label>
              </div>
              {form.hasPassport === 'YES' && <>
                <DocumentDrop label="Passport Document" doc={form.passportDocument} required onSelect={(file) => uploadOptionalDocument('passportDocument', file)} onRemove={() => removeOptionalDocument('passportDocument')} />
                {!form.passportDocument?.fileName && <p className="conditional-document-error">Passport Document Is Required When Yes Is Selected.</p>}
              </>}
            </div>
            <div className={`passport-visa-card ${form.hasVisa === 'YES' && !form.visaDocument?.fileName ? 'conditional-document-missing' : ''}`}>
              <div className="welcome-grid passport-grid">
                <label><span>Do You Have A Visa?</span>
                  <select value={form.hasVisa} onChange={(e) => setHasVisa(e.target.value)}>
                    <option value="">Select An Option</option>
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                  </select>
                </label>
              </div>
              {form.hasVisa === 'YES' && <>
                <DocumentDrop label="Visa Document" doc={form.visaDocument} required onSelect={(file) => uploadOptionalDocument('visaDocument', file)} onRemove={() => removeOptionalDocument('visaDocument')} />
                {!form.visaDocument?.fileName && <p className="conditional-document-error">Visa Document Is Required When Yes Is Selected.</p>}
              </>}
            </div>
          </div>
        </section>


        <EducationCard number="03" title="10th / SSLC" subtitle="Required • Upload Marksheet For Supported Auto-Fill" section="tenth" data={form.tenth} setEdu={setEdu} fileHandler={readTenthMarksheet} extracting={extracting} message={message} />
        <EducationCard number="04" title="12th / PUC" subtitle="Required • Upload Marksheet For Supported Auto-Fill" section="twelfth" data={form.twelfth} setEdu={setEdu} fileHandler={(file) => selectEducationFile('twelfth', file)} extracting={extracting} message={message} />
        <EducationCard number="05" title="Degree / Bachelor's" subtitle="Required • Upload Certificate/Marksheet For Supported Auto-Fill" section="degree" data={form.degree} setEdu={setEdu} fileHandler={(file) => selectEducationFile('degree', file)} extracting={extracting} message={message} degree />
        <EducationCard number="06" title="Master's Degree" subtitle="Optional • Leave Empty If Not Applicable" section="master" data={form.master} setEdu={setEdu} fileHandler={(file) => selectEducationFile('master', file)} degree optional />

        <section className="welcome-section employment-section">
          <div className="section-title"><span>07</span><div><h2>Employment Details</h2><p>{isExperienced ? 'Select Your Present Employment Status And Provide The Corresponding Required Details.' : 'Freshers Do Not Need To Provide Employment Details.'}</p></div></div>

          {isExperienced && <div className="employment-status-choice">
            <label className={form.employmentStatus === 'CURRENTLY_WORKING' ? 'selected' : ''}><input type="radio" name="employmentStatus" value="CURRENTLY_WORKING" checked={form.employmentStatus === 'CURRENTLY_WORKING'} onChange={(e)=>setEmploymentStatus(e.target.value)} /><div><b>Currently Working</b><span>I Am Employed Now</span></div></label>
            <label className={form.employmentStatus === 'NOT_WORKING' ? 'selected' : ''}><input type="radio" name="employmentStatus" value="NOT_WORKING" checked={form.employmentStatus === 'NOT_WORKING'} onChange={(e)=>setEmploymentStatus(e.target.value)} /><div><b>Not Currently Working</b><span>My Latest Employment Has Ended</span></div></label>
          </div>}

          {!isExperienced ? <div className="fresher-note">No Employment Details Are Required For A Fresher. Continue With Education And Offer Information.</div> : <div className="employment-columns">
            <div className={`employment-card ${form.employmentStatus === 'CURRENTLY_WORKING' ? 'required-card' : ''}`}><h3>Current Employer {form.employmentStatus === 'CURRENTLY_WORKING' && <em>Required</em>}</h3><div className="welcome-grid two-col">
              <input placeholder="Current Company" value={form.currentEmployer} onChange={(e)=>set('currentEmployer',e.target.value)} />
              <input placeholder="Current Designation" value={form.currentDesignation} onChange={(e)=>set('currentDesignation',e.target.value)} />
              <label><span>Working From</span><input type="date" value={form.currentFrom} onChange={(e)=>set('currentFrom',e.target.value)} /></label>
              <input placeholder="Current CTC" value={form.currentCtc} onChange={(e)=>set('currentCtc',numberOnly(e.target.value))} />
            </div>
            <div className="notice-period-block">
              <span className="notice-period-label">Are You Serving Notice Period?{form.employmentStatus === 'CURRENTLY_WORKING' && <em>Required</em>}</span>
              <div className="employment-status-choice notice-period-choice">
                <label className={form.servingNoticePeriod === 'YES' ? 'selected' : ''}><input type="radio" name="servingNoticePeriod" value="YES" checked={form.servingNoticePeriod === 'YES'} onChange={(e)=>setServingNoticePeriod(e.target.value)} /><div><b>Yes</b><span>I Am Currently Serving Notice Period</span></div></label>
                <label className={form.servingNoticePeriod === 'NO' ? 'selected' : ''}><input type="radio" name="servingNoticePeriod" value="NO" checked={form.servingNoticePeriod === 'NO'} onChange={(e)=>setServingNoticePeriod(e.target.value)} /><div><b>No</b><span>I Am Not Serving Notice Period Yet</span></div></label>
              </div>
              {form.servingNoticePeriod === 'YES' && <div className="welcome-grid two-col notice-period-details">
                <label><span>Last Working Date (With Current Company &amp; Designation Above)</span><input type="date" value={form.lastWorkingDate} onChange={(e)=>set('lastWorkingDate',e.target.value)} /></label>
              </div>}
              {form.servingNoticePeriod === 'NO' && <div className="welcome-grid two-col notice-period-details">
                <input placeholder="What Is Your Official Notice Period? (E.g. 30 Days, 60 Days, 90 Days)" value={form.noticePeriodDuration} onChange={(e)=>set('noticePeriodDuration',e.target.value)} />
              </div>}
            </div></div>
            <div className={`employment-card ${form.employmentStatus === 'NOT_WORKING' ? 'required-card' : ''}`}><h3>Previous / Latest Employer {form.employmentStatus === 'NOT_WORKING' && <em>Required</em>}</h3><div className="welcome-grid two-col">
              <input placeholder="Previous Company" value={form.previousEmployer} onChange={(e)=>set('previousEmployer',e.target.value)} />
              <input placeholder="Previous Designation" value={form.previousDesignation} onChange={(e)=>set('previousDesignation',e.target.value)} />
              <label><span>From</span><input type="month" value={form.previousFrom} onChange={(e)=>set('previousFrom',e.target.value)} /></label>
              <label><span>To</span><input type="month" value={form.previousTo} onChange={(e)=>set('previousTo',e.target.value)} /></label>
              <input placeholder="Previous CTC" value={form.previousCtc} onChange={(e)=>set('previousCtc',numberOnly(e.target.value))} />
              <input placeholder="Expected CTC" value={form.expectedCtc} onChange={(e)=>set('expectedCtc',numberOnly(e.target.value))} />
            </div></div>
          </div>}
        </section>


        <section className="welcome-section skills-section">
          <div className="section-title"><span>08</span><div><h2>Role Skills & Tools</h2><p>Your Applied Role Is <b>{form.appliedRole || 'Not Selected'}</b>. Recommended Skills Are Highlighted, But You Can Search And Select From The Complete IT Catalogue.</p></div>{skillsComplete && <div className="skills-ready-badge">✓ Skills Added</div>}</div>
          <div className="applied-role-summary"><span>Applied Role</span><b>{form.appliedRole || 'Select A Role During Registration'}</b><small>Recommendations Below Automatically Follow This Role.</small></div>
          <div className="skills-selector-grid">
            <SkillMultiSelect label="Technical Skills" options={IT_SKILLS} value={form.skills || []} recommended={roleRecommendations.skills} onChange={(skills)=>set('skills',skills)} placeholder="Select Your Technical Skills" />
            <SkillMultiSelect label="Tools & Platforms" options={IT_TOOLS} value={form.tools || []} recommended={roleRecommendations.tools} onChange={(tools)=>set('tools',tools)} placeholder="Select Tools And Platforms You Have Used" />
          </div>
          {!skillsComplete && <div className="skills-required-note">Select At least One Technical Skill To Unlock The Required-Document Checklist.</div>}
        </section>

        <section className="welcome-section offers-section">
          <div className="section-title offers-title"><span>09</span><div><h2>Offer Letters <small>(Optional)</small></h2><p>This Section Is Completely Optional And Does Not Affect Application Completion Or Submission. Add An Offer Letter Only If You Want To.</p></div><button type="button" className="btn secondary add-offer-btn" onClick={addOfferLetter}>＋ Add Offer Letter</button></div>
          <div className="offer-list">
            {!form.offerLetters.length && <div className="fresher-note">No Offer Letter Added. You Can Continue Without Uploading One.</div>}
            {form.offerLetters.map((offer, index) => <article className="offer-card" key={`${offer.id || 'offer'}-${index}`}>
              <div className="offer-card-head"><div><span>Offer {index + 1}</span><b>{offer.companyName || 'New Offer Letter'}</b></div>{form.offerLetters.length > 1 && <button type="button" onClick={() => removeOffer(offer.id)} className="remove-offer">Remove</button>}</div>
              <div className="welcome-grid offer-grid">
                <input placeholder="Company Name" value={offer.companyName} onChange={(e)=>updateOffer(offer.id,'companyName',e.target.value)} />
                <input placeholder="Offered Role / Designation" value={offer.designation} onChange={(e)=>updateOffer(offer.id,'designation',e.target.value)} />
                <input placeholder="Offered CTC" value={offer.offeredCtc} onChange={(e)=>updateOffer(offer.id,'offeredCtc',numberOnly(e.target.value))} />
                <label><span>Offer Date</span><input type="date" value={offer.offeredDate} onChange={(e)=>updateOffer(offer.id,'offeredDate',e.target.value)} /></label>
                <label><span>Joining Date</span><input type="date" value={offer.joiningDate} onChange={(e)=>updateOffer(offer.id,'joiningDate',e.target.value)} /></label>
                <input placeholder="Offer / Reference Number" value={offer.referenceNumber} onChange={(e)=>updateOffer(offer.id,'referenceNumber',e.target.value)} />
              </div>
              <label className="compact-upload"><input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e)=>updateOffer(offer.id,'fileName',e.target.files?.[0]?.name || '')}/><span>📎 {offer.fileName || 'Upload Offer Letter'}</span><small>PDF / JPG / PNG</small></label>
            </article>)}
          </div>
        </section>

        <section id="required-documents" className={`welcome-section required-documents-section ${!documentChecklistUnlocked ? 'locked-section' : ''}`}>
          <div className="section-title"><span>10</span><div><h2>Required Documents</h2><p>{documentChecklistUnlocked ? `Upload The Required Documents For ${isExperienced ? (form.employmentStatus === 'CURRENTLY_WORKING' ? 'An Experienced Candidate Who Is Currently Working' : 'An Experienced candidate who is not currently working') : 'a fresher'}.` : 'Complete The Required Education, Employment And Technical-Skills Information Above To Unlock Your Document Checklist.'}</p></div>{documentChecklistUnlocked && <div className="document-progress-badge">{documentCompletion}% uploaded</div>}</div>

          {!documentChecklistUnlocked ? <div className="documents-locked-message"><span>🔒</span><div><b>Document Checklist Is Locked</b><p>Finish The Required Education/Employment Details And Select At least One Technical Skill. Your Document Requirements will then be generated automatically.</p></div></div> : <>
            <div className="document-rule-summary">
              <b>{isExperienced ? (form.employmentStatus === 'CURRENTLY_WORKING' ? 'Currently Working — Required Documents' : 'Not Currently Working — Required Documents') : 'Fresher — Required Documents'}</b>
              <span>{requiredVerificationDocuments.length} required document{requiredVerificationDocuments.length === 1 ? '' : 's'}{requiredDocumentList.some((doc) => doc.optional) ? ' • Optional Uploads Also Available' : ''} • Maximum 5 MB Per File</span>
            </div>
            <div className="identity-verification-panel">
              <div className="identity-verification-head"><div><span>Identity verification</span><b>Automatic document verification</b><small>Upload Documents And Enter Identity Numbers. Verify-X Checks Them Automatically Before Submission.</small></div><div className={`verification-score ${documentVerificationComplete ? 'verified' : ''}`}>{verifiedDocumentCount}/{requiredVerificationDocuments.length} required verified</div></div>
              <div className="identity-number-grid">
                <label><span>PAN Number *</span><input value={form.panNumber || ''} maxLength={10} placeholder="ABCDE1234F" onChange={(e)=>setIdentityNumber('panNumber',panOnly(e.target.value),'PAN Card')}/><small className={identityNumbersValid.panValid ? 'valid' : ''}>{identityNumbersValid.panValid ? '✓ Valid format' : '5 letters + 4 digits + 1 letter'}</small></label>
                <label><span>Aadhaar Number *</span><input value={form.aadhaarNumber || ''} inputMode="numeric" maxLength={12} placeholder="12-digit Aadhaar number" onChange={(e)=>setIdentityNumber('aadhaarNumber',digitsOnly(e.target.value,12),'Aadhaar Card')}/><small className={identityNumbersValid.aadhaarValid ? 'valid' : ''}>{identityNumbersValid.aadhaarValid ? '✓ Valid format' : 'Enter exactly 12 digits'}</small></label>
                {isExperienced && <label><span>UAN Number *</span><input value={form.uanNumber || ''} inputMode="numeric" maxLength={12} placeholder="12-digit UAN number" onChange={(e)=>setIdentityNumber('uanNumber',digitsOnly(e.target.value,12),'UAN Proof')}/><small className={identityNumbersValid.uanValid ? 'valid' : ''}>{identityNumbersValid.uanValid ? '✓ Valid format' : 'Enter exactly 12 digits'}</small></label>}
              </div>
              <div className="verification-actions-row automatic-verification-row"><div><b>Automatic Checks Are Enabled</b><span>No Candidate Verification Button Is Needed. Each Upload Is Checked Automatically; HR Performs The Final Verification After Submission.</span></div><span className="auto-check-badge">⚡ AUTO</span></div>
            </div>
            <div className="required-document-grid">
              {requiredDocumentList.map((doc) => {
                const uploaded = form.requiredDocuments?.[doc.name];
                const status = uploaded?.verificationStatus || '';
                const isChecking = status === 'VERIFYING';
                return <article className={`required-document-card ${uploaded ? 'uploaded' : ''} ${status ? status.toLowerCase() : ''}`} key={doc.name}>
                  <div className="required-doc-icon">{status === 'VERIFIED' ? '✓' : status === 'FAILED' ? '!' : isChecking ? '⟳' : uploaded ? '↻' : '📄'}</div>
                  <div className="required-doc-copy"><b>{doc.name}{doc.optional && <em className="optional-doc-label"> Optional</em>}</b><span>{uploaded?.fileName || doc.hint}</span>{uploaded && <small className={`doc-verification-text ${status.toLowerCase()}`}>{status === 'VERIFIED' ? 'Verified automatically for submission' : status === 'FAILED' ? uploaded.verificationMessage : isChecking ? 'Automatic verification in progress…' : 'Uploaded • automatic check pending'}</small>}</div>
                  {uploaded ? <button type="button" className="remove-required-doc" onClick={()=>removeRequiredDocument(doc.name)}>Replace</button> : null}
                  <label className="required-doc-upload"><input type="file" accept={doc.accept} onChange={(e)=>addRequiredDocument(doc.name,e.target.files?.[0])}/><span>{uploaded ? 'Choose another file' : 'Upload'}</span></label>
                </article>;
              })}
            </div>
          </>}
        </section>

        <div className="welcome-actions sticky-actions"><div><b>Not finished?</b><span>Save your draft and login again later to continue securely.</span></div><div><button type="button" className="btn ghost" onClick={saveAndExit}>Save Draft & Logout</button><button className="btn primary welcome-continue" disabled={!informationComplete || documentCompletion < 100 || !documentVerificationComplete} title={!informationComplete ? 'Complete required information first' : documentCompletion < 100 ? 'Upload All Required Documents First' : !documentVerificationComplete ? 'Wait For Automatic Document Verification Or Fix Failed Documents' : 'Submit Your Application To HR'}><span>Submit Application</span><small>{documentVerificationComplete ? 'Ready To Submit' : documentCompletion < 100 ? 'Upload Documents First' : 'Automatic Verification Pending'}</small><b>→</b></button></div></div>
      </form>
    </main>
  </div>;
}

function AddressBlock({ which, label, form, set, onPincodeInput }) {
  const prefix = which;
  const line1 = form[`${prefix}Line1`];
  const area = form[`${prefix}Area`];
  const city = form[`${prefix}City`];
  const district = form[`${prefix}District`];
  const state = form[`${prefix}State`];
  const pincode = form[`${prefix}Pincode`];
  const country = form[`${prefix}Country`];

  return <div className="address-block">
    <div className="address-block-head"><b>{label}</b></div>
    <div className="manual-address-fields">
      <div className="manual-address-heading">Enter Address Manually</div>
      <div className="welcome-grid address-fields-grid">
        <input placeholder="Address Line 1 *" value={line1} onChange={(e) => set(`${prefix}Line1`, e.target.value)} />
        <input placeholder="Address Line 2 (Optional)" value={form[`${prefix}Line2`]} onChange={(e) => set(`${prefix}Line2`, e.target.value)} />
        <input placeholder="Area / Locality" value={area} onChange={(e) => set(`${prefix}Area`, e.target.value)} />
        <input placeholder="Pincode *" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => onPincodeInput(e.target.value)} autoComplete="off" />
        <input placeholder="City *" value={city} onChange={(e) => set(`${prefix}City`, e.target.value)} />
        <input placeholder="District" value={district} onChange={(e) => set(`${prefix}District`, e.target.value)} />
        <input placeholder="State *" value={state} onChange={(e) => set(`${prefix}State`, e.target.value)} />
        <input placeholder="Country" value={country} onChange={(e) => set(`${prefix}Country`, e.target.value)} />
      </div>
    </div>
  </div>;
}

function DocumentDrop({ label, doc, onSelect, onRemove, required = false }) {
  return <div className="document-drop-wrap">
    <label className="compact-upload document-drop">
      <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => { onSelect(e.target.files?.[0]); e.target.value = ''; }} />
      <span>📎 {doc?.fileName || `Upload ${label}${required ? ' *' : ' (Optional)'}`}</span>
      <small>PDF / JPG / PNG • Max 5 MB</small>
    </label>
    {doc?.fileName && <button type="button" className="remove-required-doc" onClick={onRemove}>Remove</button>}
  </div>;
}

function EducationCard({ number, title, subtitle, section, data, setEdu, fileHandler, extracting = false, message = '', degree = false, optional = false }) {
  return <section className="welcome-section education-section">
    <div className="section-title"><span>{number}</span><div><h2>{title} {optional && <em>Optional</em>}</h2><p>{subtitle}</p></div></div>
    <div className="education-layout">
      <label className="smart-upload education-upload"><input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e)=>fileHandler(e.target.files?.[0])}/><b>{extracting ? 'Reading Document…' : `Upload ${title} Marksheet`}</b><span>{data.marksheetName || 'PDF / JPG / PNG'}</span></label>
      <div className="welcome-grid education-grid">
        {degree && <input placeholder="Degree / Course Name" value={data.degree} onChange={(e)=>setEdu(section,'degree',e.target.value)} />}
        {degree && <input placeholder="Specialization" value={data.specialization} onChange={(e)=>setEdu(section,'specialization',e.target.value)} />}
        <input placeholder={degree ? 'College / Institution Name' : 'School / College Name'} value={data.institution} onChange={(e)=>setEdu(section,'institution',e.target.value)} />
        <input placeholder={degree ? 'University Name' : 'Board Name'} value={data.boardUniversity} onChange={(e)=>setEdu(section,'boardUniversity',e.target.value)} />
        <input placeholder="Location" value={data.location} onChange={(e)=>setEdu(section,'location',e.target.value)} />
        <input placeholder="Registration / Roll Number" value={data.registrationNumber} onChange={(e)=>setEdu(section,'registrationNumber',e.target.value.toUpperCase())} />
        {degree ? <><input placeholder="Start Year" maxLength={4} value={data.startYear} onChange={(e)=>setEdu(section,'startYear',yearOnly(e.target.value))}/><input placeholder="End / Passing Year" maxLength={4} value={data.endYear} onChange={(e)=>setEdu(section,'endYear',yearOnly(e.target.value))}/></> : <input placeholder="Passing Year" maxLength={4} value={data.passingYear} onChange={(e)=>setEdu(section,'passingYear',yearOnly(e.target.value))}/>} 
        <input placeholder="Percentage / CGPA" value={data.percentage} onChange={(e)=>setEdu(section,'percentage',numberOnly(e.target.value))} />
      </div>
    </div>
    {message && ['tenth','twelfth','degree'].includes(section) && extracting && <div className="smart-message">{message}</div>}
  </section>;
}
