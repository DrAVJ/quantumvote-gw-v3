// =============================================================================
// FILE: src/gs/SheetAdapter.gs
// PROJECT: QuantumVote GW v3
// OWNER: Agent 4 (Google Sheets Integration) + Agent 5 integration
// PURPOSE: All read/write operations to Google Sheets.
// CONTRACT: DATA_CONTRACT_v1.md, FILE_OWNERSHIP_v1.md
//
// PATCH (Questions-blad direktläsning):
//  - Nytt Questions-bladformat: questionId, title, prompt, optionA-D,
//    correctAnswer, category, tags, dateAdded, difficulty, active
//  - _SheetAdapter_getAllQuestions(): intern hjälpfunktion, läser via headers
//  - SheetAdapter_loadQuestion():    om-skriven, läser direkt från blad
//  - SheetAdapter_writeQuestion():   om-skriven, matchar nytt bladformat
//  - SheetAdapter_getNextQuestionId(): om-skriven, använder _getAllQuestions
//  - SheetAdapter_getPrevQuestionId(): om-skriven, använder _getAllQuestions
//  - Allt annat (sessions, votes, participants) är oförändrat.
// =============================================================================

/**
 * Internal helper to get or create a sheet by name and ensure headers.
 */
function _SheetAdapter_getOrCreateSheet(sheetName, headers) {
  var ss    = _Config_getSpreadsheet();
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

// =============================================================================
// SESSIONS
// =============================================================================

/**
 * SheetAdapter_writeSession(sessionRow)
 * Writes or updates a session row in the Sessions sheet.
 */
function SheetAdapter_writeSession(sessionRow) {
  var headers = ["sessionId","presentationId","teacherEmail","classCode",
                 "safeMode","status","currentQuestionId","currentState",
                 "createdAt","startedAt","endedAt"];
  var sheet = _SheetAdapter_getOrCreateSheet(QV_CONFIG.SHEET_TABS.SESSIONS, headers);
  var data  = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === sessionRow.sessionId) { rowIndex = i + 1; break; }
  }
  var rowValues = [
    sessionRow.sessionId, sessionRow.presentationId, sessionRow.teacherEmail,
    sessionRow.classCode, sessionRow.safeMode, sessionRow.status,
    sessionRow.currentQuestionId, sessionRow.currentState,
    sessionRow.createdAt, sessionRow.startedAt, sessionRow.endedAt
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
        sessionId:         data[i][0], presentationId: data[i][1],
        teacherEmail:      data[i][2], classCode:      data[i][3],
        safeMode:          data[i][4], status:         data[i][5],
        currentQuestionId: data[i][6], currentState:   data[i][7],
        createdAt:         data[i][8], startedAt:      data[i][9],
        endedAt:           data[i][10]
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
    session.status  = status;
    session.endedAt = endedAt;
    SheetAdapter_writeSession(session);
  }
}

// =============================================================================
// QUESTIONS — nytt bladformat (patch)
// Förväntat bladformat (rad 1 = rubriker):
//   questionId | title | prompt | optionA | optionB | optionC | optionD |
//   correctAnswer | category | tags | dateAdded | difficulty | active
// =============================================================================

/**
 * _SheetAdapter_getAllQuestions()
 * Internal: reads all active questions from Questions sheet.
 * Maps header row to object keys — robust against column reordering.
 * @returns {Array} array of question objects
 */
function _SheetAdapter_getAllQuestions() {
  var ss    = _Config_getSpreadsheet();
  var sheet = ss.getSheetByName(QV_CONFIG.SHEET_TABS.QUESTIONS);
  if (!sheet) throw new Error('SheetAdapter: Questions sheet not found');

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var rows    = data.slice(1);

  var activeIdx = headers.indexOf('active');

  return rows
    .filter(function(row) {
      // Skip empty rows
      if (!row[0]) return false;
      // Skip inactive (active = FALSE), keep TRUE or blank (default active)
      if (activeIdx !== -1) {
        var activeVal = String(row[activeIdx]).trim().toUpperCase();
        if (activeVal === 'FALSE') return false;
      }
      return true;
    })
    .map(function(row) {
      var obj = {};
      headers.forEach(function(header, i) { obj[header] = row[i]; });

      var options = {
        A: String(obj['optionA'] || '').trim(),
        B: String(obj['optionB'] || '').trim(),
        C: String(obj['optionC'] || '').trim(),
        D: String(obj['optionD'] || '').trim()
      };

      return {
        questionId:    String(obj['questionId']    || '').trim(),
        title:         String(obj['title']         || '').trim(),
        prompt:        String(obj['prompt']        || '').trim(),
        options:       options,
        optionsJson:   JSON.stringify(options),
        correctAnswer: String(obj['correctAnswer'] || '').trim().toUpperCase(),
        category:      String(obj['category']      || '').trim(),
        tags:          String(obj['tags']          || '').trim(),
        dateAdded:     String(obj['dateAdded']     || '').trim(),
        difficulty:    obj['difficulty'] !== undefined ? obj['difficulty'] : '',
        active:        String(obj['active'] || '').trim().toUpperCase() !== 'FALSE'
      };
    });
}

/**
 * SheetAdapter_loadQuestion(questionId)
 * Loads a single active question by questionId.
 * @returns { ok: true, question: Object } or { ok: false, error: string }
 */
