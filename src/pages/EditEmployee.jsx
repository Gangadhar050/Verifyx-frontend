import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { findCandidate, updateCandidate } from "../services/employeeService";

export default function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", candidateType: "FRESHER", appliedRole: "", address: "", pan: "", aadhaar: "", skills: [] });

  useEffect(() => {
    findCandidate(id).then((candidate) => {
      setForm({
        fullName: candidate.fullName || "", email: candidate.email || "", phone: candidate.phone || "",
        candidateType: candidate.candidateType || "FRESHER", appliedRole: candidate.appliedRole || "",
        address: candidate.address || "", pan: candidate.pan || "", aadhaar: candidate.aadhaar || "",
        skills: Array.isArray(candidate.skills) ? candidate.skills : [],
      });
    }).catch((err) => setError(err.message || "Unable to load candidate.")).finally(() => setLoading(false));
  }, [id]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setError(""); setSaving(true);
    try { await updateCandidate(id, form); alert("Candidate Updated Successfully."); navigate("/dashboard"); }
    catch (err) { setError(err.message || "Unable To Update Candidate."); }
    finally { setSaving(false); }
  };

  return <div className="app"><Sidebar/><main className="content">
    <div className="page-head"><div><span className="eyebrow">Candidate Workspace</span><h1>Edit Candidate</h1><p className="muted">Update The Candidate Information Without Changing The Verification Workflow.</p></div></div>
    <section className="panel">{loading ? <div className="vx-feedback">Loading Candidate...</div> : <form className="admin-add-form" onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <div className="grid2">
        <input placeholder="Full Name" value={form.fullName} onChange={(e)=>set("fullName",e.target.value)} required/>
        <input placeholder="Email" type="email" value={form.email} onChange={(e)=>set("email",e.target.value)} required/>
        <input placeholder="Phone" value={form.phone} onChange={(e)=>set("phone",e.target.value)} required/>
        <input placeholder="Applied Role" value={form.appliedRole} onChange={(e)=>set("appliedRole",e.target.value)}/>
        <input placeholder="PAN Number" value={form.pan} onChange={(e)=>set("pan",e.target.value.toUpperCase())}/>
        <input placeholder="Aadhaar Number" value={form.aadhaar} onChange={(e)=>set("aadhaar",e.target.value)}/>
        <input placeholder="Address" value={form.address} onChange={(e)=>set("address",e.target.value)}/>
        <input placeholder="Skills (comma separated)" value={form.skills.join(", ")} onChange={(e)=>set("skills",e.target.value.split(",").map(v=>v.trim()).filter(Boolean))}/>
        <select value={form.candidateType} onChange={(e)=>set("candidateType",e.target.value)}><option value="FRESHER">Fresher</option><option value="EXPERIENCED">Experienced</option></select>
      </div>
      <div className="form-actions"><button className="btn primary" disabled={saving}>{saving ? "Saving..." : "Update Candidate"}</button><button type="button" className="btn" onClick={()=>navigate("/dashboard")}>Cancel</button></div>
    </form>}</section>
  </main></div>;
}
