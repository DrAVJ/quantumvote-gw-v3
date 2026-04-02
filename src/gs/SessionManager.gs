/**
 * File: SessionManager.gs
 * Owner: Backend-agent (Agent 2)
 * Project: QuantumVote GW v3
 * Purpose: Session lifecycle, state transitions, question navigation.
 * Contracts: API_CONTRACT_v1, DATA_CONTRACT_v1, STATE_MACHINE_v1
 *
 * Depends on:
 *   - Config.gs (QV_CONFIG, QV_STATES)
 *   - StateMachine.gs (validate, apply, buildSnapshot)
 *   - Auth.gs (Auth_getCurrentUserContext, Auth_requireTeacher)
 *   - SheetAdapter.gs (to be implemented by Agent 4)
 *
 * MANUAL APPS SCRIPT NOTE:
 *   Copy into Apps Script as "SessionManager.gs".
 *   Ensure Config.gs, StateMachine.gs, Auth.gs are already present.
 */

// ---------------------------------------------------------------------------
// In-memory cache for hot sessions (optional, for performance).
// PropertiesService is still source of truth; this is a write-through cache.
// ---------------------------------------------------------------------------
var _sessionCache = {};

// ---------------------------------------------------------------------------
// Public API: Session_create
// Creates a new session and writes it to Sheets via SheetAdapter.
// Input: { presentationId, classCode, options: { safeMode, allowVoteChange, ... } }
// Output: { ok: true, sessionId, stateSnapshot } or { ok: false, error }
// ---------------------------------------------------------------------------
function Session_create(presentationId, classCode, options) {
  // Require teacher auth
  Auth_requireTeacher();

  if (!presentationId || !classCode) {
    return {
      ok: false,
      error: 'MISSING_PARAM',
      message: 'presentationId and classCode are required.'
    };
  }

  options = options || {};
  var safeMode           = (options.safeMode !== false);
  var allowVoteChange    = (options.allowVoteChange !== false);
  var discussionSeconds  = options.discussionSeconds ||
                           QV_CONFIG.DEFAULT_DISCUSSION_SECONDS;

  var userContext = Auth_getCurrentUserContext();
  var teacherEmail = userContext.email;

  var sessionId = 'sess_' + Utilities.getUuid();
  var now = new Date().toISOString();

  var sessionRow = {
    sessionId:        sessionId,
    presentationId:   presentationId,
    teacherEmail:     teacherEmail,
    classCode:        classCode,
    safeMode:         safeMode,
    status:           'active',
    currentQuestionId: null,
    currentState:     QV_STATES.IDLE,
    createdAt:        now,
    startedAt:        now,
    endedAt:          null
  };

  // TODO [Agent 4]: SheetAdapter_writeSession(sessionRow)
  // For now, store in PropertiesService as temporary fallback
  var props = PropertiesService.getScriptProperties();
  props.setProperty('session_' + sessionId, JSON.stringify(sessionRow));

  var snapshot = StateMachine_buildSnapshot(sessionId, safeMode);
  props.setProperty('snapshot_' + sessionId, JSON.stringify(snapshot));

  _sessionCache[sessionId] = { session: sessionRow, snapshot: snapshot };

  return {
    ok: true,
    sessionId: sessionId,
    stateSnapshot: snapshot
  };
}

// ---------------------------------------------------------------------------
// Public API: Session_load
// Loads a session from Sheets or PropertiesService.
// Output: { ok, session, stateSnapshot, links: {...} }
// ---------------------------------------------------------------------------
function Session_load(sessionId) {
  if (!sessionId) {
    return { ok: false, error: 'MISSING_SESSION_ID' };
  }

  // Check cache
  if (_sessionCache[sessionId]) {
    var cached = _sessionCache[sessionId];
    return {
      ok: true,
      session: cached.session,
      stateSnapshot: cached.snapshot,
      links: _buildSessionLinks(sessionId)
    };
  }

  // TODO [Agent 4]: SheetAdapter_loadSession(sessionId)
  // Temporary fallback: read from PropertiesService
  var props = PropertiesService.getScriptProperties();
  var sessionData = props.getProperty('session_' + sessionId);
  var snapshotData = props.getProperty('snapshot_' + sessionId);

  if (!sessionData || !snapshotData) {
    return { ok: false, error: 'SESSION_NOT_FOUND', sessionId: sessionId };
  }

  var session = JSON.parse(sessionData);
  var snapshot = JSON.parse(snapshotData);

  _sessionCache[sessionId] = { session: session, snapshot: snapshot };

  return {
    ok: true,
    session: session,
    stateSnapshot: snapshot,
    links: _buildSessionLinks(sessionId)
  };
}

