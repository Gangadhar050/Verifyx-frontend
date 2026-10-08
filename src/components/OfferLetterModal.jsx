import { useEffect, useMemo, useState } from 'react';
import { buildOfferReference, defaultResponsibilities, EMPLOYMENT_TYPES, getOfferLetterHistory, sendOfferLetter } from '../services/offerLetterService';

const isoToday = () => new Date().toISOString().slice(0, 10);
const plusDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

export default function OfferLetterModal({ candidates = [], onClose, onReleased }) {
  const [selectedId, setSelectedId] = useState('');
  const [step, setStep] = useState('select');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const selected = useMemo(() => candidates.find((item) => String(item.workflowId) === String(selectedId)), [candidates, selectedId]);
  const [form, setForm] = useState({ companyName: 'Verify-X', designation: '', offeredCtc: '', offerDate: isoToday(), joiningDate: plusDays(7), referenceNumber: '', employmentType: 'FULL_TIME', responsibilities: '' });

  useEffect(() => {
    if (!selected) return;
    const role = selected.appliedRole || selected.designation || '';
    setForm((prev) => ({ ...prev, designation: role, referenceNumber: buildOfferReference(selected), responsibilities: defaultResponsibilities(role).join('\n') }));
  }, [selected]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const candidateId = selected?.candidateId || selected?.id || selected?.identity;

  const continueToTemplate = async () => {
    if (!selected) return;
    setError('');
    if (!candidateId) { setError('Candidate ID is missing, so the backend offer-letter API cannot be called for this candidate.'); return; }
    try { setHistory(await getOfferLetterHistory(candidateId)); } catch { setHistory([]); }
    setStep('template');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.companyName.trim() || !form.designation.trim() || !form.referenceNumber.trim()) { setError('Please complete all required offer-letter fields.'); return; }
    if (!Number(form.offeredCtc) || Number(form.offeredCtc) <= 0) { setError('Please enter a valid package/CTC in LPA.'); return; }
    if (form.joiningDate < form.offerDate) { setError('Joining date cannot be before the offer date.'); return; }
    setSending(true);
    try {
      const payload = {
        companyName: form.companyName.trim(),
        designation: form.designation.trim(),
        offeredCtc: Number(form.offeredCtc),
        offerDate: form.offerDate,
        joiningDate: form.joiningDate,
        referenceNumber: form.referenceNumber.trim(),
        employmentType: form.employmentType,
      };
      const result = await sendOfferLetter(candidateId, payload);
      onReleased?.(selected, result);
    } catch (err) {
      setError(err?.message || 'Unable to release the offer letter.');
    } finally { setSending(false); }
  };

  return <div className="hr-offer-modal-backdrop" onClick={onClose}>
    <section className="hr-offer-modal hr-offer-template-modal" onClick={(event) => event.stopPropagation()}>
      <header><div><span>Final Selection</span><h2>{step === 'select' ? 'Release Offer Letter' : 'Offer Letter Template'}</h2><p>{step === 'select' ? 'Select an approved candidate to prepare the backend-generated offer letter.' : 'Edit the candidate-specific offer details before sending.'}</p></div><button type="button" onClick={onClose}>×</button></header>
      {step === 'select' ? <>
        <div className="hr-offer-list">{candidates.length ? candidates.map((workflow) => <label key={workflow.workflowId} className={`hr-offer-candidate hr-offer-selectable ${selectedId === workflow.workflowId ? 'selected' : ''} ${workflow.offerStatus === 'RELEASED' ? 'is-released' : ''}`}>
          <input className="hr-offer-radio" type="radio" name="offerCandidate" value={workflow.workflowId} checked={selectedId === workflow.workflowId} disabled={workflow.offerStatus === 'RELEASED'} onChange={() => setSelectedId(workflow.workflowId)} />
          <div className="hr-offer-avatar">{String(workflow.fullName || 'C').charAt(0).toUpperCase()}</div>
          <div className="hr-offer-candidate-info"><strong>{workflow.fullName}</strong><span>{workflow.email}</span><small>{workflow.appliedRole || 'Applied Role Not Added'}</small></div>
          <span className={`hr-offer-status ${workflow.offerStatus === 'RELEASED' ? 'released' : ''}`}>{workflow.offerStatus === 'RELEASED' ? 'Released' : 'Ready'}</span>
        </label>) : <div className="hr-offer-empty"><span>✉</span><h3>No Candidates Ready Yet</h3><p>Candidates will appear here after HR interview approval.</p></div>}</div>
        {error && <p className="hr-offer-error">{error}</p>}
        {candidates.length > 0 && <footer className="hr-offer-release-footer"><div><strong>{selected ? selected.fullName : 'Select A Candidate To Continue'}</strong><small>Offer details can be edited on the next screen.</small></div><button type="button" className="btn primary" disabled={!selectedId} onClick={continueToTemplate}>Edit Offer Template</button></footer>}
      </> : <form className="hr-offer-form" onSubmit={submit}>
        <div className="hr-offer-selected-summary"><div className="hr-offer-avatar">{String(selected?.fullName || 'C').charAt(0).toUpperCase()}</div><div><strong>{selected?.fullName}</strong><span>{selected?.email}</span><small>Candidate ID: {candidateId}</small></div></div>
        <div className="hr-offer-form-grid">
          <label><span>Company Name *</span><input value={form.companyName} maxLength={200} onChange={(e) => update('companyName', e.target.value)} required /></label>
          <label><span>Domain / Designation *</span><input value={form.designation} maxLength={150} onChange={(e) => { update('designation', e.target.value); update('responsibilities', defaultResponsibilities(e.target.value).join('\n')); }} required /></label>
          <label><span>Package / Offered CTC (LPA) *</span><input type="number" min="0.01" step="0.01" value={form.offeredCtc} onChange={(e) => update('offeredCtc', e.target.value)} placeholder="Example: 7.50" required /></label>
          <label><span>Employment Type *</span><select value={form.employmentType} onChange={(e) => update('employmentType', e.target.value)}>{EMPLOYMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span>Offer Date *</span><input type="date" value={form.offerDate} onChange={(e) => update('offerDate', e.target.value)} required /></label>
          <label><span>Joining Date *</span><input type="date" value={form.joiningDate} min={form.offerDate} onChange={(e) => update('joiningDate', e.target.value)} required /></label>
          <label className="hr-offer-full"><span>Reference Number *</span><input value={form.referenceNumber} maxLength={100} onChange={(e) => update('referenceNumber', e.target.value)} required /></label>
          <label className="hr-offer-full"><span>Domain-wise Roles & Responsibilities Preview</span><textarea rows="5" value={form.responsibilities} onChange={(e) => update('responsibilities', e.target.value)} /><small className="hr-offer-field-note">The uploaded backend currently accepts designation/domain but generates the final responsibility section on the server. This preview helps HR review the role content before release.</small></label>
        </div>
        {history.length > 0 && <div className="hr-offer-history"><strong>Previous Offer Letters</strong>{history.slice(0, 3).map((item) => <span key={item.id}>{item.referenceNumber} • {item.designation} • {item.mailStatus}</span>)}</div>}
        {error && <p className="hr-offer-error">{error}</p>}
        <footer className="hr-offer-form-footer"><button type="button" className="btn secondary" onClick={() => setStep('select')}>Back</button><button type="submit" className="btn primary" disabled={sending}>{sending ? 'Releasing…' : 'Release & Email Offer Letter'}</button></footer>
      </form>}
    </section>
  </div>;
}
