# BRANCH_STRATEGY.md – Branchstrategi

## QuantumVote GW v3

---

## Brancher

| Branch | Syfte | Ägare |
|--------|-------|-------|
| `main` | Stabil, körbar kod | Agent 1 (setup) + PR-merges |
| `agent2-backend` | Backend-implementation (GS-logik) | Agent 2 |
| `agent3-frontend` | Frontend-implementation (HTML + SlidesAdapter) | Agent 3 |
| `agent4-sheets` | Google Sheets-integration | Agent 4 |

---

## Arbetsflöde

```
main (stabil)
  └── agent2-backend     ← Agent 2 jobbar här
  └── agent3-frontend    ← Agent 3 jobbar här
  └── agent4-sheets      ← Agent 4 jobbar här
```

### Steg-för-steg:
1. Checka ut din branch: `git checkout agent2-backend`
2. Gör ditt arbete och committa med rätt format
3. Pusha: `git push origin agent2-backend`
4. Skapa Pull Request mot `main` när modulen är klar
5. Involvera ägaren (DrAVJ) för review och merge

---

## Commit-namnkonvention

```
[verb]: [Agent-tag] [beskrivning av ändringen]
```

**Verb-prefix:**
- `feat:` – ny funktionalitet
- `fix:` – buggfix
- `docs:` – dokumentation
- `chore:` – konfiguration, bygge, tooling
- `refactor:` – omstrukturering utan ny funktionalitet
- `test:` – tester

**Agent-taggar:** `[Agent1]`, `[Agent2]`, `[Agent3]`, `[Agent4]`

**Exempel:**
```
feat: [Agent2] Implementera doGet routing med action-parameter
fix: [Agent3] Rätta CSS-layout på vote.html för mobil
docs: [Agent4] Lägg till sheet-schema i docs/
```

---

## Branch Protection (manuellt att aktivera i GitHub)

Följande inställningar bör aktiveras manuellt under
`Settings > Branches > Branch protection rules` för `main`:

- [x] **Require a pull request before merging**
- [x] **Require approvals** (1 approval)
- [x] **Dismiss stale pull request approvals**
- [x] **Do not allow bypassing the above settings**
- [ ] Require status checks (kan läggas till om CI konfigureras)

> **OBS:** Dessa regler måste aktiveras manuellt av repo-ägaren (DrAVJ).
> De kan inte automatiseras via API utan en GitHub App eller admin-token.

---

*Dokumenterad av Agent 1*
