// =============================================================================
// FILE: src/gs/SheetAdapter.gs
// PROJECT: QuantumVote GW v3
// OWNER: Agent 4 (Google Sheets Integration)
// PURPOSE: All read/write operations to Google Sheets.
// CONTRACT: DATA_CONTRACT_v1.md, FILE_OWNERSHIP_v1.md
// =============================================================================

/**
 * Internal helper to get or create a sheet by name and ensure headers.
 * @param {string} sheetName
 * @param {Array<string>} headers
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function _SheetAdapter_getOrCreateSheet(sheetName, headers) {
  var ss = _Config_getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * SheetAdapter_writeSession(sessionRow)
 * Writes or updates a session row in the Sessions sheet.
 */
function SheetAdapter_writeSession(sessionRow) {
  var headers = ["sessionId", "presentationId", "teacherEmail", "classCode", "safeMode", "status", "currentQuestionId", "currentState", "createdAt", "startedAt", "endedAt"];
  var sheet = _SheetAdapter_getOrCreateSheet(QV_CONFIG.SHEET_TABS.SESSIONS, headers);
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === sessionRow.sessionId) {
      rowIndex = i + 1;
      break;
    }
  }

  var rowValues = [
    sessionRow.sessionId,
    sessionRow.presentationId,
    sessionRow.teacherEmail,
    sessionRow.classCode,
    sessionRow.safeMode,
    sessionRow.status,
    sessionRow.currentQuestionId,
    sessionRow.currentState,
    sessionRow.createdAt,
    sessionRow.startedAt,
    sessionRow.endedAt
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

/**
 * SheetAdapter_loadSession(sessionId)
 */
function SheetAdapter_loadSession(sessionId) {
  var sheet = _Config_getSpreadsheet().getSheetByName(QV_CONFIG.SHEET_TABS.SESSIONS);
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) {
      return {
        sessionId: data[i][0],
        presentationId: data[i][1],
        teacherEmail: data[i][2],
        classCode: data[i][3],
        safeMode: data[i][4],
        status: data[i][5],
        currentQuestionId: data[i][6],
        currentState: data[i][7],
        createdAt: data[i][8],
        startedAt: data[i][9],
        endedAt: data[i][10]
      };
    }
  }
  return null;
}

/**
 * SheetAdapter_updateSessionStatus(sessionId, status, endedAt)
 */
function SheetAdapter_updateSessionStatus(sessionId, status, endedAt) {
  var session = SheetAdapter_loadSession(sessionId);
  if (session) {
    session.status = status;
    session.endedAt = endedAt;
    SheetAdapter_writeSession(session);
  }
}

/**
 * SheetAdapter_loadQuestion(questionId)
 */
function SheetAdapter_loadQuestion(questionId) {
  var sheet = _Config_getSpreadsheet().getSheetByName(QV_CONFIG.SHEET_TABS.QUESTIONS);
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === questionId) {
      return {
        questionId: data[i][0],
        presentationId: data[i][1],
        slideId: data[i][2],
        title: data[i][3],
        prompt: data[i][4],
        optionsJson: data[i][5],
        correctAnswer: data[i][6],
        imageFileId: data[i][7],
        conceptTag: data[i][8],
        difficulty: data[i][9],
        version: data[i][10],
        active: data[i][11]
      };
    }
  }
  return null;
}

/**
 * SheetAdapter_writeParticipant(participant)
 */
function SheetAdapter_writeParticipant(participant) {
  var headers = ["participantId", "sessionId", "displayCode", "role", "joinedAt", "lastSeenAt"];
  var sheet = _SheetAdapter_getOrCreateSheet(QV_CONFIG.SHEET_TABS.PARTICIPANTS, headers);
  sheet.appendRow([
    participant.participantId,
    participant.sessionId,
    participant.displayCode,
    participant.role,
    participant.joinedAt,
    participant.lastSeenAt
  ]);
}

/**
 * SheetAdapter_writeVote(voteRecord)
 */
function SheetAdapter_writeVote(voteRecord) {
  var headers = ["voteId", "sessionId", "questionId", "participantId", "round", "answer", "isCorrect", "submittedAt"];
  var sheet = _SheetAdapter_getOrCreateSheet(QV_CONFIG.SHEET_TABS.VOTES, headers);
  sheet.appendRow([
    voteRecord.voteId,
    voteRecord.sessionId,
    voteRecord.questionId,
    voteRecord.participantId,
    voteRecord.round,
    voteRecord.answer,
    voteRecord.isCorrect,
    voteRecord.submittedAt
  ]);
}

/**
 * SheetAdapter_countVotes(sessionId, questionId)
 */
function SheetAdapter_countVotes(sessionId, questionId) {
  var sheet = _Config_getSpreadsheet().getSheetByName(QV_CONFIG.SHEET_TABS.VOTES);
  if (!sheet) return { round1: 0, round2: 0, totalParticipants: 0 };
  var data = sheet.getDataRange().getValues();
  var r1 = 0, r2 = 0;
  var participants = {};

  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === sessionId && data[i][2] === questionId) {
      if (data[i][4] === 1) r1++;
      if (data[i][4] === 2) r2++;
      participants[data[i][3]] = true;
    }
  }

  return {
    round1: r1,
    round2: r2,
    totalParticipants: Object.keys(participants).length
  };
}

/**
 * SheetAdapter_getNextQuestionId(currentQuestionId)
 */
function SheetAdapter_getNextQuestionId(currentQuestionId) {
  var sheet = _Config_getSpreadsheet().getSheetByName(QV_CONFIG.SHEET_TABS.QUESTIONS);
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  if (!currentQuestionId) return data[1] ? data[1][0] : null;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === currentQuestionId) {
      return data[i + 1] ? data[i + 1][0] : null;
    }
  }
  return null;
}

/**
 * SheetAdapter_getPrevQuestionId(currentQuestionId)
 */
function SheetAdapter_getPrevQuestionId(currentQuestionId) {
  var sheet = _Config_getSpreadsheet().getSheetByName(QV_CONFIG.SHEET_TABS.QUESTIONS);
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === currentQuestionId) {
      return data[i - 1] && i > 1 ? data[i - 1][0] : null;
    }
  }
  return null;
}
