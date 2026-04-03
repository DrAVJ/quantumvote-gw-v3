/**
 * File: Config.gs
 * Owner: Agent 2 (Backend) — copied verbatim to agent5-integration
 * Purpose: Global configuration, constants, and feature flags.
 * Contracts: SPEC_MASTER_v1, API_CONTRACT_v1, DATA_CONTRACT_v1
 *
 * MANUAL APPS SCRIPT NOTE:
 *  Copy this file as-is into the Apps Script editor as "Config.gs".
 *  This file must be present before all other .gs files are loaded.
 */

var QV_CONFIG = {
  SHEET_ID: '',
  SHEET_TABS: {
    CONFIG:           'Config',
    QUESTIONS:        'Questions',
    SESSIONS:         'Sessions',
    PARTICIPANTS:     'Participants',
    VOTES:            'Votes',
    QUESTION_STATS:   'QuestionStats',
    QUESTION_HISTORY: 'QuestionHistoryAggregate',
    AUDIT_LOG:        'AuditLog'
  },
  VALID_ANSWERS:              ['A', 'B', 'C', 'D'],
  MAX_OPTIONS:                4,
  VALID_ROLES:                ['student', 'teacher-remote', 'teacher-console', 'projector'],
  DEFAULT_SAFE_MODE:          true,
  DEFAULT_ALLOW_VOTE_CHANGE:  true,
  DEFAULT_DISCUSSION_SECONDS: 120,
  DEFAULT_COUNTDOWN_SECONDS:  5,
  POLLING_INTERVAL_ACTIVE_MS: 2000,
  POLLING_INTERVAL_IDLE_MS:   8000,
  TEACHER_DOMAINS: '',
  TEACHER_EMAILS:  '',
  APP_VERSION:     'v3.0.0'
};

var QV_STATES = {
  IDLE:            0,
  QUESTION_READY:  1,
  COUNTDOWN_R1:    2,
  VOTING_R1:       3,
  R1_CLOSED:       4,
  DISCUSSION:      5,
  COUNTDOWN_R2:    6,
  VOTING_R2:       7,
  R2_CLOSED:       8,
  RESULTS_VISIBLE: 9,
  ARCHIVED:        10
};

var QV_STATE_NAMES = (function() {
  var m = {};
  for (var k in QV_STATES) {
    if (QV_STATES.hasOwnProperty(k)) m[QV_STATES[k]] = k;
  }
  return m;
})();

function _Config_getSpreadsheet() {
  if (QV_CONFIG.SHEET_ID) {
    return SpreadsheetApp.openById(QV_CONFIG.SHEET_ID);
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'Config: No spreadsheet found. Set QV_CONFIG.SHEET_ID or run as bound script.'
    );
  }
  return ss;
}