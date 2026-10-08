const KEY = 'verifyx_notifications';
const read = () => { try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };

export function addNotification({ audience, recipient = '', title, message, type = 'INFO', applicationId = '' }) {
  const notification = { id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, audience, recipient: String(recipient || '').toLowerCase(), title, message, type, applicationId, read: false, createdAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify([notification, ...read()].slice(0, 100)));
  window.dispatchEvent(new CustomEvent('verifyx-notifications-updated'));
  return notification;
}

export function getNotifications(audience, recipient = '') {
  const email = String(recipient || '').toLowerCase();
  return read().filter((item) => item.audience === audience && (!item.recipient || item.recipient === email));
}

export function markNotificationsRead(audience, recipient = '') {
  const email = String(recipient || '').toLowerCase();
  const next = read().map((item) => item.audience === audience && (!item.recipient || item.recipient === email) ? { ...item, read: true } : item);
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('verifyx-notifications-updated'));
}

export function ensureRegistrationReminder(candidate) {
  const email = String(candidate?.email || '').toLowerCase();
  if (!email || getNotifications('CANDIDATE', email).some((item) => item.type === 'REGISTRATION_REMINDER')) return null;
  return addNotification({ audience: 'CANDIDATE', recipient: email, type: 'REGISTRATION_REMINDER', title: 'Complete your registration', message: 'Please complete your education, employment, skills and required-document details to submit your Verify-X application.' });
}
