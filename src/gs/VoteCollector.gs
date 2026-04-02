/**
 * File: VoteCollector.gs
 * Owner: Backend-agent (Agent 2)
 * Project: QuantumVote GW v3
 * Purpose: Participant registration, vote submission, vote counting.
 * Contracts: API_CONTRACT_v1, DATA_CONTRACT_v1
 *
 * Depends on:
 * - Config.gs (QV_CONFIG, QV_STATES)
 * - SessionManager.gs (Session_load, Session_getState)
 * - SheetAdapter.gs (Implemented by Agent 4)
 */

var _participantCache = {};

function Vote_registerParticipant(sessionId, role) {
  if (!sessionId || !role) {
    return { ok: false, error: 'MISSING_PARAM', message: 'sessionId and role are required.' };
  }
  if (QV_CONFIG.VALID_ROLES.indexOf(role) === -1) {
    return { ok: false, error: 'INVALID_ROLE', message: 'Role must be one of: ' + QV_CONFIG.VALID_ROLES.join(', ') };
  }

  var participantId = 'part_' + Utilities.getUuid();
  var displayCode = _generateDisplayCode();
  var now = new Date().toISOString();

  var participant = {
    participantId: participantId,
    sessionId: sessionId,
    displayCode: displayCode,
    role: role,
    joinedAt: now,
    lastSeenAt: now
  };

  SheetAdapter_writeParticipant(participant);
  _participantCache[participantId] = participant;

  return { ok: true, participantId: participantId, displayCode: displayCode };
}

function Vote_submit(sessionId, participantId, round, answer) {
  if (!sessionId || !participantId || !round || !answer) {
    return { ok: false, error: 'MISSING_PARAM', message: 'sessionId, participantId, round, and answer are required.' };
  }
  if (QV_CONFIG.VALID_ANSWERS.indexOf(answer) === -1) {
    return { ok: false, error: 'INVALID_ANSWER', message: 'Answer must be one of: ' + QV_CONFIG.VALID_ANSWERS.join(', ') };
  }

  var stateRes = Session_getState(sessionId);
  if (!stateRes.ok) return stateRes;
  var snapshot = stateRes.stateSnapshot;

  if (parseInt(round, 10) !== snapshot.currentRound) {
    return { ok: false, error: 'WRONG_ROUND', message: 'Session is in round ' + snapshot.currentRound };
  }
  if (!snapshot.voteOpen) {
    return { ok: false, error: 'VOTING_CLOSED', message: 'Voting is not open.' };
  }

  var question = SheetAdapter_loadQuestion(snapshot.currentQuestionId);
  var isCorrect = question ? (answer === question.correctAnswer) : null;

  var voteId = 'vote_' + Utilities.getUuid();
  var now = new Date().toISOString();

  var voteRecord = {
    voteId: voteId,
    sessionId: sessionId,
    questionId: snapshot.currentQuestionId,
    participantId: participantId,
    round: parseInt(round, 10),
    answer: answer,
    isCorrect: isCorrect,
    submittedAt: now
  };

  SheetAdapter_writeVote(voteRecord);

  if (round == 1) snapshot.voteCountR1 = (snapshot.voteCountR1 || 0) + 1;
  if (round == 2) snapshot.voteCountR2 = (snapshot.voteCountR2 || 0) + 1;
  
  return { ok: true, accepted: true, voteRecord: voteRecord };
}

function Vote_getCounts(sessionId, questionId) {
  if (!sessionId || !questionId) {
    return { ok: false, error: 'MISSING_PARAM', message: 'sessionId and questionId required.' };
  }
  var counts = SheetAdapter_countVotes(sessionId, questionId);
  return { ok: true, counts: counts };
}

function _generateDisplayCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code = '';
  for (var i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
