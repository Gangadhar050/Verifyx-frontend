import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { registerCandidate, resendCandidateVerification, verifyCandidateEmail } from "../services/authService";
import { api } from "../services/apiService";
import { REGEX, onlyDigits, onlyLetters } from "../utils/validators";
import { sendWelcomeMail, sendHrCandidateRegisteredMail, sendProfileCompletionReminder } from "../services/mailService";
import { ensureRegistrationReminder } from '../services/notificationService';

const ROLE_LABEL_OVERRIDES = {
  "qa engineer": "QA Engineer",
};

function formatRoleLabel(label) {
  const key = String(label || "").trim().toLowerCase();
  return ROLE_LABEL_OVERRIDES[key] || label;
}

export default function CandidateRegister() {
  const nav = useNavigate();
  const location = useLocation();
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState(location.state?.message || "");
  const [otp, setOtp] = useState("");
  const [verificationStep, setVerificationStep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: location.state?.email || "", phone: "", password: "", candidateType: "", appliedRole: "" });
  const [registrationOptions, setRegistrationOptions] = useState({ appliedRoles: [], candidateTypes: [] });
  const [optionsLoading, setOptionsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRegistrationOptions = async () => {
      try {
        const options = await api.registrationOptions();
        if (!active) return;

        const normalized = {
          appliedRoles: Array.isArray(options?.appliedRoles) ? options.appliedRoles : [],
          candidateTypes: Array.isArray(options?.candidateTypes) ? options.candidateTypes : [],
        };

        setRegistrationOptions(normalized);
        setForm((current) => ({
          ...current,
          candidateType: current.candidateType || normalized.candidateTypes?.[0]?.value || "",
        }));
      } catch (error) {
        if (!active) return;
        setErr(error.message || "Unable to load registration options from backend.");
        setRegistrationOptions({ appliedRoles: [], candidateTypes: [] });
      } finally {
        if (active) setOptionsLoading(false);
      }
    };

    loadRegistrationOptions();
    return () => { active = false; };
  }, []);

  const set = (key, value) => {
    let safeValue = value;
    if (key === "fullName") safeValue = onlyLetters(value);
    if (key === "phone") safeValue = onlyDigits(value, 10);
    setForm({ ...form, [key]: safeValue });
  };

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (!REGEX.name.test(form.fullName.trim())) return setErr("Full name must contain only letters and spaces.");
    if (!REGEX.email.test(form.email.trim())) return setErr("Please enter a valid email address.");
    if (!REGEX.mobile.test(form.phone.trim())) return setErr("Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9.");
    if (form.password.length < 8) return setErr("Password must contain at least 8 characters.");
    try { setBusy(true); const result = await registerCandidate(form); ensureRegistrationReminder(form); setVerificationStep(true); const devOtp = String(result || "").match(/DEV_OTP=(\d{6})/)?.[1]; setMsg(devOtp ? `Account created. Local test OTP: ${devOtp} (enable mail settings for real email delivery).` : "Account created. We sent a 6-digit verification OTP to your email."); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  const verify = async (e) => {
    e.preventDefault(); setErr("");
    if (!/^\d{6}$/.test(otp)) return setErr("Enter the 6-digit OTP from your email.");
    try { setBusy(true); await verifyCandidateEmail(form.email, otp); sendWelcomeMail(form).catch(()=>{}); sendProfileCompletionReminder(form, true).catch(()=>{}); sendHrCandidateRegisteredMail(form).catch(()=>{}); nav("/candidate-login", { state: { message: "Email verified successfully. Please login to continue." } }); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };

  const resend = async () => {
    try { setErr(""); await resendCandidateVerification(form.email); setMsg("A fresh OTP has been sent to your email."); }
    catch (x) { setErr(x.message); }
  };

  return <>
    <Navbar />
    <main className="auth-wrap register-premium-wrap">
      <section className="register-premium-shell">
        <div className="register-copy">
          <span className="auth-mini-label">Candidate Onboarding</span>
          <h1>Build A Verified Career Profile.</h1>
          <p>One Secure Profile For Identity, Education, Employment And Offer-Document Verification.</p>
          <div className="register-benefits"><span>✓ Email Verified Registration</span><span>✓ Secure Document Tracking</span><span>✓ Live Verification status</span></div>
        </div>
        <form className="auth-card wide register-card" onSubmit={verificationStep ? verify : submit}>
          <h1>{verificationStep ? "Verify Email" : "Candidate Sign Up"}</h1>
          <p className="muted">{verificationStep ? `Enter The OTP Sent To ${form.email}` : "Create Your Account First. After Email Verification, You Will Be Redirected To Login."}</p>
          {err && <div className="error">{err}</div>}{msg && <div className="success">{msg}</div>}
          {!verificationStep ? <div className="grid2">
            <input placeholder="Full Name" value={form.fullName} maxLength={60} onChange={(e)=>set("fullName",e.target.value)} required />
            <input placeholder="Email" type="email" value={form.email} onChange={(e)=>set("email",e.target.value)} required />
            <input placeholder="Phone" value={form.phone} maxLength={10} inputMode="numeric" onChange={(e)=>set("phone",e.target.value)} required />
            <select aria-label="Applied Role" value={form.appliedRole} onChange={(e)=>set("appliedRole",e.target.value)} required disabled={optionsLoading || !registrationOptions.appliedRoles.length}>
              <option value="" disabled>{optionsLoading ? "Loading roles from backend..." : registrationOptions.appliedRoles.length ? "Select Applied IT Role" : "Backend unavailable - roles not loaded"}</option>
              {registrationOptions.appliedRoles.map((role) => <option key={role.value} value={role.value}>{formatRoleLabel(role.label)}</option>)}
            </select>
            <input placeholder="Password (minimum 8 characters)" type="password" value={form.password} onChange={(e)=>set("password",e.target.value)} required />
            <select aria-label="Candidate Type" value={form.candidateType} onChange={(e)=>set("candidateType",e.target.value)} required disabled={optionsLoading || !registrationOptions.candidateTypes.length}>
              {registrationOptions.candidateTypes.length
                ? registrationOptions.candidateTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)
                : <option value="">{optionsLoading ? "Loading candidate types..." : "Backend unavailable - types not loaded"}</option>}
            </select>
          </div> : <div className="otp-box">
            <input className="otp-input" placeholder="6-Digit OTP" inputMode="numeric" maxLength={6} value={otp} onChange={(e)=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} autoFocus />
            <button type="button" className="forgot-button" onClick={resend}>Resend OTP</button>
          </div>}
          <button className="btn primary full" disabled={busy}>{busy ? "Please wait..." : verificationStep ? "Verify & Continue to Login" : "Create Account & Send OTP"}</button>
          <p>Already registered? <Link to="/candidate-login">Login</Link></p>
        </form>
      </section>
    </main>
  </>;
}
