/**
 * File: Auth.gs
 * Owner: Backend-agent (Agent 2)
 * Project: QuantumVote GW v3
 * Purpose: Authentication and authorization guards.
 * Contracts: API_CONTRACT_v1
 *
 * Depends on:
 *   - Config.gs (QV_CONFIG.TEACHER_DOMAINS, QV_CONFIG.TEACHER_EMAILS)
 *
 * MANUAL APPS SCRIPT NOTE:
 *   Copy into Apps Script as "Auth.gs".
 *   This uses Session.getActiveUser() which requires Google account sign-in.
 */

// ---------------------------------------------------------------------------
// Public API: Auth_getCurrentUserContext
// Returns the current user's context: email, domain, isTeacher, isAuthenticated.
// Output: { email, domain, isTeacher, isAuthenticated }
// ---------------------------------------------------------------------------
function Auth_getCurrentUserContext() {
  var user = Session.getActiveUser();
  var email = user ? user.getEmail() : null;

  if (!email) {
    return {
      email: null,
      domain: null,
      isTeacher: false,
      isAuthenticated: false
    };
  }

  var domain = null;
  if (email.indexOf('@') > -1) {
    domain = email.split('@')[1];
  }

  var isTeacher = _isTeacher(email, domain);

  return {
    email: email,
    domain: domain,
    isTeacher: isTeacher,
    isAuthenticated: true
  };
}

// ---------------------------------------------------------------------------
// Public API: Auth_requireTeacher
// Throws an error if the current user is not a teacher.
// Use this at the top of teacher-only functions.
// ---------------------------------------------------------------------------
function Auth_requireTeacher() {
  var ctx = Auth_getCurrentUserContext();
  if (!ctx.isAuthenticated) {
    throw new Error('Authentication required. Please sign in with a Google account.');
  }
  if (!ctx.isTeacher) {
    throw new Error(
      'Teacher authorization required. User ' + ctx.email + ' is not authorized.'
    );
  }
}

// ===========================================================================
// PRIVATE HELPERS
// ===========================================================================

// ---------------------------------------------------------------------------
// _isTeacher
// Checks if email/domain qualifies as teacher according to config.
// If TEACHER_EMAILS is set, check explicit list.
// Otherwise, check TEACHER_DOMAINS.
// If both are empty, accept any authenticated user.
// ---------------------------------------------------------------------------
function _isTeacher(email, domain) {
  var teacherEmails = QV_CONFIG.TEACHER_EMAILS;
  var teacherDomains = QV_CONFIG.TEACHER_DOMAINS;

  // If explicit email list is provided, check it
  if (teacherEmails && teacherEmails.length > 0) {
    var emailList = teacherEmails.split(',').map(function(e) { return e.trim(); });
    return emailList.indexOf(email) > -1;
  }

  // Otherwise check domain list
  if (teacherDomains && teacherDomains.length > 0) {
    var domainList = teacherDomains.split(',').map(function(d) { return d.trim(); });
    return domainList.indexOf(domain) > -1;
  }

  // If neither is set, accept all authenticated users as teachers (dev mode)
  return true;
}
