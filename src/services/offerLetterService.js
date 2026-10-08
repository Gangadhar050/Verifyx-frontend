import { api } from './apiService';

export const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

export const sendOfferLetter = (candidateId, payload) => api.sendHrOfferLetter(candidateId, payload);
export const getOfferLetterHistory = (candidateId) => api.hrOfferLetters(candidateId);

export const buildOfferReference = (candidate = {}) => {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const raw = candidate.candidateId || candidate.id || candidate.identity || candidate.applicationId || Date.now();
  const suffix = String(raw).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  return `VX-OFFER-${date}-${suffix || Date.now().toString().slice(-6)}`;
};

export const defaultResponsibilities = (role = '') => {
  const r = String(role || '').toLowerCase();
  if (r.includes('react') || r.includes('front')) return ['Build responsive user interfaces and reusable components.', 'Integrate frontend screens with REST APIs.', 'Maintain code quality, performance and browser compatibility.'];
  if (r.includes('java') || r.includes('spring') || r.includes('back')) return ['Develop and maintain backend services and REST APIs.', 'Work with databases, validations and application security.', 'Write maintainable code and support integration/testing activities.'];
  if (r.includes('.net') || r.includes('dotnet') || r.includes('c#')) return ['Develop and maintain .NET applications and APIs.', 'Work with C#, ASP.NET and database integrations.', 'Participate in debugging, testing and release support.'];
  if (r.includes('python') || r.includes('data')) return ['Develop Python-based solutions and data workflows.', 'Prepare, validate and analyse data for business requirements.', 'Document solutions and collaborate with cross-functional teams.'];
  if (r.includes('test') || r.includes('qa')) return ['Prepare and execute test scenarios and test cases.', 'Identify, document and track defects through closure.', 'Support regression, functional and release validation.'];
  return ['Carry out the duties associated with the selected role.', 'Deliver quality work within agreed timelines.', 'Collaborate with team members and adopt required tools and technologies.'];
};
