# STATE_MACHINE_v1 — QuantumVote GW v3

> **Detta dokument definierar den enda tillåtna state machine för QuantumVote GW v3.**
> Backend är sanningskälla för tillstånd. Enbart definierade transitioner är tillåtna.
> Alla agenter måste följa detta dokument och får inte implementera egna tillstånd eller transitioner.

---

## Tillstånd

| State | Namn | Beskrivning |
|-------|------|-------------|
| 0 | `IDLE` | Ingen aktiv fråga, session pausad |
| 1 | `QUESTION_READY` | Fråga är vald och redo att visas |
| 2 | `COUNTDOWN_R1` | Nedräkning inför omgång 1 |
| 3 | `VOTING_R1` | Röstning omgång 1 är öppen |
| 4 | `R1_CLOSED` | Omgång 1 stängd, röstning låst |
| 5 | `DISCUSSION` | Diskussionsfas pågår |
| 6 | `COUNTDOWN_R2` | Nedräkning inför omgång 2 |
| 7 | `VOTING_R2` | Röstning omgång 2 är öppen |
| 8 | `R2_CLOSED` | Omgång 2 stängd |
| 9 | `RESULTS_VISIBLE` | Resultat visas publikt |
| 10 | `ARCHIVED` | Frågan är arkiverad, session klar |

---

## Tillåtna transitioner

Enbart följande transitioner är tillåtna. Alla andra ska avvisas med fel.

| Från state | Till state | Trigger |
|-----------|-----------|---------|
| 0 IDLE | 1 QUESTION_READY | Lärare väljer fråga |
| 1 QUESTION_READY | 2 COUNTDOWN_R1 | Lärare startar omgång 1 |
| 1 QUESTION_READY | 0 IDLE | Lärare avbryter |
| 2 COUNTDOWN_R1 | 3 VOTING_R1 | Nedräkning klar |
| 3 VOTING_R1 | 4 R1_CLOSED | Lärare stänger omgång 1 eller timer |
| 4 R1_CLOSED | 5 DISCUSSION | Lärare startar diskussion |
| 4 R1_CLOSED | 9 RESULTS_VISIBLE | Lärare hoppar över diskussion |
| 5 DISCUSSION | 6 COUNTDOWN_R2 | Lärare startar omgång 2 |
| 6 COUNTDOWN_R2 | 7 VOTING_R2 | Nedräkning klar |
| 7 VOTING_R2 | 8 R2_CLOSED | Lärare stänger omgång 2 eller timer |
| 8 R2_CLOSED | 9 RESULTS_VISIBLE | Lärare publicerar resultat |
| 9 RESULTS_VISIBLE | 10 ARCHIVED | Lärare arkiverar |
| 9 RESULTS_VISIBLE | 1 QUESTION_READY | Lärare väljer nästa fråga |
| 10 ARCHIVED | 0 IDLE | System reset |

---

## Regler

- Endast `Session_transition(sessionId, nextState, payload)` får ändra tillstånd.
- Backend validerar att övergången är tillåten innan den genomförs.
- Om en ogiltig transition försöks ska backend returnera fel: `{ "ok": false, "error": "INVALID_TRANSITION", "from": X, "to": Y }`.
- State lagras i Google Sheets (Flik: Sessions, kolumn: `currentState`).
- Alla klienter ska läsa state från `Session_getState()` — inte lokalt beräkna state.

---

## Visningsregler per state

| State | Teacher Console | Teacher Remote | Student Vote | Projector View |
|-------|----------------|----------------|-------------|----------------|
| 0 IDLE | Välj fråga | Välj fråga | Väntar på fråga | Logotyp/väntar |
| 1 QUESTION_READY | Fråga visas, starta R1 | Starta R1-knapp | Frågetext visas | Frågetext visas |
| 2 COUNTDOWN_R1 | Nedräkning | Nedräkning | Nedräkning | Nedräkning |
| 3 VOTING_R1 | Live-fördelning (om safeMode=false) | Antal röster | Röstningsknappar | Frågetext, antal röster |
| 4 R1_CLOSED | R1-fördelning privat | Starta diskussion-knapp | "Diskutera med granne" | Ingen fördelning om safeMode |
| 5 DISCUSSION | Timer, starta R2 | Timer, starta R2 | Diskussionsindikator | Timer |
| 6 COUNTDOWN_R2 | Nedräkning | Nedräkning | Nedräkning | Nedräkning |
| 7 VOTING_R2 | Live-fördelning (om safeMode=false) | Antal röster | Röstningsknappar | Frågetext, antal röster |
| 8 R2_CLOSED | R1+R2 privat | Publicera-knapp | "Väntar på resultat" | Ingen fördelning |
| 9 RESULTS_VISIBLE | Full statistik | Full statistik | Rätt/fel + fördelning | Publik fördelning + korrekt svar |
| 10 ARCHIVED | Historik | — | — | — |

---

## Mirror-safe mode

När `safeMode = true` (default) gäller:
- Projektorvyn visar **aldrig** livefördelning under VOTING_R1 eller VOTING_R2.
- Teacher Remote kräver aktiv reveal-handling för att se privat livegraf.
- Projektorvyn visar aldrig intern analytics.

---

*Version: v1 | Status: Bindande kontrakt | Ägare: Backend-agent/Integrationsagent*
