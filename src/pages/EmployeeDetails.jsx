import { useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  DOC_STATUS,
  findCandidate,
  rejectCandidateDocument,
  verifyCandidateDocument,
  openHrCandidateDocument,
} from "../services/employeeService";
import { updateStatus } from "../services/verificationService";
import { sendInterviewInvitationMail, sendStatusMail } from "../services/mailService";
import { scheduleHrInterview } from "../services/interviewWorkflowService";
import { addNotification } from "../services/notificationService";
import "./DashboardPro.css";

function getDocStatus(doc) {
  return doc?.status || (doc?.verified ? DOC_STATUS.VERIFIED : DOC_STATUS.PENDING);
}

function getStatusLabel(status) {
  if (status === DOC_STATUS.VERIFIED) return "Verified";
  if (status === DOC_STATUS.REJECTED) return "Rejected";
  return "Pending Review";
}

// These fallback lists must mirror the Candidate Portal exactly (CandidateWelcome.jsx:
// FRESHER_DOCUMENTS / CURRENT_EMPLOYEE_DOCUMENTS / NOT_WORKING_DOCUMENTS) so HR sees the
// same document count the candidate saw: 3 for Fresher, 6 for currently-working
// Experienced, 7 for not-working Experienced.
const FRESHER_REQUIRED_DOCUMENTS = ["Resume", "Aadhaar Card", "PAN Card"];
const CURRENT_EMPLOYEE_REQUIRED_DOCUMENTS = [
  "Resume", "Aadhaar Card", "PAN Card", "Current Offer / Appointment Letter",
  "Latest Salary Slip", "UAN Proof",
];
const OPTIONAL_TRAVEL_DOCUMENTS = ['Passport', 'Visa'];

const NOT_WORKING_REQUIRED_DOCUMENTS = [
  "Resume", "Aadhaar Card", "PAN Card", "Experience Letter",
  "Relieving Letter", "Last Salary Slip", "UAN Proof",
];

function canonicalDocumentName(name = '') {
  const value = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (value.includes('salaryslip')) return 'salaryslip';
  if (value.includes('offer') && value.includes('letter')) return 'offerletter';
  if (value.includes('experienceletter')) return 'experienceletter';
  if (value.includes('relievingletter')) return 'relievingletter';
  if (value.includes('aadhaar')) return 'aadhaarcard';
  if (value.includes('pan')) return 'pancard';
  if (value.includes('uan')) return 'uanproof';
  if (value.includes('resume')) return 'resume';
  return value;
}

function findUploadedDocument(documents = [], requiredName = '') {
  const wanted = canonicalDocumentName(requiredName);
  return documents.find((doc) => canonicalDocumentName(doc?.name || doc?.documentType) === wanted);
}

function getRequiredDocuments(candidate) {
  // Prefer the exact document list the candidate was actually asked for on
  // the Candidate Portal. Falling back to a static guess caused HR to see a
  // different document count than the candidate actually saw/uploaded.
  if (Array.isArray(candidate?.requiredDocumentNames) && candidate.requiredDocumentNames.length) {
    return candidate.requiredDocumentNames;
  }
  if (candidate?.candidateType !== "EXPERIENCED") {
    return FRESHER_REQUIRED_DOCUMENTS;
  }
  return String(candidate?.employmentStatus || "").toUpperCase().includes("CURRENT")
    ? CURRENT_EMPLOYEE_REQUIRED_DOCUMENTS
    : NOT_WORKING_REQUIRED_DOCUMENTS;
}

function getMissingDocuments(candidate) {
  const uploaded = candidate?.documents || [];
  return getRequiredDocuments(candidate).filter(
    (name) => !uploaded.some((doc) => doc.name === name)
  );
}

function isDocumentVerified(candidate, name) {
  const doc = findUploadedDocument(candidate?.documents || [], name);
  return doc && getDocStatus(doc) === DOC_STATUS.VERIFIED;
}


