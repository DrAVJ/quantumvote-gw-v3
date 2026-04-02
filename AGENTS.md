# AGENTS.md – Multi-Agent Collaboration Guide

## QuantumVote GW v3

Detta dokument beskriver rollfördelningen mellan de agenter som bygger projektet.
Läs detta FÖRST innan du ändrar någon fil.

---

## Agent 1: GitHub Bootstrap & Collaboration Architect
**Status:** KLAR  
**Branch:** `main`  
**Ansvar:**
- Skapade repo-strukturen
- Lade in alla sex kontraktsdokument i `docs/contracts/`
- Skapade README.md
- Skapade alla placeholder-filer med ägarkommentarer
- Skapade `.gitignore`, `.clasp.json.example`, `appsscript.json`
- Dokumenterade branchstrategi och agentroller

**Fält att inte röra:** Allt. Agent 1:s arbete är klart.

---

## Agent 2: Backend & API-implementatör
**Status:** VÄNTAR  
**Branch:** `agent2-backend`  
**Ansvar:**
- Implementera `src/gs/Routing.gs` (doGet/doPost)
- Implementera `src/gs/StateMachine.gs`
- Implementera `src/gs/SessionManager.gs`
- Implementera `src/gs/VoteCollector.gs`
- Implementera `src/gs/Auth.gs`

**Fält att INTE röra:**
- `src/gs/SheetAdapter.gs` (Agent 4)
- `src/gs/SlidesAdapter.gs` (Agent 3)
- `src/html/` (Agent 3)
- `docs/contracts/` (låsta – ändra bara via diskussion)

**Kontrakt att följa:** `API_CONTRACT_v1.md`, `STATE_MACHINE_v1.md`, `DATA_CONTRACT_v1.md`

---

## Agent 3: Frontend & HTML-implementatör
**Status:** VÄNTAR  
**Branch:** `agent3-frontend`  
**Ansvar:**
- Implementera `src/html/index.html`
- Implementera `src/html/vote.html`
- Implementera `src/html/results.html`
- Implementera `src/html/admin.html`
- Implementera `src/gs/SlidesAdapter.gs`

**Fält att INTE röra:**
- `src/gs/Routing.gs`, `StateMachine.gs`, `Auth.gs`, `SessionManager.gs`, `VoteCollector.gs` (Agent 2)
- `src/gs/SheetAdapter.gs` (Agent 4)

**Kontrakt att följa:** `API_CONTRACT_v1.md`, `DATA_CONTRACT_v1.md`, `UI_CONTRACT_v1.md`

---

## Agent 4: Google Sheets Integration
**Status:** VÄNTAR  
**Branch:** `agent4-sheets`  
**Ansvar:**
- Implementera `src/gs/SheetAdapter.gs`
- Skapa och konfigurera Google Sheets-mall
- Dokumentera sheet-struktur i `docs/`

**Fält att INTE röra:**
- Någon annan `.gs`-fil (Agent 2 eller 3)
- `src/html/` (Agent 3)

**Kontrakt att följa:** `DATA_CONTRACT_v1.md`, `FILE_OWNERSHIP_v1.md`

---

## Gemensamma regler

1. **Commit-format:** `[verb]: [Agent-tag] [beskrivning]`  
   Exempel: `feat: [Agent2] Implementera doGet routing`
2. **Jobba alltid på din branch** – aldrig direkt på `main`
3. **Skapa Pull Request** mot `main` när en modul är klar
4. **Fråga innan du ändrar en fil du inte äger**
5. **Kontrakten i `docs/contracts/` är styrande** – implementera EXAKT vad de säger
6. **TODO-taggar i placeholder-filer** anger exakt vad som ska göras

---

*Senast uppdaterad av Agent 1*
