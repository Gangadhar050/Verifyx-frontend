const REGISTRY_KEY = 'verifyx_submitted_applications';

export const applicationKey = (identity) => `verifyx_application_${identity}`;

export function getApplication(identity) {
  try { return JSON.parse(localStorage.getItem(applicationKey(identity)) || 'null'); }
  catch { return null; }
}

export function saveApplication(identity, data) {
  const existing = getApplication(identity) || {};
  const app = { status: 'DRAFT', ...existing, ...data, identity, updatedAt: new Date().toISOString() };
  localStorage.setItem(applicationKey(identity), JSON.stringify(app));

  // Also upsert into the shared registry the HR Dashboard reads from, so
  // every document upload / field change is visible on the HR side live,
  // instead of only appearing after the candidate hits "Submit Application".
  // A candidate that has already been fully submitted keeps its locked,
  // submitted record here (we still refresh it so live edits still show).
  const registry = getSubmittedApplications().filter((item) => item.identity !== identity);
  registry.unshift(app);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));

  return app;
}

export function submitApplication(identity, data, session = {}) {
  const submittedAt = new Date().toISOString();
  const applicationId = data.applicationId || `VX-${Date.now().toString().slice(-8)}`;
  const app = {
    ...data,
    identity,
    applicationId,
    candidateId: session.id,
    email: session.email,
    fullName: data.fullName || session.name || 'Candidate',
    appliedRole: data.appliedRole || session.appliedRole || '',
    status: 'SUBMITTED_FOR_HR_REVIEW',
    submittedAt,
    updatedAt: submittedAt,
    locked: true,
    hrExtractionStatus: 'READY_FOR_EXTRACTION',
  };
  localStorage.setItem(applicationKey(identity), JSON.stringify(app));
  const registry = getSubmittedApplications().filter((item) => item.identity !== identity);
  registry.unshift(app);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  return app;
}

const normalizeKeyPart = (value) => String(value || '').trim().toLowerCase();

// A candidate should only ever have ONE record in the registry. Older
// versions of the app could save the same candidate under two different
// "identity" keys (e.g. once by a temporary session id, once by their
// email) across different visits/logins, which showed up on the HR
// dashboard as duplicate "ghost" candidates — one with real data, one
// mostly blank. This groups by the most reliable identifier available
// (email, then phone, then full name) so those duplicates collapse back
// into a single, most-complete record.
function dedupeKey(app = {}) {
  const email = normalizeKeyPart(app.email);
  if (email) return `email:${email}`;
  const phone = normalizeKeyPart(app.phone || app.phoneNumber);
  if (phone) return `phone:${phone}`;
  const name = normalizeKeyPart(app.fullName);
  if (name) return `name:${name}`;
  return `identity:${app.identity}`;
}

// Prefer the record with more real data (email, phone, uploaded documents)
// and, as a tiebreaker, the more recently updated one.
function completenessScore(app = {}) {
  let score = 0;
  if (app.email) score += 10;
  if (app.phone || app.phoneNumber) score += 5;
  score += Object.keys(app.requiredDocuments || {}).length;
  const time = new Date(app.updatedAt || app.submittedAt || 0).getTime();
  return score * 1e15 + (Number.isNaN(time) ? 0 : time);
}

function dedupeApplications(list) {
  const byKey = new Map();

  list.forEach((app) => {
    const key = dedupeKey(app);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, app);
      return;
    }

    const keep = completenessScore(app) >= completenessScore(existing) ? app : existing;
    const other = keep === app ? existing : app;

    // Merge so no data uploaded/entered against either identity is lost.
    byKey.set(key, {
      ...other,
      ...keep,
      requiredDocuments: { ...(other.requiredDocuments || {}), ...(keep.requiredDocuments || {}) },
    });
  });

  return Array.from(byKey.values());
}

export function getSubmittedApplications() {
  let list;
  try {
    const value = JSON.parse(localStorage.getItem(REGISTRY_KEY) || '[]');
    list = Array.isArray(value) ? value : [];
  } catch {
    list = [];
  }

  const deduped = dedupeApplications(list);

  // Self-heal: if duplicates were found, persist the cleaned-up registry
  // so this candidate shows as exactly one record from now on.
  if (deduped.length !== list.length) {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(deduped));
  }

  return deduped;
}

export function removeSubmittedApplication(identity) {
  const list = getSubmittedApplications().filter((item) => item.identity !== identity);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(list));
  localStorage.removeItem(applicationKey(identity));
}

export function updateSubmittedApplication(identity, patch) {
  const list = getSubmittedApplications();
  const next = list.map((item) => item.identity === identity ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(next));
  const existing = getApplication(identity);
  if (existing) localStorage.setItem(applicationKey(identity), JSON.stringify({ ...existing, ...patch, updatedAt: new Date().toISOString() }));
  return next.find((item) => item.identity === identity) || null;
}
