# DATA_CONTRACT_v1 — QuantumVote GW v3

> **Detta dokument definierar projektets datakontrakt: tillåtna objektstrukturer, Sheet-kolumner, JSON-fält och standardnycklar.**
> Alla agenter måste använda exakt dessa nycklar och får inte byta stavning eller struktur utan godkänd kontraktsändring.

---

## Allmänna regler

- Alla datum/tider lagras som ISO 8601-strängar i UTC om inget annat anges.
- Boolean-värden lagras som `true`/`false` i JSON och som text eller checkbox i Sheet beroende på implementation, men nyckelnamnen får inte ändras.
- Alla frågor ska ha stabilt `questionId` som inte beror på slide-ordning.
- Alla sessioner ska ha unikt `sessionId`.

---

## Objekt: Question

```json
{
  "questionId": "string",
  "presentationId": "string",
  "slideId": "string",
  "title": "string",
  "prompt": "string",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "optionsJson": "stringified-json-array-or-object",
  "correctAnswer": "A",
  "imageFileId": "string|null",
  "conceptTag": "string|null",
  "difficulty": "string|null",
  "version": "string",
  "active": true
}
```

## Objekt: SessionSnapshot

```json
{
  "sessionId": "string",
  "currentState": 0,
  "currentQuestionId": "string|null",
  "currentSlideId": "string|null",
  "currentRound": 0,
  "voteOpen": false,
  "safeMode": true,
  "questionStartTs": "string|null",
  "discussionEndTs": "string|null",
  "voteCountR1": 0,
  "voteCountR2": 0,
  "lastCommandAt": "string|null",
  "lastCommandByRole": "string|null"
}
```

## Objekt: Participant

```json
{
  "participantId": "string",
  "sessionId": "string",
  "displayCode": "string",
  "role": "student",
  "joinedAt": "string",
  "lastSeenAt": "string|null"
}
```

## Objekt: VoteRecord

```json
{
  "voteId": "string",
  "sessionId": "string",
  "questionId": "string",
  "participantId": "string",
  "round": 1,
  "answer": "A",
  "isCorrect": true,
  "submittedAt": "string"
}
```

## Objekt: QuestionStats

```json
{
  "sessionId": "string",
  "questionId": "string",
  "nR1": 0,
  "nR2": 0,
  "distR1": { "A": 0, "B": 0, "C": 0, "D": 0 },
  "distR2": { "A": 0, "B": 0, "C": 0, "D": 0 },
  "pctCorrectR1": 0,
  "pctCorrectR2": 0,
  "gain": 0,
  "dominantDistractorR1": "B|null",
  "dominantDistractorR2": "C|null",
  "savedAt": "string"
}
```

## Objekt: QuestionHistoryAggregate

```json
{
  "questionId": "string",
  "totalRuns": 0,
  "avgPctCorrectR1": 0,
  "avgPctCorrectR2": 0,
  "avgGain": 0,
  "medianGain": 0,
  "commonDistractor": "string|null",
  "lastRunAt": "string|null"
}
```

## Objekt: AuditLogRecord

```json
{
  "timestamp": "string",
  "actorRole": "teacher-console",
  "actorId": "string",
  "action": "Session_transition",
  "sessionId": "string|null",
  "questionId": "string|null",
  "metadataJson": "stringified-json"
}
```

---

## Sheet-schema

### Flik: Config
Kolumner i ordning:
1. `key`
2. `value`

### Flik: Questions
Kolumner i ordning:
1. `questionId`
2. `presentationId`
3. `slideId`
4. `title`
5. `prompt`
6. `optionsJson`
7. `correctAnswer`
8. `imageFileId`
9. `conceptTag`
10. `difficulty`
11. `version`
12. `active`

### Flik: Sessions
Kolumner i ordning:
1. `sessionId`
2. `presentationId`
3. `teacherEmail`
4. `classCode`
5. `safeMode`
6. `status`
7. `currentQuestionId`
8. `currentState`
9. `createdAt`
10. `startedAt`
11. `endedAt`

### Flik: Participants
Kolumner i ordning:
1. `participantId`
2. `sessionId`
3. `displayCode`
4. `role`
5. `joinedAt`
6. `lastSeenAt`

### Flik: Votes
Kolumner i ordning:
1. `voteId`
2. `sessionId`
3. `questionId`
4. `participantId`
5. `round`
6. `answer`
7. `isCorrect`
8. `submittedAt`

### Flik: QuestionStats
Kolumner i ordning:
1. `sessionId`
2. `questionId`
3. `nR1`
4. `nR2`
5. `distR1Json`
6. `distR2Json`
7. `pctCorrectR1`
8. `pctCorrectR2`
9. `gain`
10. `dominantDistractorR1`
11. `dominantDistractorR2`
12. `savedAt`

### Flik: QuestionHistoryAggregate
Kolumner i ordning:
1. `questionId`
2. `totalRuns`
3. `avgPctCorrectR1`
4. `avgPctCorrectR2`
5. `avgGain`
6. `medianGain`
7. `commonDistractor`
8. `lastRunAt`

### Flik: AuditLog
Kolumner i ordning:
1. `timestamp`
2. `actorRole`
3. `actorId`
4. `action`
5. `sessionId`
6. `questionId`
7. `metadataJson`

---

## Tillåtna svarsalternativ

Standard är `A`, `B`, `C`, `D`. Om fler alternativ ska stödjas i framtiden måste `maxOptions` styras centralt i config, och alla klienter ska läsa detta från bootstrap eller backend — inte hårdkoda egna alternativ.

---

*Version: v1 | Status: Bindande kontrakt | Ägare: Backend-agent/Integrationsagent*
