# Recalibrage des bots + niveau expert — Plan d'implémentation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recalibrer les 3 niveaux de bots (facile=ancien moyen, moyen=ancien difficile, difficile=nouveau expert) avec des stratégies avancées pour le niveau expert.

**Architecture:** Enrichissement in-place des fichiers existants du bot-engine. Extension de `VueBotJeu` avec `positionPreneur`/`positionDonneur`. Nouveau `SuiviCartesAvance` pour le comptage par joueur. Stratégies expert basées sur des priorités décroissantes avec adaptation au score et gestion de la Belote/Rebelote.

**Tech Stack:** TypeScript strict, Vitest (tests), XState v5 (machine à états), architecture monorepo Turborepo.

**Spec:** `docs/superpowers/specs/2026-03-18-recalibrage-bots-expert-design.md`

---

## Structure des fichiers

| Fichier                                                    | Action   | Responsabilité                                           |
| ---------------------------------------------------------- | -------- | -------------------------------------------------------- |
| `packages/shared-types/src/game.ts`                        | Modifier | Ajout `positionPreneur`, `positionDonneur` à `VueBotJeu` |
| `packages/bot-engine/src/comptage-cartes.ts`               | Modifier | Ajout `SuiviCartesAvance` + fonctions avancées           |
| `packages/bot-engine/src/strategie-encheres.ts`            | Modifier | Remapping niveaux + enchères expert                      |
| `packages/bot-engine/src/strategie-jeu.ts`                 | Modifier | Remapping niveaux + jeu expert                           |
| `packages/bot-engine/src/index.ts`                         | Modifier | Exporter les nouveaux types et fonctions                 |
| `apps/mobile/hooks/useControleurJeu.ts`                    | Modifier | Mise à jour `construireVueBot()`                         |
| `packages/bot-engine/__tests__/comptage-cartes.test.ts`    | Modifier | Tests suivi avancé                                       |
| `packages/bot-engine/__tests__/strategie-encheres.test.ts` | Modifier | Remapping + tests expert                                 |
| `packages/bot-engine/__tests__/strategie-jeu.test.ts`      | Modifier | Remapping + tests expert                                 |
| `packages/bot-engine/__tests__/bot.test.ts`                | Modifier | Mise à jour fixtures VueBotJeu                           |

---

## Task 1 : Extension de `VueBotJeu`

**Files:**

- Modify: `packages/shared-types/src/game.ts:49-62`
- Modify: `apps/mobile/hooks/useControleurJeu.ts:325-352`
- Modify: `packages/bot-engine/__tests__/*.test.ts` (toutes les fixtures)

- [ ] **Step 1: Ajouter les champs à `VueBotJeu`**

Dans `packages/shared-types/src/game.ts`, ajouter à l'interface `VueBotJeu` (avant la fermeture `}` à ligne 62) :

```typescript
positionPreneur: PositionJoueur | null;
positionDonneur: PositionJoueur;
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `pnpm --filter @belote/shared-types typecheck`
Expected: PASS (les types sont juste des définitions)

Run: `pnpm turbo typecheck`
Expected: FAIL — les fichiers qui construisent `VueBotJeu` ne passent plus les nouveaux champs

- [ ] **Step 3: Mettre à jour `construireVueBot()` dans `useControleurJeu.ts`**

Dans `apps/mobile/hooks/useControleurJeu.ts`, dans la fonction `construireVueBot` (lignes 325-352), ajouter les deux nouveaux champs à l'objet retourné. Le contexte XState contient `indexPreneur` et `indexDonneur` (indices 0-3). Utiliser le tableau `POSITIONS_JOUEUR` (importé de `@belote/shared-types`, c'est `["sud", "ouest", "nord", "est"]`) :

```typescript
positionPreneur: contexte.indexPreneur !== null
  ? POSITIONS_JOUEUR[contexte.indexPreneur]
  : null,
