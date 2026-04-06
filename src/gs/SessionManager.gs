/**
 * File: SessionManager.gs
 * Owner: Agent 5 (Integration) — based on Agent 2 backend
 * Purpose: Session lifecycle, state transitions, question navigation.
 * Contracts: API_CONTRACT_v1, DATA_CONTRACT_v1, STATE_MACHINE_v1
 *
 * INTEGRATION FIXES (Agent 5):
 *  - Session_create: wired SheetAdapter_writeSession
 *  - Session_load: falls back SheetAdapter_loadSession before PropertiesService
 *  - Session_activateQuestion: wired SheetAdapter_loadQuestion for real slideId
 *  - Session_nextQuestion / Session_prevQuestion: wired SheetAdapter
 *  - _saveSnapshot: also persists currentState to Sessions sheet
 */

// In-memory cache for hot sessions (write-through)
var _sessionCache = {};

// ---------------------------------------------------------------------------
// Public API: Session_create
// ---------------------------------------------------------------------------
function Session_create(presentationId, classCode, options) {
  Auth_requireTeacher();

  // presentationId är valfritt sedan Questions-bladet är primär datakälla
  if (!classCode) {
    return { ok: false, error: 'MISSING_PARAM',
             message: 'classCode is required.' };
  }

  options = options || {};
  var safeMode          = (options.safeMode !== false);
  var allowVoteChange   = (options.allowVoteChange !== false);
  var discussionSeconds = options.discussionSeconds ||
                          QV_CONFIG.DEFAULT_DISCUSSION_SECONDS;

  var userContext  = Auth_getCurrentUserContext();
  var teacherEmail = userContext.email;
  var sessionId    = 'sess_' + Utilities.getUuid();
  var now          = new Date().toISOString();

  var sessionRow = {
    sessionId:         sessionId,
    presentationId:    presentationId || null,   // bevaras för bakåtkompatibilitet
    teacherEmail:      teacherEmail,
    classCode:         classCode,
    safeMode:          safeMode,
    status:            'active',
    currentQuestionId: null,
    currentState:      QV_STATES.IDLE,
    createdAt:         now,
    startedAt:         now,
    endedAt:           null
  };

  // Persist to Sheets
  SheetAdapter_writeSession(sessionRow);

  var snapshot = StateMachine_buildSnapshot(sessionId, safeMode);

  // Also store in PropertiesService for fast read access
  var props = PropertiesService.getScriptProperties();
  props.setProperty('session_'  + sessionId, JSON.stringify(sessionRow));
  props.setProperty('snapshot_' + sessionId, JSON.stringify(snapshot));

  _sessionCache[sessionId] = { session: sessionRow, snapshot: snapshot };

  return { ok: true, sessionId: sessionId, stateSnapshot: snapshot };
}
// ---------------------------------------------------------------------------
// Public API: Session_load
// ---------------------------------------------------------------------------
function Session_load(sessionId) {
  if (!sessionId) {
    return { ok: false, error: 'MISSING_SESSION_ID' };
  }

  // Check in-memory cache first
  if (_sessionCache[sessionId]) {
    var cached = _sessionCache[sessionId];
    return { ok: true, session: cached.session,
             stateSnapshot: cached.snapshot,
             links: _buildSessionLinks(sessionId) };
  }

  // Try PropertiesService (fast path)
  var props        = PropertiesService.getScriptProperties();
  var sessionData  = props.getProperty('session_'  + sessionId);
  var snapshotData = props.getProperty('snapshot_' + sessionId);

  if (sessionData && snapshotData) {
    var session  = JSON.parse(sessionData);
    var snapshot = JSON.parse(snapshotData);
    _sessionCache[sessionId] = { session: session, snapshot: snapshot };
    return { ok: true, session: session,
             stateSnapshot: snapshot,
             links: _buildSessionLinks(sessionId) };
  }

  // Fall back to Sheets
  var sheetSession = SheetAdapter_loadSession(sessionId);
  if (!sheetSession) {
    return { ok: false, error: 'SESSION_NOT_FOUND', sessionId: sessionId };
  }

  // Rebuild minimal snapshot from stored currentState
  var rebuiltSnapshot = StateMachine_buildSnapshot(sessionId, sheetSession.safeMode);
  rebuiltSnapshot.currentState      = sheetSession.currentState      || QV_STATES.IDLE;
  rebuiltSnapshot.currentQuestionId = sheetSession.currentQuestionId || null;

  // Populate cache and PropertiesService
  props.setProperty('session_'  + sessionId, JSON.stringify(sheetSession));
  props.setProperty('snapshot_' + sessionId, JSON.stringify(rebuiltSnapshot));
  _sessionCache[sessionId] = { session: sheetSession, snapshot: rebuiltSnapshot };

  return { ok: true, session: sheetSession,
           stateSnapshot: rebuiltSnapshot,
           links: _buildSessionLinks(sessionId) };
}

