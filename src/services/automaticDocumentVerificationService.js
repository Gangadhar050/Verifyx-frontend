const EXTENSION_RULES = {
  'Resume': ['pdf', 'doc', 'docx'],
  'Aadhaar Card': ['pdf', 'png', 'jpg', 'jpeg'],
  'PAN Card': ['pdf', 'png', 'jpg', 'jpeg'],
  'UAN Proof': ['pdf', 'png', 'jpg', 'jpeg'],
  'Current Offer / Appointment Letter': ['pdf', 'png', 'jpg', 'jpeg'],
  'Latest Salary Slip': ['pdf', 'png', 'jpg', 'jpeg'],
  'Last Salary Slip': ['pdf', 'png', 'jpg', 'jpeg'],
  'Experience Letter': ['pdf', 'png', 'jpg', 'jpeg'],
  'Relieving Letter': ['pdf', 'png', 'jpg', 'jpeg'],
};

const getExtension = (name = '') => String(name).split('.').pop().toLowerCase();
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const DIGITS_12 = /^\d{12}$/;

function localAutomaticCheck({ documentName, file, metadata = {}, panNumber = '', aadhaarNumber = '', uanNumber = '' }) {
  const fileName = file?.name || metadata.fileName || '';
  const size = file?.size ?? metadata.size ?? 0;
  const allowed = EXTENSION_RULES[documentName] || ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'];
  const extension = getExtension(fileName);

  if (!fileName) return { ok: false, message: 'No document uploaded' };
  if (!allowed.includes(extension)) return { ok: false, message: `Unsupported file type .${extension || 'unknown'}` };
  if (size && size > 5 * 1024 * 1024) return { ok: false, message: 'File exceeds the 5 MB limit' };

  if (documentName === 'PAN Card' && !PAN_REGEX.test(String(panNumber || '').toUpperCase())) {
    return { ok: false, message: 'PAN number does not match the required format' };
  }
  if (documentName === 'Aadhaar Card') {
    const value = String(aadhaarNumber || '').replace(/\D/g, '');
    if (!DIGITS_12.test(value) || /^(\d)\1{11}$/.test(value)) return { ok: false, message: 'Aadhaar number must contain 12 valid digits' };
  }
  if (documentName === 'UAN Proof' && !DIGITS_12.test(String(uanNumber || '').replace(/\D/g, ''))) {
    return { ok: false, message: 'UAN number must contain exactly 12 digits' };
  }

  return {
    ok: true,
    message: 'Automatic pre-submission checks passed',
    source: 'local-automatic-check',
  };
}

export async function automaticallyVerifyCandidateDocument(args) {
  const { documentName, file } = args;
  if (file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', String(documentName || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_'));
      formData.append('panNumber', args.panNumber || '');
      formData.append('aadhaarNumber', args.aadhaarNumber || '');
      formData.append('uanNumber', args.uanNumber || '');
      const token = localStorage.getItem('verifyx_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const response = await fetch(`${baseUrl}/api/candidate/auto-verify-document`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        const ok = data.verified === true || data.valid === true || String(data.status || '').toUpperCase() === 'VERIFIED';
        return {
          ok,
          message: data.message || (ok ? 'Document verified automatically' : 'Automatic verification found a mismatch'),
          source: 'verification-api',
          extracted: data.extracted || data.data || null,
        };
      }
    } catch {
      // Backend verification is optional during local frontend development.
    }
  }

  return localAutomaticCheck(args);
}
