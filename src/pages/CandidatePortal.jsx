import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { findLocalCandidate } from '../services/localStorage/storage';
import { getApplication } from '../services/candidateApplicationService';
import { addNotification, getNotifications, markNotificationsRead } from '../services/notificationService';
import { formatInterviewSlot, getCandidateInterviewWorkflow, selectHrInterviewSlot } from '../services/interviewWorkflowService';
import { sendInterviewSlotSelectedMail } from '../services/mailService';
import verifyXLogo from '../assets/verify-x-full-logo.png';
import './CandidatePortal.css';

const titleCase = (value='') => String(value).replaceAll('_',' ').toLowerCase().replace(/\b\w/g, (m)=>m.toUpperCase());
const filled = (v) => Boolean(String(v || '').trim());
const getExpectedDocuments = (application = {}) => {
  const safeApplication = application || {};
  const experienced = String(safeApplication.candidateType || '').toUpperCase().includes('EXPER');
  if (!experienced) return ['Resume', 'Aadhaar Card', 'PAN Card'];
  const working = String(safeApplication.employmentStatus || '').toUpperCase() === 'CURRENTLY_WORKING';
  return working
    ? ['Resume', 'Aadhaar Card', 'PAN Card', 'Current Offer / Appointment Letter', 'Latest Salary Slip', 'UAN Proof']
    : ['Resume', 'Aadhaar Card', 'PAN Card', 'Experience Letter', 'Relieving Letter', 'Last Salary Slip', 'UAN Proof'];
};

