/**
 * File: VoteCollector.gs
 * Owner: Agent 5 (Integration) — based on Agent 2 backend
 * Purpose: Participant registration, vote submission, vote counting.
 * Contracts: API_CONTRACT_v1, DATA_CONTRACT_v1
 *
 * INTEGRATION FIXES (Agent 5):
 *  - Vote_registerParticipant: wired SheetAdapter_writeParticipant
 *  - Vote_submit: wired SheetAdapter_writeVote + resolves isCorrect via
 *    SheetAdapter_loadQuestion
 *  - Vote_getCounts: uses SheetAdapter_countVotes for real Sheet data
 */

// In-memory cache for participants (write-through to Sheets)
var _participantCache = {};

// ---------------------------------------------------------------------------
// Public API: Vote_registerParticipant
// ---------------------------------------------------------------------------
function Vote_registerParticipant(sessionId, role) {
  if (!sessionId || !role) {
    return { ok: false, error: 'MISSING_PARAM',
             message: 'sessionId and role are required.' };
  }

  if (QV_CONFIG.VALID_ROLES.indexOf(role) === -1) {
    return { ok: false, error: 'INVALID_ROLE',
             message: 'Role must be one of: ' + QV_CONFIG.VALID_ROLES.join(', ') };
  }

  var participantId = 'part_' + Utilities.getUuid();
  var displayCode   = _generateDisplayCode();
  var now           = new Date().toISOString();

  var participant = {
    participantId: participantId,
    sessionId:     sessionId,
    displayCode:   displayCode,
    role:          role,
    joinedAt:      now,
    lastSeenAt:    now
  };

  // Persist to Sheets
  SheetAdapter_writeParticipant(participant);

  // Also cache in PropertiesService for fast vote validation
  var props = PropertiesService.getScriptProperties();
  props.setProperty('participant_' + participantId, JSON.stringify(participant));
  _participantCache[participantId] = participant;

  return { ok: true, participantId: participantId, displayCode: displayCode };
}

// ---------------------------------------------------------------------------
// Public API: Vote_submit
// ---------------------------------------------------------------------------
function Vote_submit(sessionId, participantId, round, answer) {
  if (!sessionId || !participantId || !round || !answer) {
    return { ok: false, error: 'MISSING_PARAM',
             message: 'sessionId, participantId, round, and answer are required.' };
  }

  if (QV_CONFIG.VALID_ANSWERS.indexOf(answer) === -1) {
    return { ok: false, error: 'INVALID_ANSWER',
             message: 'Answer must be one of: ' + QV_CONFIG.VALID_ANSWERS.join(', ') };
  }

  var stateRes = Session_getState(sessionId);
  if (!stateRes.ok) return stateRes;
  var snapshot = stateRes.stateSnapshot;

  var roundInt = parseInt(round, 10);
  if (roundInt !== snapshot.currentRound) {
    return { ok: false, error: 'WRONG_ROUND',
             message: 'Session is in round ' + snapshot.currentRound +
                      ', not round ' + roundInt };
  }

  if (!snapshot.voteOpen) {
    return { ok: false, error: 'VOTING_CLOSED',
             message: 'Voting is not open. Current state: ' + snapshot.currentState };
  }

  if (!snapshot.currentQuestionId) {
    return { ok: false, error: 'NO_ACTIVE_QUESTION',
             message: 'No active question set in session.' };
  }

  // Resolve correctAnswer from SheetAdapter to set isCorrect
  var isCorrect = null;
  var q = SheetAdapter_loadQuestion(snapshot.currentQuestionId);
  if (q && q.correctAnswer) {
    isCorrect = (answer === q.correctAnswer);
  }

  var voteId = 'vote_' + Utilities.getUuid();
  var now    = new Date().toISOString();

  var voteRecord = {
    voteId:        voteId,
    sessionId:     sessionId,
    questionId:    snapshot.currentQuestionId,
    participantId: participantId,
    round:         roundInt,
    answer:        answer,
    isCorrect:     isCorrect,
    submittedAt:   now
  };

  // Persist to Sheets
  SheetAdapter_writeVote(voteRecord);

  // Increment live vote count in snapshot
  if (roundInt === 1) {
    snapshot.voteCountR1 = (snapshot.voteCountR1 || 0) + 1;
  } else if (roundInt === 2) {
    snapshot.voteCountR2 = (snapshot.voteCountR2 || 0) + 1;
  }

  // Write snapshot back
  var props = PropertiesService.getScriptProperties();
  props.setProperty('snapshot_' + sessionId, JSON.stringify(snapshot));

  return { ok: true, accepted: true, voteRecord: voteRecord };
}

// ---------------------------------------------------------------------------
// Public API: Vote_getCounts
// ---------------------------------------------------------------------------
function Vote_getCounts(sessionId, questionId) {
  if (!sessionId || !questionId) {
    return { ok: false, error: 'MISSING_PARAM',
             message: 'sessionId and questionId required.' };
  }
  // Use SheetAdapter for authoritative counts
  var counts = SheetAdapter_countVotes(sessionId, questionId);
  return { ok: true, counts: counts };
}

// ===========================================================================
// PRIVATE HELPERS
// ===========================================================================
function _generateDisplayCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoid confusing 0/O, 1/I
  var code  = '';
  for (var i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}