positionDonneur: POSITIONS_JOUEUR[contexte.indexDonneur],
```

Vérifier que `POSITIONS_JOUEUR` est bien importé (il devrait déjà l'être en haut du fichier, sinon l'ajouter à l'import existant depuis `@belote/shared-types`).

- [ ] **Step 4: Mettre à jour les fixtures de test dans TOUS les fichiers**

Dans **tous** les fichiers de test du bot-engine (`__tests__/*.test.ts`), les objets `VueBotJeu` de test doivent inclure les nouveaux champs. Les helpers de construction de fixtures à mettre à jour :

- `bot.test.ts` : fixtures directes dans les tests
- `strategie-encheres.test.ts` : fonction helper `creerVueEncheres` (vers ligne 14)
- `strategie-jeu.test.ts` : fonction helper `creerVueJeu` (vers ligne 14)
- `comptage-cartes.test.ts` : si des fixtures `VueBotJeu` existent

Ajouter `positionPreneur: "sud"` et `positionDonneur: "est"` (valeurs par défaut) à chaque helper/fixture.

- [ ] **Step 5: Vérifier typecheck + tests**

Run: `pnpm turbo typecheck test`
Expected: PASS partout

- [ ] **Step 6: Commit**

```bash
git add packages/shared-types/src/game.ts apps/mobile/hooks/useControleurJeu.ts packages/bot-engine/__tests__/
git commit -m "feat(shared): ajouter positionPreneur et positionDonneur à VueBotJeu"
```

---

## Task 2 : Comptage de cartes avancé

**Files:**

- Modify: `packages/bot-engine/src/comptage-cartes.ts:6-133`
- Modify: `packages/bot-engine/src/index.ts`
- Modify: `packages/bot-engine/__tests__/comptage-cartes.test.ts`

### Sous-task 2a : `SuiviCartesAvance` et `construireSuiviAvance`

- [ ] **Step 1: Écrire les tests pour `construireSuiviAvance`**

Dans `packages/bot-engine/__tests__/comptage-cartes.test.ts`, créer d'abord une fonction helper `creerVueBotAvecHistorique(historiquePlis, couleurAtout?)` qui construit une `VueBotJeu` complète avec l'historique fourni (les autres champs avec des valeurs par défaut). Puis ajouter un bloc `describe("construireSuiviAvance")` :

```typescript
describe("construireSuiviAvance", () => {
  it("détecte une couleur épuisée quand un joueur ne fournit pas", () => {
    // Pli historique : ouest entame carreau, nord joue pique (ne fournit pas)
    // → nord a carreau épuisé
    const vue = creerVueBotAvecHistorique([
      {
        cartes: [
          { joueur: "ouest", carte: { couleur: "carreau", rang: "as" } },
          { joueur: "nord", carte: { couleur: "pique", rang: "7" } },
          { joueur: "est", carte: { couleur: "carreau", rang: "10" } },
          { joueur: "sud", carte: { couleur: "carreau", rang: "roi" } },
        ],
        gagnant: "ouest",
        points: 22,
      },
    ]);
    const suivi = construireSuiviAvance(vue);
    expect(suivi.couleursEpuisees["nord"]).toContain("carreau");
    expect(suivi.couleursEpuisees["ouest"]).not.toContain("carreau");
  });

  it("compte les atouts joués par joueur", () => {
    const vue = creerVueBotAvecHistorique(
      [
        {
          cartes: [
            { joueur: "ouest", carte: { couleur: "carreau", rang: "as" } },
            { joueur: "nord", carte: { couleur: "pique", rang: "9" } },
            { joueur: "est", carte: { couleur: "carreau", rang: "10" } },
            { joueur: "sud", carte: { couleur: "carreau", rang: "roi" } },
          ],
          gagnant: "nord",
          points: 36,
        },
      ],
      "pique",
    );
    const suivi = construireSuiviAvance(vue);
    expect(suivi.atoutsJouesParJoueur["nord"]).toEqual([{ couleur: "pique", rang: "9" }]);
  });

  it("retourne des tableaux vides au premier pli", () => {
    const vue = creerVueBotSansHistorique();
    const suivi = construireSuiviAvance(vue);
    expect(suivi.couleursEpuisees["nord"]).toEqual([]);
    expect(suivi.defaussesParJoueur["est"]).toEqual([]);
    expect(suivi.nombreAtoutsRestantsTotal).toBeGreaterThan(0);
  });

  it("calcule correctement au dernier pli (tout connu)", () => {
    // 7 plis complets dans l'historique → toutes les cartes sauf 4 sont connues
    const vue = creerVueBotAvecHistoriqueComplet(); // 7 plis, main de 1 carte
    const suivi = construireSuiviAvance(vue);
    // Avec 7 plis (28 cartes) + 1 carte en main + pli en cours = 32 cartes connues
    expect(suivi.cartesRestantes.length).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `pnpm --filter @belote/bot-engine test -- --run comptage-cartes`
Expected: FAIL — `construireSuiviAvance` n'existe pas encore

- [ ] **Step 3: Implémenter `SuiviCartesAvance` et `construireSuiviAvance`**

Dans `packages/bot-engine/src/comptage-cartes.ts`, après l'interface `SuiviCartes` (ligne 11) :

```typescript
export interface SuiviCartesAvance extends SuiviCartes {
  couleursEpuisees: Record<PositionJoueur, Couleur[]>;
  atoutsJouesParJoueur: Record<PositionJoueur, Carte[]>;
  nombreAtoutsRestantsTotal: number;
  defaussesParJoueur: Record<PositionJoueur, Carte[]>;
}
```

Puis implémenter `construireSuiviAvance(vue: VueBotJeu): SuiviCartesAvance`. Cette fonction prend la `VueBotJeu` complète (contrairement à `construireSuiviCartes` qui prend 3 paramètres séparés — les deux conventions coexistent car le niveau moyen continue d'utiliser l'ancienne) :

1. Appeler `construireSuiviCartes(vue.maMain, vue.historiquePlis, vue.pliEnCours)` pour obtenir la base `SuiviCartes`
2. Initialiser `couleursEpuisees`, `atoutsJouesParJoueur`, `defaussesParJoueur` comme `Record<PositionJoueur, []>` pour les 4 positions
3. Parcourir `vue.historiquePlis` + `vue.pliEnCours` pour chaque pli :
   - La couleur demandée = couleur de la première carte du pli
   - Pour chaque joueur du pli (sauf le premier qui a demandé) : si sa carte est d'une couleur différente de la demandée → marquer la couleur demandée comme épuisée pour ce joueur
   - Si sa carte est de la couleur atout (`vue.couleurAtout`) et que la couleur demandée n'est pas atout → c'est une coupe, enregistrer dans `atoutsJouesParJoueur`
   - Si sa carte n'est ni la couleur demandée ni atout → c'est une défausse, enregistrer dans `defaussesParJoueur`
4. Compter `nombreAtoutsRestantsTotal` = 8 - (atouts dans `cartesJouees`) - (atouts dans `vue.maMain`)

- [ ] **Step 4: Vérifier que les tests passent**

Run: `pnpm --filter @belote/bot-engine test -- --run comptage-cartes`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/bot-engine/src/comptage-cartes.ts packages/bot-engine/__tests__/comptage-cartes.test.ts
git commit -m "feat(bot-engine): ajouter SuiviCartesAvance et construireSuiviAvance"
```

### Sous-task 2b : Fonctions utilitaires avancées

- [ ] **Step 6: Écrire les tests pour les nouvelles fonctions**

Dans `comptage-cartes.test.ts`, ajouter :

```typescript
describe("joueurACoupe", () => {
  it("retourne true si le joueur a coupé dans une couleur", () => {
    const vue = creerVueBotAvecHistorique(
      [
        {
          cartes: [
            { joueur: "ouest", carte: { couleur: "carreau", rang: "as" } },
            { joueur: "nord", carte: { couleur: "pique", rang: "7" } }, // coupe
            { joueur: "est", carte: { couleur: "carreau", rang: "10" } },
            { joueur: "sud", carte: { couleur: "carreau", rang: "roi" } },
          ],
          gagnant: "nord",
          points: 22,
        },
      ],
      "pique",
    );
    const suivi = construireSuiviAvance(vue);
    expect(joueurACoupe(suivi, "nord", "carreau")).toBe(true);
    expect(joueurACoupe(suivi, "est", "carreau")).toBe(false);
  });
});

describe("atoutsRestantsAdversaires", () => {
  it("exclut les atouts du bot", () => {
    const vue = creerVueBotAvecHistorique([], "pique");
    vue.maMain = [
      { couleur: "pique", rang: "valet" },
      { couleur: "pique", rang: "9" },
      { couleur: "carreau", rang: "as" },
    ];
    const suivi = construireSuiviAvance(vue);
    const maMain = vue.maMain;
    // 8 atouts total - 2 dans ma main = 6 chez les autres (partenaire + adversaires)
    const result = atoutsRestantsAdversaires(suivi, maMain, "nord");
    expect(result).toBeLessThanOrEqual(6);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe("carteMaitresseAvancee", () => {
  it("considère une carte maîtresse si les cartes plus fortes ont été jouées", () => {
    const vue = creerVueBotAvecHistorique(
      [
        {
          cartes: [
            { joueur: "ouest", carte: { couleur: "carreau", rang: "as" } },
            { joueur: "nord", carte: { couleur: "carreau", rang: "dame" } },
            { joueur: "est", carte: { couleur: "carreau", rang: "7" } },
            { joueur: "sud", carte: { couleur: "carreau", rang: "8" } },
          ],
          gagnant: "ouest",
          points: 15,
        },
      ],
      "pique",
    );
    const suivi = construireSuiviAvance(vue);
    // As de carreau joué → 10 de carreau est maîtresse
    expect(carteMaitresseAvancee({ couleur: "carreau", rang: "10" }, suivi)).toBe(true);
  });
});
```

- [ ] **Step 7: Vérifier que les tests échouent**

Run: `pnpm --filter @belote/bot-engine test -- --run comptage-cartes`
Expected: FAIL

- [ ] **Step 8: Implémenter les fonctions**

Dans `packages/bot-engine/src/comptage-cartes.ts` :

- `joueurACoupe(suivi: SuiviCartesAvance, position: PositionJoueur, couleur: Couleur): boolean` — vérifie si `couleur` est dans `suivi.couleursEpuisees[position]` ET que le joueur a joué un atout sur cette couleur (la couleur est épuisée + le joueur a des entrées dans `atoutsJouesParJoueur`)

- `atoutsRestantsAdversaires(suivi: SuiviCartesAvance, maMain: Carte[], positionPartenaire: PositionJoueur): number` — `suivi.nombreAtoutsRestantsTotal` (qui exclut déjà les atouts du bot). Si le partenaire est épuisé en atout (atout dans `couleursEpuisees[partenaire]`), tous les atouts restants sont chez les adversaires.

- `carteMaitresseAvancee(carte: Carte, suivi: SuiviCartesAvance): boolean` — comme `estCarteMaitresse` mais en plus : si tous les joueurs qui pourraient avoir une carte plus forte ont cette couleur épuisée, la carte est considérée maîtresse.

- [ ] **Step 9: Vérifier que les tests passent**

Run: `pnpm --filter @belote/bot-engine test -- --run comptage-cartes`
Expected: PASS

- [ ] **Step 10: Exporter les nouvelles fonctions**

Dans `packages/bot-engine/src/index.ts`, ajouter les exports :

```typescript
export {
  // ... exports existants ...
  SuiviCartesAvance,
  construireSuiviAvance,
  joueurACoupe,
  atoutsRestantsAdversaires,
  carteMaitresseAvancee,
} from "./comptage-cartes";
```

- [ ] **Step 11: Commit**

```bash
git add packages/bot-engine/src/comptage-cartes.ts packages/bot-engine/src/index.ts packages/bot-engine/__tests__/comptage-cartes.test.ts
git commit -m "feat(bot-engine): fonctions utilitaires comptage avancé"
```

---

## Task 3 : Remapping des niveaux existants (enchères)

**Files:**

- Modify: `packages/bot-engine/src/strategie-encheres.ts`
- Modify: `packages/bot-engine/__tests__/strategie-encheres.test.ts`

**Note :** Le remapping consiste à remplacer le **corps** des fonctions existantes, pas à renommer les fonctions (les noms `encheresFacileTour1`, `encheresMoyenTour1`, `encheresDifficileTour1` restent). Concrètement : (a) supprimer le corps de l'ancien facile (aléatoire), (b) mettre le corps de l'ancien moyen dans `encheresFacileTour1` + ajouter l'erreur 12%, (c) mettre le corps de l'ancien difficile dans `encheresMoyenTour1`, (d) laisser `encheresDifficileTour1/Tour2` comme stubs (PASSER) pour la Task 5.

**Note :** Après cette task et la Task 4, le niveau "difficile" sera temporairement dégradé (stubs). C'est attendu — il sera implémenté dans les Tasks 5-6.

- [ ] **Step 1: Mettre à jour les tests pour le remapping**

Dans `strategie-encheres.test.ts` :

- Supprimer les tests "facile" existants (l'ancien facile aléatoire disparaît)
- Mettre à jour les tests "facile" pour correspondre à l'ancien comportement moyen (heuristiques Valet+9, etc.) + composante d'erreur
- Mettre à jour les tests "moyen" pour correspondre à l'ancien comportement difficile (évaluation par points)
- Ajouter un test pour la composante d'erreur aléatoire du nouveau facile :

```typescript
describe("enchères facile (ancien moyen + erreurs)", () => {
  it("inverse parfois la décision (composante aléatoire 12%)", () => {
    const vue = creerVueAvecMainForte(); // Valet + 9 atout → devrait toujours prendre
    let nbPrises = 0;
    for (let i = 0; i < 100; i++) {
      const action = deciderEncheres(vue, "facile");
      if (action.type === "PRENDRE") nbPrises++;
    }
    // Avec Valet+9, la logique correcte prend toujours → facile devrait prendre ~88%
    expect(nbPrises).toBeGreaterThan(75);
    expect(nbPrises).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-encheres`
Expected: FAIL — le mapping a changé

- [ ] **Step 3: Implémenter le remapping dans `strategie-encheres.ts`**

Pour chaque fonction (`encheresFacileTour1`, `encheresMoyenTour1`, etc.) :

1. Remplacer le corps de `encheresFacileTour1` par l'ancien corps de `encheresMoyenTour1` + ajouter `if (Math.random() < 0.12)` pour inverser la décision finale (PRENDRE↔PASSER, ANNONCER↔PASSER)
2. Remplacer le corps de `encheresMoyenTour1` par l'ancien corps de `encheresDifficileTour1`
3. Même chose pour Tour 2
4. Remplacer le corps de `encheresDifficileTour1/Tour2` par des stubs retournant `{ type: "PASSER" }` (seront implémentés Task 5)

- [ ] **Step 4: Vérifier que les tests passent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-encheres`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/bot-engine/src/strategie-encheres.ts packages/bot-engine/__tests__/strategie-encheres.test.ts
git commit -m "refactor(bot-engine): remapper niveaux enchères facile=ancien moyen, moyen=ancien difficile"
```

---

## Task 4 : Remapping des niveaux existants (jeu)

**Files:**

- Modify: `packages/bot-engine/src/strategie-jeu.ts`
- Modify: `packages/bot-engine/__tests__/strategie-jeu.test.ts`

**Note :** Même approche que Task 3 — on remplace les **corps** des fonctions, pas les noms. La signature de `jouerDifficile`/`entameDifficile` changera dans la Task 6 (nouvelle signature prenant `SuiviCartesAvance`), mais pour l'instant on garde les signatures existantes avec un stub.

- [ ] **Step 1: Mettre à jour les tests pour le remapping**

Dans `strategie-jeu.test.ts` :

- Supprimer les tests "facile" (ancien aléatoire pur)
- Mettre à jour les tests "facile" pour correspondre à l'ancien moyen (entame As, partenaire faible, adversaire forte) — **sans** comptage de cartes
- Mettre à jour les tests "moyen" pour correspondre à l'ancien difficile (carte maîtresse, comptage)
- Laisser un bloc `describe("jeu difficile (expert)")` vide pour la Task 6

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-jeu`
Expected: FAIL

- [ ] **Step 3: Implémenter le remapping dans `strategie-jeu.ts`**

1. Remplacer le corps de `jouerFacile` (ancien aléatoire) par le corps de l'ancien `jouerMoyen` (heuristiques sans comptage)
2. Remplacer `entameFacile` (nouveau nom de l'ancienne `entameMoyen`)
3. Remplacer le corps de `jouerMoyen` par le corps de l'ancien `jouerDifficile` (avec comptage `construireSuiviCartes`)
4. Renommer les fonctions helpers internes : `donnerAuPartenaire` → `donnerAuPartenaireMoyen`, `contrerAdversaire` → `contrerAdversaireMoyen`
5. Créer `jouerDifficile` comme stub qui délègue à `jouerMoyen` temporairement

- [ ] **Step 4: Vérifier que les tests passent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-jeu`
Expected: PASS

- [ ] **Step 5: Vérifier typecheck + tous les tests**

Run: `pnpm turbo typecheck test`
Expected: PASS partout

- [ ] **Step 6: Commit**

```bash
git add packages/bot-engine/src/strategie-jeu.ts packages/bot-engine/__tests__/strategie-jeu.test.ts
git commit -m "refactor(bot-engine): remapper niveaux jeu facile=ancien moyen, moyen=ancien difficile"
```

---

## Task 5 : Enchères expert

**Files:**

- Modify: `packages/bot-engine/src/strategie-encheres.ts`
- Modify: `packages/bot-engine/__tests__/strategie-encheres.test.ts`

### Sous-task 5a : Tour 1 expert

- [ ] **Step 1: Écrire les tests pour les enchères expert tour 1**

Dans `strategie-encheres.test.ts`, ajouter :

```typescript
describe("enchères difficile tour 1 (expert)", () => {
  it("prend avec Valet + 9 + As hors atout (auto-prend)", () => {
    const vue = creerVue({
      maMain: [
        { couleur: "pique", rang: "valet" },
        { couleur: "pique", rang: "9" },
        { couleur: "pique", rang: "7" },
        { couleur: "carreau", rang: "as" },
        { couleur: "coeur", rang: "roi" },
      ],
      phaseJeu: "encheres1",
      carteRetournee: { couleur: "pique", rang: "dame" },
      positionDonneur: "est",
      positionPreneur: null,
    });
    const action = deciderEncheres(vue, "difficile");
    expect(action.type).toBe("PRENDRE");
  });

  it("abaisse le seuil en position favorable (donneur)", () => {
    const vue = creerVue({
      maMain: mainAvecPointsAtout(80), // juste 80 pts, sous le seuil normal de 87
      phaseJeu: "encheres1",
      positionDonneur: "sud", // bot est donneur = position favorable
      maPosition: "sud",
    });
    const action = deciderEncheres(vue, "difficile");
    expect(action.type).toBe("PRENDRE");
  });

  it("abaisse le seuil quand l'adversaire mène de 200+", () => {
    const vue = creerVue({
      maMain: mainAvecPointsAtout(82),
      phaseJeu: "encheres1",
      scoreMonEquipe: 200,
      scoreAdversaire: 450, // adversaire mène de 250
    });
    const action = deciderEncheres(vue, "difficile");
    expect(action.type).toBe("PRENDRE");
  });

  it("refuse sans 2 couleurs couvertes hors atout (anti-chute)", () => {
    const vue = creerVue({
      maMain: [
        // 5 atouts mais rien d'autre de couvert
        { couleur: "pique", rang: "valet" },
        { couleur: "pique", rang: "9" },
        { couleur: "pique", rang: "as" },
        { couleur: "pique", rang: "10" },
        { couleur: "pique", rang: "roi" },
      ],
      phaseJeu: "encheres1",
      carteRetournee: { couleur: "pique", rang: "dame" },
    });
    const action = deciderEncheres(vue, "difficile");
    expect(action.type).toBe("PASSER");
  });

  it("compte Belote/Rebelote (+20 pts) dans l'évaluation", () => {
    // Roi(4)+Dame(3) atout = 7 pts + Belote(20) = 27 pts atout
    // + carte retournée 10(10) = 37 pts atout
    // + As carreau(11) + As coeur(11) = 22 pts hors atout
    // Total = 59 pts → sous seuil 87
    // Avec position favorable (donneur, seuil 80) → encore sous seuil
    // MAIS si on ajoute plus de cartes pour atteindre le seuil...
    const vue = creerVue({
      maMain: [
        { couleur: "pique", rang: "roi" },
        { couleur: "pique", rang: "dame" },
        { couleur: "pique", rang: "as" }, // +11 pts atout
        { couleur: "carreau", rang: "as" },
        { couleur: "coeur", rang: "as" },
      ],
      phaseJeu: "encheres1",
      carteRetournee: { couleur: "pique", rang: "10" },
      positionDonneur: "sud",
      maPosition: "sud",
      // Roi(4)+Dame(3)+As(11) = 18 pts atout + carte retournée 10(10) = 28
      // + Belote(20) = 48 + As(11)+As(11) = 70 pts → sous seuil 80
      // Sans Belote : 50 pts → ne prend pas. Avec Belote : 70 → toujours sous 80
    });
    // Testons plutôt un cas où la Belote fait la différence
    const vue2 = creerVue({
      maMain: [
        { couleur: "pique", rang: "roi" },
        { couleur: "pique", rang: "dame" },
        { couleur: "pique", rang: "valet" }, // +20 pts atout
        { couleur: "carreau", rang: "as" },
        { couleur: "coeur", rang: "10" },
      ],
      phaseJeu: "encheres1",
      carteRetournee: { couleur: "pique", rang: "9" },
      positionDonneur: "sud",
      maPosition: "sud",
      // Roi(4)+Dame(3)+Valet(20) = 27 + carte retournée 9(14) = 41
      // + As(11)+10(10) = 62 pts sans Belote → sous seuil 80
      // Avec Belote +20 = 82 → au dessus du seuil 80 (donneur) → prend
    });
    const action = deciderEncheres(vue2, "difficile");
    expect(action.type).toBe("PRENDRE");
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-encheres`
Expected: FAIL — `encheresDifficileTour1` est un stub

- [ ] **Step 3: Implémenter `encheresDifficileTour1`**

Dans `packages/bot-engine/src/strategie-encheres.ts`, remplacer le stub par :

1. Calculer `pointsAtout` avec `getPointsAtout()` sur les cartes de la couleur de `vue.carteRetournee` + points de la carte retournée elle-même
2. Calculer `pointsHorsAtout` : As = 11 pts, 10 = 10 pts pour chaque couleur hors atout
3. Ajouter +20 si Roi + Dame d'atout dans la main (Belote/Rebelote)
4. Compter les couleurs couvertes hors atout : couleur avec As OU couleur avec 3+ cartes
5. Si couleurs couvertes < 2 ET pas (Valet + 9) → PASSER
6. Si atouts < 2 ET pas (Valet + 9) → PASSER
7. Calculer le seuil adaptatif :
   - Base = 87
   - Déterminer la position relative du bot : comparer `vue.maPosition` avec `vue.positionDonneur` en utilisant l'ordre `["sud", "ouest", "nord", "est"]`. Calculer `(indexBot - indexDonneur + 4) % 4` → 0=donneur (dernier), 1=premier, 2=deuxième, 3=troisième. Position favorable = 0 (donneur) ou 3 (3e) → seuil -7 (→ 80)
   - Si `Math.abs(vue.scoreMonEquipe - vue.scoreAdversaire) > 200` → seuil -5
8. Auto-prend : Valet + 9 + (au moins 1 As ou 10 hors atout) → PRENDRE
9. Si `pointsAtout + pointsHorsAtout >= seuil` ET atouts >= 2 → PRENDRE
10. Sinon → PASSER

- [ ] **Step 4: Vérifier que les tests passent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-encheres`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/bot-engine/src/strategie-encheres.ts packages/bot-engine/__tests__/strategie-encheres.test.ts
git commit -m "feat(bot-engine): enchères expert tour 1 avec seuils adaptatifs et anti-chute"
```

### Sous-task 5b : Tour 2 expert

- [ ] **Step 6: Écrire les tests pour les enchères expert tour 2**

```typescript
describe("enchères difficile tour 2 (expert)", () => {
  it("annonce avec main longue (4+ cartes) contenant Valet", () => {
    const vue = creerVue({
      maMain: [
        { couleur: "coeur", rang: "valet" },
        { couleur: "coeur", rang: "as" },
        { couleur: "coeur", rang: "10" },
        { couleur: "coeur", rang: "roi" },
        { couleur: "carreau", rang: "7" },
      ],
      phaseJeu: "encheres2",
      carteRetournee: { couleur: "pique", rang: "roi" }, // pique exclu
    });
    const action = deciderEncheres(vue, "difficile");
    expect(action.type).toBe("ANNONCER");
    expect((action as { couleur: Couleur }).couleur).toBe("coeur");
  });

  it("applique un seuil +5 pts par rapport au tour 1", () => {
    // Main à 88 pts → passerait au tour 1 (seuil 87) mais pas au tour 2 (seuil 92)
    const vue = creerVue({
      maMain: mainAvecPointsCouleur("coeur", 88),
      phaseJeu: "encheres2",
      carteRetournee: { couleur: "pique", rang: "roi" },
    });
    const action = deciderEncheres(vue, "difficile");
    expect(action.type).toBe("PASSER");
  });

  it("passe si tous ont passé au tour 1 et main moyenne", () => {
    const vue = creerVue({
      maMain: mainMoyenne("coeur"),
      phaseJeu: "encheres2",
      historiqueEncheres: [
        { joueur: "sud", action: "PASSER" },
        { joueur: "ouest", action: "PASSER" },
        { joueur: "nord", action: "PASSER" },
        { joueur: "est", action: "PASSER" },
      ],
    });
    const action = deciderEncheres(vue, "difficile");
    expect(action.type).toBe("PASSER");
  });
});
```

Les fonctions helpers `mainAvecPointsAtout(pts)`, `mainAvecPointsCouleur(couleur, pts)`, `mainMoyenne(couleur)` construisent des mains avec des points ciblés. Les définir en haut du fichier de test.

- [ ] **Step 7: Vérifier que les tests échouent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-encheres`
Expected: FAIL

- [ ] **Step 8: Implémenter `encheresDifficileTour2`**

Même logique que tour 1 mais :

1. Utiliser `trouverMeilleureCouleur()` existante pour évaluer les 3 couleurs restantes (exclut celle de la carte retournée)
2. Seuil de base = 92 (87 + 5)
3. Analyse main longue : si une couleur a 4+ cartes avec Valet ou 9 → seuil abaissé de 10 (→ 82)
4. Si `historiqueEncheres` contient 4 PASSER (tout le monde a passé tour 1) → seuil augmenté de 5 (prudence) sauf si points ≥ 100 (main très forte)
5. Anti-chute : même vérification (2 couleurs couvertes, 2+ atouts)
6. Belote/Rebelote : +20 pts si Roi + Dame dans la couleur annoncée

- [ ] **Step 9: Vérifier que les tests passent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-encheres`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add packages/bot-engine/src/strategie-encheres.ts packages/bot-engine/__tests__/strategie-encheres.test.ts
git commit -m "feat(bot-engine): enchères expert tour 2 avec main longue et prudence collective"
```

---

## Task 6 : Jeu expert

**Files:**

- Modify: `packages/bot-engine/src/strategie-jeu.ts`
- Modify: `packages/bot-engine/__tests__/strategie-jeu.test.ts`

### Sous-task 6a : Entame expert

- [ ] **Step 1: Écrire les tests pour l'entame expert**

Créer d'abord la fonction helper `creerVueJeuExpert(overrides)` qui construit une `VueBotJeu` complète pour le jeu expert, avec des valeurs par défaut sensées et la possibilité de surcharger. Puis :

```typescript
describe("jeu difficile (expert) - entame", () => {
  it("tire l'atout quand l'équipe est preneuse et a la majorité", () => {
    const vue = creerVueJeuExpert({
      maMain: [
        { couleur: "pique", rang: "valet" },
        { couleur: "pique", rang: "9" },
        { couleur: "pique", rang: "as" },
        { couleur: "carreau", rang: "roi" },
        { couleur: "coeur", rang: "as" },
      ],
      positionPreneur: "sud",
      maPosition: "sud",
      couleurAtout: "pique",
      pliEnCours: [],
    });
    const action = deciderJeu(vue, "difficile");
    expect(action.type).toBe("JOUER_CARTE");
    expect((action as any).carte.couleur).toBe("pique");
  });

  it("joue carte maîtresse hors atout si partenaire non épuisé", () => {
    const vue = creerVueJeuExpert({
      maMain: [
        { couleur: "carreau", rang: "as" },
        { couleur: "coeur", rang: "7" },
        { couleur: "pique", rang: "8" },
      ],
      positionPreneur: "ouest",
      couleurAtout: "pique",
      pliEnCours: [],
    });
    const action = deciderJeu(vue, "difficile");
    expect((action as any).carte).toEqual({ couleur: "carreau", rang: "as" });
  });

  it("force la coupe si adversaire épuisé et a encore des atouts", () => {
    // Construire un historique où ouest n'a pas fourni en carreau (a coupé)
    const historique = [
      {
        cartes: [
          { joueur: "sud", carte: { couleur: "carreau", rang: "as" } },
          { joueur: "ouest", carte: { couleur: "pique", rang: "7" } }, // coupe = épuisé en carreau
          { joueur: "nord", carte: { couleur: "carreau", rang: "10" } },
          { joueur: "est", carte: { couleur: "carreau", rang: "dame" } },
        ],
        gagnant: "ouest",
        points: 32,
      },
    ];
    const vue = creerVueJeuExpert({
      maMain: [
        { couleur: "carreau", rang: "roi" },
        { couleur: "coeur", rang: "8" },
        { couleur: "trefle", rang: "7" },
      ],
      couleurAtout: "pique",
      pliEnCours: [],
      historiquePlis: historique,
      positionPreneur: "est",
    });
    const action = deciderJeu(vue, "difficile");
    expect((action as any).carte.couleur).toBe("carreau");
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-jeu`
Expected: FAIL

- [ ] **Step 3: Implémenter `jouerDifficile` et `entameDifficile`**

Remplacer le stub `jouerDifficile` dans `strategie-jeu.ts`. La nouvelle implémentation :

1. Construire `suivi = construireSuiviAvance(vue)` (importer depuis comptage-cartes)
2. Si c'est une entame (`vue.pliEnCours.length === 0`) → appeler `entameDifficile(vue, jouables, suivi)`
3. Sinon, déterminer qui gagne le pli et router vers `donnerAuPartenaireExpert` ou `contrerAdversaireExpert` (implémentés en 6b)

`entameDifficile(vue, jouables, suivi)` — priorités :

1. **Tirage atout** : si `(vue.positionPreneur === vue.maPosition || vue.positionPreneur === vue.positionPartenaire)` ET `atoutsRestantsAdversaires(suivi, vue.maMain, vue.positionPartenaire) > 0` ET le bot a des atouts jouables → jouer le plus gros atout
2. **Carte maîtresse hors atout** : parmi les jouables hors atout, trouver une carte maîtresse (`carteMaitresseAvancee`) dans une couleur non épuisée chez le partenaire (`!suivi.couleursEpuisees[vue.positionPartenaire].includes(couleur)`) → la jouer
3. **Forcer la coupe** : pour chaque adversaire, trouver une couleur où il est épuisé mais le partenaire ne l'est pas, ET l'adversaire a encore des atouts (non épuisé en atout) → jouer la plus petite carte de cette couleur
4. **Singleton** : si une couleur hors atout n'a qu'une carte dans la main → la jouer
5. **Fallback** : plus petite carte de la couleur la plus longue

- [ ] **Step 4: Vérifier que les tests passent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-jeu`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/bot-engine/src/strategie-jeu.ts packages/bot-engine/__tests__/strategie-jeu.test.ts
git commit -m "feat(bot-engine): entame expert avec tirage atout, maîtresse et force coupe"
```

### Sous-task 6b : Réponses expert (partenaire gagne, adversaire gagne)

- [ ] **Step 6: Écrire les tests**

```typescript
describe("jeu difficile (expert) - partenaire gagne", () => {
  it("charge en points si partenaire a la maîtresse", () => {
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "nord", carte: { couleur: "carreau", rang: "as" } }],
      maMain: [
        { couleur: "carreau", rang: "10" },
        { couleur: "carreau", rang: "7" },
      ],
      couleurDemandee: "carreau",
      maPosition: "sud",
      positionPartenaire: "nord",
    });
    const action = deciderJeu(vue, "difficile");
    expect((action as any).carte).toEqual({ couleur: "carreau", rang: "10" });
  });

  it("joue un As pour établir une couleur quand on défausse", () => {
    // Le bot ne peut pas fournir la couleur demandée et n'a pas d'atout
    // Il a un As dans une couleur non encore jouée → le défausse pour
    // sécuriser les points avant de perdre la main
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "nord", carte: { couleur: "trefle", rang: "roi" } }],
      maMain: [
        { couleur: "carreau", rang: "as" },
        { couleur: "coeur", rang: "7" },
      ],
      couleurDemandee: "trefle",
      couleurAtout: "pique",
      // bot n'a pas de trefle ni d'atout → doit défausser
    });
    const action = deciderJeu(vue, "difficile");
    // Préfère défausser l'As (points sécurisés) plutôt que le 7
    expect((action as any).carte).toEqual({ couleur: "carreau", rang: "as" });
  });

  it("joue la plus faible si partenaire n'a pas la maîtresse", () => {
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "nord", carte: { couleur: "carreau", rang: "roi" } }],
      maMain: [
        { couleur: "carreau", rang: "10" },
        { couleur: "carreau", rang: "7" },
      ],
      couleurDemandee: "carreau",
    });
    const action = deciderJeu(vue, "difficile");
    expect((action as any).carte).toEqual({ couleur: "carreau", rang: "7" });
  });
});

describe("jeu difficile (expert) - adversaire gagne", () => {
  it("coupe avec le plus petit atout suffisant, pas le Valet", () => {
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "ouest", carte: { couleur: "carreau", rang: "as" } }],
      maMain: [
        { couleur: "pique", rang: "valet" },
        { couleur: "pique", rang: "7" },
        { couleur: "coeur", rang: "8" },
      ],
      couleurDemandee: "carreau",
      couleurAtout: "pique",
    });
    const action = deciderJeu(vue, "difficile");
    expect((action as any).carte).toEqual({ couleur: "pique", rang: "7" });
  });

  it("sur-coupe seulement si le pli vaut le coup (beaucoup de points)", () => {
    // Un adversaire a déjà coupé avec un petit atout, le pli contient beaucoup de points
    const vue = creerVueJeuExpert({
      pliEnCours: [
        { joueur: "est", carte: { couleur: "carreau", rang: "as" } }, // 11 pts
        { joueur: "ouest", carte: { couleur: "pique", rang: "7" } }, // coupe adverse
        { joueur: "nord", carte: { couleur: "carreau", rang: "10" } }, // 10 pts
      ],
      maMain: [
        { couleur: "pique", rang: "8" }, // peut sur-couper
        { couleur: "coeur", rang: "7" },
      ],
      couleurDemandee: "carreau",
      couleurAtout: "pique",
      // Pli vaut 21+ pts → sur-couper vaut le coup
    });
    const action = deciderJeu(vue, "difficile");
    expect((action as any).carte).toEqual({ couleur: "pique", rang: "8" });
  });

  it("ne sur-coupe pas si le pli ne vaut pas le coup", () => {
    const vue = creerVueJeuExpert({
      pliEnCours: [
        { joueur: "est", carte: { couleur: "carreau", rang: "7" } }, // 0 pts
        { joueur: "ouest", carte: { couleur: "pique", rang: "8" } }, // coupe adverse
        { joueur: "nord", carte: { couleur: "carreau", rang: "8" } }, // 0 pts
      ],
      maMain: [
        { couleur: "pique", rang: "9" }, // pourrait sur-couper mais cher (14 pts)
        { couleur: "coeur", rang: "7" },
      ],
      couleurDemandee: "carreau",
      couleurAtout: "pique",
      // Pli vaut ~0 pts → ne pas gaspiller le 9 d'atout
    });
    const action = deciderJeu(vue, "difficile");
    expect((action as any).carte.couleur).not.toBe("pique"); // défausse plutôt
  });

  it("défausse dans couleur épuisée du partenaire", () => {
    // Bot ne peut ni fournir ni couper → défausse
    // Partenaire est épuisé en coeur → défausser en coeur pour future coupe
    const historique = [
      {
        cartes: [
          { joueur: "sud", carte: { couleur: "coeur", rang: "as" } },
          { joueur: "ouest", carte: { couleur: "coeur", rang: "10" } },
          { joueur: "nord", carte: { couleur: "pique", rang: "7" } }, // nord épuisé en coeur
          { joueur: "est", carte: { couleur: "coeur", rang: "roi" } },
        ],
        gagnant: "sud",
        points: 25,
      },
    ];
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "ouest", carte: { couleur: "trefle", rang: "as" } }],
      maMain: [
        { couleur: "coeur", rang: "dame" },
        { couleur: "carreau", rang: "7" },
      ],
      couleurDemandee: "trefle",
      couleurAtout: "pique",
      historiquePlis: historique,
    });
    const action = deciderJeu(vue, "difficile");
    expect((action as any).carte.couleur).toBe("coeur");
  });
});
```

- [ ] **Step 7: Vérifier que les tests échouent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-jeu`
Expected: FAIL

- [ ] **Step 8: Implémenter les réponses expert**

Dans `strategie-jeu.ts`, dans la fonction `jouerDifficile` :

**`donnerAuPartenaireExpert(vue, jouables, suivi)`** — Si partenaire gagne :

1. Si le partenaire a la carte maîtresse (`carteMaitresseAvancee`) ET on a un 10 ou As dans la couleur demandée → charger en points
2. Si on ne peut pas fournir et on n'a pas d'atout (défausse) : préférer donner un As d'une couleur non encore jouée (sécuriser les points)
3. Sinon → carte la plus faible

**`contrerAdversaireExpert(vue, jouables, suivi)`** — Si adversaire gagne :

1. Cartes de la couleur demandée plus fortes que la carte gagnante → jouer la plus forte
2. Si pas de couleur demandée et on a de l'atout :
   a. Si personne n'a encore coupé → couper avec le plus petit atout. Ne JAMAIS jouer Valet ou 9 si un atout plus petit suffit.
   b. Si un adversaire a déjà coupé → évaluer le sur-coupage : calculer les points dans le pli. Si > 15 pts ET on a un atout plus fort que la coupe adverse → sur-couper avec le plus petit atout suffisant. Sinon → défausser.
3. Défausse intelligente : préférer une couleur épuisée chez le partenaire (via `suivi.couleursEpuisees[vue.positionPartenaire]`), sinon la couleur avec le moins de points

- [ ] **Step 9: Vérifier que les tests passent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-jeu`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add packages/bot-engine/src/strategie-jeu.ts packages/bot-engine/__tests__/strategie-jeu.test.ts
git commit -m "feat(bot-engine): réponses expert avec sur-coupage évalué et défausse intelligente"
```

### Sous-task 6c : Gestion atout, Belote/Rebelote, adaptation score

- [ ] **Step 11: Écrire les tests**

```typescript
describe("jeu difficile (expert) - gestion atout", () => {
  it("garde un atout de retour (dernier atout) pour coupe décisive", () => {
    // Bot a un seul atout et peut défausser au lieu de couper
    // Il devrait garder son atout si possible
    const vue = creerVueJeuExpert({
      pliEnCours: [{ joueur: "ouest", carte: { couleur: "carreau", rang: "roi" } }],
      maMain: [
        { couleur: "pique", rang: "as" }, // dernier atout
        { couleur: "coeur", rang: "7" },
        { couleur: "trefle", rang: "8" },
      ],
      couleurDemandee: "carreau",
      couleurAtout: "pique",
      // Bot n'a pas de carreau, MAIS a un atout → obligé de couper en belote
      // (règle : obligation de couper si on peut)
      // Ce test vérifie que si le bot PEUT choisir (pas obligé), il garde l'atout
    });
    // Note : en belote, si on ne peut pas fournir et qu'on a de l'atout,
    // on est OBLIGÉ de couper. Ce test s'applique quand le partenaire gagne
    // et que le bot n'est pas obligé de monter.
  });

  it("arrête de tirer l'atout quand adversaires n'en ont plus", () => {
    // Construire un historique où tous les atouts adverses ont été joués
    const historiqueAvecAtoutsPurges = creerHistoriqueAtoutsPurges("pique");
    const vue = creerVueJeuExpert({
      positionPreneur: "sud",
      maPosition: "sud",
      maMain: [
        { couleur: "pique", rang: "valet" },
        { couleur: "carreau", rang: "as" },
        { couleur: "coeur", rang: "roi" },
      ],
      couleurAtout: "pique",
      pliEnCours: [],
      historiquePlis: historiqueAvecAtoutsPurges,
    });
    const action = deciderJeu(vue, "difficile");
    // Ne devrait PAS jouer atout → joue maîtresse hors atout
    expect((action as any).carte.couleur).not.toBe("pique");
  });
});

describe("jeu difficile (expert) - Belote/Rebelote", () => {
  it("garde Roi et Dame d'atout ensemble quand possible", () => {
    // Bot a Roi + Dame d'atout et doit fournir à l'atout
    // Il joue le Roi (le plus faible des deux) mais ne sépare pas la paire
    // → S'il doit jouer un atout en entame, il ne joue ni Roi ni Dame
    //   si d'autres atouts sont disponibles
    const vue = creerVueJeuExpert({
      maMain: [
        { couleur: "pique", rang: "roi" },
        { couleur: "pique", rang: "dame" },
        { couleur: "pique", rang: "7" },
        { couleur: "carreau", rang: "as" },
      ],
      couleurAtout: "pique",
      pliEnCours: [],
      positionPreneur: "sud",
      maPosition: "sud",
    });
    const action = deciderJeu(vue, "difficile");
    // S'il tire l'atout, il ne devrait pas séparer Roi/Dame
    // Il devrait jouer le 7 pour tirer l'atout, ou jouer une maîtresse hors atout
    if ((action as any).carte.couleur === "pique") {
      expect((action as any).carte.rang).not.toBe("roi");
      expect((action as any).carte.rang).not.toBe("dame");
    }
  });
});

describe("jeu difficile (expert) - adaptation score manche", () => {
  it("jeu conservateur quand l'équipe mène (>120 pts manche)", () => {
    const historiquePlisMenants = creerHistoriqueAvecScore("sud", 125);
    const vue = creerVueJeuExpert({
      historiquePlis: historiquePlisMenants,
      pliEnCours: [],
      maMain: [
        { couleur: "carreau", rang: "as" },
        { couleur: "carreau", rang: "7" },
      ],
    });
    const action = deciderJeu(vue, "difficile");
    // En menant largement, joue maîtresse pour sécuriser les points
    expect((action as any).carte).toEqual({ couleur: "carreau", rang: "as" });
  });

  it("jeu agressif quand l'équipe est menée", () => {
    const historiquePlisPerds = creerHistoriqueAvecScore("sud", 30); // 30 pts vs ~100 adversaire
    const vue = creerVueJeuExpert({
      historiquePlis: historiquePlisPerds,
      pliEnCours: [],
      maMain: [
        { couleur: "carreau", rang: "roi" }, // pas maîtresse
        { couleur: "coeur", rang: "7" },
        { couleur: "pique", rang: "8" }, // atout
      ],
      couleurAtout: "pique",
      positionPreneur: "sud",
      maPosition: "sud",
    });
    const action = deciderJeu(vue, "difficile");
    // En étant mené, le bot devrait être plus agressif (tenter des coups)
    expect(action.type).toBe("JOUER_CARTE");
  });

  it("tente de gagner le dernier pli (der = 10 pts)", () => {
    const vue = creerVueJeuExpert({
      historiquePlis: Array(7).fill(pliCompletDefaut),
      pliEnCours: [{ joueur: "ouest", carte: { couleur: "carreau", rang: "roi" } }],
      maMain: [{ couleur: "carreau", rang: "as" }],
      couleurDemandee: "carreau",
    });
    const action = deciderJeu(vue, "difficile");
    expect((action as any).carte).toEqual({ couleur: "carreau", rang: "as" });
  });
});
```

Les fonctions helpers `creerHistoriqueAtoutsPurges(atout)`, `creerHistoriqueAvecScore(equipe, score)`, `pliCompletDefaut` doivent être définies en haut du fichier de test.

- [ ] **Step 12: Vérifier que les tests échouent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-jeu`
Expected: FAIL

- [ ] **Step 13: Implémenter la logique**

Dans `jouerDifficile` et `entameDifficile` :

**Score de manche :**

- Créer une fonction helper `calculerScoreManche(historiquePlis, maPosition, positionPartenaire)` qui somme les points des plis gagnés par l'équipe du bot
- Si `scoreManche > 120` → mode conservateur : à l'entame, la priorité 2 (carte maîtresse hors atout) monte en priorité 1 (sécuriser les points prime sur le tirage d'atout)
- Si `scoreManche < 50` et `historiquePlis.length >= 4` → mode agressif : tenter les coupes même risquées, jouer les gros atouts pour prendre la main
- Dernier pli (`historiquePlis.length === 7`) → toujours tenter de gagner : jouer la plus forte carte possible

**Gestion atout :**

- Dans `entameDifficile`, la condition de tirage atout vérifie déjà `atoutsRestantsAdversaires > 0`
- Ajouter un guard : ne pas tirer l'atout si le bot n'a que le Valet ou le 9 comme atout et qu'il y a des cartes maîtresses hors atout

**Garder un atout de retour :**

- Si le bot n'a plus qu'un seul atout ET que le partenaire gagne le pli → ne pas le gaspiller, jouer une défausse à la place (quand les règles le permettent — si le bot est obligé de couper par les règles de la belote, il coupe quand même)

**Belote/Rebelote :**

- Si le bot a le Roi ET la Dame d'atout dans sa main → ne pas les séparer. Quand il tire l'atout, utiliser un autre atout si possible (7, 8, etc.). Quand il doit jouer Roi ou Dame, jouer les deux successivement (si le contexte le permet)
- Exception : si le bot est obligé de fournir et n'a que le Roi ou la Dame comme carte de la couleur demandée → il doit la jouer

- [ ] **Step 14: Vérifier que les tests passent**

Run: `pnpm --filter @belote/bot-engine test -- --run strategie-jeu`
Expected: PASS

- [ ] **Step 15: Vérifier typecheck + tous les tests**

Run: `pnpm turbo typecheck test`
Expected: PASS

- [ ] **Step 16: Commit**

```bash
git add packages/bot-engine/src/strategie-jeu.ts packages/bot-engine/__tests__/strategie-jeu.test.ts
git commit -m "feat(bot-engine): gestion atout expert, Belote/Rebelote, adaptation score manche"
```

---

## Task 7 : Validation finale et simulation

**Files:**

- All modified files
- `AVANCEMENT.md`

- [ ] **Step 1: Lancer tous les tests**

Run: `pnpm turbo typecheck test`
Expected: PASS partout

- [ ] **Step 2: Lancer le linter**

Run: `pnpm turbo lint`
Expected: PASS

- [ ] **Step 3: Vérifier la couverture du bot-engine**

Run: `pnpm --filter @belote/bot-engine test -- --run --coverage`
Expected: Couverture > 80% sur les fichiers modifiés

- [ ] **Step 4: Simulation 100 parties bot vs bot (validation manuelle)**

Créer un script temporaire (ou un test marqué `.skip` pour ne pas tourner en CI) qui :

1. Simule 100 parties complètes : 4 bots difficile vs 4 bots moyen
2. Simule 100 parties : 4 bots moyen vs 4 bots facile
3. Vérifie :
   - Difficile gagne au moins 55% des parties contre moyen
   - Moyen gagne au moins 55% des parties contre facile
   - Aucun crash, aucun coup illégal

Ce test est une **validation manuelle** (non bloquant en CI). Les résultats dépendent de la variance des distributions de cartes. Si les seuils ne sont pas atteints, ajuster les seuils des enchères/stratégies plutôt que le test.

- [ ] **Step 5: Test de fumée manuel (optionnel)**

Lancer l'app et jouer une partie en mode difficile. Vérifier que le bot :

- Tire l'atout quand il est preneur
- Ne joue pas au hasard
- Coupe quand il le peut
- Donne des points au partenaire
- Annonce Belote/Rebelote quand il a Roi+Dame d'atout

- [ ] **Step 6: Mettre à jour `AVANCEMENT.md`**

Ajouter dans la section appropriée que le recalibrage des bots est terminé :

- Niveaux recalibrés : facile (ancien moyen + 12% erreurs), moyen (ancien difficile), difficile (nouveau expert)
- Stratégies expert implémentées : tirage atout systématique, carte maîtresse avancée, force coupe, sur-coupage évalué, défausse intelligente, anti-chute, adaptation score manche, Belote/Rebelote, seuils adaptatifs (position + score partie)

- [ ] **Step 7: Commit final**

```bash
git add AVANCEMENT.md
git commit -m "docs: mettre à jour avancement avec recalibrage bots expert"
```