export default function CandidatePortal(){
  const { session, logout } = useAuth();
  const nav = useNavigate();
  const identity = session?.id || session?.email;
  const [application, setApplication] = useState(null);
  const [showApplication, setShowApplication] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const [notifications, setNotifications] = useState(() => getNotifications('CANDIDATE', session?.email));
  const [profilePhoto, setProfilePhoto] = useState('');
  const [photoMessage, setPhotoMessage] = useState('');
  const [interviewWorkflow, setInterviewWorkflow] = useState(null);
  const [selectingInterviewSlot, setSelectingInterviewSlot] = useState('');

  useEffect(() => {
    if (identity) setProfilePhoto(localStorage.getItem(`verifyx_candidate_photo_${identity}`) || '');
  }, [identity]);

  const changeProfilePhoto = (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setPhotoMessage('Please select a JPG or PNG image.'); return; }
    if (file.size > 5 * 1024 * 1024) { setPhotoMessage('Profile photo must be 5 MB or smaller.'); return; }
    const reader = new FileReader();
    reader.onload = () => { const image = new Image(); image.onload = () => { const size = Math.min(image.width, image.height); const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; const context = canvas.getContext('2d'); context.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 512, 512); const optimized = canvas.toDataURL('image/jpeg', .82); try { localStorage.setItem(`verifyx_candidate_photo_${identity}`, optimized); setProfilePhoto(optimized); setPhotoMessage('Profile photo updated successfully.'); } catch { setPhotoMessage('Unable to save the photo. Please select a smaller image.'); } }; image.src = reader.result; };
    reader.readAsDataURL(file);
  };

  useEffect(()=>{
    if(!identity) return;
    const allowed = localStorage.getItem(`verifyx_portal_access_${identity}`) === 'true';
    if(!allowed){ nav('/candidate-welcome',{replace:true}); return; }
    const saved = getApplication(identity);
    const draft = JSON.parse(localStorage.getItem(`verifyx_welcome_profile_${identity}`) || 'null');
    const local = findLocalCandidate(session?.email) || {};
    setApplication(saved || (draft ? {
      ...draft,
      fullName: draft.fullName || local.fullName || session?.name,
      email: local.email || session?.email,
      appliedRole: local.appliedRole || session?.appliedRole || '',
      status:'DRAFT'
    } : null));
    if (sessionStorage.getItem(`verifyx_show_return_progress_${identity}`) === 'true') {
      sessionStorage.removeItem(`verifyx_show_return_progress_${identity}`);
      setActiveSection('profile');
      setShowProgress(true);
    }
  },[identity,session?.email,session?.name,session?.appliedRole,nav]);

  useEffect(() => {
    const refreshNotifications = () => setNotifications(getNotifications('CANDIDATE', session?.email));
    refreshNotifications(); window.addEventListener('verifyx-notifications-updated', refreshNotifications); window.addEventListener('storage', refreshNotifications);
    return () => { window.removeEventListener('verifyx-notifications-updated', refreshNotifications); window.removeEventListener('storage', refreshNotifications); };
  }, [session?.email]);

  useEffect(() => {
    const refreshInterview = () => setInterviewWorkflow(getCandidateInterviewWorkflow(session?.email));
    refreshInterview(); window.addEventListener('verifyx-interview-workflow-updated', refreshInterview); window.addEventListener('storage', refreshInterview);
    return () => { window.removeEventListener('verifyx-interview-workflow-updated', refreshInterview); window.removeEventListener('storage', refreshInterview); };
  }, [session?.email]);

  const chooseInterviewSlot = async (slot) => {
    if (!slot || selectingInterviewSlot) return; setSelectingInterviewSlot(slot);
    try { const updated = selectHrInterviewSlot(session?.email, slot); setInterviewWorkflow(updated); addNotification({ audience: 'HR', type: 'INTERVIEW_SLOT_SELECTED', applicationId: updated.applicationId || '', title: 'HR Interview Slot Selected', message: `${updated.fullName || 'Candidate'} selected ${formatInterviewSlot(slot)}. Please confirm/fix the interview from the HR Dashboard.` }); await sendInterviewSlotSelectedMail(updated, slot).catch(() => false); alert('Interview Time Slot Selected Successfully. HR Has Been Notified.'); }
    catch (err) { alert(err?.message || 'Unable To Select The Interview Time Slot.'); } finally { setSelectingInterviewSlot(''); }
  };

  const requiredNames = useMemo(()=>{
    if (!application) return [];
    if(Array.isArray(application?.requiredDocumentNames) && application.requiredDocumentNames.length) return application.requiredDocumentNames;
    const uploadedKeys = Object.keys(application?.requiredDocuments || {});
    return [...new Set([...getExpectedDocuments(application), ...uploadedKeys])];
  },[application]);
  const uploadedNames = useMemo(()=>Object.entries(application?.requiredDocuments || {}).filter(([,v])=>filled(v?.fileName)).map(([k])=>k),[application]);
  const pendingNames = requiredNames.filter((name)=>!uploadedNames.includes(name));
  const docPercent = requiredNames.length ? Math.round((uploadedNames.length/requiredNames.length)*100) : 0;
  const statusText = String(application?.status || '').toUpperCase();
  const submitted = statusText.includes('SUBMITTED') || statusText.includes('PENDING_VERIFICATION') || statusText.includes('VERIFIED') || statusText.includes('REJECTED');
  const overall = submitted ? 100 : Number(application?.overallCompletion || Math.min(95, docPercent));

  const openSection = (section) => {
    setActiveSection(section);
    setMenuOpen(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 40);
  };

  if(!application){
    return <main className="candidate-dashboard-page"><div className="candidate-dashboard-shell"><div className="candidate-empty-state"><h2>Your application is ready to begin</h2><p>Complete the candidate application before HR review can start.</p><button className="candidate-primary-btn" onClick={()=>nav('/candidate-welcome')}>Start Application</button></div></div></main>;
  }

  const signOut = async()=>{ await logout(); nav('/candidate-login',{replace:true}); };
  const quickApply = ()=>{
    if(submitted){ setShowApplication(true); return; }
    nav('/candidate-welcome');
  };

  return <div className="candidate-dashboard-page">
    <header className="candidate-dashboard-header">
      <div className="candidate-header-left">
        <button className="candidate-menu-toggle" aria-label="Open candidate menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(true)}><span></span><span></span><span></span></button>
        <div className="candidate-brand" onClick={()=>nav('/candidate')}><img src={verifyXLogo} alt="VerifyX" /></div>
      </div>
      <div className="candidate-header-actions">{!submitted && <button className="candidate-quick-apply-header" onClick={quickApply}>Quick Apply</button>}<button className="candidate-link-btn" onClick={()=>setShowApplication(true)}>View Application</button><button className="candidate-logout-btn" onClick={signOut}>Logout</button></div>
    </header>

    <div className={`candidate-menu-backdrop ${menuOpen?'open':''}`} onClick={()=>setMenuOpen(false)}></div>
    <aside className={`candidate-drawer ${menuOpen?'open':''}`} aria-hidden={!menuOpen}>
      <div className="candidate-drawer-head"><div className="candidate-drawer-avatar">{profilePhoto ? <img src={profilePhoto} alt="Candidate" /> : String(application.fullName || session?.name || 'C').charAt(0).toUpperCase()}</div><div><b>{application.fullName || session?.name || 'Candidate'}</b><span>{application.email || session?.email || ''}</span></div><button onClick={()=>setMenuOpen(false)} aria-label="Close candidate menu">×</button></div>
      <nav className="candidate-drawer-nav candidate-reference-nav">
        <button className={activeSection==='profile'?'active':''} onClick={()=>openSection('profile')}><i>●</i><span><b>Profile</b><small>Candidate Profile Information</small></span></button>
        <button className={activeSection==='documents'?'active':''} onClick={()=>openSection('documents')}><i>▤</i><span><b>Documents</b><small>Uploaded And Pending Files</small></span></button>
        <button className={activeSection==='status'?'active':''} onClick={()=>openSection('status')}><i>▣</i><span><b>Applications</b><small>Track Application Status</small></span></button>
        <button className={activeSection==='notifications'?'active':''} onClick={()=>openSection('notifications')}><i>♥</i><span><b>Notifications</b><small>Email And Application Updates</small></span></button>
        <button className={activeSection==='dashboard'?'active':''} onClick={()=>openSection('dashboard')}><i>⚙</i><span><b>Dashboard</b><small>Application Overview</small></span></button>
        <button onClick={()=>{setMenuOpen(false);setShowApplication(true)}}><i>⌕</i><span><b>View Application</b><small>Read Submitted Details</small></span></button>
        {!submitted && <button className="candidate-quick-apply-menu" onClick={quickApply}><i>⚡</i><span><b>Continue Application</b><small>Resume Your Saved Draft</small></span></button>}
      </nav>
      <div className="candidate-drawer-footer"><button onClick={signOut}>↪ <span>Logout</span></button></div>
    </aside>

    <main className="candidate-dashboard-shell" id="candidate-overview">
      {activeSection==='dashboard' && <>
        <section className="candidate-welcome-banner">
          <div><span className="candidate-eyebrow">Candidate Application</span><h1>Hello, {application.fullName || session?.name || 'Candidate'} 👋</h1><p>{submitted ? 'Your application has been submitted successfully. HR can now extract and review your information and documents.' : 'Your application is saved as a draft. Continue whenever you are ready; your progress is preserved.'}</p>{!submitted && <button className="candidate-quick-apply-btn" onClick={quickApply}>⚡ Quick Apply / Continue Application</button>}</div>
          <div className={`candidate-status-chip ${submitted?'submitted':'draft'}`}><i></i>{submitted?'Submitted for HR Review':'Draft Application'}</div>
        </section>

        <section className="candidate-stat-grid">
          <DashboardCard icon="✓" label="Application Status" value={submitted?'Submitted':'Draft'} hint={submitted?`ID: ${application.applicationId || 'Generated'}`:'Not submitted yet'} cls="status" />
          <DashboardCard icon="◔" label="Profile Completion" value={`${overall}%`} hint={overall===100?'Profile completed':'Continue remaining details'} progress={overall} cls="profile" />
          <DashboardCard icon="↑" label="Documents Uploaded" value={`${uploadedNames.length}/${requiredNames.length || uploadedNames.length}`} hint={`${docPercent}% of required documents`} progress={docPercent} cls="uploaded" />
          <DashboardCard icon="!" label="Pending Documents" value={String(pendingNames.length)} hint={pendingNames.length?pendingNames.slice(0,2).join(', '):'No pending documents'} cls="pending" />
        </section>

        <section className="candidate-dashboard-hint">
          <div className="candidate-dashboard-hint-icon">☰</div>
          <div><b>Open the menu to view your details</b><p>Use the hamburger menu for Profile Information, Application Status, Documents and Notifications.</p></div>{!submitted && <button className="candidate-quick-apply-inline" onClick={quickApply}>Quick Apply →</button>}
        </section>
      </>}

      {activeSection==='profile' && <section className="candidate-reference-profile candidate-section-view" id="candidate-profile-information">
        <div className="candidate-profile-reference-hero">
          <div className="candidate-profile-reference-copy"><span>Profile Information</span><h1>Your Candidate Profile</h1><p>Keep Your Profile Updated To Increase Your Chance.</p></div><div className="candidate-profile-reference-art" aria-hidden="true"><i></i><i></i><i></i></div>
        </div>
        <div className="candidate-profile-identity-card">
          <div className="candidate-profile-photo-wrap candidate-reference-photo"><div className="candidate-profile-avatar">{profilePhoto ? <img src={profilePhoto} alt={`${application.fullName || 'Candidate'} Profile`} /> : String(application.fullName || session?.name || 'C').charAt(0).toUpperCase()}</div><label className="candidate-photo-edit" title="Upload Profile Photo">📷<input type="file" accept="image/jpeg,image/png" onChange={changeProfilePhoto} /></label></div>
          <div className="candidate-profile-main candidate-reference-main"><h3>{application.fullName || session?.name || 'Candidate'}</h3><p>{application.appliedRole || session?.appliedRole || 'Role Not Selected'}</p><div className="candidate-profile-tags"><span>{titleCase(application.candidateType || session?.candidateType || 'Candidate')}</span><span className="saved-tag">✓ {application.employmentStatus ? titleCase(application.employmentStatus) : 'Profile Saved'}</span></div></div>
          <div className="candidate-profile-actions candidate-reference-actions">{!submitted ? <button className="candidate-edit-profile-btn" onClick={()=>nav('/candidate-welcome')}>Edit Profile</button> : <span className="candidate-profile-locked">Submitted Profile Locked</span>}</div>
          <div className="candidate-profile-contact candidate-reference-contact"><div><small>Email</small><b>{application.email || session?.email || '—'}</b></div><div><small>Phone No:</small><b>{application.phone || application.mobile || session?.phone || '—'}</b></div></div>
        </div>
        {photoMessage && <div className="candidate-photo-message">{photoMessage}</div>}
        <div className="candidate-profile-details-grid candidate-reference-grid">
          <ProfileMini icon="🎓" tone="blue" title="10th / SSLC" value={application.education10?.institution || application.tenth?.institution || application.tenth?.schoolName || 'Not Added'} sub={application.education10?.passingYear || application.tenth?.passingYear || ''}/>
          <ProfileMini icon="▤" tone="violet" title="12th / PUC" value={application.education12?.institution || application.twelfth?.institution || application.twelfth?.collegeName || 'Not Added'} sub={application.education12?.passingYear || application.twelfth?.passingYear || ''}/>
          <ProfileMini icon="✥" tone="green" title="Degree" value={application.degree?.degree || application.degree?.institution || 'Not Added'} sub={application.degree?.specialization || application.degree?.passingYear || ''}/>
          <ProfileMini icon="🎓" tone="orange" title="Master's" value={application.masters?.degree || application.master?.degree || application.masters?.institution || 'Not Added'} sub={application.masters?.specialization || application.master?.specialization || ''}/>
          <ProfileMini icon="▣" tone="purple" title="Current Employer" value={application.currentEmployer?.companyName || application.currentEmployerName || 'Not Added'} sub={application.currentEmployer?.designation || application.currentDesignation || ''}/>
          <ProfileMini icon="♧" tone="cyan" title="Previous Employer" value={application.previousEmployer?.companyName || application.previousEmployerName || 'Not Added'} sub={application.previousEmployer?.designation || application.previousDesignation || ''}/>
        </div>
      </section>}

      {activeSection==='status' && <section className="candidate-panel candidate-application-panel candidate-section-view" id="candidate-application-status">
        <div className="candidate-panel-head"><div><span>APPLICATION JOURNEY</span><h2>Your verification progress</h2></div><div className="candidate-panel-actions">{!submitted && <button className="candidate-panel-quick-apply" onClick={quickApply}>⚡ Quick Apply</button>}<button onClick={()=>setShowApplication(true)}>View full application</button></div></div>
        <div className="candidate-timeline">
          <Timeline done title="Account Registered" text="Welcome email and profile completion reminder created." />
          <Timeline done={overall>=80} active={!submitted && overall<100} title="Profile & Documents" text={submitted?'Required details and documents completed.':'Complete education, employment and required documents.'} />
          <Timeline done={submitted} active={submitted} title="Application Submitted" text={submitted?`Submitted ${application.submittedAt ? new Date(application.submittedAt).toLocaleString() : ''}`:'Submit after all required documents are uploaded.'} />
          <Timeline done={false} active={submitted} title="HR Extraction & Review" text={submitted?'Your application is available to HR for extraction and verification.':'Starts after submission.'} />
        </div>
        {!submitted && <button className="candidate-primary-btn continue-btn" onClick={()=>nav('/candidate-welcome')}>Continue Application →</button>}
      </section>}

      {activeSection==='profile' && interviewWorkflow && <section className="candidate-panel candidate-interview-panel candidate-section-view" id="candidate-hr-interview"><div className="candidate-panel-head"><div><span>HR INTERVIEW</span><h2>{interviewWorkflow.selectedSlot ? 'Interview Slot Confirmed' : 'Choose Your Interview Time'}</h2></div><strong className="candidate-interview-stage">{interviewWorkflow.finalDecision === 'APPROVED' ? 'Approved' : interviewWorkflow.interviewStatus === 'INTERVIEW_CONFIRMED' ? 'Confirmed' : interviewWorkflow.selectedSlot ? 'Awaiting HR Confirmation' : 'Action Required'}</strong></div><p className="candidate-interview-copy">Your Background Verification Is Complete. {interviewWorkflow.interviewStatus === 'INTERVIEW_CONFIRMED' ? 'HR Has Confirmed Your Interview At The Selected Time.' : interviewWorkflow.selectedSlot ? 'HR Has Received Your Selected Interview Time And Will Confirm The Interview.' : 'Select One Of The HR Interview Slots Below. Once Selected, HR Will Receive An Email Confirmation.'}</p><div className="candidate-interview-slots">{(interviewWorkflow.interviewSlots || []).map((slot) => <button type="button" key={slot} disabled={Boolean(interviewWorkflow.selectedSlot) || Boolean(selectingInterviewSlot)} className={interviewWorkflow.selectedSlot === slot ? 'selected' : ''} onClick={() => chooseInterviewSlot(slot)}><span>{interviewWorkflow.selectedSlot === slot ? '✓' : '◷'}</span><div><b>{formatInterviewSlot(slot)}</b><small>{interviewWorkflow.selectedSlot === slot ? 'Selected Time Slot' : interviewWorkflow.selectedSlot ? 'Another Slot Was Selected' : 'Select This Time'}</small></div></button>)}</div>{interviewWorkflow.finalDecision === 'APPROVED' && <div className="candidate-interview-result approved"><b>HR Interview Approved</b><span>Your Profile Has Moved To The Offer-Letter Release Stage.</span></div>}</section>}

      {activeSection==='documents' && <section className="candidate-panel candidate-doc-panel candidate-section-view" id="candidate-documents">
        <div className="candidate-panel-head"><div><span>DOCUMENT CHECKLIST</span><h2>{pendingNames.length?'Items still needed':'Documents complete'}</h2></div><div className="candidate-doc-head-actions"><strong>{docPercent}%</strong>{!submitted && <button className="candidate-panel-quick-apply" onClick={quickApply}>⚡ Quick Apply</button>}</div></div>
        <div className="candidate-doc-list">
          {(requiredNames.length?requiredNames:uploadedNames).map(name=>{const ok=uploadedNames.includes(name);return <div className="candidate-doc-row" key={name}><span className={ok?'ok':'wait'}>{ok?'✓':'!'}</span><div><b>{name}</b><small>{ok?(application.requiredDocuments?.[name]?.fileName || 'Uploaded'):'Required before submission'}</small></div><em>{ok?'Uploaded':'Pending'}</em></div>})}
          {!requiredNames.length && <div className="candidate-no-docs"><span>Required documents will appear after you complete the profile information.</span>{!submitted && <button className="candidate-quick-apply-btn compact" onClick={quickApply}>Quick Apply →</button>}</div>}
        </div>
      </section>}

      {activeSection==='notifications' && <section className="candidate-bottom-grid candidate-section-view" id="candidate-notifications" onMouseEnter={() => { markNotificationsRead('CANDIDATE', session?.email); setNotifications(getNotifications('CANDIDATE', session?.email)); }}>
        <article className="candidate-panel candidate-notification-card"><div className="candidate-panel-head"><div><span>NOTIFICATIONS</span><h2>Your latest updates</h2></div><strong>{notifications.filter((item) => !item.read).length} new</strong></div><div className="candidate-notification-list">{notifications.length ? notifications.map((item) => <div key={item.id} className={item.read ? '' : 'unread'}><i>🔔</i><div><b>{item.title}</b><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div></div>) : <p className="candidate-no-notifications">No notifications yet.</p>}</div></article>
        {!submitted && <article className="candidate-panel candidate-quick-apply-card"><div className="quick-apply-icon">⚡</div><div><span>QUICK APPLICATION</span><h3>Continue your application</h3><p>Complete profile details, skills, offer letters and required documents from one guided flow.</p></div><button className="candidate-quick-apply-btn compact" onClick={quickApply}>Quick Apply →</button></article>}
        <article className="candidate-panel email-card"><div className="mail-icon">✉</div><div><span>EMAIL NOTIFICATIONS</span><h3>Stay updated automatically</h3><p>Registration welcome/profile-completion email is triggered after sign-up. A submission confirmation email is triggered after you submit the application. HR status notifications continue through the existing Verify-X mail flow.</p></div></article>
        <article className="candidate-panel role-card"><span>APPLIED ROLE</span><h3>{application.appliedRole || session?.appliedRole || 'Not selected'}</h3><p>{application.candidateType || session?.candidateType || 'Candidate'} • {application.employmentStatus ? titleCase(application.employmentStatus) : 'Profile information saved'}</p></article>
      </section>}
    </main>
    {showApplication && <ApplicationModal application={application} requiredNames={requiredNames} uploadedNames={uploadedNames} onClose={()=>setShowApplication(false)} onEdit={()=>{ setShowApplication(false); nav('/candidate-welcome'); }} />}
    {showProgress && <ReturnProgressModal application={application} overall={overall} docPercent={docPercent} uploadedCount={uploadedNames.length} pendingNames={pendingNames} onClose={()=>setShowProgress(false)} onContinue={()=>nav('/candidate-welcome')} />}
  </div>;
}

