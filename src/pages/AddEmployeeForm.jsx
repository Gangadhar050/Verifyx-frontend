import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { addCandidate } from "../services/employeeService";
import { api } from "../services/apiService";

export default function AddEmployeeForm() {
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  const [roleOptions, setRoleOptions] = useState([]);
  const [candidateTypeOptions, setCandidateTypeOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.registrationOptions().then((options) => {
      if (!active) return;
      setRoleOptions(Array.isArray(options?.appliedRoles) ? options.appliedRoles : []);
      setCandidateTypeOptions(Array.isArray(options?.candidateTypes) ? options.candidateTypes : []);
    }).catch((error) => { if (active) setErr(error.message || "Unable to load roles from backend."); })
      .finally(() => { if (active) setOptionsLoading(false); });
    return () => { active = false; };
  }, []);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    candidateType: "FRESHER",
    appliedRole: "",
    status: "Draft",
  });

  const set = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!/^\d{10}$/.test(form.phone)) {
      setErr("Phone number must contain exactly 10 digits.");
      return;
    }

    try {
      await addCandidate(form);
      alert("Candidate added successfully.");
      navigate("/dashboard");
    } catch (error) {
      setErr(error.message || "Failed to add candidate.");
    }
  };

  return (
    <div className="app">
      <Sidebar />

      <main className="content">
        <div className="page-head">
          <div>
            <span className="eyebrow">Admin Workspace</span>
            <h1>Add Candidate</h1>
            <p className="muted">
              Add a Candidate Directly From HR/Admin Panel.
            </p>
          </div>
        </div>

        <section className="panel">
          <form className="admin-add-form" onSubmit={submit}>
            {err && <div className="error">{err}</div>}

            <div className="grid2">
              <input
                placeholder="Full Name"
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                required
              />

              <input
                placeholder="Email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />

              <input
                placeholder="Phone"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                title="Enter exactly 10 digits"
                required
              />

              <select
                aria-label="Applied Role"
                value={form.appliedRole}
                onChange={(e) => set("appliedRole", e.target.value)}
                required
                disabled={optionsLoading || !roleOptions.length}
              >
                <option value="" disabled>{optionsLoading ? "Loading roles from backend..." : "Select Applied Role"}</option>
                {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>

              <select value={form.candidateType} onChange={(e) => set("candidateType", e.target.value)} disabled={optionsLoading || !candidateTypeOptions.length}>
                {candidateTypeOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>

              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option>Draft</option>
                <option>Pending Verification</option>
                <option>Approved</option>
                <option>Rejected</option>
                <option>Re-upload Required</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn primary">
                Save Candidate
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
