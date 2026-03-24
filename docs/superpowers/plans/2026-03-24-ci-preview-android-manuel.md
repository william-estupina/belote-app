# CI preview Android manuelle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un workflow GitHub Actions manuel qui verifie le monorepo puis lance un build Android `preview` EAS et affiche le lien de build ainsi qu'un QR code de telechargement de l'APK.

**Architecture:** Un seul workflow `workflow_dispatch` orchestre la preparation de l'environnement, les verifications monorepo, le build EAS Android et la generation d'un resume GitHub. Le parsing de sortie EAS est realise dans des etapes Node inline pour eviter d'ajouter du code applicatif inutile.

**Tech Stack:** GitHub Actions, pnpm, Turbo, Expo/EAS Build, Node.js

---

### Task 1: Ajouter la documentation de la feature

**Files:**

- Create: `docs/superpowers/specs/2026-03-24-ci-preview-android-manuel-design.md`
- Create: `docs/superpowers/plans/2026-03-24-ci-preview-android-manuel.md`

- [x] **Step 1: Ecrire la spec validee**
- [x] **Step 2: Ecrire le plan d'implementation**
- [ ] **Step 3: Commit**

Run: `git add docs/superpowers/specs/2026-03-24-ci-preview-android-manuel-design.md docs/superpowers/plans/2026-03-24-ci-preview-android-manuel.md`

Expected: les deux fichiers sont stages

Commit:

```bash
git commit -m "docs: cadrer la ci preview android manuelle"
```

### Task 2: Ajouter le workflow GitHub Actions manuel

**Files:**

- Create: `.github/workflows/build-preview.yml`

- [ ] **Step 1: Ecrire le workflow manuel**
- [ ] **Step 2: Ajouter les etapes de verification bloquante**
- [ ] **Step 3: Ajouter le build EAS Android preview**
- [ ] **Step 4: Ajouter l'extraction des URLs et la generation du summary avec QR**
- [ ] **Step 5: Relire le YAML**

Run: `Get-Content .github/workflows/build-preview.yml`

Expected: workflow `workflow_dispatch` avec checks, build et summary

### Task 3: Documenter l'usage du workflow

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Ecrire la section GitHub Actions preview**
- [ ] **Step 2: Expliquer le secret `EXPO_TOKEN`**
- [ ] **Step 3: Ajouter le parcours utilisateur minimum**

Run: `Select-String -Path README.md -Pattern 'GitHub Actions|EXPO_TOKEN|preview'`

Expected: README documente le workflow manuel

### Task 4: Mettre a jour l'avancement projet

**Files:**

- Modify: `AVANCEMENT.md`

- [ ] **Step 1: Cocher la mise en place de la pipeline GitHub Actions**
- [ ] **Step 2: Cocher la configuration EAS Build**
- [ ] **Step 3: Ajouter une note de mise a jour recente**

Run: `Select-String -Path AVANCEMENT.md -Pattern 'Pipeline GitHub Actions|Configurer EAS Build|Mise a jour recente'`

Expected: l'etape 10 reflète l'avancee CI/CD

### Task 5: Verifier puis commit l'implementation

**Files:**

- Modify: `.github/workflows/build-preview.yml`
- Modify: `README.md`
- Modify: `AVANCEMENT.md`

- [ ] **Step 1: Lancer la verification**

Run:

```bash
pnpm lint
pnpm turbo typecheck test
```

Expected: commandes vertes

- [ ] **Step 2: Relire le diff**

Run: `git diff --stat`

Expected: uniquement les fichiers attendus

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(ci): ajouter le build preview android manuel"
```
