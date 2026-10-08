const KEYS = {
  session: 'verifyx_session',
  token: 'verifyx_token',
  candidates: 'verifyx_candidates',
  hrUsers: 'verifyx_hr_users',
  resetOtps: 'verifyx_reset_otps',
};

const safeParse = (value, fallback) => {
  try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
};

export const getSession = () => safeParse(localStorage.getItem(KEYS.session), null);
export const setSession = (session) => localStorage.setItem(KEYS.session, JSON.stringify(session));
export const clearSession = () => {
  localStorage.removeItem(KEYS.session);
  localStorage.removeItem(KEYS.token);
};

export const getToken = () => localStorage.getItem(KEYS.token) || '';
export const setToken = (token) => token ? localStorage.setItem(KEYS.token, token) : localStorage.removeItem(KEYS.token);

export const getLocalCandidates = () => safeParse(localStorage.getItem(KEYS.candidates), []);
export const findLocalCandidate = (email) => getLocalCandidates().find((candidate) => candidate.email?.toLowerCase() === String(email || '').trim().toLowerCase()) || null;
export const hasLocalCandidate = (email) => Boolean(findLocalCandidate(email));
export const removeLocalCandidate = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  const remaining = getLocalCandidates().filter((candidate) => candidate.email?.toLowerCase() !== normalized);
  localStorage.setItem(KEYS.candidates, JSON.stringify(remaining));
};

async function hashPassword(password) {
  if (!globalThis.crypto?.subtle) return `dev:${btoa(unescape(encodeURIComponent(password)))}`;
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function saveLocalCandidate(candidate, password) {
  const list = getLocalCandidates();
  const normalizedEmail = String(candidate.email || '').trim().toLowerCase();
  const nextCandidate = {
    id: candidate.id || `local-${Date.now()}`,
    fullName: candidate.fullName || candidate.username || '',
    email: normalizedEmail,
    phone: candidate.phone || candidate.phoneNumber || '',
    appliedRole: candidate.appliedRole || '',
    candidateType: candidate.candidateType || 'Fresher',
    skills: Array.isArray(candidate.skills) ? candidate.skills : [],
    tools: Array.isArray(candidate.tools) ? candidate.tools : [],
    passwordHash: password ? await hashPassword(password) : candidate.passwordHash,
    emailVerified: candidate.emailVerified ?? true,
    createdAt: candidate.createdAt || new Date().toISOString(),
  };
  const withoutCurrent = list.filter((item) => item.email?.toLowerCase() !== normalizedEmail);
  localStorage.setItem(KEYS.candidates, JSON.stringify([...withoutCurrent, nextCandidate]));
  return nextCandidate;
}

export async function validateLocalCandidate(email, password) {
  const candidate = findLocalCandidate(email);
  if (!candidate?.passwordHash) return null;
  const passwordHash = await hashPassword(password);
  return candidate.passwordHash === passwordHash ? candidate : null;
}

export const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  if (!file) return resolve('');
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const HR_PROFILE_KEY = 'verifyx_hr_profile';

export const getHrProfile = () => {
  const session = getSession() || {};
  const stored = safeParse(localStorage.getItem(HR_PROFILE_KEY), {});
  return { ...stored, ...session };
};

export const saveHrProfile = (profile) => {
  const current = getHrProfile();
  const next = { ...current, ...profile };
  localStorage.setItem(HR_PROFILE_KEY, JSON.stringify(next));
  setSession(next);
  return next;
};

export const setHrLastLogin = (date = new Date()) => {
  const current = getHrProfile();
  const next = { ...current, lastLoginAt: date.toISOString(), status: 'Active' };
  localStorage.setItem(HR_PROFILE_KEY, JSON.stringify(next));
  setSession(next);
  return next;
};


export async function resetLocalCandidatePassword(identifier, newPassword) {
  const normalized = String(identifier || '').trim().toLowerCase();
  const list = getLocalCandidates();
  const index = list.findIndex((candidate) => candidate.email?.toLowerCase() === normalized || candidate.phone === identifier);
  if (index < 0) throw new Error('Candidate account not found for this email or phone number.');
  list[index] = { ...list[index], passwordHash: await hashPassword(newPassword), passwordUpdatedAt: new Date().toISOString() };
  localStorage.setItem(KEYS.candidates, JSON.stringify(list));
  return true;
}

export const findLocalCandidateByIdentifier = (identifier) => {
  const raw = String(identifier || '').trim();
  const lower = raw.toLowerCase();
  return getLocalCandidates().find((candidate) => candidate.email?.toLowerCase() === lower || candidate.phone === raw) || null;
};

export const saveResetOtp = (scope, identifier, otp) => {
  const all = safeParse(localStorage.getItem(KEYS.resetOtps), {});
  all[`${scope}:${String(identifier).trim().toLowerCase()}`] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };
  localStorage.setItem(KEYS.resetOtps, JSON.stringify(all));
};

export const verifyResetOtp = (scope, identifier, otp) => {
  const all = safeParse(localStorage.getItem(KEYS.resetOtps), {});
  const key = `${scope}:${String(identifier).trim().toLowerCase()}`;
  const found = all[key];
  if (!found || found.expiresAt < Date.now() || String(found.otp) !== String(otp)) return false;
  delete all[key];
  localStorage.setItem(KEYS.resetOtps, JSON.stringify(all));
  return true;
};
