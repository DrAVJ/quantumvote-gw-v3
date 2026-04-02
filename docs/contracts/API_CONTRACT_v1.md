# API_CONTRACT_v1 — QuantumVote GW v3

> **Detta dokument definierar det enda tillåtna offentliga funktionskontraktet mellan klienter och backend i QuantumVote GW v3.**
> Alla agenter måste använda exakt dessa publika namn om inte kontraktet ändras formellt.

---

## Regler

- Alla publika Apps Script-funktioner ska prefixas med domännamn för att undvika namnkonflikter i det globala namespace som delas mellan `.gs`-filer.
- Klienter får endast anropa funktioner som finns listade i detta dokument.
- Backend får lägga till privata hjälpfunktioner, men de ska prefixas med underscore och domännamn (t.ex. `_Session_helper`).
- Ändringar av signaturer kräver versionshjning eller godkänd kontraktsdiff.

---

## Routing

### `Route_handleDoGet(e)`
- **Ägare:** Backend-agent
- **Input:** `e.parameter.view`, `e.parameter.sessionId`, `e.parameter.questionId` (optional)
- **Output:** `HtmlOutput` för en av vyerna: `teacher-console`, `teacher-remote`, `student` eller `projector`

---

## Auth

### `Auth_getCurrentUserContext()`
Output: `{ "email": "string|null", "domain": "string|null", "isTeacher": true, "isAuthenticated": true }`

### `Auth_requireTeacher()`
Output: Kastar fel om användaren inte är behörig lärare

---

## Session actions

### `Session_create(presentationId, classCode, options)`
Input: `{ "presentationId": "string", "classCode": "string", "options": { "safeMode": true, "allowVoteChange": true, "discussionSeconds": 120 } }`
Output: `{ "ok": true, "sessionId": "string", "stateSnapshot": {} }`

### `Session_load(sessionId)`
Output: `{ "ok": true, "session": {}, "stateSnapshot": {}, "links": { "teacherConsoleUrl": "string", "teacherRemoteUrl": "string", "studentUrl": "string", "projectorUrl": "string" } }`

### `Session_activateQuestion(sessionId, questionId)`
Output: `{ "ok": true, "stateSnapshot": {} }`

### `Session_nextQuestion(sessionId)`
Samma outputformat som `Session_activateQuestion`

### `Session_prevQuestion(sessionId)`
Samma outputformat som `Session_activateQuestion`

### `Session_transition(sessionId, nextState, payload)`
Input: `{ "sessionId": "string", "nextState": 3, "payload": { "round": 1, "durationSec": 8 } }`
Output: `{ "ok": true, "stateSnapshot": {} }`

### `Session_getState(sessionId)`
Output: `{ "ok": true, "stateSnapshot": { "sessionId": "string", "currentState": 0, "currentQuestionId": "string|null", "currentSlideId": "string|null", "voteCountR1": 0, "voteCountR2": 0, "safeMode": true, "questionStartTs": "string|null", "discussionEndTs": "string|null", "lastCommandAt": "string|null", "lastCommandByRole": "string|null" } }`

### `Session_archive(sessionId)`
Output: `{ "ok": true, "archived": true }`

---

## Vote actions

### `Vote_registerParticipant(sessionId, role)`
Input: `sessionId: string`, `role: "student" | "teacher-remote" | "teacher-console" | "projector"`
Output: `{ "ok": true, "participantId": "string", "displayCode": "string" }`

### `Vote_submit(sessionId, participantId, round, answer)`
Input: `{ "sessionId": "string", "participantId": "string", "round": 1, "answer": "A" }`
Output: `{ "ok": true, "accepted": true, "voteRecord": { "sessionId": "string", "questionId": "string", "participantId": "string", "round": 1, "answer": "A" } }`

### `Vote_getCounts(sessionId, questionId)`
Output: `{ "ok": true, "counts": { "round1": 0, "round2": 0, "totalParticipants": 0 } }`

---

## Slides actions

### `Slides_importQuestionsFromPresentation(presentationId)`
Output: `{ "ok": true, "imported": 0, "questionIds": [] }`

### `Slides_extractQuestion(slideId)`
Output: `{ "ok": true, "question": { "questionId": "string", "slideId": "string", "prompt": "string", "options": {}, "correctAnswer": "A", "imageFileId": "string|null" } }`

---

## Analytics actions

### `Analytics_getPrivateLiveDistribution(sessionId, questionId, round)`
Output: `{ "ok": true, "distribution": { "A": 0, "B": 0, "C": 0, "D": 0 }, "pctCorrect": 0 }`

### `Analytics_computeQuestionStats(sessionId, questionId)`
Output: `{ "ok": true, "stats": { "nR1": 0, "nR2": 0, "pctCorrectR1": 0, "pctCorrectR2": 0, "gain": 0, "distR1": {}, "distR2": {}, "dominantDistractorR1": "B", "dominantDistractorR2": "C" } }`

### `Analytics_getQuestionHistory(questionId)`
Output: `{ "ok": true, "history": { "totalRuns": 0, "avgPctCorrectR1": 0, "avgPctCorrectR2": 0, "avgGain": 0, "medianGain": 0, "commonDistractor": "B", "recentRuns": [] } }`

---

## Audit actions

### `Audit_logAction(actorRole, actorId, action, sessionId, questionId, metadata)`
Anropas från backendlager, inte direkt från klient.

---

## UI state keys (tillåtna, inga andra får introduceras)

- `currentState`
- `currentQuestionId`
- `currentSlideId`
- `currentRound`
- `voteOpen`
- `safeMode`
- `voteCountR1`
- `voteCountR2`
- `discussionEndTs`
- `questionStartTs`

---

*Version: v1 | Status: Bindande kontrakt | Ägare: Backend-agent/Integrationsagent*
