// =============================================================================
// FILE: src/gs/SlidesAdapter.gs
// PROJECT: QuantumVote GW v3
// OWNER: Agent 3 (Frontend & HTML)
// PURPOSE: Integration with Google Slides for question extraction and flow control.
// CONTRACT: API_CONTRACT_v1.md
// PATCH: Agent3-mini - Slides_extractQuestion now requires presentationId as
//        argument instead of calling Config_get() which is not implemented.
//        The old signature Slides_extractQuestion(slideId) is preserved for
//        API_CONTRACT compatibility; presentationId must be passed via slideId
//        parameter as "presentationId:slideId" or caller must use
//        Slides_importQuestionsFromPresentation instead.
//        See TODO below for when Config.gs is implemented.
// =============================================================================

/**
 * Slides_importQuestionsFromPresentation(presentationId)
 * Reads all slides in a presentation and extracts question data.
 * @param {string} presentationId
 * @returns {Object} { ok: true, imported: number, questionIds: string[] }
 */
function Slides_importQuestionsFromPresentation(presentationId) {
  try {
    const deck = SlidesApp.openById(presentationId);
    const slides = deck.getSlides();
    let importedCount = 0;
    let questionIds = [];

    slides.forEach((slide, index) => {
      const question = _Slides_parseSlide(slide, presentationId);
      if (question) {
        // Save to Sheet via SheetAdapter (Agent 2 domain)
        // Here we just return the count and IDs as per API CONTRACT
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
 * @param {string} slideId - Format: "presentationId:objectId" OR just objectId
 *   if called with compound key. Falls back to error if no presentationId
 *   can be resolved (Config_get is not yet implemented).
 * @returns {Object} { ok: true, question: Object } or { ok: false, error: string }
 *
 * PATCH Agent3-mini: Config_get('PRESENTATION_ID') was removed because
 * Config_get() is not implemented in Config.gs (placeholder only).
 * This function now requires presentationId to be embedded in slideId as
 * "presentationId::objectId". If the format is plain objectId only,
 * the function returns a defensive error instead of crashing.
 *
 * TODO: When Config.gs implements Config_get(), restore:
 *   const presentationId = Config_get('PRESENTATION_ID');
 */
function Slides_extractQuestion(slideId) {
  try {
    // PATCH: Config_get() not available - parse compound key or return safe error
    var presentationId = null;
    var actualSlideId = slideId;

    if (slideId && slideId.indexOf('::') !== -1) {
      // Compound format: "presentationId::objectId"
      var parts = slideId.split('::');
      presentationId = parts[0];
      actualSlideId = parts[1];
    }

    if (!presentationId) {
      // Config_get not implemented; cannot resolve presentationId.
      // Return safe error instead of crashing.
      return {
        ok: false,
        error: 'Slides_extractQuestion: presentationId could not be resolved. ' +
               'Config_get() is not yet implemented. ' +
               'Pass slideId as "presentationId::objectId" or use ' +
               'Slides_importQuestionsFromPresentation(presentationId) instead.'
      };
    }

    const deck = SlidesApp.openById(presentationId);
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
  const notes = slide.getNotesPage().getSpeakerNotesShape().getText().asString();
  const jsonMatch = notes.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const data = JSON.parse(jsonMatch[0]);
    return {
      questionId: data.questionId || slide.getObjectId(),
      presentationId: presentationId,
      slideId: slide.getObjectId(),
      title: data.title || 'Fraga',
      prompt: data.prompt || '',
      options: data.options || { 'A': '', 'B': '', 'C': '', 'D': '' },
      correctAnswer: data.correctAnswer || 'A',
      imageFileId: data.imageFileId || null
    };
  } catch (e) {
    return null;
  }
}

/**
 * Slides_syncWithPresenter()
 */
function Slides_syncWithPresenter() {
  return { ok: false, error: 'Not implemented - requires Add-on context' };
}
