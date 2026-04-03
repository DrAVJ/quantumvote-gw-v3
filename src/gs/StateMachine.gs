/**
 * File: StateMachine.gs
 * Owner: Backend-agent (Agent 2)
 * Project: QuantumVote GW v3
 * Purpose: State machine validation and transition logic.
 * Contract: STATE_MACHINE_v1.md
 *
 * Depends on: Config.gs (QV_STATES, QV_STATE_NAMES)
 *
 * MANUAL APPS SCRIPT NOTE:
 *   Copy into Apps Script as "StateMachine.gs".
 *   Config.gs must be loaded first (Apps Script loads .gs files
 *   alphabetically by default — "Config" < "StateMachine").
 */

// ---------------------------------------------------------------------------
// Allowed transitions — mirrors STATE_MACHINE_v1.md exactly.
// Key: fromState (integer), Value: array of allowed toState integers.
// ---------------------------------------------------------------------------
var _SM_TRANSITIONS = {
  0:  [1],        // IDLE → QUESTION_READY
  1:  [2, 0],     // QUESTION_READY → COUNTDOWN_R1 | IDLE
  2:  [3],        // COUNTDOWN_R1 → VOTING_R1
  3:  [4],        // VOTING_R1 → R1_CLOSED
  4:  [5, 9],     // R1_CLOSED → DISCUSSION | RESULTS_VISIBLE
  5:  [6],        // DISCUSSION → COUNTDOWN_R2
  6:  [7],        // COUNTDOWN_R2 → VOTING_R2
  7:  [8],        // VOTING_R2 → R2_CLOSED
  8:  [9],        // R2_CLOSED → RESULTS_VISIBLE
  9:  [10, 1],    // RESULTS_VISIBLE → ARCHIVED | QUESTION_READY
  10: [0]         // ARCHIVED → IDLE
};

// ---------------------------------------------------------------------------
// Public: StateMachine_validate
// Checks whether a transition from currentState → nextState is allowed.
// Returns { ok: true } or { ok: false, error: 'INVALID_TRANSITION',
//   from: X, fromName: '...', to: Y, toName: '...' }
// ---------------------------------------------------------------------------
function StateMachine_validate(currentState, nextState) {
  var from = parseInt(currentState, 10);
  var to   = parseInt(nextState,   10);

  if (isNaN(from) || !_SM_TRANSITIONS.hasOwnProperty(from)) {
    return {
      ok: false,
      error: 'INVALID_TRANSITION',
      from: from,
      fromName: QV_STATE_NAMES[from] || 'UNKNOWN',
      to: to,
      toName: QV_STATE_NAMES[to] || 'UNKNOWN',
      message: 'Unknown source state: ' + from
    };
  }

  if (_SM_TRANSITIONS[from].indexOf(to) === -1) {
    return {
      ok: false,
      error: 'INVALID_TRANSITION',
      from: from,
      fromName: QV_STATE_NAMES[from] || 'UNKNOWN',
      to: to,
      toName: QV_STATE_NAMES[to] || 'UNKNOWN',
      message: 'Transition ' + (QV_STATE_NAMES[from] || from) +
               ' → ' + (QV_STATE_NAMES[to] || to) + ' is not allowed.'
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Public: StateMachine_apply
// Validates and applies the transition, updating a snapshot object in-place.
// snapshot must conform to DATA_CONTRACT_v1 SessionSnapshot shape.
// Returns the updated snapshot or a { ok: false, error: ... } object.
//
// payload (optional): { round, durationSec, discussionSeconds, ... }
// ---------------------------------------------------------------------------
function StateMachine_apply(snapshot, nextState, payload) {
  var validation = StateMachine_validate(snapshot.currentState, nextState);
  if (!validation.ok) return validation;

  var now = new Date().toISOString();
  payload = payload || {};

  snapshot.currentState  = parseInt(nextState, 10);
  snapshot.lastCommandAt = now;

  // Derive voteOpen from state
  snapshot.voteOpen = (
    snapshot.currentState === QV_STATES.VOTING_R1 ||
    snapshot.currentState === QV_STATES.VOTING_R2
  );

  // Derive currentRound
  if (snapshot.currentState === QV_STATES.VOTING_R1 ||
      snapshot.currentState === QV_STATES.R1_CLOSED ||
      snapshot.currentState === QV_STATES.COUNTDOWN_R1) {
    snapshot.currentRound = 1;
  } else if (snapshot.currentState === QV_STATES.VOTING_R2 ||
             snapshot.currentState === QV_STATES.R2_CLOSED ||
             snapshot.currentState === QV_STATES.COUNTDOWN_R2 ||
             snapshot.currentState === QV_STATES.RESULTS_VISIBLE) {
    snapshot.currentRound = 2;
  } else {
    snapshot.currentRound = 0;
  }

  // State-specific side-effects on snapshot fields
  if (snapshot.currentState === QV_STATES.VOTING_R1 ||
      snapshot.currentState === QV_STATES.COUNTDOWN_R1) {
    snapshot.questionStartTs = snapshot.questionStartTs || now;
  }

  if (snapshot.currentState === QV_STATES.DISCUSSION) {
    var discSec = payload.discussionSeconds ||
                  QV_CONFIG.DEFAULT_DISCUSSION_SECONDS;
    var endTs = new Date(Date.now() + discSec * 1000);
    snapshot.discussionEndTs = endTs.toISOString();
  }

  if (snapshot.currentState === QV_STATES.IDLE) {
    // Reset question-level fields on return to idle
    snapshot.currentQuestionId = null;
    snapshot.currentSlideId    = null;
    snapshot.questionStartTs   = null;
    snapshot.discussionEndTs   = null;
    snapshot.voteCountR1       = 0;
    snapshot.voteCountR2       = 0;
    snapshot.currentRound      = 0;
  }

  return { ok: true, stateSnapshot: snapshot };
}

// ---------------------------------------------------------------------------
// Public: StateMachine_buildSnapshot
// Constructs a fresh SessionSnapshot with default values.
// sessionId: string, safeMode: bool
// ---------------------------------------------------------------------------
function StateMachine_buildSnapshot(sessionId, safeMode) {
  return {
    sessionId:          sessionId,
    currentState:       QV_STATES.IDLE,
    currentQuestionId:  null,
    currentSlideId:     null,
    currentRound:       0,
    voteOpen:           false,
    safeMode:           (safeMode !== false),  // default true
    questionStartTs:    null,
    discussionEndTs:    null,
    voteCountR1:        0,
    voteCountR2:        0,
    lastCommandAt:      null,
    lastCommandByRole:  null
  };
}

// ---------------------------------------------------------------------------
// Public: StateMachine_getAllowedTransitions
// Returns the list of valid next states from a given state.
// Useful for frontend to disable/enable control buttons.
// ---------------------------------------------------------------------------
function StateMachine_getAllowedTransitions(currentState) {
  var from = parseInt(currentState, 10);
  return _SM_TRANSITIONS[from] || [];
}
