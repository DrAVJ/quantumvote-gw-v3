/**
 * File: VoteCollector.gs
 * Owner: Backend-agent (Agent 2)
 * Project: QuantumVote GW v3
 * Purpose: Participant registration, vote submission, vote counting.
 * Contracts: API_CONTRACT_v1, DATA_CONTRACT_v1
 *
 * Depends on:
 *   - Config.gs (QV_CONFIG, QV_STATES)
 *   - SessionManager.gs (Session_load, Session_getState)
 *   - SheetAdapter.gs (to be implemented by Agent 4)
 *
 * MANUAL APPS SCRIPT NOTE:
 *   Copy into Apps Script as "VoteCollector.gs".
 */

// In-memory cache for participants (write-through to Sheets)
var _participantCache = {};

// ---------------------------------------------------------------------------
// Public API: Vote_registerParticipant
// Registers a participant (student, teacher-remote, etc.) for a session.
// Input: sessionId (string), role (string)
// Output: { ok, participantId, displayCode }
// ---------------------------------------------------------------------------
function Vote_registerParticipant(sessionId, role) {
  if (!sessionId || !role) {
    return {
      ok: false,
      error: 'MISSING_PARAM',
      message: 'sessionId and role are required.'
    };
  }

  if (QV_CONFIG.VALID_ROLES.indexOf(role) === -1) {
    return {
      ok: false,
      error: 'INVALID_ROLE',
      message: 'Role must be one of: ' + QV_CONFIG.VALID_ROLES.join(', ')
    };
  }

  var participantId = 'part_' + Utilities.getUuid();
  var displayCode   = _generateDisplayCode();
  var now = new Date().toISOString();

  var participant = {
    participantId: participantId,
    sessionId:     sessionId,
    displayCode:   displayCode,
    role:          role,
    joinedAt:      now,
    lastSeenAt:    now
  };

  // TODO [Agent 4]: SheetAdapter_writeParticipant(participant)
  // Temporary: store in PropertiesService
  var props = PropertiesService.getScriptProperties();
  var key = 'participant_' + participantId;
  props.setProperty(key, JSON.stringify(participant));

  _participantCache[participantId] = participant;

  return {
    ok: true,
    participantId: participantId,
    displayCode:   displayCode
  };
}

// ---------------------------------------------------------------------------
// Public API: Vote_submit
// Submits a vote for the current question in the current round.
// Input: sessionId, participantId, round (1 or 2), answer ('A'/'B'/'C'/'D')
// Output: { ok, accepted, voteRecord } or { ok: false, error }
// ---------------------------------------------------------------------------
function Vote_submit(sessionId, participantId, round, answer) {
  if (!sessionId || !participantId || !round || !answer) {
    return {
      ok: false,
      error: 'MISSING_PARAM',
      message: 'sessionId, participantId, round, and answer are required.'
    };
  }

  // Validate answer
  if (QV_CONFIG.VALID_ANSWERS.indexOf(answer) === -1) {
    return {
      ok: false,
      error: 'INVALID_ANSWER',
      message: 'Answer must be one of: ' + QV_CONFIG.VALID_ANSWERS.join(', ')
    };
  }

  // Load session state
  var stateRes = Session_getState(sessionId);
  if (!stateRes.ok) return stateRes;

  var snapshot = stateRes.stateSnapshot;

  // Validate round matches current state
  if (round !== snapshot.currentRound) {
    return {
      ok: false,
      error: 'WRONG_ROUND',
      message: 'Session is in round ' + snapshot.currentRound + ', not round ' + round
    };
  }

  // Check that voting is open
  if (!snapshot.voteOpen) {
    return {
      ok: false,
      error: 'VOTING_CLOSED',
      message: 'Voting is not open. Current state: ' + snapshot.currentState
    };
  }

  if (!snapshot.currentQuestionId) {
    return {
      ok: false,
      error: 'NO_ACTIVE_QUESTION',
      message: 'No active question set in session.'
    };
  }

  // TODO [Agent 4]: Check if participant already voted for this question/round
  // and whether allowVoteChange is enabled.

  var voteId = 'vote_' + Utilities.getUuid();
  var now = new Date().toISOString();

  // TODO [Agent 4]: SheetAdapter_loadQuestion(snapshot.currentQuestionId)
  // to get correctAnswer and validate isCorrect.
  // For now, assume correctAnswer is not yet loaded:
  var isCorrect = null; // will be determined later

  var voteRecord = {
    voteId:        voteId,
    sessionId:     sessionId,
    questionId:    snapshot.currentQuestionId,
    participantId: participantId,
    round:         parseInt(round, 10),
    answer:        answer,
    isCorrect:     isCorrect,
    submittedAt:   now
  };

  // TODO [Agent 4]: SheetAdapter_writeVote(voteRecord)
  // Temporary: store in PropertiesService
  var props = PropertiesService.getScriptProperties();
  var voteKey = 'vote_' + voteId;
  props.setProperty(voteKey, JSON.stringify(voteRecord));

  // Increment live vote count in snapshot
  if (round === 1) {
    snapshot.voteCountR1 = (snapshot.voteCountR1 || 0) + 1;
  } else if (round === 2) {
    snapshot.voteCountR2 = (snapshot.voteCountR2 || 0) + 1;
  }

  // Write snapshot back via SessionManager's helper (we'll call internal helper)
  // For now, update PropertiesService directly:
  props.setProperty('snapshot_' + sessionId, JSON.stringify(snapshot));

  return {
    ok: true,
    accepted: true,
    voteRecord: voteRecord
  };
}

// ---------------------------------------------------------------------------
// Public API: Vote_getCounts
// Returns total vote counts for a session+question.
// Output: { ok, counts: { round1, round2, totalParticipants } }
// ---------------------------------------------------------------------------
function Vote_getCounts(sessionId, questionId) {
  if (!sessionId || !questionId) {
    return {
      ok: false,
      error: 'MISSING_PARAM',
      message: 'sessionId and questionId required.'
    };
  }

  // TODO [Agent 4]: SheetAdapter_countVotes(sessionId, questionId, round)
  // For now, read from snapshot for quick counts:
  var stateRes = Session_getState(sessionId);
  if (!stateRes.ok) return stateRes;

  var snapshot = stateRes.stateSnapshot;

  // If the question doesn't match current, return 0 (historical data needs SheetAdapter)
  if (snapshot.currentQuestionId !== questionId) {
    return {
      ok: true,
      counts: { round1: 0, round2: 0, totalParticipants: 0 }
    };
  }

  // TODO [Agent 4]: count distinct participants
  var totalParticipants = 0; // placeholder

  return {
    ok: true,
    counts: {
      round1: snapshot.voteCountR1 || 0,
      round2: snapshot.voteCountR2 || 0,
      totalParticipants: totalParticipants
    }
  };
}

// ===========================================================================
// PRIVATE HELPERS
// ===========================================================================

// ---------------------------------------------------------------------------
// _generateDisplayCode
// Generates a short 4-character alphanumeric code for participant display.
// ---------------------------------------------------------------------------
function _generateDisplayCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoid confusing 0/O, 1/I
  var code = '';
  for (var i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