function SheetAdapter_loadQuestion(questionId) {
  try {
    var questions = _SheetAdapter_getAllQuestions();
    for (var i = 0; i < questions.length; i++) {
      if (questions[i].questionId === String(questionId).trim()) {
        return { ok: true, question: questions[i] };
      }
    }
    return { ok: false, error: 'QUESTION_NOT_FOUND: ' + questionId };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

/**
 * SheetAdapter_writeQuestion(questionRow)
 * Writes or updates a question in the Questions sheet.
 * Matches new column format. Updates in place if questionId exists, else appends.
 */
function SheetAdapter_writeQuestion(questionRow) {
  var headers = [
    'questionId', 'title', 'prompt',
    'optionA', 'optionB', 'optionC', 'optionD',
    'correctAnswer', 'category', 'tags',
    'dateAdded', 'difficulty', 'active'
  ];
  var sheet = _SheetAdapter_getOrCreateSheet(QV_CONFIG.SHEET_TABS.QUESTIONS, headers);

  // Resolve options — support both {options: {A,B,C,D}} and flat optionA/B/C/D
  var options = questionRow.options || {};
  var optionA = questionRow.optionA || options.A || '';
  var optionB = questionRow.optionB || options.B || '';
  var optionC = questionRow.optionC || options.C || '';
  var optionD = questionRow.optionD || options.D || '';

  // If only optionsJson is available (legacy Slides import), parse it
  if (!optionA && questionRow.optionsJson) {
    try {
      var parsed = JSON.parse(questionRow.optionsJson);
      optionA = parsed.A || ''; optionB = parsed.B || '';
      optionC = parsed.C || ''; optionD = parsed.D || '';
    } catch (e) {}
  }

  var rowValues = [
    String(questionRow.questionId    || '').trim(),
    String(questionRow.title         || '').trim(),
    String(questionRow.prompt        || '').trim(),
    String(optionA).trim(),
    String(optionB).trim(),
    String(optionC).trim(),
    String(optionD).trim(),
    String(questionRow.correctAnswer || '').trim().toUpperCase(),
    String(questionRow.category      || '').trim(),
    String(questionRow.tags          || '').trim(),
    questionRow.dateAdded  || new Date().toISOString().slice(0, 10),
    questionRow.difficulty || '',
    questionRow.active !== false ? 'TRUE' : 'FALSE'
  ];

  // Check if questionId already exists — update in place if so
  var data     = sheet.getDataRange().getValues();
  var qid      = String(questionRow.questionId || '').trim();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === qid) {
      sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      return { ok: true, action: 'updated' };
    }
  }
  sheet.appendRow(rowValues);
  return { ok: true, action: 'inserted' };
}

/**
 * SheetAdapter_getNextQuestionId(currentQuestionId)
 * Returns the questionId of the next active question (by sheet row order).
 * If currentQuestionId is null/empty, returns the first question's id.
 * Returns null if at last question or no questions exist.
 */
function SheetAdapter_getNextQuestionId(currentQuestionId) {
  try {
    var questions = _SheetAdapter_getAllQuestions();
    if (!questions.length) return null;
    if (!currentQuestionId) return questions[0].questionId;
    for (var i = 0; i < questions.length; i++) {
      if (questions[i].questionId === String(currentQuestionId).trim()) {
        return (i + 1 < questions.length) ? questions[i + 1].questionId : null;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * SheetAdapter_getPrevQuestionId(currentQuestionId)
 * Returns the questionId of the previous active question (by sheet row order).
 * Returns null if at first question or no questions exist.
 */
function SheetAdapter_getPrevQuestionId(currentQuestionId) {
  try {
    var questions = _SheetAdapter_getAllQuestions();
    if (!questions.length) return null;
    for (var i = 0; i < questions.length; i++) {
      if (questions[i].questionId === String(currentQuestionId).trim()) {
        return (i > 0) ? questions[i - 1].questionId : null;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

// =============================================================================
// PARTICIPANTS
// =============================================================================

/**
 * SheetAdapter_writeParticipant(participant)
 */
function SheetAdapter_writeParticipant(participant) {
  var headers = ["participantId","sessionId","displayCode","role","joinedAt","lastSeenAt"];
  var sheet   = _SheetAdapter_getOrCreateSheet(QV_CONFIG.SHEET_TABS.PARTICIPANTS, headers);
  sheet.appendRow([
    participant.participantId, participant.sessionId, participant.displayCode,
    participant.role, participant.joinedAt, participant.lastSeenAt
  ]);
}

// =============================================================================
// VOTES
// =============================================================================

/**
 * SheetAdapter_writeVote(voteRecord)
 */
function SheetAdapter_writeVote(voteRecord) {
  var headers = ["voteId","sessionId","questionId","participantId","round","answer","isCorrect","submittedAt"];
  var sheet   = _SheetAdapter_getOrCreateSheet(QV_CONFIG.SHEET_TABS.VOTES, headers);
  sheet.appendRow([
    voteRecord.voteId,        voteRecord.sessionId,
    voteRecord.questionId,    voteRecord.participantId,
    voteRecord.round,         voteRecord.answer,
    voteRecord.isCorrect,     voteRecord.submittedAt
  ]);
}

/**
 * SheetAdapter_countVotes(sessionId, questionId)
 * Returns { round1, round2, totalParticipants }
 * Uses parseInt to handle values stored as strings in Sheets.
 */
function SheetAdapter_countVotes(sessionId, questionId) {
  var sheet = _Config_getSpreadsheet().getSheetByName(QV_CONFIG.SHEET_TABS.VOTES);
  if (!sheet) return { round1: 0, round2: 0, totalParticipants: 0 };
  var data = sheet.getDataRange().getValues();
  var r1 = 0, r2 = 0;
  var participants = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === sessionId && data[i][2] === questionId) {
      var round = parseInt(data[i][4], 10);
      if (round === 1) r1++;
      if (round === 2) r2++;
      participants[data[i][3]] = true;
    }
  }
  return { round1: r1, round2: r2, totalParticipants: Object.keys(participants).length };
}
