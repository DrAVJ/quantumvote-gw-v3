/**
 * File: Routing.gs
 * Owner: Backend-agent (Agent 2)
 * Project: QuantumVote GW v3
 * Purpose: doGet/doPost routing, view dispatch, bootstrap data.
 * Contracts: API_CONTRACT_v1
 *
 * Depends on:
 *   - Config.gs (QV_CONFIG)
 *   - Auth.gs (Auth_getCurrentUserContext)
 *   - SessionManager.gs (Session_load)
 *   - HTML files in src/html/* (to be implemented by Agent 3)
 *
 * MANUAL APPS SCRIPT NOTE:
 *   Copy into Apps Script as "Routing.gs".
 *   This file must define doGet() as the web app entry point.
 *   Deploy as a web app from Apps Script: Publish > Deploy as web app.
 */

// ---------------------------------------------------------------------------
// doGet(e) — Web App Entry Point
// Routes GET requests to the appropriate view.
// e.parameter.view: 'teacher-console', 'teacher-remote', 'student', 'projector'
// e.parameter.sessionId: optional, required for most views.
// ---------------------------------------------------------------------------
function doGet(e) {
  var view = (e && e.parameter && e.parameter.view) ? e.parameter.view : null;
  var sessionId = (e && e.parameter && e.parameter.sessionId) ? e.parameter.sessionId : null;

  // If no view specified, return a landing page or redirect to teacher-console
  if (!view) {
    return _renderLandingPage();
  }

  // Dispatch to view renderer
  if (view === 'teacher-console') {
    return _renderTeacherConsole(sessionId);
  } else if (view === 'teacher-remote') {
    return _renderTeacherRemote(sessionId);
  } else if (view === 'student') {
    return _renderStudent(sessionId);
  } else if (view === 'projector') {
    return _renderProjector(sessionId);
  } else {
    return _renderError('UNKNOWN_VIEW', 'Unknown view: ' + view);
  }
}

// ---------------------------------------------------------------------------
// doPost(e) — AJAX API Entry Point
// Handles POST requests for server-side actions.
// Not required if all backend calls use google.script.run directly.
// TODO: Implement if AJAX-style polling is needed.
// ---------------------------------------------------------------------------
function doPost(e) {
  // TODO [Agent 3 or Agent 2]: Implement if frontend uses fetch() instead of google.script.run
  return ContentService.createTextOutput(
    JSON.stringify({ ok: false, error: 'NOT_IMPLEMENTED' })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ===========================================================================
// VIEW RENDERERS
// ===========================================================================

// ---------------------------------------------------------------------------
// _renderLandingPage
// Returns a minimal landing page or redirects to teacher-console.
// ---------------------------------------------------------------------------
function _renderLandingPage() {
  // TODO [Agent 3]: Create a src/html/LandingPage.html
  // For now, return a minimal HTML string:
  var html = '<html><body><h1>QuantumVote GW v3</h1>' +
             '<p>Please specify a view: ?view=teacher-console</p></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('QuantumVote GW v3');
}

// ---------------------------------------------------------------------------
// _renderTeacherConsole
// Renders the desktop teacher view.
// ---------------------------------------------------------------------------
function _renderTeacherConsole(sessionId) {
  // Require teacher auth
  try {
    Auth_requireTeacher();
  } catch (err) {
    return _renderError('AUTH_ERROR', err.message);
  }

  var bootstrap = _buildBootstrap('teacher-console', sessionId);

  // TODO [Agent 3]: Use HtmlService.createTemplateFromFile('TeacherConsole')
  // For now, return a placeholder:
  var template = HtmlService.createTemplate(
    '<html><head><title>Teacher Console</title></head>' +
    '<body><h1>Teacher Console</h1>' +
    '<pre id="bootstrap"></pre>' +
    '<script>document.getElementById("bootstrap").textContent = JSON.stringify(<?= bootstrap ?>, null, 2);</script>' +
    '</body></html>'
  );
  template.bootstrap = bootstrap;
  return template.evaluate().setTitle('QuantumVote — Teacher Console');
}

// ---------------------------------------------------------------------------
// _renderTeacherRemote
// Renders the mobile teacher remote control.
// ---------------------------------------------------------------------------
function _renderTeacherRemote(sessionId) {
  try {
    Auth_requireTeacher();
  } catch (err) {
    return _renderError('AUTH_ERROR', err.message);
  }

  var bootstrap = _buildBootstrap('teacher-remote', sessionId);

  // TODO [Agent 3]: Use TeacherRemote.html
  var template = HtmlService.createTemplate(
    '<html><head><title>Teacher Remote</title></head>' +
    '<body><h1>Teacher Remote</h1>' +
    '<pre><?= bootstrap ?></pre>' +
    '</body></html>'
  );
  template.bootstrap = JSON.stringify(bootstrap, null, 2);
  return template.evaluate().setTitle('QuantumVote — Remote');
}

// ---------------------------------------------------------------------------
// _renderStudent
// Renders the student vote view.
// ---------------------------------------------------------------------------
function _renderStudent(sessionId) {
  // Students don't need teacher auth
  var bootstrap = _buildBootstrap('student', sessionId);

  // TODO [Agent 3]: Use StudentVote.html
  var template = HtmlService.createTemplate(
    '<html><head><title>Student Vote</title></head>' +
    '<body><h1>Student Vote</h1>' +
    '<pre><?= bootstrap ?></pre>' +
    '</body></html>'
  );
  template.bootstrap = JSON.stringify(bootstrap, null, 2);
  return template.evaluate().setTitle('QuantumVote — Student');
}

// ---------------------------------------------------------------------------
// _renderProjector
// Renders the projector view.
// ---------------------------------------------------------------------------
function _renderProjector(sessionId) {
  var bootstrap = _buildBootstrap('projector', sessionId);

  // TODO [Agent 3]: Use ProjectorView.html
  var template = HtmlService.createTemplate(
    '<html><head><title>Projector View</title></head>' +
    '<body><h1>Projector View</h1>' +
    '<pre><?= bootstrap ?></pre>' +
    '</body></html>'
  );
  template.bootstrap = JSON.stringify(bootstrap, null, 2);
  return template.evaluate().setTitle('QuantumVote — Projector');
}

// ===========================================================================
// HELPERS
// ===========================================================================

// ---------------------------------------------------------------------------
// _buildBootstrap
// Constructs the initial data payload sent to the client on page load.
// Includes: userContext, sessionId, config, stateSnapshot (if session exists).
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// _renderError
// Returns a simple error page.
// ---------------------------------------------------------------------------
function _renderError(errorCode, message) {
  var html = '<html><body>' +
             '<h1>Error: ' + errorCode + '</h1>' +
             '<p>' + message + '</p>' +
             '</body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('QuantumVote — Error');
}
