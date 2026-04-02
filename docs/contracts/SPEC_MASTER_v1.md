# SPEC_MASTER_v1 — QuantumVote GW v3

> **Detta dokument är master-specifikationen för projektet QuantumVote GW v3.**
> Dokumentet är den högsta sanningen för projektets funktionella mål, arkitektur, roller, constraints och acceptanskriterier.
> Alla agenter måste följa detta dokument och får inte avvika utan att först föreslå en ändring mot master-specen.

---

## Projektmål

Systemet ska vara ett Google Workspace-nativt responssystem för Peer Instruction med fokus på låg latens, tydlig rollseparation, säker classroom-användning och historisk analys per fråga.

Systemet ska stödja frågor med och utan bild, två omgångar av omröstning, diskussionsfas, gamification-inspirerad feedback och långsiktig historik på frågenivå.

---

## Övergripande principer

- All persistent data ska lagras inom skolans Google Workspace-miljö, primärt i Slides, Sheets och Drive.
- Ingen extern databas eller tredjeparts analytics får användas för känslig eller pseudonymiserad undervisningsdata.
- Systemet ska använda Apps Script HTML Service och web app-routing via `doGet()` för att servera separata vyer.
- Systemet ska vara state-machine-drivet och backend ska vara sanningskälla för tillstånd.
- Privat lärardata får aldrig exponeras i projektorvy eller elevvy under aktiv omröstning.

---

## Kärnfunktioner

### 1. Låg latens

Låg latens är högsta prioritet i den pedagogiska upplevelsen. Lösningen ska därför minimera dubbla pollers, reducera payload-storlek, använda kortlivad cache där det är lämpligt och separera lätta state-anrop från tyngre historik- och statistikoperationer.

### 2. Frågor på projektorskärmen

Systemet ska kunna skapa, läsa in och visa frågor på projektorskärmen både med och utan bild. Google Slides är canonical authoring-miljö, och sliden ska kunna mappas till en systemfråga med stabilt `questionId`, `slideId`, korrekt svar, alternativ och eventuell bildreferens.

### 3. Elever svarar från mobil eller dator

Elever ska använda en separat elevvy med tydlig frågetext, eventuell bild, svarsalternativ och fasinstruktioner. Elevgränssnittet ska fungera på både mobil och dator och får aldrig innehålla lärarkontroller eller privat statistik.

### 4. Två omgångar med Peer Instruction

Systemet ska scaffolda Peer Instruction explicit i state machine-logiken. Varje fråga ska kunna genomföras i två omgångar med individuell röstning, diskussionsfas och ny omröstning innan resultat publiceras.

### 5. Statistik och historik

Systemet ska spara historisk statistik per fråga och kunna visa aggregerad historik, inklusive fördelningar, korrektandelar, gain och vanliga distraktorer. Data ska sparas så att samma fråga kan analyseras över flera lektioner och tillfällen.

---

## Roller

Systemet ska ha exakt fyra roller:

| Roll | Beskrivning |
|------|-------------|
| **Teacher Console** | Rik lärarvy på dator för kontroll, historik och privat analytics |
| **Teacher Remote** | Mobilanpassad lärarfjärrkontroll för live-styrning och diskret statistikvisning |
| **Student Vote App** | Elevens separata röstningsgränssnitt |
| **Projector View** | Offentlig klassrumsvy utan privat data |

---

## Arkitektur

Systemet ska bestå av följande huvuddelar:

1. **Google Slides** — fråge- och presentationslager
2. **Apps Script backend** — routing, state machine, auth och integrationer
3. **HTML Service-baserade vyer** — för lärare, elev och projektor
4. **Google Sheets** — sessioner, röster, statistik, historik och audit log
5. **Google Drive** — eventuella frågebilder och metadata

---

## Routing

Web appen ska stödja minst följande routes via `doGet()`:

- `?view=teacher-console`
- `?view=teacher-remote`
- `?view=student`
- `?view=projector`

Varje route ska returnera rätt HTML-vy med initial bootstrap-data, och backend ska validera att användaren får åtkomst till vy och session.

---

## State machine

Systemet ska implementera följande state machine som enda tillåtna officiella undervisningsflöde:

| State | Namn |
|-------|------|
| 0 | IDLE |
| 1 | QUESTION_READY |
| 2 | COUNTDOWN_R1 |
| 3 | VOTING_R1 |
| 4 | R1_CLOSED |
| 5 | DISCUSSION |
| 6 | COUNTDOWN_R2 |
| 7 | VOTING_R2 |
| 8 | R2_CLOSED |
| 9 | RESULTS_VISIBLE |
| 10 | ARCHIVED |

Enbart definierade transitioner är tillåtna. Se `STATE_MACHINE_v1.md` för fullständig transitionstabell.

---

## Mirror-safe mode

Mirror-safe mode ska vara default för varje ny session. När safe mode är aktivt ska:
- Privat statistik vara dold som standard
- Lärarens mobilvy kräva aktiv reveal för privat livegraf
- Projektorvyn aldrig kunna exponera intern analytics

---

## Dataminimering

Systemet ska följa dataminimeringsprincipen:
- Elevnamn ska inte sparas i röstdatatabellen som standard
- Systemet ska undvika IP-loggning, externa identifikatorer och tredjepartsspårning

---

## Prestandaregler

- En klient får bara ha en aktiv state-poller åt gången
- Polling ska vara adaptiv — snabbare under aktiv röstning, långsammare i andra faser
- Tunga slide-operationer ska inte köras mitt under aktiv omröstning om det går att förbereda dem före lektionen

---

## Samarbetsmodell

Projektet ska byggas med flera agenter, men **endast en integrationsagent får mergea till master och publicera till det riktiga Apps Script-projektet via Git och clasp**. Alla andra agenter ska arbeta genom kontrakt, patchar och filägarskap.

---

## Acceptanskriterier

Projektet är inte färdigt förrän följande är sant:

- [ ] Lärare kan styra session från både dator och mobil
- [ ] Elev, lärare och projektor har separata vyer
- [ ] Projektorn visar aldrig privat livefördelning under aktiv omröstning
- [ ] Två peer-instruction-omgångar fungerar stabilt
- [ ] Frågor med och utan bild fungerar
- [ ] Historik sparas per fråga och kan visas aggregerat
- [ ] Inga externa datalager används för känslig undervisningsdata
- [ ] Integrationen kan underhållas av flera agenter utan filkollisioner genom låsta kontrakt och filägarskap

---

*Version: v1 | Status: Bindande kontrakt | Ägare: Projektägare/Integrationsagent*
