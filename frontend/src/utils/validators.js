// ── Frontend validation helpers ───────────────────────────────────────────────

export const validateAadhaar = (v) => {
  if (!v) return "Aadhaar number is required.";
  if (!/^\d{12}$/.test(v.trim())) return "Aadhaar must be exactly 12 digits (numbers only).";
  return null;
};

export const validatePhone = (v) => {
  if (!v) return "Phone number is required.";
  const digits = v.trim().replace(/^\+91/, "");
  if (!/^\d{10}$/.test(digits)) return "Phone must be exactly 10 digits (optionally prefixed with +91).";
  return null;
};

export const validateEmail = (v) => {
  if (!v) return "Email is required.";
  if (!/^[a-zA-Z0-9._%+\-]+@gmail\.com$/.test(v.trim()))
    return "Email must be a valid @gmail.com address.";
  return null;
};

export const validatePassword = (v) => {
  if (!v) return "Password is required.";
  if (v.length < 6) return "Password must be at least 6 characters.";
  if (v.length > 128) return "Password must be at most 128 characters.";
  return null;
};

export const validateName = (v, field = "Name") => {
  if (!v || !v.trim()) return `${field} is required.`;
  if (v.trim().length < 2) return `${field} must be at least 2 characters.`;
  if (!/^[A-Za-z\s'\-.]+$/.test(v.trim())) return `${field} may only contain letters, spaces, hyphens, apostrophes, and dots.`;
  return null;
};

export const validateSalary = (v, field = "Salary") => {
  const n = Number(v);
  if (!v || isNaN(n)) return `${field} is required.`;
  if (n <= 0) return `${field} must be greater than zero.`;
  if (n > 10000000) return `${field} is unreasonably large.`;
  return null;
};

export const validatePrice = (v, field = "Price") => {
  if (v === "" || v === null || v === undefined) return null; // optional
  const n = Number(v);
  if (isNaN(n) || n <= 0) return `${field} must be a positive number.`;
  if (n > 10000000000) return `${field} is unreasonably large.`;
  return null;
};

export const validatePincode = (v) => {
  if (!v) return "Pincode is required.";
  if (!/^\d{6}$/.test(v.trim())) return "Pincode must be exactly 6 digits.";
  return null;
};

export const validateBuildYear = (v) => {
  const n = Number(v);
  if (!v || isNaN(n)) return "Build year is required.";
  if (n < 1900 || n > 2030) return "Build year must be between 1900 and 2030.";
  return null;
};

export const validateSizeSqft = (v) => {
  const n = Number(v);
  if (!v || isNaN(n) || n <= 0) return "Size must be a positive number.";
  if (n > 1000000) return "Size cannot exceed 1,000,000 sqft.";
  return null;
};

// Run multiple validators and return first error or null
export const runValidators = (validators) => {
  for (const err of validators) {
    if (err) return err;
  }
  return null;
};
