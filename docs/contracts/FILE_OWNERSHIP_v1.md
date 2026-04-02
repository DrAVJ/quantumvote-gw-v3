# FILE_OWNERSHIP_v1 — QuantumVote GW v3

> **Detta dokument definierar filägarskap, merge-policy och ändringsregler för alla agenter.**
> Syftet är att undvika att flera agenter skriver över varandra och att säkra konsekventa namn, ansvar och integrationer i ett Apps Script-projekt med flera `.gs`- och `.html`-filer.

---

## Grundregler

- Endast integrationsagenten får mergea till masterbranch och publicera till Apps Script-projektet via `clasp push`.
- Ingen agent utom integrationsagenten får skriva direkt i produktionsprojektet.
- Varje fil har en primär ägare och eventuellt en sekundär integrationsägare.
- Om en agent behöver ändra en fil som den inte äger ska ändringen lämnas som patchförslag till integrationsagenten.

---

## Filägarmatriser — .gs-filer

| Fil | Primär ägare | Sekundär | Kommentar |
|-----|-------------|----------|-----------|
| `Config.gs` | Backend-agent | Integrationsagent | Konfiguration, constants, feature flags |
| `Routing.gs` | Backend-agent | Integrationsagent | `doGet()` och route-dispatch |
| `Auth.gs` | Backend-agent | Integrationsagent | Lärarbehörighet och user context |
| `SessionService.gs` | Backend-agent | Integrationsagent | Sessioner och state machine |
| `VoteService.gs` | Backend-agent | Integrationsagent | Röster och counts |
| `SheetService.gs` | Backend-agent | Integrationsagent | Läs/skriv mot Sheets |
| `SlidesService.gs` | Backend-agent | Integrationsagent | Slides-import och frågeextraktion |
| `AnalyticsService.gs` | Analytics-agent | Integrationsagent | Beräkning av gain, statistik och historik |
| `TeacherActions.gs` | Backend-agent | Integrationsagent | Teacher-specifika server actions |
| `StudentActions.gs` | Backend-agent | Integrationsagent | Student-specifika server actions |
| `ProjectorActions.gs` | Backend-agent | Integrationsagent | Projector-läsning och visningsdata |
| `Utils.gs` | Backend-agent | Integrationsagent | Delade hjälpfunktioner |

## Filägarmatriser — .html-filer

| Fil | Primär ägare | Sekundär | Kommentar |
|-----|-------------|----------|-----------|
| `TeacherConsole.html` | Teacher Console-agent | Integrationsagent | Desktopvy lärare |
| `TeacherConsoleJS.html` | Teacher Console-agent | Integrationsagent | Klientlogik teacher console |
| `TeacherRemote.html` | Teacher Remote-agent | Integrationsagent | Mobil livekontroll |
| `TeacherRemoteJS.html` | Teacher Remote-agent | Integrationsagent | Klientlogik teacher remote |
| `StudentVote.html` | StudentProjector-agent | Integrationsagent | Elevvy |
| `StudentVoteJS.html` | StudentProjector-agent | Integrationsagent | Elevens klientlogik |
| `ProjectorView.html` | StudentProjector-agent | Integrationsagent | Offentlig projektorvy |
| `ProjectorViewJS.html` | StudentProjector-agent | Integrationsagent | Klientlogik projektor |
| `SharedStyles.html` | Teacher Console-agent | Integrationsagent | Delad styling — ändringar koordineras |
| `SharedUtilsJS.html` | Backend-agent | Integrationsagent | Delad klienthjälplogik |

---

## Branch-struktur

```
main                    ← stabil release, SKYDDAD
integration             ← nästa integrerade version, SKYDDAD
agent/backend           ← backend-agentens arbete
agent/teacher-console   ← Teacher Console-agentens arbete
agent/teacher-remote    ← Teacher Remote-agentens arbete
agent/student-projector ← StudentProjector-agentens arbete
agent/analytics         ← Analytics-agentens arbete
agent/qa                ← QA-agentens arbete
```

**Ingen agent får committa direkt till `main`.**

---

## Merge-policy

- Alla merges går via integrationsagenten.
- Integrationsagenten måste först köra `clasp pull` eller verifiera att lokal repo-version matchar Apps Script-projektets senaste tillstånd innan merge/push.
- Efter merge ska integrationsagenten köra snabb smoke test innan push till testprojekt.

---

## Patchformat

Varje agent ska lämna ändringar i följande format:

1. **Filer som ändras**
2. **Nya publika funktioner**
3. **Eventuella kontraktsbehov**
4. **Testfall**
5. **Risker/beroenden**

---

## Namnkonfliktregler

Alla publika funktioner i `.gs` ska prefixas per domän:
- `Session_` — sessionshantering
- `Vote_` — röstningslogik
- `Analytics_` — statistik och historik
- `Slides_` — slides-integration
- `Auth_` — autentisering
- `Route_` — routing

Ingen agent får skapa en ny publik funktion utan korrekt prefix och utan att den finns i `API_CONTRACT_v1.md` om den ska anropas från annan modul eller klient.

---

## HTML include-regler

- Delade HTML-fragment (`SharedStyles.html`, `SharedUtilsJS.html`) får inte fyllas med vy-specifik logik.
- Vy-specifik logik ska ligga i respektive vyfil för att undvika dolda beroenden mellan agenter.

---

*Version: v1 | Status: Bindande kontrakt | Ägare: Integrationsagent*
