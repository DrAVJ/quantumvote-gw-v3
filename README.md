# QuantumVote GW v3

> Google Workspace-nativt responssystem för Peer Instruction
> Apps Script • Google Slides • Google Sheets • State-machine • Multi-agent development

---

## Projektbeskrivning

QuantumVote GW v3 är ett responsystem för Peer Instruction byggt helt inom Google Workspace-miljön. Det använder Google Apps Script som backend och web app-router, Google Slides som presentations- och frågelager, och Google Sheets för alla sessioner, röster, statistik och historik.

Systemet stödjer två omgångar av omröstning med diskussionsfas (klassisk Peer Instruction), gamification-inspirerad feedback och långsiktig fragehistorik.

**Ingen extern databas eller tredjeparts-analytics används för känslig eller pseudonymiserad undervisningsdata.**

---

## Arkitekturlöversikt

```
[Google Slides]  <-- frågor och presentationslager
       |
[Apps Script Backend]  <-- routing, state machine, auth, integrationer
       |
   +---+---+---+---+
   |   |   |   |
[Teacher  [Teacher  [Student  [Projector
 Console] Remote]   Vote]     View]
(dator)  (mobil)   (elev)    (klassrum)
       |
[Google Sheets]  <-- sessioner, röster, statistik, historik, audit log
[Google Drive]   <-- frågebilder och metadata
```

### Systemkomponenter

| Komponent | Teknik | Syfte |
|-----------|--------|-------|
| Backend | Google Apps Script (.gs) | Routing, state machine, auth, session, votes |
| Vyer | HTML Service (.html) | Teacher Console, Teacher Remote, Student, Projector |
| Datalager | Google Sheets | Persistent data - sessioner, röster, statistik |
| Frågelager | Google Slides | Canonical authoring-miljö för frågor |
| Media | Google Drive | Frågebilder och metadata |

---

## Roller i systemet

| Roll | Vy | Beskrivning |
|------|----|-------------|
| **Teacher Console** | `?view=teacher-console` | Rik lärarvy på dator - kontroll, historik, privat analytics |
| **Teacher Remote** | `?view=teacher-remote` | Mobilanpassad fjärrkontroll för live-styrning |
| **Student Vote** | `?view=student` | Elevens separata röstningsgränssnitt |
| **Projector View** | `?view=projector` | Offentlig klassrumsvy - aldrig privat data |

---

## Agentmodell

Projektet utvecklas med flera agenter där varje agent äger specifika filer.

| Agent | Ansvar | Branch |
|-------|--------|--------|
| **Integrationsagent** | Merge till `main`/`integration`, `clasp push`, deploy | `integration` |
| **Backend-agent** | `.gs`-filer: Config, Routing, Auth, Session, Vote, Sheet, Slides, Utils | `agent/backend` |
| **Teacher Console-agent** | TeacherConsole.html, TeacherConsoleJS.html, SharedStyles.html | `agent/teacher-console` |
| **Teacher Remote-agent** | TeacherRemote.html, TeacherRemoteJS.html | `agent/teacher-remote` |
| **StudentProjector-agent** | StudentVote.html, ProjectorView.html och JS-varianter | `agent/student-projector` |
| **Analytics-agent** | AnalyticsService.gs | `agent/analytics` |
| **QA-agent** | Testfall och verifiering | `agent/qa` |

**Se `docs/contracts/FILE_OWNERSHIP_v1.md` för fullständig filägarskapsmatris.**

---

## Branchstrategi

```
main               <-- stabil release, SKYDDAD
integration        <-- nästa integrerade version, SKYDDAD
agent/backend      <-- backend-agentens arbete
agent/teacher-console
agent/teacher-remote
agent/student-projector
agent/analytics
agent/qa
```

### Regler

- **Ingen agent får committa direkt till `main`.**
- Alla merges går via integrationsagenten.
- Pull requests måste referera till minst ett kontraktsdokument.
- Inga publika funktionsnamn får introduceras utan att matcha `API_CONTRACT_v1.md`.
- Nya dataflält får inte läggas till utan uppdatering av `DATA_CONTRACT_v1.md`.

