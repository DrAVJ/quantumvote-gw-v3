# AGENT1_GITHUB_BOOTSTRAP_PLAN_v1 — QuantumVote GW v3

> **Detta dokument beskriver exakt vad Agent 1 ska göra för att skapa GitHub-repo, initiera projektet och lägga grunden för samarbete mellan flera agenter på ett säkert och konsekvent sätt.**
> Agent 1 ska inte bygga hela systemet, utan etablera det tekniska och organisatoriska fundamentet så att övriga agenter kan arbeta utan namnkonflikter, filkollisioner eller otydliga kontrakt.

---

## Syfte

Agent 1 är **GitHub Bootstrap & Collaboration Architect**. Uppdraget är att:
- Skapa GitHub-repo
- Lägga till kontraktsdokument
- Skapa initial fil- och mappstruktur
- Definiera branchstrategi
- Skriva README och samarbetsfiler
- Dokumentera manuella steg som återstår

---

## Leverabler som Agent 1 måste ta med till GitHub

```
quantumvote-gw-v3/
├── README.md
├── .gitignore
├── .clasp.json.example
├── appsscript.json.example
├── docs/
│   └── contracts/
│       ├── SPEC_MASTER_v1.md
│       ├── API_CONTRACT_v1.md
│       ├── DATA_CONTRACT_v1.md
│       ├── FILE_OWNERSHIP_v1.md
│       ├── STATE_MACHINE_v1.md
│       └── AGENT1_GITHUB_BOOTSTRAP_PLAN_v1.md
├── src/
│   ├── gs/
│   │   ├── Config.gs
│   │   ├── Routing.gs
│   │   ├── Auth.gs
│   │   ├── SessionService.gs
│   │   ├── VoteService.gs
│   │   ├── SheetService.gs
│   │   ├── SlidesService.gs
│   │   ├── AnalyticsService.gs
│   │   ├── TeacherActions.gs
│   │   ├── StudentActions.gs
│   │   ├── ProjectorActions.gs
│   │   └── Utils.gs
│   └── html/
│       ├── TeacherConsole.html
│       ├── TeacherConsoleJS.html
│       ├── TeacherRemote.html
│       ├── TeacherRemoteJS.html
│       ├── StudentVote.html
│       ├── StudentVoteJS.html
│       ├── ProjectorView.html
│       ├── ProjectorViewJS.html
│       ├── SharedStyles.html
│       └── SharedUtilsJS.html
├── scripts/
│   ├── setup-local.sh
│   └── validate-contracts.sh
└── .github/
    ├── pull_request_template.md
    ├── CODEOWNERS
    └── ISSUE_TEMPLATE/
        ├── agent-patch.md
        └── contract-change.md
```

---

## Repo-struktur som Agent 1 ska skapa

Lokal mappstruktur ska vara hierarkisk i Git, men Agent 1 ska dokumentera att Apps Script-projektet blir plattare vid push och att filnamn därför måste hållas unika och tydliga.

---

## Brancher som Agent 1 ska skapa

```
main
integration
agent/backend
agent/teacher-console
agent/teacher-remote
agent/student-projector
agent/analytics
agent/qa
```

---

## README som Agent 1 ska skapa

README ska innehålla minst:
1. Projektbeskrivning
2. Arkitekturöversikt
3. Rollbeskrivning för agenter
4. Länkning till kontraktsdokument
5. Regler för merge och deploy
6. Hur clasp används
7. Varning att endast integrationsagenten får göra `clasp push` mot masterprojekt

---

## GitHub-samarbetsregler

Agent 1 ska dokumentera följande regler i repot:
- Endast integrationsagenten får mergea till `main` och `integration`.
- Alla andra agenter arbetar i egna brancher eller lämnar patchar.
- Pull requests måste referera till minst ett kontraktsdokument.
- Inga publika funktionsnamn får introduceras utan att matcha `API_CONTRACT_v1.md`.
- Nya datafält får inte läggas till utan uppdatering av `DATA_CONTRACT_v1.md`.

---

## Placeholder-standard i källfiler

Varje ny tom fil ska inledas med en header som anger:
- Filnamn
- Primär ägare
- Syfte
- Beroende kontrakt

Exempel för `.gs`:
```javascript
/**
 * File: SessionService.gs
 * Owner: Backend-agent
 * Purpose: Session lifecycle and state machine transitions
 * Contracts: SPEC_MASTER_v1, API_CONTRACT_v1, DATA_CONTRACT_v1, STATE_MACHINE_v1
 */
```

---

## Kontraktssäkring

Agent 1 ska lägga in en enkel checklista i repot med frågor som varje agent måste verifiera innan merge:
- Har nya publika funktioner korrekt prefix?
- Matchar signaturerna `API_CONTRACT_v1.md`?
- Matchar nya datafält `DATA_CONTRACT_v1.md`?
- Har filägarskap respekterats?
- Är eventuella state-förändringar förenliga med `STATE_MACHINE_v1.md`?

---

## Integrationsprincip

Agent 1 ska skriva tydligt i repot att integrationsagenten är den enda som får:
- Köra `clasp pull`
- Köra `clasp push`
- Göra deploy till test eller produktion
- Lösa mergekonflikter i kontraktsfiler

---

## Browser control-anvisning för senare agenter

Agent 1 ska dokumentera att senare agenter som använder Assistant med browser control inte ska redigera produktionsprojektet direkt utan i första hand arbeta mot GitHub-repo, issues, pull requests och textpatchar.

Om direkt editorarbete används ska det ske **endast i testprojekt** och **endast av integrationsagent** eller uttryckligen utsedd ansvarig.

---

## Klart-kriterier för Agent 1

Agent 1 är färdig först när:
- [ ] GitHub-repo finns
- [ ] Kontraktsdokument är committade
- [ ] Branchstrategi är definierad
- [ ] Filstruktur finns
- [ ] Samarbetsregler finns i repo
- [ ] Det är tydligt vem som får push/deploya
- [ ] Övriga agenter kan börja arbeta utan att behöva gissa namn, filer eller ansvar

---

*Version: v1 | Status: Bindande kontrakt | Ägare: Agent 1 (Bootstrap) → Integrationsagent*
