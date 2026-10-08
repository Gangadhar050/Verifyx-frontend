import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import useAuth from "../hooks/useAuth";
import {
  allCandidates,
  findCandidate,
  updateCandidate,
  getDocumentReviewSummary,
  rejectCandidateDocument,
  uploadCandidateDocument,
  verifyCandidateDocument,
  openCandidateDocument,
  DOC_STATUS,
} from "../services/employeeService";

const FRESHER_DOCUMENTS = ["Resume", "Aadhaar Card", "PAN Card"];
const CURRENT_EMPLOYEE_DOCUMENTS = ["Resume", "Aadhaar Card", "PAN Card", "Offer Letter", "Last Month Salary Slip", "UAN Proof"];
const NOT_WORKING_DOCUMENTS = ["Resume", "Aadhaar Card", "PAN Card", "Experience Letter", "Relieving Letter", "Last Month Salary Slip", "UAN Proof"];

const DOCUMENT_RULES = {
  Resume: { accept: ".pdf,.doc,.docx", label: "PDF, DOC or DOCX", maxMb: 5 },
  "PAN Card": { accept: ".pdf,.png,.jpg,.jpeg", label: "PDF, JPG or PNG", maxMb: 5 },
  "Aadhaar Card": { accept: ".pdf,.png,.jpg,.jpeg", label: "PDF, JPG or PNG", maxMb: 5 },
  "Offer Letter": { accept: ".pdf", label: "PDF only", maxMb: 5 },
  "Last Month Salary Slip": { accept: ".pdf", label: "PDF only", maxMb: 5 },
  "Relieving Letter": { accept: ".pdf", label: "PDF only", maxMb: 5 },
  "Experience Letter": { accept: ".pdf", label: "PDF only", maxMb: 5 },
  "UAN Proof": { accept: ".pdf,.png,.jpg,.jpeg", label: "PDF, JPG or PNG", maxMb: 5 },
};

function getDocumentRule(name) {
  return DOCUMENT_RULES[name] || { accept: ".pdf", label: "PDF only", maxMb: 5 };
}

function getMissingDocuments(candidate) {
  const required = getRequiredDocuments(candidate);
  const uploaded = candidate?.documents || [];
  return required.filter((name) => !uploaded.some((doc) => doc.name === name));
}

function isAcceptedFile(file, rule) {
  const extension = `.${String(file.name || "").split(".").pop().toLowerCase()}`;
  const allowed = rule.accept.split(",").map((item) => item.trim().toLowerCase());
  return allowed.includes(extension);
}



function getCandidateTime(candidate) {
  return (
    candidate.submittedAt ||
    candidate.updatedAt ||
    candidate.createdAt ||
    candidate.appliedAt ||
    candidate.id ||
    ""
  );
}

function getRequiredDocuments(candidate) {
  const experienced = String(candidate?.candidateType || "").toUpperCase().includes("EXPER");
  if (!experienced) return FRESHER_DOCUMENTS;
  const status = String(candidate?.employmentStatus || "").toUpperCase();
  const currentlyWorking = ["CURRENTLY_WORKING", "CURRENTLY_EMPLOYED"].includes(status) || String(candidate?.currentlyEmployed || "").toUpperCase() === "YES";
  return currentlyWorking ? CURRENT_EMPLOYEE_DOCUMENTS : NOT_WORKING_DOCUMENTS;
}

function getDocStatus(doc) {
  return doc?.status || (doc?.verified ? DOC_STATUS.VERIFIED : DOC_STATUS.PENDING);
}

function getStatusLabel(status) {
  if (status === DOC_STATUS.VERIFIED) return "Verified";
  if (status === DOC_STATUS.REJECTED) return "Rejected";
  return "Pending Review";
}

