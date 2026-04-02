// =============================================================================
// FILE: src/gs/Auth.gs
// PROJECT: QuantumVote GW v3
// OWNER: Agent 2 (Backend & API)
// PURPOSE: Admin authentication and authorization guards
// CONTRACT: API_CONTRACT_v1.md (auth section)
// STATUS: PLACEHOLDER – implementation reserved for Agent 2
// NOTE: Uses Google session (Session.getActiveUser()) – no external auth
// =============================================================================

/**
 * isAdmin(email) – Checks if the caller is an authorized admin
 * @param {string} email - Caller's email address
 * @returns {boolean}
 */
function isAdmin(email) {
  // TODO (Agent 2): Compare against ADMIN_EMAILS list in Config.gs
  throw new Error('isAdmin not yet implemented – reserved for Agent 2');
}

/**
 * requireAdmin() – Throws if the active user is not an admin
 * Use at the top of admin-only functions.
 */
function requireAdmin() {
  // TODO (Agent 2): Call isAdmin(Session.getActiveUser().getEmail())
  // Throw AuthError if not authorized
  throw new Error('requireAdmin not yet implemented – reserved for Agent 2');
}

/**
 * getCallerEmail() – Returns the email of the active Google user
 * @returns {string} email address
 */
function getCallerEmail() {
  // TODO (Agent 2): Return Session.getActiveUser().getEmail()
  throw new Error('getCallerEmail not yet implemented – reserved for Agent 2');
}
