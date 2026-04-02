// =============================================================================
// FILE: src/gs/SlidesAdapter.gs
// PROJECT: QuantumVote GW v3
// OWNER: Agent 3 (Frontend & HTML)
// PURPOSE: Integration with Google Slides for question extraction and flow control.
// CONTRACT: API_CONTRACT_v1.md
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
 * @param {string} slideId
 * @returns {Object} { ok: true, question: Object }
 */
function Slides_extractQuestion(slideId) {
  try {
    const presentationId = Config_get('PRESENTATION_ID');
    const deck = SlidesApp.openById(presentationId);
    const slide = deck.getSlides().find(s => s.getObjectId() === slideId);
    
    if (!slide) throw new Error("Slide not found: " + slideId);
    
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
      title: data.title || "Fråga",
      prompt: data.prompt || "",
      options: data.options || { "A": "", "B": "", "C": "", "D": "" },
      correctAnswer: data.correctAnswer || "A",
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
  return { ok: false, error: "Not implemented - requires Add-on context" };
}
