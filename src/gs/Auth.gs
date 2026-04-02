/**
 * File: Auth.gs
 * Owner: Agent 2 (Backend) — copied verbatim to agent5-integration
 * Purpose: Authentication and authorization guards.
 * Contracts: API_CONTRACT_v1
 */

function Auth_getCurrentUserContext() {
  var user  = Session.getActiveUser();
  var email = user ? user.getEmail() : null;

  if (!email) {
    return { email: null, domain: null, isTeacher: false, isAuthenticated: false };
  }

  var domain = null;
  if (email.indexOf('@') > -1) { domain = email.split('@')[1]; }

  var isTeacher = _isTeacher(email, domain);
  return { email: email, domain: domain, isTeacher: isTeacher, isAuthenticated: true };
}

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

function _isTeacher(email, domain) {
  var teacherEmails  = QV_CONFIG.TEACHER_EMAILS;
  var teacherDomains = QV_CONFIG.TEACHER_DOMAINS;

  if (teacherEmails && teacherEmails.length > 0) {
    var emailList = teacherEmails.split(',').map(function(e) { return e.trim(); });
    return emailList.indexOf(email) > -1;
  }
  if (teacherDomains && teacherDomains.length > 0) {
    var domainList = teacherDomains.split(',').map(function(d) { return d.trim(); });
    return domainList.indexOf(domain) > -1;
  }
  // Neither set — accept any authenticated user (dev mode)
  return true;
}
