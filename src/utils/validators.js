export const REGEX = {
  name: /^[A-Za-z ]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  mobile: /^[6-9]\d{9}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  aadhaar: /^\d{12}$/,
  uan: /^\d{12}$/,
  year: /^(19|20)\d{2}$/,
  number: /^\d+(\.\d{1,2})?$/,
};

export const onlyLetters = (value = "") =>
  value.replace(/[^A-Za-z ]/g, "").replace(/\s+/g, " ").slice(0, 60);

export const onlyDigits = (value = "", maxLength = 99) =>
  value.replace(/\D/g, "").slice(0, maxLength);

export const cleanPan = (value = "") =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);

export const cleanAlphaNumber = (value = "", maxLength = 40) =>
  value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, maxLength);

export function validateCandidateIdentity(candidate = {}) {
  const errors = [];
  const name = (candidate.fullName || "").trim();
  const email = (candidate.email || "").trim();
  const phone = (candidate.phone || "").trim();
  const pan = (candidate.pan || candidate.panNumber || "").trim().toUpperCase();
  const aadhaar = (candidate.aadhaar || candidate.aadhaarNumber || "").trim();
  const uan = (candidate.uan || candidate.uanNumber || "").trim();

  if (!name) errors.push("Full name is required.");
  else if (!REGEX.name.test(name)) errors.push("Full name must contain only letters and spaces.");

  if (!REGEX.email.test(email)) errors.push("Please enter a valid email address.");
  if (!REGEX.mobile.test(phone)) errors.push("Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9.");
  if (!REGEX.pan.test(pan)) errors.push("PAN must be exactly 10 characters in ABCDE1234F format.");
  if (aadhaar && !REGEX.aadhaar.test(aadhaar)) errors.push("Aadhaar number must be exactly 12 digits.");
  if (uan && !REGEX.uan.test(uan)) errors.push("UAN number must be exactly 12 digits.");

  return errors;
}

export function findDuplicateIdentity(list = [], candidate = {}, currentCandidateId = "") {
  const pan = (candidate.pan || candidate.panNumber || "").trim().toUpperCase();
  const aadhaar = (candidate.aadhaar || candidate.aadhaarNumber || "").trim();
  const uan = (candidate.uan || candidate.uanNumber || "").trim();

  return list.find((item) => {
    if (item.id === currentCandidateId) return false;
    const itemPan = (item.pan || item.panNumber || "").trim().toUpperCase();
    const itemAadhaar = (item.aadhaar || item.aadhaarNumber || "").trim();
    const itemUan = (item.uan || item.uanNumber || "").trim();

    return (
      (pan && itemPan === pan) ||
      (aadhaar && itemAadhaar === aadhaar) ||
      (uan && itemUan === uan)
    );
  });
}
