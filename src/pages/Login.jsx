import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import {
  loginAdmin,
  loginCandidate,
  requestCandidatePasswordReset,
  resetCandidatePassword,
  requestHrPasswordResetByIdentifier,
  resetHrPasswordByIdentifier,
} from "../services/authService";
import { getLocalCandidates } from '../services/storage';
import { getApplication } from '../services/candidateApplicationService';
import "./Login.css";

export default function Login({ mode }) {
  const nav = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const isAdmin = mode === "admin";
  const [form, setForm] = useState({ email: "", password: "" });
  const [forgot, setForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState("email");
  const [reset, setReset] = useState({ identifier: "", otp: "", newPassword: "", confirmPassword: "" });
  const [otpSent, setOtpSent] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState(location.state?.message || "");

  const rememberStorageKey = isAdmin ? "verifyx_remembered_hr_credentials" : "verifyx_remembered_candidate_credentials";

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(rememberStorageKey) || "null");
      if (saved?.email && saved?.password) {
        setForm({ email: saved.email, password: saved.password });
        setRemember(true);
      }
    } catch {
      localStorage.removeItem(rememberStorageKey);
    }
  }, [rememberStorageKey]);

  const registeredCandidateEmails = useMemo(() => {
    if (isAdmin) return [];
    return [...new Set(getLocalCandidates().map((candidate) => String(candidate.email || '').trim().toLowerCase()).filter(Boolean))].sort();
  }, [isAdmin]);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    try {
      const loggedSession = isAdmin
        ? await loginAdmin(form.email, form.password)
        : await loginCandidate(form.email, form.password);
      if (remember) {
        localStorage.setItem(rememberStorageKey, JSON.stringify({ email: form.email.trim(), password: form.password }));
      } else {
        localStorage.removeItem(rememberStorageKey);
      }
      refresh();
      if (isAdmin) {
        nav("/dashboard");
      } else {
        const identity = loggedSession?.id || loggedSession?.email || form.email;
        const existingApplication = getApplication(identity);
        if (existingApplication) {
          localStorage.setItem(`verifyx_portal_access_${identity}`, 'true');
          sessionStorage.setItem(`verifyx_show_return_progress_${identity}`, 'true');
          nav("/candidate", { replace: true });
        } else {
          localStorage.removeItem(`verifyx_portal_access_${identity}`);
          nav("/candidate-welcome", { replace: true });
        }
      }
    } catch (x) {
      if (!isAdmin && x?.code === "CANDIDATE_NOT_REGISTERED") {
        nav("/candidate-register", { state: { message: "First-time candidate? Please register before logging in.", email: form.email } });
        return;
      }
      setErr(x.message);
    }
  };

  const sendResetOtp = async () => {
    const identifier = reset.identifier.trim();
    if (!identifier) return setErr(`Enter your registered ${verificationMethod === "email" ? "email" : "phone number"}.`);
    if (verificationMethod === "email" && !/^\S+@\S+\.\S+$/.test(identifier)) return setErr("Enter a valid registered email address.");
    if (verificationMethod === "phone" && !/^\d{10}$/.test(identifier)) return setErr("Enter a valid 10-digit registered phone number.");
    try {
      const result = isAdmin
        ? await requestHrPasswordResetByIdentifier(identifier, verificationMethod)
        : await requestCandidatePasswordReset(identifier);
      const devOtp = String(result || "").match(/DEV_OTP=(\d{6})/)?.[1];
      setOtpSent(true);
      if (devOtp) setReset((current) => ({ ...current, otp: devOtp }));
      setMsg(devOtp
        ? `Local verification OTP: ${devOtp}. Connect email/SMS delivery in the backend for production.`
        : `A 6-digit OTP has been sent to your registered ${verificationMethod}.`);
    } catch (x) { setErr(x.message); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (!otpSent) return sendResetOtp();
    if (!/^\d{6}$/.test(reset.otp)) return setErr("Enter the 6-digit OTP.");
    if (reset.newPassword.length < 8) return setErr("Password must be at least 8 characters.");
    if (reset.newPassword !== reset.confirmPassword) return setErr("Passwords do not match.");
    try {
      if (isAdmin) await resetHrPasswordByIdentifier(reset.identifier.trim(), reset.otp, reset.newPassword, verificationMethod);
      else await resetCandidatePassword(reset.identifier.trim(), reset.otp, reset.newPassword);
      setMsg("Password reset successfully. You can login now.");
      setForgot(false); setOtpSent(false);
      if (verificationMethod === "email") setForm((f) => ({ ...f, email: reset.identifier.trim(), password: "" }));
    } catch (x) { setErr(x.message); }
  };

  const resetForgotState = () => {
    setForgot(false); setOtpSent(false); setErr(""); setMsg("");
    setReset({ identifier: "", otp: "", newPassword: "", confirmPassword: "" });
  };

  return <main className="vx-login-page">
    <section className="vx-login-shell page-enter">
      <aside className="vx-login-illustration" aria-hidden="true" />

      <section className="vx-login-form-area">
        <form className="vx-auth-login-card" onSubmit={forgot ? handleForgotPassword : submit}>
          <div className="vx-login-brand">
            <img src="/verify-x-logo.svg" alt="VerifyX" />
          </div>
          <h1>{forgot ? "Recover Your Account" : isAdmin ? "HR Login" : "Candidate Login"}</h1>
          <p className="vx-login-subtitle">{forgot
            ? `Verify Your Registered Email Or Phone Number To create a new ${isAdmin ? "HR" : "candidate"} password.`
            : isAdmin ? "Review candidate profiles, documents and verification requests" : "Continue your Profile, Documents and Verification Journey"}</p>

          {err && <div className="error vx-login-message">{err}</div>}
          {msg && <div className="success vx-login-message">{msg}</div>}

          {!forgot ? <>
            <div className="vx-input-box">
              <span className="vx-input-icon" aria-hidden="true">✉</span>
              <div className="vx-input-content">
                <label htmlFor="login-email">Email</label>
                <input id="login-email" type="email" list={!isAdmin ? "registered-candidate-emails" : undefined} autoComplete="email" placeholder="abc@gmail.com" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} required />
              </div>
            </div>
            {!isAdmin && <datalist id="registered-candidate-emails">{registeredCandidateEmails.map((email) => <option value={email} key={email} />)}</datalist>}

            <div className="vx-input-box vx-password-box">
              <span className="vx-input-icon vx-key-icon" aria-hidden="true">◆</span>
              <div className="vx-input-content">
                <label htmlFor="login-password">Password</label>
                <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••••" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} required />
              </div>
              <button type="button" className="vx-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={()=>setShowPassword(!showPassword)}>{showPassword ? "◉" : "⊙"}</button>
            </div>

            <div className="vx-login-options">
              <label className="vx-remember-row"><input type="checkbox" checked={remember} onChange={(e)=>setRemember(e.target.checked)}/><span>Remember me</span></label>
              <button type="button" className="vx-forgot-link" onClick={()=>{setForgot(true);setReset((r)=>({...r,identifier:form.email}))}}>Forgot Password?</button>
            </div>

            <button className="vx-login-submit">Login</button>
            {!isAdmin && <p className="vx-signup-line">Don’t have an account? <Link to="/candidate-register">Register</Link></p>}
          </> : <>
            <div className="verification-tabs" role="tablist">
              <button type="button" className={verificationMethod === "email" ? "active" : ""} onClick={()=>{setVerificationMethod("email");setOtpSent(false);}}>Email Verification</button>
              <button type="button" className={verificationMethod === "phone" ? "active" : ""} onClick={()=>{setVerificationMethod("phone");setOtpSent(false);}}>Phone Verification</button>
            </div>

            <label className="vx-reset-label">Registered {verificationMethod === "email" ? "Email" : "Phone Number"}</label>
            <input className="vx-reset-input" type={verificationMethod === "email" ? "email" : "tel"} inputMode={verificationMethod === "phone" ? "numeric" : undefined} maxLength={verificationMethod === "phone" ? 10 : undefined} placeholder={verificationMethod === "email" ? "name@example.com" : "10-digit mobile number"} value={reset.identifier} onChange={(e)=>setReset({...reset,identifier: verificationMethod === "phone" ? e.target.value.replace(/\D/g,"").slice(0,10) : e.target.value})} required />
            {otpSent && <>
              <label className="vx-reset-label">Verification OTP</label><input className="vx-reset-input" inputMode="numeric" maxLength={6} placeholder="6-digit OTP" value={reset.otp} onChange={(e)=>setReset({...reset,otp:e.target.value.replace(/\D/g,"").slice(0,6)})} required />
              <label className="vx-reset-label">New Password</label><input className="vx-reset-input" type="password" placeholder="Minimum 8 characters" value={reset.newPassword} onChange={(e)=>setReset({...reset,newPassword:e.target.value})} required />
              <label className="vx-reset-label">Confirm Password</label><input className="vx-reset-input" type="password" placeholder="Confirm new password" value={reset.confirmPassword} onChange={(e)=>setReset({...reset,confirmPassword:e.target.value})} required />
            </>}
            <button className="vx-login-submit">{otpSent ? "Verify OTP & Reset Password" : "Send Verification OTP"}</button>
            <button type="button" className="vx-back-login" onClick={resetForgotState}>← Back to Login</button>
          </>}
        </form>
      </section>
    </section>
  </main>;
}
