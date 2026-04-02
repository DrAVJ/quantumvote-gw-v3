/**
 * File: SessionManager.gs
 * Owner: Backend-agent (Agent 2)
 * Project: QuantumVote GW v3
 * Purpose: Session lifecycle, state transitions, question navigation.
 * Contracts: API_CONTRACT_v1, DATA_CONTRACT_v1, STATE_MACHINE_v1
 *
 * Depends on:
 * - Config.gs (QV_CONFIG, QV_STATES)
 * - StateMachine.gs (validate, apply, buildSnapshot)
 * - Auth.gs (Auth_getCurrentUserContext, Auth_requireTeacher)
 * - SheetAdapter.gs (Implemented by Agent 4)
 */

var _sessionCache = {};

function Session_create(presentationId, classCode, options) {
  Auth_requireTeacher();
  if (!presentationId || !classCode) {
    return { ok: false, error: 'MISSING_PARAM', message: 'presentationId and classCode are required.' };
  }
  options = options || {};
  var safeMode = (options.safeMode !== false);
  var userContext = Auth_getCurrentUserContext();
  var teacherEmail = userContext.email;
  var sessionId = 'sess_' + Utilities.getUuid();
  var now = new Date().toISOString();

  var sessionRow = {
    sessionId: sessionId,
    presentationId: presentationId,
    teacherEmail: teacherEmail,
    classCode: classCode,
    safeMode: safeMode,
    status: 'active',
    currentQuestionId: null,
    currentState: QV_STATES.IDLE,
    createdAt: now,
    startedAt: now,
    endedAt: null
  };

  SheetAdapter_writeSession(sessionRow);
  var snapshot = StateMachine_buildSnapshot(sessionId, safeMode);
  _sessionCache[sessionId] = { session: sessionRow, snapshot: snapshot };
  return { ok: true, sessionId: sessionId, stateSnapshot: snapshot };
}

function Session_load(sessionId) {
  if (!sessionId) return { ok: false, error: 'MISSING_SESSION_ID' };
  if (_sessionCache[sessionId]) {
    var cached = _sessionCache[sessionId];
    return { ok: true, session: cached.session, stateSnapshot: cached.snapshot, links: _buildSessionLinks(sessionId) };
  }

  var session = SheetAdapter_loadSession(sessionId);
  if (!session) return { ok: false, error: 'SESSION_NOT_FOUND', sessionId: sessionId };

  var snapshot = StateMachine_buildSnapshot(sessionId, session.safeMode);
  snapshot.currentState = session.currentState;
  snapshot.currentQuestionId = session.currentQuestionId;

  _sessionCache[sessionId] = { session: session, snapshot: snapshot };
  return { ok: true, session: session, stateSnapshot: snapshot, links: _buildSessionLinks(sessionId) };
}

function Session_activateQuestion(sessionId, questionId) {
  Auth_requireTeacher();
  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;
  var snapshot = loaded.stateSnapshot;
  var session = loaded.session;

  var question = SheetAdapter_loadQuestion(questionId);
  if (!question) return { ok: false, error: 'QUESTION_NOT_FOUND', questionId: questionId };

  snapshot.currentQuestionId = questionId;
  snapshot.currentSlideId = question.slideId;
  session.currentQuestionId = questionId;

  var result = StateMachine_apply(snapshot, QV_STATES.QUESTION_READY, {});
  if (!result.ok) return result;
  snapshot = result.stateSnapshot;
  session.currentState = snapshot.currentState;

  _saveSnapshot(sessionId, snapshot, session);
  return { ok: true, stateSnapshot: snapshot };
}

function Session_nextQuestion(sessionId) {
  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;
  var nextId = SheetAdapter_getNextQuestionId(loaded.stateSnapshot.currentQuestionId);
  if (!nextId) return { ok: false, error: 'NO_NEXT_QUESTION' };
  return Session_activateQuestion(sessionId, nextId);
}

function Session_prevQuestion(sessionId) {
  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;
  var prevId = SheetAdapter_getPrevQuestionId(loaded.stateSnapshot.currentQuestionId);
  if (!prevId) return { ok: false, error: 'NO_PREV_QUESTION' };
  return Session_activateQuestion(sessionId, prevId);
}

function Session_transition(sessionId, nextState, payload) {
  Auth_requireTeacher();
  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;
  var snapshot = loaded.stateSnapshot;
  var session = loaded.session;

  var result = StateMachine_apply(snapshot, nextState, payload || {});
  if (!result.ok) return result;
  snapshot = result.stateSnapshot;
  session.currentState = snapshot.currentState;

  var userContext = Auth_getCurrentUserContext();
  snapshot.lastCommandByRole = userContext.isTeacher ? 'teacher' : 'unknown';

  _saveSnapshot(sessionId, snapshot, session);
  return { ok: true, stateSnapshot: snapshot };
}

function Session_getState(sessionId) {
  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;
  return { ok: true, stateSnapshot: loaded.stateSnapshot };
}

function Session_archive(sessionId) {
  Auth_requireTeacher();
  var loaded = Session_load(sessionId);
  if (!loaded.ok) return loaded;
  var snapshot = loaded.stateSnapshot;
  var session = loaded.session;

  var result = StateMachine_apply(snapshot, QV_STATES.ARCHIVED, {});
  if (!result.ok) return result;
  snapshot = result.stateSnapshot;
  session.currentState = snapshot.currentState;
  session.status = 'archived';
  session.endedAt = new Date().toISOString();

  _saveSnapshot(sessionId, snapshot, session);
  return { ok: true, archived: true };
}

function _saveSnapshot(sessionId, snapshot, session) {
  if (session) {
    SheetAdapter_writeSession(session);
  }
  if (_sessionCache[sessionId]) {
    _sessionCache[sessionId].snapshot = snapshot;
    if (session) _sessionCache[sessionId].session = session;
  }
}

function _buildSessionLinks(sessionId) {
  var baseUrl = ScriptApp.getService().getUrl();
  return {
    teacherConsoleUrl: baseUrl + '?view=teacher-console&sessionId=' + sessionId,
    teacherRemoteUrl: baseUrl + '?view=teacher-remote&sessionId=' + sessionId,
    studentUrl: baseUrl + '?view=student&sessionId=' + sessionId,
    projectorUrl: baseUrl + '?view=projector&sessionId=' + sessionId
  };
}
