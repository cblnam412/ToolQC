/**
 * Shared utility: generate a short unique ID (same algorithm as frontend).
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

module.exports = { generateId };
