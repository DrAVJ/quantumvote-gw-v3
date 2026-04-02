/**
 * File: Config.gs
 * Owner: Backend-agent (Agent 2)
 * Project: QuantumVote GW v3
 * Purpose: Global configuration, constants, and feature flags.
 * Contracts: SPEC_MASTER_v1, API_CONTRACT_v1, DATA_CONTRACT_v1
 *
 * MANUAL APPS SCRIPT NOTE:
 *   Copy this file as-is into the Apps Script editor as "Config.gs".
 *   This file must be present before all other .gs files are loaded,
 *   since other files read QV_CONFIG at startup.
 */

// ---------------------------------------------------------------------------
// QV_CONFIG — central configuration object
// All backend files read from this object. Never hard-code these values
// elsewhere. If you change a value here it takes effect everywhere.
// ---------------------------------------------------------------------------
var QV_CONFIG = {

  // --- Google Sheets ---
  // Set this to the SpreadsheetApp.getActiveSpreadsheet().getId() value
  // for the deployment spreadsheet. Left empty so the script works both
  // as a bound script (getActiveSpreadsheet works) and standalone.
  SHEET_ID: '',

  // --- Sheet tab names (must match DATA_CONTRACT_v1 exactly) ---
  SHEET_TABS: {
    CONFIG:              'Config',
    QUESTIONS:           'Questions',
    SESSIONS:            'Sessions',
    PARTICIPANTS:        'Participants',
    VOTES:               'Votes',
    QUESTION_STATS:      'QuestionStats',
    QUESTION_HISTORY:    'QuestionHistoryAggregate',
    AUDIT_LOG:           'AuditLog'
  },

  // --- Allowed answer options (DATA_CONTRACT_v1) ---
  VALID_ANSWERS: ['A', 'B', 'C', 'D'],
  MAX_OPTIONS: 4,

  // --- Allowed participant roles (API_CONTRACT_v1) ---
  VALID_ROLES: ['student', 'teacher-remote', 'teacher-console', 'projector'],

  // --- Session defaults ---
  DEFAULT_SAFE_MODE:           true,
  DEFAULT_ALLOW_VOTE_CHANGE:   true,
  DEFAULT_DISCUSSION_SECONDS:  120,
  DEFAULT_COUNTDOWN_SECONDS:   5,

  // --- Polling intervals (ms) — read by frontend bootstrap ---
  POLLING_INTERVAL_ACTIVE_MS: 2000,
  POLLING_INTERVAL_IDLE_MS:   8000,

  // --- Auth ---
  // Comma-separated list of authorised teacher e-mail domains.
  // Example: 'skola.se,edu.example.com'
  // If empty, any authenticated Google account is accepted as teacher.
  TEACHER_DOMAINS: '',
  // Comma-separated list of explicitly authorised teacher e-mails.
  // Takes precedence over TEACHER_DOMAINS if non-empty.
  TEACHER_EMAILS: '',

  // --- App version ---
  APP_VERSION: 'v3.0.0-agent2'
};

// ---------------------------------------------------------------------------
// State constants — mirrors STATE_MACHINE_v1.md exactly.
// Use QV_STATES.IDLE etc. throughout the codebase; never use raw integers.
// ---------------------------------------------------------------------------
var QV_STATES = {
  IDLE:             0,
  QUESTION_READY:   1,
  COUNTDOWN_R1:     2,
  VOTING_R1:        3,
  R1_CLOSED:        4,
  DISCUSSION:       5,
  COUNTDOWN_R2:     6,
  VOTING_R2:        7,
  R2_CLOSED:        8,
  RESULTS_VISIBLE:  9,
  ARCHIVED:        10
};

// Reverse map: integer → name string (for error messages and logging)
var QV_STATE_NAMES = (function() {
  var m = {};
  for (var k in QV_STATES) {
    if (QV_STATES.hasOwnProperty(k)) m[QV_STATES[k]] = k;
  }
  return m;
})();

// ---------------------------------------------------------------------------
// Helper: get the active spreadsheet, respecting SHEET_ID config.
// Returns a Spreadsheet object or throws a clear error.
// Internal — not part of public API.
// ---------------------------------------------------------------------------
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
