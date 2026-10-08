import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { allCandidates, isSubmittedCandidate } from "../services/employeeService";
import { buildCandidateSummary } from "../services/reportService";
import "./DashboardPro.css";

const displayValue = (value='') => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const EMPTY_REPORT = { total: 0, verified: 0, rejected: 0, approved: 0, freshers: 0, experienced: 0 };

const isDemoRecord = (record = {}) => {
  const email = String(record.email || record.identity || '').trim().toLowerCase();
  const id = String(record.id || record.candidateId || record.applicationId || record.identity || '').trim().toLowerCase();
  const name = String(record.fullName || record.name || record.candidateName || '').trim().toLowerCase();
  return email.endsWith('@verifyx.test') || email.startsWith('demo.') || id.startsWith('demo') || name.startsWith('demo ');
};

const normalizeCandidates = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.candidates)) return response.candidates;
  return [];
};


export default function Reports() {
  const [report, setReport] = useState(EMPTY_REPORT);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const candidateResponse = await allCandidates();
      const candidateRows = normalizeCandidates(candidateResponse)
        .filter(isSubmittedCandidate)
        .filter((candidate) => !isDemoRecord(candidate));
      setCandidates(candidateRows);
      setReport(buildCandidateSummary(candidateRows));
    } catch (err) {
      console.error("Unable to load reports:", err);
      setCandidates([]);
      setReport(EMPTY_REPORT);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Unable to load reports. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const getCandidateTime = (candidate) =>
    candidate.submittedAt ||
    candidate.updatedAt ||
    candidate.createdAt ||
    candidate.appliedAt ||
    candidate.id ||
    "";

  const rows = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const dateA = new Date(getCandidateTime(a)).getTime();
      const dateB = new Date(getCandidateTime(b)).getTime();

      if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
        return dateB - dateA;
      }

      return String(getCandidateTime(b)).localeCompare(
        String(getCandidateTime(a))
      );
    });
  }, [candidates]);

  const totalRecords = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRows = rows.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const reportHeaders = ["ID", "Name", "Email", "Phone", "Type", "Status", "Role"];

  const reportRows = useMemo(
    () =>
      rows.map((candidate, index) => [
        Number.isFinite(Number(candidate.candidateId))
          ? Number(candidate.candidateId)
          : index + 1,
        candidate.fullName || candidate.name || "",
        candidate.email || "",
        candidate.phone || "",
        candidate.candidateType || "",
        candidate.status || candidate.verificationStatus || "PENDING",
        candidate.appliedRole ? displayValue(candidate.appliedRole) : "",
      ]),
    [rows]
  );

  const ensureExportRows = () => {
    if (!reportRows.length) {
      window.alert("No report records are available to export.");
      return false;
    }
    return true;
  };

  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (!ensureExportRows()) return;

    const csv = [
      reportHeaders.join(","),
      ...reportRows.map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");

    downloadBlob(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
      "verify-x-report.csv"
    );
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const exportExcel = () => {
    if (!ensureExportRows()) return;

    const tableHeader = reportHeaders
      .map((header) => `<th>${escapeHtml(header)}</th>`)
      .join("");
    const tableRows = reportRows
      .map(
        (row) =>
          `<tr>${row
            .map((value) => `<td>${escapeHtml(value)}</td>`)
            .join("")}</tr>`
      )
      .join("");

    const excelDocument = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"><style>table{border-collapse:collapse;font-family:Arial,sans-serif}th,td{border:1px solid #b7c2d0;padding:8px;text-align:left}th{font-weight:700;background:#eef3f8}</style></head>
<body><table><thead><tr>${tableHeader}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;

    downloadBlob(
      new Blob(["\uFEFF", excelDocument], {
        type: "application/vnd.ms-excel;charset=utf-8",
      }),
      "verify-x-report.xls"
    );
  };

  const pdfEscape = (value) =>
    String(value ?? "")
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "?")
      .replaceAll("\\", "\\\\")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)");

  const exportPdf = () => {
    if (!ensureExportRows()) return;

    const pageWidth = 842;
    const pageHeight = 595;
    const margin = 34;
    const rowHeight = 18;
    const titleHeight = 36;
    const maxRowsPerPage = Math.max(1, Math.floor((pageHeight - margin * 2 - titleHeight - rowHeight) / rowHeight));
    const columnWidths = [42, 125, 175, 82, 78, 105, 115];
    const pages = [];

    for (let start = 0; start < reportRows.length; start += maxRowsPerPage) {
      const pageRows = reportRows.slice(start, start + maxRowsPerPage);
      const commands = [];
      let y = pageHeight - margin;

      commands.push("BT /F1 16 Tf");
      commands.push(`${margin} ${y} Td (${pdfEscape("Verify-X Candidate Report")}) Tj ET`);
      y -= 26;

      let x = margin;
      reportHeaders.forEach((header, index) => {
        commands.push(`BT /F1 8 Tf ${x + 3} ${y - 12} Td (${pdfEscape(header)}) Tj ET`);
        x += columnWidths[index];
      });

      commands.push("0.8 w");
      const tableTop = y;
      const tableBottom = y - rowHeight * (pageRows.length + 1);
      const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
      for (let r = 0; r <= pageRows.length + 1; r += 1) {
        const lineY = tableTop - r * rowHeight;
        commands.push(`${margin} ${lineY} m ${margin + tableWidth} ${lineY} l S`);
      }
      x = margin;
      commands.push(`${x} ${tableTop} m ${x} ${tableBottom} l S`);
      columnWidths.forEach((width) => {
        x += width;
        commands.push(`${x} ${tableTop} m ${x} ${tableBottom} l S`);
      });

      pageRows.forEach((row, rowIndex) => {
        let cellX = margin;
        const textY = tableTop - rowHeight * (rowIndex + 1) - 12;
        row.forEach((value, columnIndex) => {
          const maxChars = Math.max(4, Math.floor((columnWidths[columnIndex] - 8) / 4.1));
          const textValue = String(value ?? "");
          const clipped = textValue.length > maxChars ? `${textValue.slice(0, maxChars - 3)}...` : textValue;
          commands.push(`BT /F1 7 Tf ${cellX + 3} ${textY} Td (${pdfEscape(clipped)}) Tj ET`);
          cellX += columnWidths[columnIndex];
        });
      });

      pages.push(commands.join("\n"));
    }

    const objects = [];
    const addObject = (content) => {
      objects.push(content);
      return objects.length;
    };

    const catalogId = addObject("");
    const pagesId = addObject("");
    const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const pageIds = [];

    pages.forEach((stream) => {
      const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      const pageId = addObject(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
      );
      pageIds.push(pageId);
    });

    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let index = 1; index <= objects.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    downloadBlob(
      new Blob([pdf], { type: "application/pdf" }),
      "verify-x-report.pdf"
    );
  };

  const handleRecordsPerPageChange = (event) => {
    setRecordsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="app hr-reports-app">
      <Sidebar />

      <main className="content">
        <div className="page-head">
          <div>
            <h1>Reports</h1>
            <p className="muted">Verification Report and Export.</p>
          </div>

          <div style={{ position: "relative" }}>
            <button
              className="btn primary"
              onClick={() => setExportMenuOpen((open) => !open)}
              disabled={loading}
              aria-haspopup="menu"
              aria-expanded={exportMenuOpen}
            >
              Export Report ▾
            </button>

            {exportMenuOpen && (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  minWidth: "170px",
                  background: "#fff",
                  border: "1px solid #d9e0e8",
                  borderRadius: "8px",
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.14)",
                  padding: "6px",
                  zIndex: 20,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    exportPdf();
                    setExportMenuOpen(false);
                  }}
                  style={{ width: "100%", padding: "9px 12px", textAlign: "left", border: 0, background: "transparent", cursor: "pointer", borderRadius: "6px" }}
                >
                  PDF
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    exportExcel();
                    setExportMenuOpen(false);
                  }}
                  style={{ width: "100%", padding: "9px 12px", textAlign: "left", border: 0, background: "transparent", cursor: "pointer", borderRadius: "6px" }}
                >
                  Excel
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    exportCsv();
                    setExportMenuOpen(false);
                  }}
                  style={{ width: "100%", padding: "9px 12px", textAlign: "left", border: 0, background: "transparent", cursor: "pointer", borderRadius: "6px" }}
                >
                  CSV
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <section className="panel">
            <p className="empty">{error}</p>
            <button className="btn primary" onClick={loadReports}>
              Retry
            </button>
          </section>
        )}

        <section className="hr-summary-grid" aria-label="Candidate status summary">
          <article className="hr-summary-card total"><span className="hr-summary-icon">👥</span><div><small>Total Candidates</small><strong>{loading ? "…" : report.total ?? 0}</strong></div></article>
          <article className="hr-summary-card verified"><span className="hr-summary-icon">✅</span><div><small>Verified</small><strong>{loading ? "…" : report.verified ?? 0}</strong></div></article>
          <article className="hr-summary-card rejected"><span className="hr-summary-icon">⊘</span><div><small>Rejected</small><strong>{loading ? "…" : report.rejected ?? 0}</strong></div></article>
          <article className="hr-summary-card approved"><span className="hr-summary-icon">☑</span><div><small>Approved</small><strong>{loading ? "…" : report.approved ?? 0}</strong></div></article>
          <article className="hr-summary-card freshers"><span className="hr-summary-icon">🎓</span><div><small>Freshers</small><strong>{loading ? "…" : report.freshers ?? 0}</strong></div></article>
          <article className="hr-summary-card experienced"><span className="hr-summary-icon">💼</span><div><small>Experienced</small><strong>{loading ? "…" : report.experienced ?? 0}</strong></div></article>
        </section>

        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Role</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="empty">
                      Loading report records...
                    </td>
                  </tr>
                ) : paginatedRows.length ? (
                  paginatedRows.map((candidate, index) => (
                    <tr key={candidate.id || candidate.email}>
                      <td>{Number.isFinite(Number(candidate.candidateId)) ? Number(candidate.candidateId) : startIndex + index + 1}</td>
                      <td>{candidate.fullName || candidate.name || "-"}</td>
                      <td>{candidate.candidateType || "-"}</td>
                      <td>
                        {candidate.status ||
                          candidate.verificationStatus ||
                          "PENDING"}
                      </td>
                      <td>{candidate.appliedRole ? displayValue(candidate.appliedRole) : "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="empty">
                      No report records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalRecords > 0 && (
            <div className="vx-pagination">
              <div className="vx-pagination-info">
                Showing <b>{startIndex + 1}</b> -{" "}
                <b>{Math.min(endIndex, totalRecords)}</b> of{" "}
                <b>{totalRecords}</b> records
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
                  onClick={() => setCurrentPage((previous) => Math.max(previous - 1, 1))}
                  disabled={safeCurrentPage === 1}
                >
                  Previous
                </button>

                <span>
                  Page {safeCurrentPage} of {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((previous) =>
                      Math.min(previous + 1, totalPages)
                    )
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
          )}
        </section>
      </main>
    </div>
  );
}