function formatFieldLabel(key) {
  const labels = {
    id: "ID",
    createdAt: "Created At",
    updatedAt: "Updated At",
    submittedAt: "Submitted At",
    fullName: "Full Name",
    candidateType: "Candidate Type",
    profileStep: "Profile Step",
    appliedRole: "Applied Role",
    employmentStatus: "Employment Status",
    currentlyEmployed: "Currently Employed",
    holdingOfferLetter: "Holding Offer Letter",
    aadhaar: "Aadhaar",
    pan: "PAN",
    uan: "UAN",
    uanNumber: "UAN Number",
    uanVerified: "UAN Verified",
    uanVerifiedBy: "UAN Verified By",
    uanVerifiedAt: "UAN Verified At",
    lastCtc: "Last CTC",
    permanentAddress: "Permanent Address",
    currentResidentialAddress: "Current Residential Address",
    emergencyContactNumber: "Emergency Contact Number",
    referenceNumber: "Reference Number",
  };

  if (labels[key]) return labels[key];

  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}


function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function formatDisplayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    return value.map((item) => isPlainObject(item) ? JSON.stringify(item) : String(item)).join(", ");
  }
  return String(value);
}

function ObjectDetailsSection({ title, data, exclude = [] }) {
  if (!isPlainObject(data)) return null;

  const entries = Object.entries(data).filter(([key, value]) =>
    !exclude.includes(key) &&
    value !== null &&
    value !== undefined &&
    value !== "" &&
    !Array.isArray(value) &&
    !isPlainObject(value)
  );

  const nestedEntries = Object.entries(data).filter(([key, value]) =>
    !exclude.includes(key) && isPlainObject(value)
  );

  if (entries.length === 0 && nestedEntries.length === 0) return null;

  return (
    <section className="panel">
      <h2>{title}</h2>
      {entries.length > 0 && (
        <div className="details">
          {entries.map(([key, value]) => (
            <p key={key}>
              <b>{formatFieldLabel(key)}:</b> {formatDisplayValue(value)}
            </p>
          ))}
        </div>
      )}
      {nestedEntries.map(([key, value]) => (
        <div className="nested-details" key={key}>
          <h3>{formatFieldLabel(key)}</h3>
          <div className="details">
            {Object.entries(value).map(([nestedKey, nestedValue]) => (
              <p key={nestedKey}>
                <b>{formatFieldLabel(nestedKey)}:</b> {isPlainObject(nestedValue)
                  ? JSON.stringify(nestedValue)
                  : formatDisplayValue(nestedValue)}
              </p>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function toDateTimeInput(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function defaultInterviewSlots() {
  const base = new Date(); base.setSeconds(0, 0); base.setDate(base.getDate() + 1); base.setHours(11, 0, 0, 0);
  const second = new Date(base); second.setDate(second.getDate() + 1); second.setHours(14, 0, 0, 0);
  const third = new Date(base); third.setDate(third.getDate() + 2); third.setHours(16, 0, 0, 0);
  return [base, second, third].map(toDateTimeInput);
}

export default function EmployeeDetails() {
  const { id } = useParams();
  const location = useLocation();
  const [c, setC] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInterviewScheduler, setShowInterviewScheduler] = useState(false);
  const [interviewSlots, setInterviewSlots] = useState(defaultInterviewSlots);
  const [interviewSaving, setInterviewSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadCandidate() {
      setLoading(true);
      setError("");
      try {
        const candidate = await findCandidate(id);
        if (!active) return;
        setC(candidate);
        setRemarks(candidate?.remarks || "");
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Unable to load candidate details.");
        setC(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCandidate();
    return () => { active = false; };
  }, [id]);

  const missingDocuments = c ? getMissingDocuments(c) : [];
  const isExperienced = c?.candidateType === "EXPERIENCED";
  const criticalDocuments = isExperienced
    ? ["PAN Card", "UAN Proof", "Aadhaar Card"]
    : ["PAN Card", "Aadhaar Card", "Resume"];
  const unverifiedCriticalDocuments = c
    ? criticalDocuments.filter((name) => !isDocumentVerified(c, name))
    : [];

  // Experienced-candidate document checklist (mirrors the "Uploaded Candidate
  // Documents" card style on the HR Dashboard) — shows every required
  // document, not just the critical three, so HR sees uploaded/not-uploaded
  // status for the whole set in one place.
  const allRequiredDocuments = c ? getRequiredDocuments(c) : [];
  const uploadedDocsList = c?.documents || [];
  const uploadedRequiredCount = allRequiredDocuments.filter((name) =>
    uploadedDocsList.some((doc) => doc.name === name)
  ).length;
  const docProgressPct = allRequiredDocuments.length
    ? Math.round((uploadedRequiredCount / allRequiredDocuments.length) * 100)
    : 0;
  const isDocChecklistComplete = allRequiredDocuments.length > 0 && uploadedRequiredCount === allRequiredDocuments.length;

  useEffect(() => {
    if (!c || missingDocuments.length === 0) return;
    const alertKey = `verifyx-hr-missing-docs-${c.id}-${missingDocuments.join("|")}`;
    if (localStorage.getItem(alertKey)) return;
    localStorage.setItem(alertKey, "shown");
    alert(
      `Missing Document Alert for HR

The following required documents are missing:

• ${missingDocuments.join("\n• ")}

Ask the candidate to upload them.`
    );
  }, [c?.id, missingDocuments.join("|")]);

  useEffect(() => {
    if (!loading && new URLSearchParams(location.search).get('section') === 'documents') {
      window.setTimeout(() => document.getElementById('candidate-documents')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  }, [loading, location.search]);

  if (loading) {
    return (
      <div className="app"><Sidebar /><main className="content"><section className="panel">Loading candidate details...</section></main></div>
    );
  }

  if (!c) {
    return (
      <div className="app">
        <Sidebar />
        <main className="content">
          <div className="page-header">
            <button type="button" className="back-btn" onClick={() => window.history.back()}>
              ← Back
            </button>
          </div>
          <section className="panel"><b>Unable to load candidate:</b> {error || "Candidate not found."}</section>
        </main>
      </div>
    );
  }

  const setStatus = async (status) => {
    if (status === "Approved" && missingDocuments.length > 0) {
      alert(
        `Cannot approve. Required documents are missing:

• ${missingDocuments.join("\n• ")}`
      );
      return;
    }

    if (status === "Approved" && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(c.pan || "").toUpperCase())) {
      alert("Cannot approve. PAN must be in a valid format such as ABCDE1234F.");
      return;
    }

    if (status === "Approved" && c.candidateType === "EXPERIENCED" && !/^\d{12}$/.test(String(c.uan || ""))) {
      alert("Cannot approve. UAN must contain exactly 12 digits.");
      return;
    }

    if (status === "Approved" && unverifiedCriticalDocuments.length > 0) {
      alert(
        `Cannot approve. HR must validate these critical documents:

• ${unverifiedCriticalDocuments.join("\n• ")}`
      );
      return;
    }

    if (status === "Approved") {
      setInterviewSlots(defaultInterviewSlots());
      setShowInterviewScheduler(true);
      return;
    }

    setLoading(true);

    try {
      await updateStatus(c.id, status, remarks);
      const updatedCandidate = await findCandidate(c.id);
      setC(updatedCandidate);
      const mailRemarks = remarks || (status === "Approved"
        ? "Your Verify-X application and submitted documents have been approved successfully."
        : status === "Rejected"
          ? "Your Verify-X application has been rejected. Please contact the HR team if you need clarification."
          : "HR has requested that you re-upload one or more documents. Please login, review the rejected documents and upload corrected copies.");
      sendStatusMail({ ...c, ...updatedCandidate }, status.toUpperCase(), mailRemarks).catch(() => {});
      alert("Application status updated successfully.");
    } catch (statusError) {
      console.error("Status update failed:", statusError);
      alert(statusError?.message || "Unable to update candidate status.");
    } finally {
      setLoading(false);
    }
  };

  const confirmInterviewSchedule = async () => {
    const cleanSlots = interviewSlots.map((slot) => String(slot || '').trim()).filter(Boolean);
    if (cleanSlots.length < 2) { alert('Please Provide At Least Two Interview Time Slots.'); return; }
    if (cleanSlots.some((slot) => new Date(slot).getTime() <= Date.now())) { alert('Please Select Future Interview Time Slots.'); return; }
    setInterviewSaving(true);
    try {
      await updateStatus(c.id, 'Approved', remarks);
      const updatedCandidate = await findCandidate(c.id).catch(() => ({ ...c, status: 'Approved' }));
      const workflow = scheduleHrInterview({ ...c, ...updatedCandidate }, cleanSlots);
      setC({ ...updatedCandidate, status: 'Approved' });
      addNotification({ audience: 'CANDIDATE', recipient: updatedCandidate.email || c.email, type: 'BGV_CLEARED', applicationId: updatedCandidate.applicationId || c.applicationId || '', title: 'BGV Cleared - HR Discussion Invitation', message: 'Your background verification is cleared. Please open the HR Interview section and select one of the available time slots.' });
      addNotification({ audience: 'HR', type: 'INTERVIEW_INVITED', applicationId: updatedCandidate.applicationId || c.applicationId || '', title: 'Candidate Invited For HR Discussion', message: `${updatedCandidate.fullName || c.fullName || 'Candidate'} has cleared BGV and received HR interview time-slot options.` });
      sendInterviewInvitationMail({ ...c, ...updatedCandidate }, workflow.interviewSlots).catch(() => {});
      setShowInterviewScheduler(false);
      alert('BGV Approved. HR Interview Time Slots Have Been Sent To The Candidate.');
    } catch (statusError) { alert(statusError?.message || 'Unable To Schedule The HR Interview.'); } finally { setInterviewSaving(false); }
  };

  const handleVerifyDocument = async (doc) => {
    try {
      await verifyCandidateDocument(c.id, doc);
      setC(await findCandidate(c.id));
      alert(`${doc.name} verified successfully.`);
    } catch (err) {
      alert(err?.message || "Unable to verify document.");
    }
  };

  const handleRejectDocument = async (doc) => {
    const reason = window.prompt(`Enter rejection reason for ${doc.name}:`);
    if (reason === null) return;

    if (!reason.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }

    try {
      await rejectCandidateDocument(c.id, doc, reason.trim());
      setC(await findCandidate(c.id));
      alert(`${doc.name} rejected. Candidate can re-upload only this document.`);
    } catch (err) {
      alert(err?.message || "Unable to reject document.");
    }
  };


  return (
    <div className="app">
      <Sidebar />

      <main className="content">
        <div className="page-header">
          <button type="button" className="back-btn" onClick={() => window.history.back()}>
            ← Back
          </button>

          <div>
            <h1>{c.fullName}</h1>
            <p className="muted">
              {c.id} • {c.email}
            </p>
          </div>
        </div>

        <section className="panel">
          <h2>Candidate Details</h2>

          <div className="skill-review-box">
            <h3>Candidate Skills</h3>
            <p><b>Technical Skills:</b> <strong>{(c.skills || []).join(", ") || "No skills selected"}</strong></p>
          </div>

          <div className="details">
            {Object.entries(c)
              .filter(([k, v]) =>
                ![
                  "password", "documents", "softSkills", "languages", "profile", "review", "education", "employment",
                  "localOnly", "identity", "locked", "hrExtractionStatus", "requiredDocuments", "requiredDocumentNames", "skills",
                  "address", "photo", "photoUrl", "profilePhoto", "profilePhotoUrl", "imageUrl",
                  "uanVerificationStatus", "uanVerifiedBy", "uanVerifiedAt",
                ].includes(k) &&
                !isPlainObject(v) &&
                !Array.isArray(v)
              )
              .map(([k, v]) => (
                <p key={k}>
                  <b>{formatFieldLabel(k)}:</b> {formatDisplayValue(v)}
                </p>
              ))}
          </div>
        </section>

        <section className="panel">
          <h2>Contact & Location Details</h2>
          <div className="details">
            <p><b>Permanent Address:</b> {c.permanentAddress || "Not Added"}</p>
            <p><b>Current Residential Address:</b> {c.currentResidentialAddress || "Not Added"}</p>
            <p><b>Emergency Contact Number:</b> {c.emergencyContactNumber || "Not Added"}</p>
            <p><b>Reference Number:</b> {c.referenceNumber || "Optional / Not Added"}</p>
          </div>
        </section>

        <section className="panel document-verification-panel" id="candidate-documents">
          <div className="verification-subsection">
            <div className="doc-checklist-header">
              <div>
                <h3>Document Checklist</h3>
                <p className="muted">
                  {isExperienced ? "Experienced candidate" : "Fresher candidate"} — {allRequiredDocuments.length} document{allRequiredDocuments.length === 1 ? "" : "s"} required for this application.
                </p>
              </div>
              <div className="doc-checklist-progress">
                <span>{uploadedRequiredCount}/{allRequiredDocuments.length} submitted</span>
                <div className="doc-checklist-progress-track">
                  <div
                    className={`doc-checklist-progress-fill ${isDocChecklistComplete ? "is-complete" : ""}`}
                    style={{ width: `${docProgressPct}%` }}
                  />
                </div>
              </div>
            </div>

            <ul className="doc-checklist-list">
              {allRequiredDocuments.map((name, index) => {
                const uploaded = findUploadedDocument(uploadedDocsList, name);
                const status = uploaded ? getDocStatus(uploaded) : null;
                const isVerified = status === DOC_STATUS.VERIFIED;
                const isRejected = status === DOC_STATUS.REJECTED;

                return (
                  <li className={`doc-checklist-row ${uploaded ? "is-submitted" : "is-pending"}`} key={name}>
                    <span className="doc-checklist-index">{index + 1}</span>

                    <div className="doc-checklist-main">
                      <span className="doc-checklist-name">{name}</span>
                      {isRejected && uploaded?.rejectionReason && (
                        <span className="doc-reject-reason"><b>Reason:</b> {uploaded.rejectionReason}</span>
                      )}
                    </div>

                    <span className={`doc-checklist-badge ${uploaded ? "submitted" : "not-uploaded"}`}>
                      {uploaded ? "Submitted" : "Not Uploaded"}
                    </span>

                    {isVerified && <span className="doc-checklist-badge verified">Verified</span>}
                    {isRejected && <span className="doc-checklist-badge rejected">Rejected</span>}

                    <div className="doc-checklist-actions">
                      {uploaded ? (
                        <>
                          <button
                            className="btn small"
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openHrCandidateDocument(uploaded).catch((err) => alert(err?.message || "Unable to open document.")); }}
                          >
                            View
                          </button>
                          {!isVerified && (
                            <button className="btn success small" type="button" onClick={() => handleVerifyDocument(uploaded)}>
                              Verify
                            </button>
                          )}
                          {!isRejected && (
                            <button className="btn danger small" type="button" onClick={() => handleRejectDocument(uploaded)}>
                              Reject
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="doc-checklist-waiting">Awaiting candidate</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="panel document-verification-panel">
          <div className="verification-subsection">
            <div className="doc-checklist-header"><div><h3>Passport & Visa (Optional)</h3><p className="muted">These documents are optional and do not affect application completion.</p></div></div>
            <ul className="doc-checklist-list">
              {OPTIONAL_TRAVEL_DOCUMENTS.map((name, index) => {
                const uploaded = findUploadedDocument(uploadedDocsList, name);
                const status = uploaded ? getDocStatus(uploaded) : null;
                return <li className={`doc-checklist-row ${uploaded ? 'is-submitted' : 'is-pending'}`} key={name}>
                  <span className="doc-checklist-index">{index + 1}</span>
                  <div className="doc-checklist-main"><span className="doc-checklist-name">{name}</span><small>{uploaded ? getStatusLabel(status) : 'Not uploaded'}</small></div>
                  {uploaded && <div className="doc-checklist-actions">
                    <button className="doc-action-btn view" type="button" onClick={()=>openHrCandidateDocument(uploaded)}>View</button>
                    {status !== DOC_STATUS.VERIFIED && <button className="doc-action-btn verify" type="button" onClick={()=>handleVerifyDocument(uploaded)}>Verify</button>}
                    {status !== DOC_STATUS.REJECTED && <button className="doc-action-btn reject" type="button" onClick={()=>handleRejectDocument(uploaded)}>Reject</button>}
                  </div>}
                </li>;
              })}
            </ul>
          </div>
        </section>

        <ObjectDetailsSection
          title="Profile Details"
          data={c.profile}
          exclude={["password", "documents", "address", "uanVerificationStatus", "uanVerifiedBy", "uanVerifiedAt"]}
        />

        <ObjectDetailsSection
          title="Education Details"
          data={c.education}
        />

        <ObjectDetailsSection
          title="Employment Details"
          data={c.employment}
        />

        <ObjectDetailsSection
          title="Application Review"
          data={c.review}
          exclude={["documents", "profile", "education", "employment"]}
        />

        <section className="panel">
          <h2>Application Verification Action</h2>

          <textarea
            placeholder="Remarks for Candidate"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />

          <div className="actions">
            <button className="btn warn" disabled={loading} onClick={() => setStatus("Re-upload Required")}>
              Request Re-upload
            </button>

            <button className="btn success" disabled={loading} onClick={() => setStatus("Approved")}>
              Approve
            </button>

            <button className="btn danger" disabled={loading} onClick={() => setStatus("Rejected")}>
              Reject
            </button>
          </div>
        </section>
      </main>
      {showInterviewScheduler && <div className="hr-interview-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="hr-interview-scheduler-title"><section className="hr-interview-modal"><header><div><span>BGV Completed</span><h2 id="hr-interview-scheduler-title">Schedule HR Interview</h2><p>{c.fullName} Is Approved For The Next Round. Add The Available Interview Time Slots Below.</p></div><button type="button" aria-label="Close" onClick={() => setShowInterviewScheduler(false)}>×</button></header><div className="hr-interview-modal-body"><div className="hr-interview-candidate-summary"><strong>{c.fullName}</strong><span>{c.email}</span><small>{c.appliedRole || 'Applied Role Not Added'}</small></div><div className="hr-slot-grid">{interviewSlots.map((slot, index) => <label key={index}><span>Time Slot {index + 1}</span><input type="datetime-local" value={slot} min={toDateTimeInput(new Date())} onChange={(event) => setInterviewSlots((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /></label>)}</div><button type="button" className="hr-add-slot-link" onClick={() => setInterviewSlots((items) => [...items, ''])}>+ Add Another Time Slot</button><p className="hr-interview-note">The Candidate Will Receive A BGV Approval Email Containing These Slots And Can Select One From The Candidate Portal. The Selected Slot Will Be Reported Back To HR.</p></div><footer><button type="button" className="btn secondary" disabled={interviewSaving} onClick={() => setShowInterviewScheduler(false)}>Cancel</button><button type="button" className="btn success" disabled={interviewSaving} onClick={confirmInterviewSchedule}>{interviewSaving ? 'Scheduling…' : 'Approve BGV & Send Slots'}</button></footer></section></div>}
    </div>
  );
}
