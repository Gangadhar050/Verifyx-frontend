import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { allCandidates, deleteCandidate } from "../services/employeeService";

export default function EmployeeList() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);


  const loadCandidates = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await allCandidates();
      setItems(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error("Unable to load candidates", err);
      setItems([]);
      setError(err?.message || "Unable to load candidates from the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const candidateSkills = (candidate) => {
    if (Array.isArray(candidate?.skills)) return candidate.skills;
    if (typeof candidate?.skills === "string") {
      return candidate.skills.split(",").map((skill) => skill.trim()).filter(Boolean);
    }
    return [];
  };

  const getCandidateTime = (c) =>
    c.createdAt || c.appliedAt || c.updatedAt || c.submittedAt || c.id || "";

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const dateA = new Date(getCandidateTime(a)).getTime();
      const dateB = new Date(getCandidateTime(b)).getTime();

      if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
        return dateB - dateA;
      }

      return String(getCandidateTime(b)).localeCompare(
        String(getCandidateTime(a))
      );
    });
  }, [items]);

  const filtered = useMemo(() => {
    const search = q.toLowerCase().trim();

    return sortedItems.filter((c) =>
      `${c.fullName || c.name || ""} ${c.email || ""} ${c.phone || ""} ${
        c.id || ""
      } ${candidateSkills(c).join(" ")}`
        .toLowerCase()
        .includes(search)
    );
  }, [sortedItems, q]);

  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedCandidates = filtered.slice(startIndex, endIndex);

  const del = async (id) => {
    if (confirm("Delete this candidate?")) {
      try {
        await deleteCandidate(id);
        await loadCandidates();
        setCurrentPage(1);
      } catch (err) {
        alert(err?.message || "Unable to delete candidate.");
      }
    }
  };


  const handleSearchChange = (e) => {
    setQ(e.target.value);
    setCurrentPage(1);
  };

  const handleRecordsPerPageChange = (e) => {
    setRecordsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const formatLabel = (value = "") =>
    String(value)
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const statusClass = (status = "Pending") => {
    const value = String(status).toLowerCase();
    if (value.includes("reject")) return "rejected";
    if (value.includes("approv") || value.includes("verif") && !value.includes("pending")) return "approved";
    return "pending";
  };

  const initial = (name = "Candidate") => name.charAt(0).toUpperCase();

  return (
    <div className="app">
      <Sidebar />

      <main className="content">
        <div className="vx-page-header">
          <div>
            <span className="eyebrow">Candidate Workspace</span>
            <h1>Candidate Management</h1>
            <p>Search, Review and Manage All Candidate Applications.</p>
          </div>

          <Link className="btn primary" to="/add-employee">
            + Add Candidate
          </Link>
        </div>

        <div className="vx-toolbar">
          <div className="vx-search">
            <span>⌕</span>
            <input
              placeholder="Search by Name, Email, Phone, Application ID or Skill"
              value={q}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {loading && <div className="vx-feedback">Loading candidates...</div>}
        {!loading && error && (
          <div className="vx-feedback error">
            <strong>Unable to load candidates:</strong> {error}
            <button type="button" className="btn small" onClick={loadCandidates}>Retry</button>
          </div>
        )}

        <section className="vx-table-card">
          <div className="table-wrap">
            <table className="vx-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Skills</th>
                  <th>UAN</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedCandidates.length ? (
                  paginatedCandidates.map((c) => {
                    const name = c.fullName || c.name || "Candidate";

                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="vx-candidate-cell">
                            <div className="vx-avatar">{initial(name)}</div>
                            <div>
                              <strong>{name}</strong>
                              <small>{c.email || "No email"}</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="vx-phone">{c.phone || "-"}</span>
                        </td>

                        <td>
                          <span className="vx-type">
                            {formatLabel(c.candidateType || "-")}
                          </span>
                        </td>

                        <td>
                          <div className="skill-tags-small">
                            {candidateSkills(c).slice(0, 3).map((skill) => (
                              <span key={skill}>{skill}</span>
                            ))}
                            {candidateSkills(c).length > 3 && <small>+{candidateSkills(c).length - 3}</small>}
                            {!candidateSkills(c).length && <span>-</span>}
                          </div>
                        </td>

                        <td>
                          {String(c.candidateType || "").toUpperCase() === "EXPERIENCED" ? (
                            <div className="uan-review-cell">
                              <small>{c.uan || "UAN not provided"}</small>
                              {c.uan && <span className={`doc-status-pill ${c.uanVerified || String(c.uanVerificationStatus || '').toUpperCase() === 'VERIFIED' ? 'verified' : 'pending'}`}>{c.uanVerified || String(c.uanVerificationStatus || '').toUpperCase() === 'VERIFIED' ? 'Verified' : formatLabel(c.uanVerificationStatus || 'Pending')}</span>}
                            </div>
                          ) : (
                            <span className="muted">Not required</span>
                          )}
                        </td>

                        <td>
                          <span className={`vx-status ${statusClass(c.status)}`}>
                            {formatLabel(c.status || "Pending")}
                          </span>
                        </td>

                        <td>
                          <div className="vx-actions">
                            <Link className="vx-icon-btn view" title="View candidate" aria-label="View candidate" to={`/employees/${c.id}`}>
                              👁
                            </Link>
                            <Link className="vx-icon-btn edit" title="Edit candidate" aria-label="Edit candidate" to={`/employees/${c.id}/edit`}>
                              ✎
                            </Link>
                            <button
                              className="vx-icon-btn delete"
                              title="Delete candidate"
                              aria-label="Delete candidate"
                              onClick={() => del(c.id)}
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="empty">
                      No candidates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="vx-pagination">
            <div className="vx-pagination-info">
              Showing{" "}
              <b>{totalRecords === 0 ? 0 : startIndex + 1}</b> -{" "}
              <b>{Math.min(endIndex, totalRecords)}</b> of{" "}
              <b>{totalRecords}</b> candidates
            </div>

            <div className="vx-pagination-actions">
              <select
                value={recordsPerPage}
                onChange={handleRecordsPerPageChange}
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>

              <button
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
              >
                First
              </button>

              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage === 1}
              >
                Previous
              </button>

              <span>
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
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
        </section>
      </main>
    </div>
  );
}