const crypto = require('crypto');
const { promisify } = require('util');

// The PEPPER is a secret key that only the server knows.
// It shouldn't be stored in the database.
const DEFAULT_PEPPER = 'axis_default_secret_pepper_1942';
const PEPPER = process.env.PEPPER_SECRET || DEFAULT_PEPPER;
if (PEPPER === DEFAULT_PEPPER) {
    console.warn('[Security] PEPPER_SECRET is not set: using the public default pepper. Set PEPPER_SECRET in production.');
}

const ITERATIONS = 210000;
const LEGACY_ITERATIONS = 1000;
const KEY_LENGTH = 64;

const pbkdf2 = promisify(crypto.pbkdf2);
const derive = (password, salt, iterations) =>
    pbkdf2(password + PEPPER, salt, iterations, KEY_LENGTH, 'sha512');

const safeEqualHex = (hex, buffer) => {
    const expected = Buffer.from(hex || '', 'hex');
    return expected.length === buffer.length && crypto.timingSafeEqual(expected, buffer);
};

/**
 * Creates a salted and peppered hash for a plain text password.
 * Format returned: "pbkdf2$<iterations>$<salt>$<hash>"
 */
async function hashPassword(password) {
    if (!password) return "";
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = (await derive(password, salt, ITERATIONS)).toString('hex');
    return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

/**
 * Verifies a plain text password against a stored hash.
 * Also accepts the legacy "salt:hash" format (1000 iterations).
 */
async function verifyPassword(password, storedHash) {
    if (!storedHash) return true; // No password required if falsy
    if (typeof password !== 'string' || !password) return false;

    if (storedHash.startsWith('pbkdf2$')) {
        const [, iterations, salt, hash] = storedHash.split('$');
        const iter = parseInt(iterations, 10);
        if (!iter || !salt || !hash) return false;
        return safeEqualHex(hash, await derive(password, salt, iter));
    }

    if (storedHash.includes(':')) {
        const [salt, hash] = storedHash.split(':');
        return safeEqualHex(hash, await derive(password, salt, LEGACY_ITERATIONS));
    }

    // Unhashed values are never accepted.
    return false;
}

module.exports = {
    hashPassword,
    verifyPassword
};
