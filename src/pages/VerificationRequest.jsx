import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { allCandidates, verifyCandidateUan } from "../services/employeeService";
import { Link } from "react-router-dom";
import { getSubmittedApplications, updateSubmittedApplication } from "../services/candidateApplicationService";
import { sendStatusMail } from "../services/mailService";
import "./CandidatePortal.css";

export default function VerificationRequest() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [localReview, setLocalReview] = useState(null);

  const loadCandidates = async () => {
    setLoading(true);
    setError("");

    const localSubmitted = getSubmittedApplications().map((application) => ({
      ...application,
      id: application.candidateId || application.identity,
      localApplication: true,
      documents: Object.entries(application.requiredDocuments || {}).map(([name, info]) => ({ name, fileName: info?.fileName, status: info?.verificationStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING', preSubmissionVerified: info?.verificationStatus === 'VERIFIED' })),
    }));
    try {
      const result = await allCandidates();
      const apiItems = Array.isArray(result) ? result : [];
      const localEmails = new Set(localSubmitted.map((item) => String(item.email || '').toLowerCase()));
      setItems([...localSubmitted, ...apiItems.filter((item) => !localEmails.has(String(item.email || '').toLowerCase()))]);
    } catch (err) {
      console.error("Unable to load verification requests", err);
      setItems(localSubmitted);
      if (!localSubmitted.length) setError(err?.message || "Unable to load verification requests from the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const getCandidateTime = (candidate) =>
    candidate.createdAt ||
    candidate.appliedAt ||
    candidate.updatedAt ||
    candidate.submittedAt ||
    candidate.id ||
    "";

  const sortedItems = useMemo(() => {
    return items
      .filter((candidate) => String(candidate?.status || "").toUpperCase() !== "DRAFT")
      .sort((a, b) => {
        const dateA = new Date(getCandidateTime(a)).getTime();
        const dateB = new Date(getCandidateTime(b)).getTime();

        if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
          return dateB - dateA;
        }

        return String(getCandidateTime(b)).localeCompare(String(getCandidateTime(a)));
      });
  }, [items]);

  const totalRecords = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

  const handleRecordsPerPageChange = (event) => {
    setRecordsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  const handleVerifyUan = async (candidate) => {
    if (!candidate?.uan) {
      alert("UAN number is not available for this candidate.");
      return;
    }

    if (!/^\d{12}$/.test(String(candidate.uan))) {
      alert("UAN number must be exactly 12 digits before HR verification.");
      return;
    }

    try {
      await verifyCandidateUan(candidate.id);
      alert("UAN verified successfully by HR.");
      await loadCandidates();
    } catch (err) {
      alert(err?.message || "Unable to verify UAN.");
    }
  };

  const isExperienced = (candidate) =>
    String(candidate?.candidateType || "").toUpperCase().includes("EXPER");

  const formatLabel = (value = "") =>
    String(value)
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const statusClass = (status = "Pending") => {
    const value = String(status).toLowerCase();
    if (value.includes("reject")) return "rejected";
    if (value.includes("approv") || (value.includes("verif") && !value.includes("pending"))) return "approved";
    return "pending";
  };

  return (
    <div className="app">
      <Sidebar />

      <main className="content">
        <h1>Verification Requests</h1>
        <p className="muted">Applications Submitted By Candidates for HR/Admin Review.</p>

        {loading && <div className="vx-feedback">Loading Verification Requests...</div>}

        {!loading && error && (
          <div className="vx-feedback error">
            <strong>Unable to load verification requests:</strong> {error}
            <button type="button" className="btn small" onClick={loadCandidates}>
              Retry
            </button>
          </div>
        )}

        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Type</th>
                  <th>Documents</th>
                  <th>UAN Verification</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>

              <tbody>
                {!loading && paginatedItems.length ? (
                  paginatedItems.map((candidate) => (
                    <tr key={candidate.id}>
                      <td>
                        {candidate.fullName || candidate.name || "Candidate"}
                        <br />
                        <small>{candidate.email || "Email not available"}</small>
                      </td>
                      <td>{isExperienced(candidate) ? "Experienced" : "Fresher"}</td>
                      <td>{Array.isArray(candidate.documents) ? candidate.documents.length : 0}</td>
                      <td>
                        {isExperienced(candidate) ? (
                          <div className="uan-review-cell">
                            <small>{candidate.uan || "UAN not provided"}</small>
                            {candidate.uanVerified ? (
                              <span className="doc-status-pill verified">Verified by HR</span>
                            ) : (
                              <>
                                <span className="doc-status-pill pending">Pending HR Verification</span>
                                <button
                                  type="button"
                                  className="btn success small"
                                  onClick={() => handleVerifyUan(candidate)}
                                >
                                  Verify UAN
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="muted">Not required</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${statusClass(candidate.status)}`}>{formatLabel(candidate.status || "Pending")}</span>
                      </td>
                      <td>
                        {candidate.localApplication ? (
                          <button className="btn small primary" type="button" onClick={() => { updateSubmittedApplication(candidate.identity, { hrExtractionStatus: 'EXTRACTING', hrOpenedAt: new Date().toISOString() }); setLocalReview({ ...candidate, hrExtractionStatus: 'EXTRACTING' }); }}>Extract & Review</button>
                        ) : (
                          <Link className="btn small primary" to={`/employees/${candidate.id}`}>Open</Link>
                        )}
                      </td>
                    </tr>
                  ))
                ) : !loading ? (
                  <tr>
                    <td colSpan="6" className="empty">
                      {error ? "Verification requests could not be loaded." : "No verification requests yet."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {!loading && totalRecords > 0 && (
            <div className="vx-pagination">
              <div className="vx-pagination-info">
                Showing <b>{startIndex + 1}</b> - <b>{Math.min(endIndex, totalRecords)}</b> of{" "}
                <b>{totalRecords}</b> requests
              </div>

              <div className="vx-pagination-actions">
                <select value={recordsPerPage} onChange={handleRecordsPerPageChange}>
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>

                <button onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}>
                  First
                </button>
                <button
                  onClick={() => setCurrentPage((previous) => Math.max(previous - 1, 1))}
                  disabled={safeCurrentPage === 1}
                >
                  Previous
                </button>
                <span>
                  Page {safeCurrentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((previous) => Math.min(previous + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
      {localReview && <div className="application-modal-backdrop" onClick={() => setLocalReview(null)}><section className="application-modal" onClick={(e)=>e.stopPropagation()}><header><div><span>HR EXTRACTION VIEW</span><h2>{localReview.applicationId}</h2></div><button onClick={()=>setLocalReview(null)}>×</button></header><div className="application-modal-body"><div className="app-summary-block"><h4>Candidate & Application</h4><div className="app-summary-grid"><div><small>Name</small><b>{localReview.fullName}</b></div><div><small>Email</small><b>{localReview.email}</b></div><div><small>Applied Role</small><b>{localReview.appliedRole || '—'}</b></div><div><small>Type</small><b>{localReview.candidateType}</b></div><div><small>Submitted</small><b>{localReview.submittedAt ? new Date(localReview.submittedAt).toLocaleString() : '—'}</b></div><div><small>Extraction</small><b>Ready / Opened by HR</b></div></div></div><div className="app-summary-block"><h4>Skills & Tools Extract</h4><div className="app-summary-grid"><div><small>Technical Skills</small><b>{(localReview.skills || []).join(', ') || '—'}</b></div><div><small>Tools / Platforms</small><b>{(localReview.tools || []).join(', ') || '—'}</b></div></div></div><div className="app-summary-block"><h4>Education Extract</h4><div className="app-summary-grid">{[['10th',localReview.tenth],['12th',localReview.twelfth],['Degree',localReview.degree],['Master',localReview.master]].map(([label,d])=>d && <div key={label}><small>{label}</small><b>{d.institution || d.degree || 'Not provided'}</b><small>{d.boardUniversity || ''} {d.percentage ? `• ${d.percentage}` : ''}</small></div>)}</div></div><div className="app-summary-block"><h4>Identity & Employment Extract</h4><div className="app-summary-grid"><div><small>PAN</small><b>{localReview.panNumber || '—'}</b></div><div><small>Aadhaar</small><b>{localReview.aadhaarNumber || '—'}</b></div><div><small>UAN</small><b>{localReview.uanNumber || '—'}</b></div><div><small>Status</small><b>{String(localReview.employmentStatus || '').replaceAll('_',' ') || 'Fresher'}</b></div><div><small>Current Employer</small><b>{localReview.currentEmployer || '—'}</b></div><div><small>Previous Employer</small><b>{localReview.previousEmployer || '—'}</b></div></div></div><div className="app-summary-block"><h4>Submitted Documents</h4><div className="modal-doc-grid">{Object.entries(localReview.requiredDocuments || {}).map(([name,info])=><div className={info?.verificationStatus === 'VERIFIED' ? 'uploaded' : 'missing'} key={name}><span>{info?.verificationStatus === 'VERIFIED' ? '✓' : '!'}</span><div><b>{name}</b><small>{info?.fileName || 'Uploaded'} • {info?.verificationStatus === 'VERIFIED' ? 'Automatic pre-check passed' : 'Needs HR review'}</small></div></div>)}</div></div></div><footer><button className="btn primary" onClick={()=>{ updateSubmittedApplication(localReview.identity,{hrExtractionStatus:'EXTRACTED',status:'PENDING_VERIFICATION',extractedAt:new Date().toISOString()}); sendStatusMail(localReview, 'PENDING VERIFICATION', 'HR extracted your submitted application and documents. Verification is now in progress.').catch(()=>{}); setLocalReview(null); loadCandidates(); }}>Mark Extraction Complete</button></footer></section></div>}
    </div>
  );
}