---

## Kontraktsdokument

Alla bindande kontrakt finns i `docs/contracts/`:

| Fil | Innehåll |
|-----|----------|
| [SPEC_MASTER_v1.md](docs/contracts/SPEC_MASTER_v1.md) | Masterspekifikation - högsta sanningen |
| [API_CONTRACT_v1.md](docs/contracts/API_CONTRACT_v1.md) | Alla tillåtna publika funktioner och signaturer |
| [DATA_CONTRACT_v1.md](docs/contracts/DATA_CONTRACT_v1.md) | Datastrukturer, Sheet-kolumner, JSON-nycklar |
| [FILE_OWNERSHIP_v1.md](docs/contracts/FILE_OWNERSHIP_v1.md) | Filägarskap och merge-policy |
| [STATE_MACHINE_v1.md](docs/contracts/STATE_MACHINE_v1.md) | Tillstånd och tillåtna transitioner |
| [AGENT1_GITHUB_BOOTSTRAP_PLAN_v1.md](docs/contracts/AGENT1_GITHUB_BOOTSTRAP_PLAN_v1.md) | Bootstrap-plan för Agent 1 |

---

## Clasp och deploy

### Princip

**Endast integrationsagenten får köra `clasp push` mot masterprojektet.**

```bash
# Endast integrationsagenten!
clasp pull   # hämta senaste från Apps Script
clasp push   # publicera till Apps Script-projektet
```

### För lokalt arbete

```bash
npm install -g @google/clasp
cp .clasp.json.example .clasp.json
# Fyll i ditt scriptId i .clasp.json
clasp login
clasp pull
```

### OBS: Mapphierarki

Lokal repo-struktur är hierarkisk (`src/gs/`, `src/html/`), men Apps Script-projektet är **platt** när clasp pushar. Filnamn måste därför vara unika och tydliga utan mapppå (t.ex. `SessionService.gs`, inte `service.gs`).

---

## För varje agent - checklista före merge

- [ ] Har nya publika funktioner korrekt prefix? (Session_, Vote_, Analytics_, Slides_, Auth_, Route_)
- [ ] Matchar signaturerna `API_CONTRACT_v1.md`?
- [ ] Matchar nya dataflält `DATA_CONTRACT_v1.md`?
- [ ] Har filägarskap respekterats?
- [ ] Är eventuella state-förändringar förenliga med `STATE_MACHINE_v1.md`?
- [ ] Är PR kopplad till minst ett kontraktsdokument?

---

## Manuella GitHub-inställningar (måste göras av repo-ägare)

Följande inställningar kan inte sättas automatiskt via webbgränssnitt av en agent:

1. **Branch protection för `main`**:
   - Settings → Branches → Add rule → Branch name pattern: `main`
   - Aktivera: Require pull request before merging
   - Aktivera: Require approvals (minst 1)
   - Aktivera: Require review from Code Owners
   - Aktivera: Do not allow bypassing the above settings

2. **Branch protection för `integration`**:
   - Samma inställningar som `main`

3. **CODEOWNERS**:
   - Filen `.github/CODEOWNERS` finns i repo:t
   - Aktiveras automatiskt när branch protection kräver code owner review

4. **Skapa brancher** (se `docs/BRANCH_STRATEGY.md`):
   - Kan göras från GitHub UI eller `git branch` lokalt

---

## Acceptanskriterier

Systemet är inte färdigt förrän:
- Lärare kan styra session från både dator och mobil
- Elev, lärare och projektor har separata vyer
- Projektorn visar aldrig privat livedata under aktiv omröstning
- Två peer-instruction-omgångar fungerar stabilt
- Frågor med och utan bild fungerar
- Historik sparas per fråga och kan visas aggregerat
- Inga externa datalager används för känslig undervisningsdata
- Integrationen kan underhållas av flera agenter utan filkollisioner

---

*Agent 1 (GitHub Bootstrap) har skapat denna repo-struktur. Nästa steg är att Backend-agenten tar över `agent/backend`-branchen.*
