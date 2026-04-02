/**
 * File: Routing.gs
 * Owner: Agent 5 (Integration)
 * Based on: Agent 2 backend + Agent 5 integration fixes
 * Purpose: doGet/doPost routing, view dispatch, bootstrap data.
 * Contracts: API_CONTRACT_v1
 *
 * INTEGRATION FIXES (Agent 5):
 *  - _renderTeacherConsole → HtmlService.createTemplateFromFile('index')
 *  - _renderStudent       → HtmlService.createTemplateFromFile('vote')
 *  - _renderResults       → HtmlService.createTemplateFromFile('results')
 *  - _renderAdmin         → HtmlService.createTemplateFromFile('admin')
 *  - view='results' added for results page (student redirect from state 9)
 *  - view='admin'   added for admin/debug page
 *  - Bootstrap JSON injected via template variable 'bootstrapJson'
 */

// ---------------------------------------------------------------------------
// doGet(e) — Web App Entry Point
// Routes GET requests to the appropriate view.
// e.parameter.view: 'teacher-console', 'teacher-remote', 'student',
//                   'projector', 'results', 'admin'
// e.parameter.sessionId: optional, required for most views.
// ---------------------------------------------------------------------------
function doGet(e) {
  var view      = (e && e.parameter && e.parameter.view)      ? e.parameter.view      : null;
  var sessionId = (e && e.parameter && e.parameter.sessionId) ? e.parameter.sessionId : null;

  // Default: teacher console
  if (!view) {
    return _renderTeacherConsole(sessionId);
  }

  if (view === 'teacher-console') {
    return _renderTeacherConsole(sessionId);
  } else if (view === 'teacher-remote') {
    return _renderTeacherRemote(sessionId);
  } else if (view === 'student') {
    return _renderStudent(sessionId);
  } else if (view === 'projector') {
    return _renderProjector(sessionId);
  } else if (view === 'results') {
    return _renderResults(sessionId, e.parameter.questionId || '');
  } else if (view === 'admin') {
    return _renderAdmin(sessionId);
  } else {
    return _renderError('UNKNOWN_VIEW', 'Unknown view: ' + view);
  }
}

// ---------------------------------------------------------------------------
// doPost(e) — AJAX API Entry Point (stub; all calls use google.script.run)
// ---------------------------------------------------------------------------
function doPost(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: false, error: 'NOT_IMPLEMENTED' })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ===========================================================================
// VIEW RENDERERS
// ===========================================================================

function _renderTeacherConsole(sessionId) {
  try { Auth_requireTeacher(); } catch (err) {
    return _renderError('AUTH_ERROR', err.message);
  }
  var bootstrap = _buildBootstrap('teacher-console', sessionId);
  var template = HtmlService.createTemplateFromFile('index');
  template.bootstrapJson = JSON.stringify(bootstrap);
  return template.evaluate()
    .setTitle('QuantumVote — Teacher Console')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function _renderTeacherRemote(sessionId) {
  try { Auth_requireTeacher(); } catch (err) {
    return _renderError('AUTH_ERROR', err.message);
  }
  var bootstrap = _buildBootstrap('teacher-remote', sessionId);
  // Teacher remote reuses index.html (same controls, mobile-optimised via CSS)
  var template = HtmlService.createTemplateFromFile('index');
  template.bootstrapJson = JSON.stringify(bootstrap);
  return template.evaluate()
    .setTitle('QuantumVote — Remote')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function _renderStudent(sessionId) {
  var bootstrap = _buildBootstrap('student', sessionId);
  var template = HtmlService.createTemplateFromFile('vote');
  template.bootstrapJson = JSON.stringify(bootstrap);
  return template.evaluate()
    .setTitle('QuantumVote — Rösta')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function _renderProjector(sessionId) {
  var bootstrap = _buildBootstrap('projector', sessionId);
  // Projector reuses results page (read-only, no private data)
  var template = HtmlService.createTemplateFromFile('results');
  template.bootstrapJson = JSON.stringify(bootstrap);
  return template.evaluate()
    .setTitle('QuantumVote — Projektor')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function _renderResults(sessionId, questionId) {
  var bootstrap = _buildBootstrap('results', sessionId);
  bootstrap.questionId = questionId || null;
  var template = HtmlService.createTemplateFromFile('results');
  template.bootstrapJson = JSON.stringify(bootstrap);
  return template.evaluate()
    .setTitle('QuantumVote — Resultat')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function _renderAdmin(sessionId) {
  try { Auth_requireTeacher(); } catch (err) {
    return _renderError('AUTH_ERROR', err.message);
  }
  var bootstrap = _buildBootstrap('admin', sessionId);
  var template = HtmlService.createTemplateFromFile('admin');
  template.bootstrapJson = JSON.stringify(bootstrap);
  return template.evaluate()
    .setTitle('QuantumVote — Admin')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ===========================================================================
// HELPERS
// ===========================================================================

/**
 * _buildBootstrap
 * Constructs the initial data payload sent to the client on page load.
 * Includes: userContext, sessionId, config, stateSnapshot (if session exists).
 */
function _buildBootstrap(view, sessionId) {
  var userContext = Auth_getCurrentUserContext();
  var bootstrap = {
    view: view,
    userContext: userContext,
    sessionId: sessionId || null,
    config: {
      pollingIntervalActiveMs: QV_CONFIG.POLLING_INTERVAL_ACTIVE_MS,
      pollingIntervalIdleMs:   QV_CONFIG.POLLING_INTERVAL_IDLE_MS,
      validAnswers:            QV_CONFIG.VALID_ANSWERS,
      appVersion:              QV_CONFIG.APP_VERSION
    },
    stateSnapshot: null,
    error: null
  };

  if (sessionId) {
    var loaded = Session_load(sessionId);
    if (loaded.ok) {
      bootstrap.stateSnapshot = loaded.stateSnapshot;
    } else {
      bootstrap.error = loaded.error || 'SESSION_NOT_FOUND';
    }
  }
  return bootstrap;
}

/**
 * _renderError
 * Returns a simple error page.
 */
function _renderError(errorCode, message) {
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
    '<body style="font-family:sans-serif;padding:20px">' +
    '<h2>Fel: ' + errorCode + '</h2>' +
    '<p>' + message + '</p>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('QuantumVote — Fel');
}
