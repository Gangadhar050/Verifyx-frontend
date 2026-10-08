import { api } from './apiService';
import { ADMIN_USERS } from '../utils/constants';
import {
  setSession,
  clearSession,
  getSession,
  setToken,
  saveLocalCandidate,
  validateLocalCandidate,
  hasLocalCandidate,
  findLocalCandidateByIdentifier,
  saveResetOtp,
  setHrLastLogin,
  verifyResetOtp,
  resetLocalCandidatePassword,
} from './storage';

const isNetworkError = (error) => error instanceof TypeError || /failed to fetch|networkerror|network request/i.test(error?.message || '');

export async function registerCandidate(data) {
  const payload = {
    username: data.fullName,
    email: data.email,
    phoneNumber: data.phone,
    password: data.password,
    appliedRole: data.appliedRole,
    candidateType: data.candidateType,
  };

  try {
    const result = await api.candidateRegister(payload);
    await saveLocalCandidate({ ...data, emailVerified: false }, data.password);
    return result;
  } catch (error) {
    // Local fallback keeps the frontend usable when the backend is not running.
    // API validation/business errors are still surfaced normally.
    if (!isNetworkError(error)) throw error;
    if (hasLocalCandidate(data.email)) throw new Error('An account with this email is already registered. Please login.');
    await saveLocalCandidate({ ...data, emailVerified: true }, data.password);
    return 'DEV_OTP=123456';
  }
}

export async function loginCandidate(email, password) {
  try {
    const data = await api.candidateLogin({ email, password });
    setToken(data.accessToken);
    const session = {
      type: 'CANDIDATE',
      id: data.userId,
      name: data.username,
      email: data.email,
      role: data.role,
      candidateType: data.candidateType,
    };
    setSession(session);
    if (!hasLocalCandidate(email)) {
      await saveLocalCandidate({
        id: data.userId,
        fullName: data.username,
        email: data.email,
        candidateType: data.candidateType,
        emailVerified: true,
      }, password);
    }
    return session;
  } catch (error) {
    const localCandidate = await validateLocalCandidate(email, password);
    if (localCandidate) {
      const session = {
        type: 'CANDIDATE',
        id: localCandidate.id,
        name: localCandidate.fullName,
        email: localCandidate.email,
        role: 'CANDIDATE',
        candidateType: localCandidate.candidateType,
        appliedRole: localCandidate.appliedRole,
        localMode: true,
      };
      setSession(session);
      return session;
    }

    if (!hasLocalCandidate(email)) {
      const firstTimeError = new Error('No candidate account found. Please register first.');
      firstTimeError.code = 'CANDIDATE_NOT_REGISTERED';
      throw firstTimeError;
    }
    throw error;
  }
}

export async function loginAdmin(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  try {
    const data = await api.hrLogin({ email: normalizedEmail, password });
    setToken(data.accessToken);
    const session = {
      type: 'HR', name: data.username || data.name || 'HR Admin', email: data.email || normalizedEmail,
      role: data.role || 'HR Admin', designation: data.designation || 'HR Professional', company: data.company || '',
      employeeId: data.employeeId || '', department: data.department || 'Human Resources', location: data.location || '',
      joiningDate: data.joiningDate || '', status: 'Active', lastLoginAt: new Date().toISOString()
    };
    setSession(session);
    setHrLastLogin();
    return session;
  } catch (error) {
    // Local HR fallback for frontend/localStorage mode when Spring Boot is not running.
    if (!isNetworkError(error)) throw error;
    const localHr = ADMIN_USERS.find((user) =>
      user.email.toLowerCase() === normalizedEmail &&
      (user.password === password || (Array.isArray(user.legacyPasswords) && user.legacyPasswords.includes(password)))
    );
    if (!localHr) throw new Error('Invalid HR email or password.');
    setToken('local-hr-session');
    const session = {
      type: 'HR',
      name: localHr.name || 'HR',
      email: localHr.email,
      role: localHr.role || 'HR Admin',
      designation: localHr.designation || 'HR Professional',
      company: localHr.company || '',
      employeeId: localHr.employeeId || '',
      department: localHr.department || 'Human Resources',
      location: localHr.location || '',
      joiningDate: localHr.joiningDate || '',
      status: 'Active',
      lastLoginAt: new Date().toISOString(),
      localMode: true,
    };
    setSession(session);
    setHrLastLogin();
    return session;
  }
}

export async function logout() {
  const session = getSession();
  try {
    if (session?.localMode) return;
    if (session?.type === 'CANDIDATE') await api.candidateLogout();
    else if (session) await api.hrLogout();
  } finally {
    clearSession();
  }
}

export async function verifyCandidateEmail(email, otp) {
  try {
    return await api.verifyCandidateEmail({ email, otp });
  } catch (error) {
    if (isNetworkError(error) && otp === '123456') return true;
    throw error;
  }
}

export const resendCandidateVerification = async (email) => {
  try { return await api.resendCandidateVerification(email); }
  catch (error) { if (isNetworkError(error)) return 'DEV_OTP=123456'; throw error; }
};
export const requestHrPasswordReset = (email) => api.requestHrPasswordReset(email);
export const resetHrPassword = (email, otp, newPassword) => api.resetHrPassword({ email, otp, newPassword });

const makeOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export async function requestCandidatePasswordReset(identifier) {
  const candidate = findLocalCandidateByIdentifier(identifier);
  if (!candidate) throw new Error('No candidate account found for this email or phone number.');
  const otp = makeOtp();
  saveResetOtp('candidate', identifier, otp);
  // Local-storage mode cannot deliver SMS/email by itself. The OTP is returned for local testing.
  return `DEV_OTP=${otp}`;
}

export async function resetCandidatePassword(identifier, otp, newPassword) {
  if (!verifyResetOtp('candidate', identifier, otp)) throw new Error('Invalid or expired verification OTP.');
  await resetLocalCandidatePassword(identifier, newPassword);
  return true;
}

export async function requestHrPasswordResetByIdentifier(identifier, method = 'email') {
  if (method === 'email') return requestHrPasswordReset(identifier);
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const response = await fetch(`${baseUrl}/api/auth/hr/forgot-password-phone?phone=${encodeURIComponent(identifier)}`, { method: 'POST' });
  if (!response.ok) throw new Error('Phone verification needs the HR phone-reset backend endpoint. Please use registered email if it is not configured yet.');
  return response.text();
}

export async function resetHrPasswordByIdentifier(identifier, otp, newPassword, method = 'email') {
  if (method === 'email') return resetHrPassword(identifier, otp, newPassword);
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const response = await fetch(`${baseUrl}/api/auth/hr/reset-password-phone`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: identifier, otp, newPassword }),
  });
  if (!response.ok) throw new Error('Unable to reset HR password using phone verification.');
  return response.text();
}