function ProfileMini({icon,tone='blue',title,value,sub}){return <div className="candidate-profile-mini candidate-reference-mini"><div className={`candidate-mini-icon ${tone}`}>{icon}</div><div><small>{title}</small><b>{value}</b>{filled(sub)&&<span>{sub}</span>}</div></div>}
function DashboardCard({icon,label,value,hint,progress,cls}){return <article className={`candidate-stat-card ${cls}`}><div className="candidate-card-top"><span>{icon}</span><small>{label}</small></div><strong>{value}</strong><p>{hint}</p>{typeof progress==='number'&&<div className="candidate-mini-progress"><i style={{width:`${progress}%`}}/></div>}</article>}
function Timeline({done,active,title,text}){return <div className={`candidate-timeline-row ${done?'done':''} ${active?'active':''}`}><span>{done?'✓':''}</span><div><b>{title}</b><p>{text}</p></div></div>}
function ReturnProgressModal({application,overall,docPercent,uploadedCount,pendingNames,onClose,onContinue}){const remaining=Math.max(0,100-overall);return <div className="return-progress-backdrop" role="dialog" aria-modal="true" aria-labelledby="return-progress-title"><section className="return-progress-modal"><header><div><span>WELCOME BACK</span><h2 id="return-progress-title">Your saved application progress</h2><p>Hello {application.fullName || 'Candidate'}, your profile has been restored successfully.</p></div><button type="button" onClick={onClose} aria-label="Close progress summary">×</button></header><div className="return-progress-cards"><DashboardCard icon="✓" label="Application Completed" value={`${overall}%`} hint={`${remaining}% still pending`} progress={overall} cls="profile"/><DashboardCard icon="◔" label="Application Pending" value={`${remaining}%`} hint={remaining ? 'Continue the remaining profile fields' : 'Application information complete'} progress={remaining} cls="status"/><DashboardCard icon="↑" label="Documents Uploaded" value={String(uploadedCount)} hint={`${docPercent}% of required documents`} progress={docPercent} cls="uploaded"/><DashboardCard icon="!" label="Documents Pending" value={String(pendingNames.length)} hint={pendingNames.length ? pendingNames.slice(0,2).join(', ') : 'No pending documents'} cls="pending"/></div><div className="return-progress-pending"><b>{pendingNames.length ? 'Pending document checklist' : 'Document checklist complete'}</b><p>{pendingNames.length ? pendingNames.join(' • ') : 'All required documents have been uploaded.'}</p></div><footer><button type="button" className="candidate-progress-secondary" onClick={onClose}>View My Profile</button>{remaining > 0 || pendingNames.length > 0 ? <button type="button" className="candidate-primary-btn" onClick={onContinue}>Continue Application →</button> : null}</footer></section></div>}
function EducationSummary({title,data}){if(!data||!Object.values(data).some(filled))return null;return <div className="app-summary-block"><h4>{title}</h4><div className="app-summary-grid"><Summary k="Institution" v={data.institution}/><Summary k="Board / University" v={data.boardUniversity}/><Summary k="Course" v={data.degree}/><Summary k="Specialization" v={data.specialization}/><Summary k="Registration No." v={data.registrationNumber}/><Summary k="Passing Year" v={data.passingYear||data.endYear}/><Summary k="Percentage / CGPA" v={data.percentage}/></div></div>}
function Summary({k,v}){if(!filled(v))return null;return <div><small>{k}</small><b>{v}</b></div>}
function ApplicationModal({application,requiredNames,uploadedNames,onClose,onEdit}){return <div className="application-modal-backdrop" onClick={onClose}><section className="application-modal" onClick={e=>e.stopPropagation()}><header><div><span>VERIFY-X APPLICATION</span><h2>{application.applicationId || 'Draft Application'}</h2></div><button onClick={onClose}>×</button></header><div className="application-modal-body"><div className="app-summary-block"><h4>Candidate Details</h4><div className="app-summary-grid"><Summary k="Name" v={application.fullName}/><Summary k="Email" v={application.email}/><Summary k="Applied Role" v={application.appliedRole}/><Summary k="Candidate Type" v={application.candidateType}/><Summary k="Status" v={titleCase(application.status)}/></div></div><div className="app-summary-block"><h4>Role Skills & Tools</h4><div className="app-summary-grid"><Summary k="Technical Skills" v={(application.skills||[]).join(', ') || 'Not provided'}/><Summary k="Tools & Platforms" v={(application.tools||[]).join(', ') || 'Not provided'}/></div></div><EducationSummary title="10th / SSLC" data={application.tenth}/><EducationSummary title="12th / PUC" data={application.twelfth}/><EducationSummary title="Degree / Bachelor's" data={application.degree}/><EducationSummary title="Master's (Optional)" data={application.master}/><div className="app-summary-block"><h4>Employment</h4><div className="app-summary-grid"><Summary k="Employment Status" v={titleCase(application.employmentStatus)}/><Summary k="Current Employer" v={application.currentEmployer}/><Summary k="Current Designation" v={application.currentDesignation}/><Summary k="Previous Employer" v={application.previousEmployer}/><Summary k="Previous Designation" v={application.previousDesignation}/></div></div><div className="app-summary-block"><h4>Offer Letters</h4>{(application.offerLetters||[]).map((o,i)=><div className="offer-summary" key={o.id||i}><b>Offer {i+1}</b><span>{o.companyName||'Company not entered'} • {o.designation||'Role not entered'} • {o.fileName||'No file selected'}</span></div>)}</div><div className="app-summary-block"><h4>Required Documents</h4><div className="modal-doc-grid">{requiredNames.map(name=><div key={name} className={uploadedNames.includes(name)?'uploaded':'missing'}><span>{uploadedNames.includes(name)?'✓':'!'}</span><div><b>{name}</b><small>{application.requiredDocuments?.[name]?.fileName || 'Pending'}</small></div></div>)}</div></div></div><footer><button className="candidate-progress-secondary" type="button" onClick={onEdit}>Edit Application</button><button className="candidate-primary-btn" onClick={onClose}>Close Application</button></footer></section></div>}
