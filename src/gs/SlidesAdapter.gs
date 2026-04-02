// =============================================================================
// FILE: src/gs/SlidesAdapter.gs
// PROJECT: QuantumVote GW v3
// OWNER: Agent 3 (Frontend & HTML)
// PURPOSE: Reads question data from Google Slides presenter notes
// CONTRACT: DATA_CONTRACT_v1.md, FILE_OWNERSHIP_v1.md
// STATUS: PLACEHOLDER – implementation reserved for Agent 3
// SLIDES ID: Defined in Config.gs (PRESENTATION_ID)
// =============================================================================

/**
 * getCurrentQuestion() – Reads question from current slide's speaker notes
 * @returns {Object} {questionId, text, options: {A,B,C,D}, correctAnswer}
 */
function getCurrentQuestion() {
  // TODO (Agent 3): Open PRESENTATION_ID, read current slide notes, parse question
  throw new Error('getCurrentQuestion not yet implemented – reserved for Agent 3');
}

/**
 * getSlideIndex() – Returns the current slide number (1-based)
 * @returns {number} current slide index
 */
function getSlideIndex() {
  // TODO (Agent 3): Use SlidesApp to detect active slide
  throw new Error('getSlideIndex not yet implemented – reserved for Agent 3');
}

/**
 * parseQuestionFromNotes(notesText) – Parses structured question from notes string
 * @param {string} notesText - Raw speaker notes text
 * @returns {Object} parsed question object per DATA_CONTRACT_v1.md
 */
function parseQuestionFromNotes(notesText) {
  // TODO (Agent 3): Implement parser – format defined in DATA_CONTRACT_v1.md
  throw new Error('parseQuestionFromNotes not yet implemented – reserved for Agent 3');
}
