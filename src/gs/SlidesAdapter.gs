// =============================================================================
// FILE: src/gs/SlidesAdapter.gs
// PROJECT: QuantumVote GW v3
// OWNER: Agent 3 (Frontend & HTML) + Agent 5 integration
// PURPOSE: Integration with Google Slides for question extraction and flow control.
// CONTRACT: API_CONTRACT_v1.md
//
// INTEGRATION FIXES (Agent 5):
//  - Slides_importQuestionsFromPresentation: wired SheetAdapter_writeQuestion
//    so parsed questions are persisted to the Questions sheet.
//  - questionId format: uses slide objectId (stable) as per DATA_CONTRACT_v1
// =============================================================================

/**
 * Slides_importQuestionsFromPresentation(presentationId)
 * Reads all slides in a presentation and extracts question data.
 * @param {string} presentationId
 * @returns {Object} { ok: true, imported: number, questionIds: string[] }
 */
function Slides_importQuestionsFromPresentation(presentationId) {
  try {
    const deck   = SlidesApp.openById(presentationId);
    const slides = deck.getSlides();
    let importedCount = 0;
    let questionIds   = [];

    slides.forEach((slide, index) => {
      const question = _Slides_parseSlide(slide, presentationId);
      if (question) {
        // INTEGRATION FIX (Agent 5): persist question to Sheets
        SheetAdapter_writeQuestion(question);
        questionIds.push(question.questionId);
        importedCount++;
      }
    });

    return { ok: true, imported: importedCount, questionIds: questionIds };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

/**
 * Slides_extractQuestion(slideId)
 * Extracts question data from a specific slide.
 * @param {string} slideId - Format: "presentationId::objectId" OR just objectId.
 * @returns {Object} { ok: true, question: Object } or { ok: false, error: string }
 *
 * NOTE (Agent3-mini): Config_get() is not implemented.
 * Pass slideId as "presentationId::objectId" compound key.
 */
function Slides_extractQuestion(slideId) {
  try {
    var presentationId = null;
    var actualSlideId  = slideId;

    if (slideId && slideId.indexOf('::') !== -1) {
      var parts      = slideId.split('::');
      presentationId = parts[0];
      actualSlideId  = parts[1];
    }

    if (!presentationId) {
      return { ok: false,
               error: 'Slides_extractQuestion: presentationId could not be resolved. ' +
                      'Pass slideId as "presentationId::objectId" or use ' +
                      'Slides_importQuestionsFromPresentation(presentationId) instead.' };
    }

    const deck  = SlidesApp.openById(presentationId);
    const slide = deck.getSlides().find(function(s) {
      return s.getObjectId() === actualSlideId;
    });
    if (!slide) throw new Error('Slide not found: ' + actualSlideId);

    const question = _Slides_parseSlide(slide, presentationId);
    return { ok: true, question: question };
  } catch (e) {
    return { ok: false, error: e.toString() };
  }
}

/**
 * Internal helper to parse a slide into a Question object.
 * @private
 */
function _Slides_parseSlide(slide, presentationId) {
  const notes     = slide.getNotesPage().getSpeakerNotesShape().getText().asString();
  const jsonMatch = notes.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const data = JSON.parse(jsonMatch[0]);
    return {
      questionId:     data.questionId || slide.getObjectId(),
      presentationId: presentationId,
      slideId:        slide.getObjectId(),
      title:          data.title         || 'Fraga',
      prompt:         data.prompt        || '',
      options:        data.options       || { 'A': '', 'B': '', 'C': '', 'D': '' },
      optionsJson:    JSON.stringify(data.options || { 'A': '', 'B': '', 'C': '', 'D': '' }),
      correctAnswer:  data.correctAnswer || 'A',
      imageFileId:    data.imageFileId   || null,
      conceptTag:     data.conceptTag    || null,
      difficulty:     data.difficulty    || null,
      version:        data.version       || 'v1',
      active:         true
    };
  } catch (e) {
    return null;
  }
}

/**
 * Slides_syncWithPresenter() - not implemented in web app context
 */
function Slides_syncWithPresenter() {
  return { ok: false, error: 'Not implemented - requires Add-on context' };
}
