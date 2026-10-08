import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { allCandidates, deleteCandidate, isSubmittedCandidate } from "../services/employeeService";
import "./DashboardPro.css";
import { confirmHrInterview, decideHrInterview, formatInterviewSlot, getInterviewWorkflows, markOfferReleased, removeInterviewWorkflow } from '../services/interviewWorkflowService';
import { sendInterviewConfirmedMail, sendInterviewDecisionMail, sendOfferReleasedMail } from '../services/mailService';
import OfferLetterModal from '../components/OfferLetterModal';
import { addNotification, getNotifications, markNotificationsRead } from '../services/notificationService';

const label = (value = "Draft") => String(value || "Draft").replaceAll("_", " ").replaceAll("-", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const statusClass = (status = "") => {
  const value = String(status).toLowerCase();
  if (value.includes("reject")) return "rejected";
  if (value.includes("approv") || (value.includes("verif") && !value.includes("pending"))) return "approved";
  return "pending";
};
const isExperiencedCandidate = (candidate = {}) => {
  const type = String(candidate.candidateType || candidate.type || '').toUpperCase();
  if (type.includes('EXPER')) return true;
  if (type.includes('FRESH')) return false;
  const employment = String(candidate.employmentStatus || '').toUpperCase();
  return Boolean(employment && employment !== 'FRESHER');
};
const rowKey = (candidate = {}) => String(candidate.email || candidate.id || candidate.identity || candidate.fullName || "").trim().toLowerCase();

const isDemoRecord = (record = {}) => {
  const email = String(record.email || record.identity || '').trim().toLowerCase();
  const id = String(record.id || record.candidateId || record.applicationId || record.identity || '').trim().toLowerCase();
  const name = String(record.fullName || record.name || record.candidateName || '').trim().toLowerCase();
  return email.endsWith('@verifyx.test') || email.startsWith('demo.') || id.startsWith('demo') || name.startsWith('demo ');
};
const dedupe = (list = []) => {
  const rows = new Map();
  list.forEach((candidate) => {
    const key = rowKey(candidate);
    if (!key) return;
    const existing = rows.get(key);
    if (!existing) rows.set(key, candidate);
    else {
      const existingScore = Object.values(existing).filter(Boolean).length;
      const nextScore = Object.values(candidate).filter(Boolean).length;
      rows.set(key, nextScore >= existingScore ? { ...existing, ...candidate } : { ...candidate, ...existing });
    }
  });
  return Array.from(rows.values());
};

function CandidatePhoto({ candidate }) {
  const photo = candidate.photo || candidate.photoUrl || candidate.profilePhoto || candidate.profilePhotoUrl || candidate.imageUrl;
  const initial = (candidate.fullName || candidate.name || "C").charAt(0).toUpperCase();
  return photo
    ? <img className="hr-candidate-photo" src={photo} alt={`${candidate.fullName || "Candidate"} profile`} />
    : <span className="hr-candidate-photo hr-photo-fallback">{initial}</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [interviewWorkflows, setInterviewWorkflows] = useState(() => getInterviewWorkflows().filter((item) => !isDemoRecord(item)));
  const [offerQueueOpen, setOfferQueueOpen] = useState(false);
  const [hrNotifications, setHrNotifications] = useState(() => getNotifications('HR'));
  const [showHrNotifications, setShowHrNotifications] = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    try { setCandidates(dedupe(await allCandidates()).filter(isSubmittedCandidate).filter((candidate) => !isDemoRecord(candidate))); }
    catch (err) { setError(err?.message || "Unable To Load Candidates."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { const refresh = () => setInterviewWorkflows(getInterviewWorkflows().filter((item) => !isDemoRecord(item))); window.addEventListener('verifyx-interview-workflow-updated', refresh); window.addEventListener('storage', refresh); return () => { window.removeEventListener('verifyx-interview-workflow-updated', refresh); window.removeEventListener('storage', refresh); }; }, []);
  useEffect(() => { const refresh = () => setHrNotifications(getNotifications('HR')); window.addEventListener('verifyx-notifications-updated', refresh); window.addEventListener('storage', refresh); return () => { window.removeEventListener('verifyx-notifications-updated', refresh); window.removeEventListener('storage', refresh); }; }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((candidate) => {
      const skills = Array.isArray(candidate.skills) ? candidate.skills.join(" ") : candidate.skills || "";
      return [candidate.id, candidate.applicationId, candidate.fullName, candidate.phone, candidate.email, candidate.candidateType, skills, candidate.appliedRole, candidate.status]
        .some((field) => String(field || "").toLowerCase().includes(q));
    });
  }, [candidates, query]);

  const summary = useMemo(() => {
    const normalizedStatus = (candidate = {}) => String(candidate.status || candidate.applicationStatus || '').toUpperCase();
    return {
      total: candidates.length,
      verified: candidates.filter((candidate) => {
        const status = normalizedStatus(candidate);
        return status.includes('VERIFIED') && !status.includes('PENDING');
      }).length,
      rejected: candidates.filter((candidate) => normalizedStatus(candidate).includes('REJECT')).length,
      approved: candidates.filter((candidate) => normalizedStatus(candidate).includes('APPROV')).length,
      freshers: candidates.filter((candidate) => !isExperiencedCandidate(candidate)).length,
      experienced: candidates.filter((candidate) => isExperiencedCandidate(candidate)).length,
    };
  }, [candidates]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  useEffect(() => { setPage(1); }, [query, pageSize]);

  const pathFor = (candidate, suffix = "") => `/employees/${encodeURIComponent(candidate.id || candidate.identity)}${suffix}`;
  const remove = async (candidate) => {
    if (!window.confirm(`Delete ${candidate.fullName || candidate.email || "This Candidate"}? This Action Cannot Be Undone.`)) return;
    try { await deleteCandidate(candidate.id || candidate.identity); await load(); }
    catch (err) { alert(err?.message || "Unable To Delete Candidate."); }
  };
  const interviewCandidates = interviewWorkflows.filter((item) => item.interviewInvitedAt && item.finalDecision !== 'REJECTED');
  const offerCandidates = interviewWorkflows.filter((item) => item.finalDecision === 'APPROVED');
  const confirmInterview = async (workflow) => {
    if (!workflow?.selectedSlot) { alert('The Candidate Must Select An Interview Time Slot First.'); return; }
    if (workflow.interviewStatus === 'INTERVIEW_CONFIRMED' || workflow.interviewConfirmedAt) { alert('This Interview Has Already Been Confirmed.'); return; }
    if (!window.confirm(`Confirm HR interview for ${workflow.fullName} on ${formatInterviewSlot(workflow.selectedSlot)}?`)) return;
    try {
      const updated = confirmHrInterview(workflow);
      addNotification({ audience: 'CANDIDATE', recipient: updated.email, type: 'INTERVIEW_CONFIRMED', applicationId: updated.applicationId || '', title: 'HR Interview Confirmed', message: `Your HR interview is confirmed for ${formatInterviewSlot(updated.selectedSlot)}.` });
      await sendInterviewConfirmedMail(updated).catch(() => false);
      setInterviewWorkflows(getInterviewWorkflows().filter((item) => !isDemoRecord(item)));
      alert('HR Interview Confirmed. The Candidate Has Been Notified.');
    } catch (err) { alert(err?.message || 'Unable To Confirm The HR Interview.'); }
  };
  const decideInterview = async (workflow, decision) => {
    const rejecting = decision === 'REJECTED'; const reason = rejecting ? window.prompt('Enter The Rejection Reason For This Candidate:') : '';
    if (rejecting && reason === null) return; if (rejecting && !String(reason || '').trim()) { alert('Please Enter A Rejection Reason.'); return; }
    if (!workflow.selectedSlot) { alert('The Candidate Must Select An Interview Time Slot Before HR Can Record The Interview Result.'); return; }
    if (workflow.interviewStatus !== 'INTERVIEW_CONFIRMED' && !workflow.interviewConfirmedAt) { alert('Please Confirm/Fix The Interview Slot First.'); return; }
    if (!window.confirm(`${rejecting ? 'Reject' : 'Approve'} ${workflow.fullName}?`)) return;
    try { const updated = decideHrInterview(workflow, decision, reason || ''); await sendInterviewDecisionMail(updated, decision, reason || '').catch(() => false);
      if (rejecting) { await deleteCandidate(workflow.candidateId || workflow.identity).catch(() => true); removeInterviewWorkflow(workflow); await load(); alert('Candidate Rejected. Candidate Details Have Been Deleted Automatically.'); }
      else { setInterviewWorkflows(getInterviewWorkflows().filter((item) => !isDemoRecord(item))); alert('Candidate Approved For Offer-Letter Release.'); }
    } catch (err) { alert(err?.message || 'Unable To Update The HR Interview Decision.'); }
  };
  const handleOfferReleased = async (workflow, result) => {
    const updated = markOfferReleased({
      ...workflow,
      offerLetterReference: result?.referenceNumber,
      offerLetterGeneratedAt: result?.createdAt || new Date().toISOString(),
      offerLetterMailStatus: result?.mailStatus,
    });
    setInterviewWorkflows(getInterviewWorkflows().filter((item) => !isDemoRecord(item)));
    setOfferQueueOpen(false);
    await sendOfferReleasedMail(updated).catch(() => false);
    alert(`Offer Letter Released Successfully.

Reference: ${result?.referenceNumber || 'Generated'}
Mail Status: ${result?.mailStatus || 'SENT'}`);
  };

  return <div className="app hr-dashboard-app">
    <Sidebar />
    <main className="content hr-dashboard-content">
      <header className="hr-dashboard-heading">
        <div className="hr-heading-copy">
          <h1><span>Candidate</span> <em>Dashboard</em></h1>
          <p>Review and manage every candidate from one clear table.</p>
        </div>
        <div className="hr-dashboard-visual" aria-hidden="true">
          <img src="/hr-dashboard-illustration-hd.png" alt="" className="hr-dashboard-illustration" />
        </div>
        <div className="hr-heading-actions">
          <span className="hr-total-count">{loading ? "…" : `${filtered.length} Candidates`}</span>
          <button className="btn secondary hr-notification-button" onClick={() => { setShowHrNotifications((value) => !value); markNotificationsRead('HR'); setHrNotifications(getNotifications('HR')); }}>Notifications <span>{hrNotifications.filter((item) => !item.read).length}</span></button>
          <button className="btn primary hr-release-offer" onClick={() => setOfferQueueOpen(true)}>Offer Letter <span>{offerCandidates.filter((item) => item.offerStatus !== 'RELEASED').length}</span></button>
        </div>
      </header>

      <section className="hr-summary-grid" aria-label="Candidate status summary">
        <article className="hr-summary-card total"><span className="hr-summary-icon">👥</span><div><small>Total Candidates</small><strong>{loading ? "…" : summary.total}</strong></div></article>
        <article className="hr-summary-card verified"><span className="hr-summary-icon">✅</span><div><small>Verified</small><strong>{loading ? "…" : summary.verified}</strong></div></article>
        <article className="hr-summary-card rejected"><span className="hr-summary-icon">⊘</span><div><small>Rejected</small><strong>{loading ? "…" : summary.rejected}</strong></div></article>
        <article className="hr-summary-card approved"><span className="hr-summary-icon">☑</span><div><small>Approved</small><strong>{loading ? "…" : summary.approved}</strong></div></article>
        <article className="hr-summary-card freshers"><span className="hr-summary-icon">🎓</span><div><small>Freshers</small><strong>{loading ? "…" : summary.freshers}</strong></div></article>
        <article className="hr-summary-card experienced"><span className="hr-summary-icon">💼</span><div><small>Experienced</small><strong>{loading ? "…" : summary.experienced}</strong></div></article>
      </section>

      <section className="hr-dashboard-table-panel">
        <div className="hr-table-toolbar">
          <label className="hr-dashboard-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search candidates" /></label>
          <div className="hr-toolbar-actions">
            <label className="hr-page-size"><span>Rows</span><select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}><option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>
          </div>
        </div>
        {error && <div className="error hr-dashboard-feedback">{error}<button onClick={load}>Retry</button></div>}

        <div className="hr-candidate-table-wrap">
          <table className="hr-candidate-table">
            <thead><tr><th>Photo</th><th>ID</th><th>Name</th><th>Phone</th><th>Email ID</th><th>PAN</th><th>Aadhaar</th><th>UAN</th><th>Emergency Contact</th><th>Permanent Address</th><th>Current Address</th><th>Reference No.</th><th>Type</th><th>Skills</th><th>Applied Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="17" className="hr-empty-row">Loading candidates…</td></tr> :
                visible.length ? visible.map((candidate, index) => {
                  const id = Number.isFinite(Number(candidate.candidateId)) ? Number(candidate.candidateId) : start + index + 1;
                  const skills = Array.isArray(candidate.skills) ? candidate.skills.filter(Boolean) : [];
                  return <tr key={rowKey(candidate) || id}>
                    <td data-label="Photo"><CandidatePhoto candidate={candidate} /></td>
                    <td data-label="ID"><span className="hr-id-cell" title={String(id)}>{String(id)}</span></td>
                    <td data-label="Name"><strong className="hr-name-cell">{candidate.fullName || candidate.name || "Not Added"}</strong></td>
                    <td data-label="Phone">{candidate.phone || candidate.mobile || "Not Added"}</td>
                    <td data-label="Email ID"><span className="hr-email-cell">{candidate.email || "Not Added"}</span></td>
                    <td data-label="PAN">{candidate.pan || candidate.panNumber || "Not Added"}</td>
                    <td data-label="Aadhaar">{candidate.aadhaar || candidate.aadhaarNumber || "Not Added"}</td>
                    <td data-label="UAN">{isExperiencedCandidate(candidate) ? <span className="hr-uan-cell">{candidate.uan || candidate.uanNumber || "Not Added"}</span> : <span className="hr-not-applicable">Not Applicable</span>}</td>
                    <td data-label="Emergency Contact">{candidate.emergencyContactNumber || "Not Added"}</td>
                    <td data-label="Permanent Address"><span className="hr-address-cell" title={candidate.permanentAddress || ''}>{candidate.permanentAddress || "Not Added"}</span></td>
                    <td data-label="Current Address"><span className="hr-address-cell" title={candidate.currentResidentialAddress || ''}>{candidate.currentResidentialAddress || "Not Added"}</span></td>
                    <td data-label="Reference No.">{candidate.referenceNumber || "Optional / Not Added"}</td>
                    <td data-label="Type"><span className="hr-type-pill">{label(candidate.candidateType || "Fresher")}</span></td>
                    <td data-label="Skills"><div className="hr-skill-list">{skills.length ? skills.slice(0, 3).map((skill) => <span key={skill}>{skill}</span>) : <em>Not Added</em>}{skills.length > 3 && <span>+{skills.length - 3}</span>}</div></td>
                    <td data-label="Applied Role">{candidate.appliedRole ? label(candidate.appliedRole) : "Not Added"}</td>
                    <td data-label="Status"><span className={`hr-status-pill ${statusClass(candidate.status)}`}>{label(candidate.status)}</span></td>
                    <td data-label="Actions"><div className="hr-action-buttons">
                      <button className="hr-icon-button view" onClick={() => navigate(pathFor(candidate))} aria-label="View candidate" title="View profile">👁</button>
                      <button className="hr-icon-button view" onClick={() => navigate(`${pathFor(candidate)}?section=documents`)} aria-label="View uploaded documents" title="View uploaded documents">📄</button>
                      <button className="hr-icon-button edit" onClick={() => navigate(pathFor(candidate, "/edit"))} aria-label="Edit candidate" title="Edit candidate">✎</button>
                      <button className="hr-icon-button delete" onClick={() => remove(candidate)} aria-label="Delete candidate" title="Delete candidate">🗑</button>
                    </div></td>
                  </tr>;
                }) : <tr><td colSpan="17" className="hr-empty-row">No Candidates Match Your Search.</td></tr>}
            </tbody>
          </table>
        </div>

        <footer className="hr-table-footer">
          <span>{filtered.length ? `Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length}` : "0 candidates"}</span>
          <div><button disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button><b>Page {safePage} of {totalPages}</b><button disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button></div>
        </footer>
      </section>
      <section className="hr-interview-section"><div className="hr-interview-section-head"><div><span className="eyebrow">Interview Pipeline</span><h2>HR Interview Candidates</h2><p>BGV-cleared candidates appear here. After a candidate selects a slot, HR must confirm the interview before recording the result.</p></div><strong>{interviewCandidates.length} Candidates</strong></div><div className="hr-interview-table-wrap"><table className="hr-interview-table"><thead><tr><th>Candidate</th><th>Applied Role</th><th>BGV Status</th><th>Selected Interview Slot</th><th>Interview Status</th><th>Actions</th></tr></thead><tbody>{interviewCandidates.length ? interviewCandidates.map((workflow) => { const confirmed = workflow.interviewStatus === 'INTERVIEW_CONFIRMED' || Boolean(workflow.interviewConfirmedAt) || Boolean(workflow.finalDecision); return <tr key={workflow.workflowId}><td data-label="Candidate"><strong>{workflow.fullName}</strong><small>{workflow.email}</small></td><td data-label="Applied Role">{workflow.appliedRole || 'Not Added'}</td><td data-label="BGV Status"><span className="hr-pipeline-badge completed">Cleared</span></td><td data-label="Selected Interview Slot">{workflow.selectedSlot ? formatInterviewSlot(workflow.selectedSlot) : <span className="hr-awaiting-slot">Awaiting Candidate Selection</span>}</td><td data-label="Interview Status"><span className={`hr-pipeline-badge ${workflow.finalDecision === 'APPROVED' ? 'approved' : workflow.finalDecision === 'REJECTED' ? 'pending' : confirmed ? 'scheduled' : 'pending'}`}>{workflow.finalDecision === 'APPROVED' ? 'Approved' : workflow.finalDecision === 'REJECTED' ? 'Rejected' : confirmed ? 'Interview Confirmed' : workflow.selectedSlot ? 'Awaiting HR Confirmation' : 'Awaiting Slot'}</span></td><td data-label="Actions"><div className="hr-interview-actions">{!workflow.finalDecision && <button type="button" className="btn primary small" disabled={!workflow.selectedSlot || confirmed} onClick={() => confirmInterview(workflow)}>{confirmed ? 'Confirmed' : 'Confirm Interview'}</button>}<button type="button" className="btn success small" disabled={!confirmed || Boolean(workflow.finalDecision)} onClick={() => decideInterview(workflow, 'APPROVED')}>{workflow.finalDecision === 'APPROVED' ? 'Approved' : 'Approve'}</button><button type="button" className="btn danger small" disabled={!confirmed || Boolean(workflow.finalDecision)} onClick={() => decideInterview(workflow, 'REJECTED')}>{workflow.finalDecision === 'REJECTED' ? 'Rejected' : 'Reject'}</button></div></td></tr>; }) : <tr><td colSpan="6" className="hr-empty-row">No Candidates Have Reached The HR Interview Stage Yet.</td></tr>}</tbody></table></div></section>
    </main>
    {showHrNotifications && <div className="hr-notification-panel"><div className="hr-notification-panel-head"><div><small>HR Updates</small><h3>Notifications</h3></div><button type="button" onClick={() => setShowHrNotifications(false)}>×</button></div><div className="hr-notification-list">{hrNotifications.length ? hrNotifications.slice(0, 12).map((item) => <article key={item.id}><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></article>) : <p className="hr-empty-notifications">No HR notifications yet.</p>}</div></div>}
    {offerQueueOpen && <OfferLetterModal candidates={offerCandidates} onClose={() => setOfferQueueOpen(false)} onReleased={handleOfferReleased} />}
  </div>;
}
