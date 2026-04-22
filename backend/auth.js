const crypto = require("crypto");

const PEPPER = process.env.PEPPER_SECRET || "axis_default_secret_pepper_1942";

/**
 * Creates a salted and peppered hash for a plain text password.
 * Format returned: "salt:hash"
 */
function hashPassword(password) {
  if (!password) return "";
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password + PEPPER, salt, 1000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain text password against a stored "salt:hash".
 */
function verifyPassword(password, storedHash) {
  if (!storedHash) return true; // No password required if falsy
  if (!password) return false; // Provided nothing but a password is required

  // In case there's an old plaintext password that wasn't hashed (fallback/edge case, though DB is fresh)
  if (!storedHash.includes(":")) {
    return storedHash === password;
  }

  const [salt, hash] = storedHash.split(":");
  const verifyHash = crypto
    .pbkdf2Sync(password + PEPPER, salt, 1000, 64, "sha512")
    .toString("hex");
  return hash === verifyHash;
}

module.exports = {
  hashPassword,
  verifyPassword,
};