// ---------------------------------------------------------------------------
// Public API: Session_activateQuestion
// Sets currentQuestionId and currentSlideId, transitions to QUESTION_READY.
// Output: { ok, stateSnapshot }
// ---------------------------------------------------------------------------
function Session_activateQuestion(sessionId, questionId) {
  Auth_requireTeacher();

  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;

  var snapshot = loaded.stateSnapshot;

  // TODO [Agent 4]: SheetAdapter_loadQuestion(questionId) to get slideId
  // For now, assume questionId === slideId or mock:
  var slideId = questionId; // placeholder

  snapshot.currentQuestionId = questionId;
  snapshot.currentSlideId    = slideId;

  // Transition to QUESTION_READY (state 1)
  var result = StateMachine_apply(snapshot, QV_STATES.QUESTION_READY, {});
  if (!result.ok) return result;

  snapshot = result.stateSnapshot;

  // Write back
  _saveSnapshot(sessionId, snapshot);

  return { ok: true, stateSnapshot: snapshot };
}

// ---------------------------------------------------------------------------
// Public API: Session_nextQuestion / Session_prevQuestion
// Navigates to next/previous question in the presentation.
// These are optional; if not implemented fully, return a stub.
// ---------------------------------------------------------------------------
function Session_nextQuestion(sessionId) {
  // TODO [Agent 4]: SheetAdapter_getNextQuestionId(currentQuestionId)
  return { ok: false, error: 'NOT_IMPLEMENTED', message: 'Session_nextQuestion pending' };
}

function Session_prevQuestion(sessionId) {
  // TODO [Agent 4]: SheetAdapter_getPrevQuestionId(currentQuestionId)
  return { ok: false, error: 'NOT_IMPLEMENTED', message: 'Session_prevQuestion pending' };
}

// ---------------------------------------------------------------------------
// Public API: Session_transition
// Validates and applies a state transition.
// Input: sessionId, nextState (int), payload (object)
// Output: { ok, stateSnapshot } or { ok: false, error }
// ---------------------------------------------------------------------------
function Session_transition(sessionId, nextState, payload) {
  Auth_requireTeacher();

  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;

  var snapshot = loaded.stateSnapshot;
  var result = StateMachine_apply(snapshot, nextState, payload || {});
  if (!result.ok) return result;

  snapshot = result.stateSnapshot;

  // Record who triggered transition
  var userContext = Auth_getCurrentUserContext();
  snapshot.lastCommandByRole = userContext.isTeacher ? 'teacher' : 'unknown';

  _saveSnapshot(sessionId, snapshot);

  return { ok: true, stateSnapshot: snapshot };
}

// ---------------------------------------------------------------------------
// Public API: Session_getState
// Returns the current snapshot for polling by clients.
// Output: { ok, stateSnapshot }
// ---------------------------------------------------------------------------
function Session_getState(sessionId) {
  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;

  return { ok: true, stateSnapshot: loaded.stateSnapshot };
}

// ---------------------------------------------------------------------------
// Public API: Session_archive
// Transitions session to ARCHIVED state and marks session status='archived'.
// Output: { ok, archived: true }
// ---------------------------------------------------------------------------
function Session_archive(sessionId) {
  Auth_requireTeacher();

  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;

  var snapshot = loaded.stateSnapshot;

  // Transition to ARCHIVED
  var result = StateMachine_apply(snapshot, QV_STATES.ARCHIVED, {});
  if (!result.ok) return result;

  snapshot = result.stateSnapshot;
  _saveSnapshot(sessionId, snapshot);

  // Also mark session row as archived
  var session = loaded.session;
  session.status = 'archived';
  session.endedAt = new Date().toISOString();

  // TODO [Agent 4]: SheetAdapter_updateSessionStatus(sessionId, 'archived', endedAt)
  var props = PropertiesService.getScriptProperties();
  props.setProperty('session_' + sessionId, JSON.stringify(session));

  _sessionCache[sessionId] = { session: session, snapshot: snapshot };

  return { ok: true, archived: true };
}

// ===========================================================================
// PRIVATE HELPERS
// ===========================================================================

// ---------------------------------------------------------------------------
// _saveSnapshot
// Writes snapshot back to PropertiesService (and cache).
// TODO [Agent 4]: Also persist to Sheets Sessions table.
// ---------------------------------------------------------------------------
function _saveSnapshot(sessionId, snapshot) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('snapshot_' + sessionId, JSON.stringify(snapshot));

  if (_sessionCache[sessionId]) {
    _sessionCache[sessionId].snapshot = snapshot;
  }
}

// ---------------------------------------------------------------------------
// _buildSessionLinks
// Constructs URLs for the 4 views.
// Returns { teacherConsoleUrl, teacherRemoteUrl, studentUrl, projectorUrl }
// ---------------------------------------------------------------------------
function _buildSessionLinks(sessionId) {
  var baseUrl = ScriptApp.getService().getUrl();

  return {
    teacherConsoleUrl: baseUrl + '?view=teacher-console&sessionId=' + sessionId,
    teacherRemoteUrl:  baseUrl + '?view=teacher-remote&sessionId=' + sessionId,
    studentUrl:        baseUrl + '?view=student&sessionId=' + sessionId,
    projectorUrl:      baseUrl + '?view=projector&sessionId=' + sessionId
  };
}