// ---------------------------------------------------------------------------
// Public API: Session_activateQuestion
// ---------------------------------------------------------------------------
function Session_activateQuestion(sessionId, questionId) {
  Auth_requireTeacher();
  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;

  var snapshot = loaded.stateSnapshot;

  // NYTT — matchar nytt returformat { ok, question }
  var slideId = questionId; // fallback
  var qResult = SheetAdapter_loadQuestion(questionId);
  if (qResult.ok && qResult.question && qResult.question.slideId) {
    slideId = qResult.question.slideId;
  }

  snapshot.currentQuestionId = questionId;
  snapshot.currentSlideId    = slideId;

  var result = StateMachine_apply(snapshot, QV_STATES.QUESTION_READY, {});
  if (!result.ok) return result;
  snapshot = result.stateSnapshot;

  _saveSnapshot(sessionId, snapshot);
  return { ok: true, stateSnapshot: snapshot };
}

// ---------------------------------------------------------------------------
// Public API: Session_nextQuestion
// ---------------------------------------------------------------------------
function Session_nextQuestion(sessionId) {
  Auth_requireTeacher();
  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;

  var currentQId = loaded.stateSnapshot.currentQuestionId;
  var nextQId    = SheetAdapter_getNextQuestionId(currentQId);
  if (!nextQId) {
    return { ok: false, error: 'NO_NEXT_QUESTION',
             message: 'No further questions in this presentation.' };
  }
  return Session_activateQuestion(sessionId, nextQId);
}

// ---------------------------------------------------------------------------
// Public API: Session_prevQuestion
// ---------------------------------------------------------------------------
function Session_prevQuestion(sessionId) {
  Auth_requireTeacher();
  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;

  var currentQId = loaded.stateSnapshot.currentQuestionId;
  var prevQId    = SheetAdapter_getPrevQuestionId(currentQId);
  if (!prevQId) {
    return { ok: false, error: 'NO_PREV_QUESTION',
             message: 'Already at first question.' };
  }
  return Session_activateQuestion(sessionId, prevQId);
}

// ---------------------------------------------------------------------------
// Public API: Session_transition
// ---------------------------------------------------------------------------
function Session_transition(sessionId, nextState, payload) {
  Auth_requireTeacher();
  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;

  var snapshot = loaded.stateSnapshot;
  var result   = StateMachine_apply(snapshot, nextState, payload || {});
  if (!result.ok) return result;
  snapshot = result.stateSnapshot;

  var userContext = Auth_getCurrentUserContext();
  snapshot.lastCommandByRole = userContext.isTeacher ? 'teacher' : 'unknown';

  _saveSnapshot(sessionId, snapshot);
  return { ok: true, stateSnapshot: snapshot };
}

// ---------------------------------------------------------------------------
// Public API: Session_getState
// ---------------------------------------------------------------------------
function Session_getState(sessionId) {
  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;
  return { ok: true, stateSnapshot: loaded.stateSnapshot };
}

// ---------------------------------------------------------------------------
// Public API: Session_archive
// ---------------------------------------------------------------------------
function Session_archive(sessionId) {
  Auth_requireTeacher();
  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;

  var snapshot = loaded.stateSnapshot;
  var result   = StateMachine_apply(snapshot, QV_STATES.ARCHIVED, {});
  if (!result.ok) return result;
  snapshot = result.stateSnapshot;
  _saveSnapshot(sessionId, snapshot);

  var session    = loaded.session;
  session.status  = 'archived';
  session.endedAt = new Date().toISOString();
  SheetAdapter_updateSessionStatus(sessionId, 'archived', session.endedAt);

  var props = PropertiesService.getScriptProperties();
  props.setProperty('session_' + sessionId, JSON.stringify(session));
  _sessionCache[sessionId] = { session: session, snapshot: snapshot };

  return { ok: true, archived: true };
}

// ===========================================================================
// PRIVATE HELPERS
// ===========================================================================
function _saveSnapshot(sessionId, snapshot) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('snapshot_' + sessionId, JSON.stringify(snapshot));
  if (_sessionCache[sessionId]) {
    _sessionCache[sessionId].snapshot = snapshot;
  }

  // Also update Sessions sheet with current state + questionId
  var sessionData = props.getProperty('session_' + sessionId);
  if (sessionData) {
    var session = JSON.parse(sessionData);
    session.currentState      = snapshot.currentState;
    session.currentQuestionId = snapshot.currentQuestionId || null;
    props.setProperty('session_' + sessionId, JSON.stringify(session));
    SheetAdapter_writeSession(session);
  }
}

function _buildSessionLinks(sessionId) {
  var baseUrl = ScriptApp.getService().getUrl();
  return {
    teacherConsoleUrl: baseUrl + '?view=teacher-console&sessionId=' + sessionId,
    teacherRemoteUrl:  baseUrl + '?view=teacher-remote&sessionId='  + sessionId,
    studentUrl:        baseUrl + '?view=student&sessionId='         + sessionId,
    projectorUrl:      baseUrl + '?view=projector&sessionId='       + sessionId
  };
}
