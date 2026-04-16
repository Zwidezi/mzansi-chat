// Basic content moderation for MzansiChat
// Filters profanity, validates handles, and sanitizes content

// Profanity filter — SA-specific + common English
const PROFANITY_LIST = [
    'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'pussy',
    'kaffir', 'kaffer', 'boerhatred', 'hottentot',
    'msunery', 'moer', 'dof', 'poes',
];

const profanityRegex = new RegExp(
    PROFANITY_LIST.map(w => `\\b${w}\\b`).join('|'),
    'gi'
);

// Check if text contains profanity
export const hasProfanity = (text) => {
    if (!text || typeof text !== 'string') return false;
    return profanityRegex.test(text);
};

// Censor profanity with asterisks
export const censorProfanity = (text) => {
    if (!text || typeof text !== 'string') return text;
    return text.replace(profanityRegex, (match) => '*'.repeat(match.length));
};

// Validate handle — 3-20 chars, alphanumeric + underscore, no profanity
export const validateHandle = (handle) => {
    if (!handle || typeof handle !== 'string') return { valid: false, error: 'Handle is required' };
    const clean = handle.trim().toLowerCase();
    if (clean.length < 3) return { valid: false, error: 'Handle must be at least 3 characters' };
    if (clean.length > 20) return { valid: false, error: 'Handle must be 20 characters or less' };
    if (!/^[a-z0-9_]+$/.test(clean)) return { valid: false, error: 'Handle can only contain letters, numbers, and underscores' };
    if (hasProfanity(clean)) return { valid: false, error: 'Handle contains inappropriate language' };
    return { valid: true, handle: clean };
};

// Validate display name — 1-50 chars, no profanity
export const validateName = (name) => {
    if (!name || typeof name !== 'string') return { valid: false, error: 'Name is required' };
    const clean = name.trim();
    if (clean.length < 1) return { valid: false, error: 'Name is required' };
    if (clean.length > 50) return { valid: false, error: 'Name must be 50 characters or less' };
    if (hasProfanity(clean)) return { valid: false, error: 'Name contains inappropriate language' };
    return { valid: true, name: clean };
};

// Validate payment amount
export const validatePaymentAmount = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return { valid: false, error: 'Invalid amount' };
    if (num < 1) return { valid: false, error: 'Minimum amount is R1' };
    if (num > 10000) return { valid: false, error: 'Maximum amount is R10,000' };
    return { valid: true, amount: num };
};