export default function DocumentUpload({ mode = "admin" }) {
  const { session } = useAuth();
  const [c, setC] = useState(null);
  const [candidateItems, setCandidateItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);

  const refreshCandidates = async () => {
    try {
      setError("");
      const items = await allCandidates();
      setCandidateItems(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err.message || "Unable To Load Candidates.");
      setCandidateItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (mode === "candidate") {
          if (!session?.id) throw new Error("Candidate Session Was Not Found. Please Login Again.");
          const candidate = await findCandidate(session.id);
          if (active) setC(candidate || null);
        } else {
          const items = await allCandidates();
          if (active) setCandidateItems(Array.isArray(items) ? items : []);
        }
      } catch (err) {
        if (active) setError(err.message || "Unable To Load Documents.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [mode, session?.id]);

  useEffect(() => {
    if (mode !== "candidate" || !c) return;
    const missing = getMissingDocuments(c);
    if (!missing.length) return;

    const alertKey = `verifyx-missing-docs-${c.id}-${missing.join("|")}`;
    if (localStorage.getItem(alertKey)) return;
    localStorage.setItem(alertKey, "shown");
    alert(
      `Document Alert: Please Upload The Following Required Documents:

• ${missing.join("\n• ")}`
    );
  }, [mode, c]);

  const candidates = useMemo(() => {
    return [...candidateItems].sort((a, b) => {
      const dateA = new Date(getCandidateTime(a)).getTime();
      const dateB = new Date(getCandidateTime(b)).getTime();

      if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) return dateB - dateA;

      return String(getCandidateTime(b)).localeCompare(String(getCandidateTime(a)));
    });
  }, [candidateItems]);

  const totalRecords = candidates.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedCandidates = candidates.slice(startIndex, endIndex);

  const handleRecordsPerPageChange = (e) => {
    setRecordsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const addDoc = async (name, file) => {
    if (!file || !c) return;

    const rule = getDocumentRule(name);
    if (!isAcceptedFile(file, rule)) {
      alert(`${name} Accepts ${rule.label} Only. Please Select The Required File Format.`);
      return;
    }

    if (file.size > rule.maxMb * 1024 * 1024) {
      alert(`${name} Must Be ${rule.maxMb} MB or Smaller.`);
      return;
    }

    const existingDoc = (c.documents || []).find((d) => d.name === name);
    const existingStatus = getDocStatus(existingDoc);

    if (existingStatus === DOC_STATUS.VERIFIED) {
      alert("This Document Is Already Verified By HR. You Cannot Re-Upload It.");
      return;
    }

    if (existingDoc && existingStatus !== DOC_STATUS.REJECTED) {
      const confirmReplace = window.confirm(
        "This Document Is Already Uploaded And Pending Review. Do You Want To Replace It?"
      );
      if (!confirmReplace) return;
    }

    try {
      setError("");
      const documents = await uploadCandidateDocument(c.id, {
        name,
        file,
        reUpload: existingStatus === DOC_STATUS.REJECTED,
      });
      setC((current) => ({ ...current, documents }));
      alert(`${name} Uploaded Successfully.`);
    } catch (err) {
      setError(err.message || `Unable To Upload ${name}.`);
      alert(err.message || `Unable To Upload ${name}.`);
    }
  };

  const submitDocuments = async () => {
    if (!c) return;

    const requiredDocs = getRequiredDocuments(c);
    const uploadedDocs = c.documents || [];

    const missingDocs = requiredDocs.filter(
      (docName) => !uploadedDocs.some((doc) => doc.name === docName)
    );

    if (missingDocs.length > 0) {
      const confirmSubmit = window.confirm(
        `Some Required Documents Are Missing:\n\n${missingDocs.join(
          "\n"
        )}\n\nDo You Still Want To Submit?`
      );

      if (!confirmSubmit) return;
    }

    try {
      const updatedCandidate = await updateCandidate(c.id, {
        ...c,
        profileStep: 5,
        status: "Pending Verification",
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setC((current) => ({ ...current, ...updatedCandidate, documents: current.documents }));
      alert("Documents Submitted Successfully To HR/Admin.");
    } catch (err) {
      setError(err.message || "Unable To Submit ocuments.");
      alert(err.message || "Unable To Submit Documents.");
    }
  };

  const renderUploadCard = (name) => {
    const found = (c.documents || []).find((d) => d.name === name);
    const rule = getDocumentRule(name);
    const status = found ? getDocStatus(found) : "NOT_UPLOADED";
    const isVerified = status === DOC_STATUS.VERIFIED;
    const isRejected = status === DOC_STATUS.REJECTED;

    return (
      <label
        className={`upload-card ${found ? "uploaded" : ""} ${isVerified ? "locked" : ""} ${isRejected ? "rejected" : ""}`}
        key={name}
      >
        <div className="upload-icon">
          {isVerified ? "✅" : isRejected ? "❌" : found ? "⏳" : "📄"}
        </div>

        <div className="upload-info">
          <h3>{name}</h3>
          <p>
            {found ? `Uploaded: ${found.fileName}` : `${rule.label} • Maximum ${rule.maxMb} MB`}
          </p>

          {found && (
            <>
              <span className={`doc-status-pill ${String(status).toLowerCase()}`}>
                {getStatusLabel(status)}
              </span>
              {found.id && (
                <button
                  type="button"
                  className="doc-view-link"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                      await openCandidateDocument(found);
                    } catch (err) {
                      alert(err.message || "Unable To Open Document.");
                    }
                  }}
                >
                  View Uploaded File
                </button>
              )}
            </>
          )}

          {isRejected && found.rejectionReason && (
            <p className="doc-reject-reason">
              <b>Reason:</b> {found.rejectionReason}
            </p>
          )}

          {isVerified && (
            <p className="muted small-text">Verified Documents Are Locked.</p>
          )}
        </div>

        {!isVerified && (
          <input
            type="file"
            accept={rule.accept}
            onChange={(e) => addDoc(name, e.target.files?.[0])}
          />
        )}
      </label>
    );
  };

  const handleVerifyDocument = async (candidateId, doc) => {
    try {
      await verifyCandidateDocument(candidateId, doc);
      await refreshCandidates();
      alert(`${doc.name || doc.documentType} Verified Successfully.`);
    } catch (err) {
      alert(err.message || "Unable To Verify Document.");
    }
  };

  const handleRejectDocument = async (candidateId, doc) => {
    const docName = doc.name || doc.documentType;
    const reason = window.prompt(`Enter Rejection Reason For ${docName}:`);
    if (reason === null) return;

    if (!reason.trim()) {
      alert("Please Enter A Rejection Reason.");
      return;
    }

    try {
      await rejectCandidateDocument(candidateId, doc, reason.trim());
      await refreshCandidates();
      alert(`${docName} Rejected. Candidate Can Re-Upload Only This Document.`);
    } catch (err) {
      alert(err.message || "Unable To Reject Document.");
    }
  };

  if (mode === "candidate") {
    const docs = c ? getRequiredDocuments(c) : [];
    const uploadedCount = docs.filter((name) =>
      (c?.documents || []).some((doc) => doc.name === name)
    ).length;

    return (
      <div className="app">
        <Sidebar type="CANDIDATE" />

        <main className="content">
          <div className="page-header">
            <button type="button" className="back-btn" onClick={() => window.history.back()}>
              ← Back
            </button>

            <div>
              <h1>Upload Documents</h1>
              <p className="muted">
                Upload The Documents Required For Candidate Verification.
              </p>
            </div>
          </div>

          {loading ? (
            <section className="panel">Loading Candidate Documents...</section>
          ) : error ? (
            <section className="panel"><b>Unable To Load Documents:</b> {error}</section>
          ) : !c ? (
            <section className="panel">Candidate Not Found. Please Login Again.</section>
          ) : (
            <section className="panel document-panel">
              <div className="document-panel-header">
                <div>
                  <h2>
                    {String(c.candidateType).toUpperCase().includes("EXPER")
                      ? "Experienced Candidate Documents"
                      : "Fresher Candidate Documents"}
                  </h2>
                  <p className="muted">
                    {uploadedCount} Of {docs.length} Documents Uploaded
                  </p>
                </div>

                <span className="document-status-badge">{c.status || "Draft"}</span>
              </div>

              <div className="employment-summary-card">
                <p>
                  <b>Document Re-Upload Rule:</b> Only Documents Rejected By HR Can Be Re-Uploaded. Verified Documents Are Locked.
                </p>
              </div>

              {getMissingDocuments(c).length > 0 && (
                <div className="missing-document-alert" role="alert">
                  <strong>⚠ Missing Required Documents</strong>
                  <p>Please Upload These Files Before Submission:</p>
                  <ul>{getMissingDocuments(c).map((name) => <li key={name}>{name}</li>)}</ul>
                </div>
              )}

              {String(c.candidateType).toUpperCase().includes("EXPER") && (
                <div className="employment-summary-card">
                  <p>
                    <b>Main Verification Document:</b> Offer Letter
                  </p>
                  <p className="muted">
                    Required Files Are Selected Automatically From The Candidate's Employment Status. Currently Working Candidates Provide Current-Employment Proof; Candidates Who Are Not Working Provide Previous-Employment And Exit Documents.
                  </p>
                </div>
              )}

              <div className="doc-section">
                <div className="doc-section-header">
                  <div>
                    <h3>Required Documents</h3>
                    <p className="muted">Upload Clear PDF, JPG, Or PNG Files.</p>
                  </div>
                </div>

                <div className="doc-grid">{docs.map(renderUploadCard)}</div>
              </div>

              <div className="document-actions">
                <button type="button" className="primary-btn" onClick={submitDocuments}>
                  Submit Documents
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar />

      <main className="content">
        <div className="page-header">
          <button type="button" className="back-btn" onClick={() => window.history.back()}>
            ← Back
          </button>

          <div>
            <h1>Uploaded Candidate Documents</h1>
            <p className="muted">
              HR Can Verify Correct Documents Or Reject Incorrect Documents With A Reason.
            </p>
          </div>
        </div>

        {loading ? (
          <section className="panel">Loading Candidate Documents...</section>
        ) : error ? (
          <section className="panel"><b>Unable To Load Documents:</b> {error}</section>
        ) : totalRecords === 0 ? (
          <section className="panel empty">No Candidate Documents Uploaded Yet.</section>
        ) : (
          <>
            {paginatedCandidates.map((candidate) => {
              const summary = getDocumentReviewSummary(candidate.documents || []);

              return (
                <section className="panel" key={candidate.id}>
                  <div className="candidate-doc-header">
                    <div>
                      <h2>{candidate.fullName || "Candidate"}</h2>
                      <p className="muted">{candidate.email}</p>
                    </div>

                    <div className="doc-summary-pills">
                      <span className="doc-status-pill verified">Verified: {summary.verified}</span>
                      <span className="doc-status-pill pending">Pending: {summary.pending}</span>
                      <span className="doc-status-pill rejected">Rejected: {summary.rejected}</span>
                    </div>
                  </div>

                  <div className="details">
                    <p><b>Application ID:</b> {candidate.id}</p>
                    <p><b>Type:</b> {candidate.candidateType}</p>
                    <p><b>Status:</b> {candidate.status}</p>
                    <p><b>PAN:</b> {candidate.pan || "-"}</p>
                    <p><b>UAN:</b> {candidate.uan || "-"}</p>
                    <p><b>Holding Offer Letter:</b> {candidate.holdingOfferLetter || "No"}</p>
                  </div>

                  {getMissingDocuments(candidate).length > 0 && (
                    <div className="missing-document-alert" role="alert">
                      <strong>⚠ Candidate Has Missing Documents</strong>
                      <p>{getMissingDocuments(candidate).join(", ")}</p>
                    </div>
                  )}

                  <h3>Documents</h3>

                  {candidate.documents?.length > 0 ? (
                    <div className="doc-review-list">
                      {candidate.documents.map((doc) => {
                        const status = getDocStatus(doc);
                        const isVerified = status === DOC_STATUS.VERIFIED;
                        const isRejected = status === DOC_STATUS.REJECTED;

                        return (
                          <div className="doc-review-card" key={doc.name}>
                            <div>
                              <h4>{doc.name}</h4>
                              <p className="muted">{doc.fileName}</p>
                              <span className={`doc-status-pill ${String(status).toLowerCase()}`}>
                                {getStatusLabel(status)}
                              </span>
                              {isRejected && doc.rejectionReason && (
                                <p className="doc-reject-reason"><b>Reason:</b> {doc.rejectionReason}</p>
                              )}
                              {isVerified && doc.verifiedAt && (
                                <p className="muted small-text">Verified By {doc.verifiedBy || "HR"} On {new Date(doc.verifiedAt).toLocaleString()}</p>
                              )}
                            </div>

                            <div className="doc-review-actions">
                              <button className="btn" type="button" onClick={() => openCandidateDocument(doc).catch((err) => alert(err.message || "Unable To Open Document."))}>View</button>
                              {!isVerified && (
                                <button className="btn success" onClick={() => handleVerifyDocument(candidate.id, doc)}>
                                  Verify
                                </button>
                              )}
                              {!isRejected && (
                                <button className="btn danger" onClick={() => handleRejectDocument(candidate.id, doc)}>
                                  Reject
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="muted">No Documents Uploaded.</p>
                  )}
                </section>
              );
            })}

            <div className="vx-pagination">
              <div className="vx-pagination-info">
                Showing <b>{startIndex + 1}</b> - <b>{Math.min(endIndex, totalRecords)}</b> of <b>{totalRecords}</b> candidates
              </div>

              <div className="vx-pagination-actions">
                <select value={recordsPerPage} onChange={handleRecordsPerPageChange}>
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>

                <button onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}>First</button>
                <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={safeCurrentPage === 1}>Previous</button>
                <span>Page {safeCurrentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={safeCurrentPage === totalPages}>Next</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages}>Last</button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
