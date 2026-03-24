# Pli via Couche Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire de la couche d'animation l'unique rendu visuel des cartes du pli entre l'atterrissage et le ramassage, tout en gardant `etatJeu.pliEnCours` comme source de verite metier.

**Architecture:** `useAnimations` portera deux collections visuelles distinctes: les cartes en vol et les cartes deja posees au centre. `CoucheAnimation` rendra ces deux etats, tandis que `ZonePli` sera reduit au decor du tapis. `useControleurJeu` continuera d'orchestrer la logique metier et alimentera la resynchronisation visuelle depuis `etatJeu.pliEnCours` quand necessaire.

**Tech Stack:** React Native, react-native-reanimated, Expo, Jest, TypeScript strict

**Spec:** `docs/superpowers/specs/2026-03-22-pli-couche-animation-design.md`

---

## Structure des fichiers

### Fichiers a modifier

- `apps/mobile/hooks/useAnimations.ts`
  Role: porter l'etat visuel du pli (`cartesEnVol`, `cartesPoseesAuPli`) et les transitions vol -> pose -> ramassage.
- `apps/mobile/components/game/CoucheAnimation.tsx`
  Role: rendre les cartes posees au pli et les cartes en vol dans la meme couche.
- `apps/mobile/components/game/ZonePli.tsx`
  Role: ne plus rendre les cartes, seulement le cadre decoratif central.
- `apps/mobile/hooks/useControleurJeu.ts`
  Role: synchroniser `etatJeu.pliEnCours` avec le cache visuel du pli et garder l'orchestration metier intacte.
- `apps/mobile/__tests__/useAnimations.test.ts`
  Role: verifier le cycle visuel vol -> pose -> ramassage.
- `apps/mobile/__tests__/CoucheAnimation.test.tsx`
  Role: verifier le rendu de la couche mixte (cartes posees + cartes en vol).
- `apps/mobile/__tests__/ZonePli.test.tsx`
  Role: verifier que `ZonePli` ne rend plus les cartes.
- `apps/mobile/__tests__/useControleurJeuPli.test.ts`
  Role: verifier que le flux metier du pli n'est pas casse par la nouvelle source visuelle.

### Fichiers probablement inchanges

- `apps/mobile/components/game/CarteAnimee.tsx`
- `apps/mobile/components/game/Carte.tsx`
- `packages/game-logic/*`
- `packages/bot-engine/*`

---

### Task 1: Introduire les tests rouges pour le pli rendu par la couche d'animation

**Files:**

- Modify: `apps/mobile/__tests__/useAnimations.test.ts`
- Modify: `apps/mobile/__tests__/CoucheAnimation.test.tsx`
- Modify: `apps/mobile/__tests__/ZonePli.test.tsx`

- [ ] **Step 1: Ajouter un test rouge pour la pose au pli dans `useAnimations.test.ts`**

Ajouter un test qui verifie:

```ts
it("deplace une carte jouee de cartesEnVol vers cartesPoseesAuPli a la fin du vol", () => {
  const { result } = renderHook(() => useAnimations());

  act(() => {
    result.current.lancerAnimationJeuCarte(CARTE_TEST, "est");
  });

  expect(result.current.cartesEnVol).toHaveLength(1);
  expect(result.current.cartesPoseesAuPli).toEqual([]);

  act(() => {
    result.current.surAnimationTerminee("jeu-1");
  });

  expect(result.current.cartesEnVol).toEqual([]);
  expect(result.current.cartesPoseesAuPli).toHaveLength(1);
  expect(result.current.cartesPoseesAuPli[0]).toMatchObject({
    joueur: "est",
    carte: CARTE_TEST,
    faceVisible: true,
  });
});
```

- [ ] **Step 2: Ajouter un test rouge pour le depart du ramassage depuis les cartes posees**

Ajouter un test qui:

```ts
it("utilise les cartes posees au pli comme point de depart du ramassage", () => {
  const { result } = renderHook(() => useAnimations());

  act(() => {
    result.current.lancerAnimationJeuCarte(CARTE_TEST, "est");
    result.current.surAnimationTerminee("jeu-1");
  });

  act(() => {
    result.current.lancerAnimationRamassagePli(
      [{ joueur: "est", carte: CARTE_TEST }],
      "nord",
    );
    jest.advanceTimersByTime(ANIMATIONS.ramassagePli.delaiAvant);
  });

  expect(result.current.cartesPoseesAuPli).toEqual([]);
  expect(
    result.current.cartesEnVol.some((carte) => carte.id.startsWith("ramassage-p1-")),
  ).toBe(true);
});
```

- [ ] **Step 3: Ajouter un test rouge dans `CoucheAnimation.test.tsx`**

Ajouter un test qui rend `CoucheAnimation` avec:

```ts
cartesPoseesAuPli: [
  {
    id: "pli-est-as-pique",
    joueur: "est",
    carte: { couleur: "pique", rang: "as" },
    x: 0.58,
    y: 0.47,
    rotation: 8,
    echelle: 0.9,
    faceVisible: true,
  },
];
```

Puis verifie que le rendu statique de la carte du pli est present via le mock `CarteFaceAtlas`.

- [ ] **Step 4: Ajouter un test rouge dans `ZonePli.test.tsx`**

Remplacer l'assertion actuelle par:

```ts
it("ne rend plus les cartes du pli et conserve seulement le cadre decoratif", () => {
  const { queryByTestId } = render(<ZonePli {...props} />);

  expect(queryByTestId("carte-face-atlas")).toBeNull();
});
```

- [ ] **Step 5: Lancer les tests pour verifier qu'ils echouent**

Run:

```bash
cmd /c pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/useAnimations.test.ts __tests__/CoucheAnimation.test.tsx __tests__/ZonePli.test.tsx
```

Expected:

- echec sur `cartesPoseesAuPli` absent ou incorrect
- echec sur `CoucheAnimation` qui ne rend pas encore les cartes posees
- echec sur `ZonePli` qui rend encore les cartes

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/__tests__/useAnimations.test.ts apps/mobile/__tests__/CoucheAnimation.test.tsx apps/mobile/__tests__/ZonePli.test.tsx
git commit -m "test(mobile): couvrir le pli rendu par la couche animation"
```

---

### Task 2: Implementer `cartesPoseesAuPli` dans `useAnimations`

**Files:**

- Modify: `apps/mobile/hooks/useAnimations.ts`
- Test: `apps/mobile/__tests__/useAnimations.test.ts`

- [ ] **Step 1: Ajouter le type et l'etat local des cartes posees**

Dans `useAnimations.ts`, ajouter un type:

```ts
interface CartePoseeAuPli {
  id: string;
  joueur: PositionJoueur;
  carte: Carte;
  x: number;
  y: number;
  rotation: number;
  echelle: number;
  faceVisible: boolean;
}
```

Puis:

```ts
const [cartesPoseesAuPli, setCartesPoseesAuPli] = useState<CartePoseeAuPli[]>([]);
```

- [ ] **Step 2: Construire une carte posee a partir de la fin d'un vol de jeu**

Ajouter un helper local:

```ts
function creerCartePoseeAuPli(
  id: string,
  joueur: PositionJoueur,
  carte: Carte,
): CartePoseeAuPli {
  const posArrivee = POSITIONS_PLI[joueur];
  const { decalageX, decalageY, rotation } = variationCartePli(
    carte.couleur,
    carte.rang,
    joueur,
  );

  return {
    id,
    joueur,
    carte,
    x: posArrivee.x + decalageX,
    y: posArrivee.y + decalageY,
    rotation,
    echelle: 0.9,
    faceVisible: true,
  };
}
```

- [ ] **Step 3: Modifier `surAnimationTerminee` pour transformer une carte de jeu en carte posee**

Quand `id` correspond a une animation `jeu-...`:

1. retrouver le `CarteEnVol` correspondant avant suppression
2. le retirer de `cartesEnVol`
3. pousser sa version posee dans `cartesPoseesAuPli`
4. appeler ensuite le callback metier

Pseudo-code attendu:

```ts
const carteTerminee = cartesEnVolRef.current.find((carte) => carte.id === id);

if (carteTerminee && id.startsWith("jeu-")) {
  const joueur = extraireJoueurDepuisVolOuMeta(carteTerminee);
  setCartesPoseesAuPli((prev) => [
    ...prev,
    creerCartePoseeAuPli(id, joueur, carteTerminee.carte),
  ]);
}
```

Si l'information joueur n'existe pas dans `CarteEnVol`, l'ajouter explicitement au type.

- [ ] **Step 4: Vider `cartesPoseesAuPli` au debut du ramassage**

Dans `lancerAnimationRamassagePli`, avant de creer les vols `ramassage-p1-*`:

```ts
setCartesPoseesAuPli([]);
```

Le depart des vols doit etre derive des cartes posees si elles existent; sinon fallback sur le calcul actuel.

- [ ] **Step 5: Exporter `cartesPoseesAuPli` et nettoyer `annulerAnimations`**

Retourner:

```ts
return {
  cartesEnVol,
  cartesPoseesAuPli,
  ...
}
```

Et dans `annulerAnimations()`:

```ts
setCartesPoseesAuPli([]);
```

- [ ] **Step 6: Lancer le test cible pour verifier qu'il passe**

Run:

```bash
cmd /c pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/useAnimations.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/hooks/useAnimations.ts apps/mobile/__tests__/useAnimations.test.ts
git commit -m "feat(mobile): conserver les cartes du pli dans la couche animation"
```

---

### Task 3: Faire rendre les cartes posees par `CoucheAnimation` et simplifier `ZonePli`

**Files:**

- Modify: `apps/mobile/components/game/CoucheAnimation.tsx`
- Modify: `apps/mobile/components/game/ZonePli.tsx`
- Test: `apps/mobile/__tests__/CoucheAnimation.test.tsx`
- Test: `apps/mobile/__tests__/ZonePli.test.tsx`

- [ ] **Step 1: Etendre les props de `CoucheAnimation`**

Ajouter:

```ts
cartesPoseesAuPli: CartePoseeAuPli[];
```

et mettre a jour l'interface exportee si necessaire.

- [ ] **Step 2: Rendre les cartes posees dans la meme couche**

Avant ou sous les cartes en vol, ajouter:

```tsx
{
  cartesPoseesAuPli.map((cartePosee) => (
    <View
      key={cartePosee.id}
      style={{
        position: "absolute",
        left: cartePosee.x * largeurEcran - largeurCarte / 2,
        top: cartePosee.y * hauteurEcran - hauteurCarte / 2,
        transform: [
          { rotate: `${cartePosee.rotation}deg` },
          { scale: cartePosee.echelle },
        ],
        zIndex: 90,
      }}
    >
      <CarteFaceAtlas
        atlas={atlas}
        carte={cartePosee.carte}
        largeur={largeurCarte}
        hauteur={hauteurCarte}
      />
    </View>
  ));
}
```

- [ ] **Step 3: Supprimer le rendu des cartes dans `ZonePli`**

Dans `ZonePli.tsx`:

- retirer `AtlasCartes` des imports et props si plus necessaire
- retirer le `map` sur `cartes`
- conserver uniquement le conteneur et le cadre decoratif

Le prop `cartes` peut etre laisse temporairement si cela simplifie l'integration, mais il ne doit plus etre utilise dans le rendu.

- [ ] **Step 4: Mettre a jour les tests**

Verifier que:

- `CoucheAnimation.test.tsx` passe avec `cartesPoseesAuPli`
- `ZonePli.test.tsx` confirme l'absence de rendu des cartes

- [ ] **Step 5: Lancer les tests cibles**

Run:

```bash
cmd /c pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/CoucheAnimation.test.tsx __tests__/ZonePli.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/components/game/CoucheAnimation.tsx apps/mobile/components/game/ZonePli.tsx apps/mobile/__tests__/CoucheAnimation.test.tsx apps/mobile/__tests__/ZonePli.test.tsx
git commit -m "refactor(mobile): confier le rendu du pli a la couche animation"
```

---

### Task 4: Connecter `useControleurJeu` a la nouvelle source visuelle et gerer la resynchronisation

**Files:**

- Modify: `apps/mobile/hooks/useControleurJeu.ts`
- Test: `apps/mobile/__tests__/useControleurJeuPli.test.ts`

- [ ] **Step 1: Passer `cartesPoseesAuPli` a `CoucheAnimation`**

Dans la valeur retour de `useControleurJeu`, exposer:

```ts
cartesPoseesAuPli: animations.cartesPoseesAuPli,
```

Puis brancher ce prop dans `PlateauJeu.tsx` si necessaire.

- [ ] **Step 2: Ajouter une synchronisation depuis `etatJeu.pliEnCours`**

Ajouter une methode dans `useAnimations` ou un helper appele depuis `useControleurJeu`:

```ts
remplacerCartesPoseesAuPliDepuisPli(
  pli: { joueur: PositionJoueur; carte: Carte }[],
): void
```

Cette methode doit:

- reconstruire les cartes posees avec `variationCartePli`
- ne pas dupliquer une carte deja en vol
- vider les cartes posees si le pli metier est vide

- [ ] **Step 3: Appeler cette synchronisation dans les branches critiques**

Dans `useControleurJeu.ts`, apres les mises a jour de `etatJeu` liees au pli:

- quand une carte est ajoutee au pli visuel
- quand un nouveau pli complet est reconstitue depuis `historiquePlis`
- quand `animationPliEnCours` preserve visuellement le centre
- quand le pli est vide apres ramassage

Le point cle: le rendu centre doit pouvoir etre reconstruit depuis `etatJeu.pliEnCours` sans `ZonePli`.

- [ ] **Step 4: Ajouter ou adapter un test dans `useControleurJeuPli.test.ts`**

Ajouter un test de non-regression qui verifie:

```ts
it("conserve la verite metier du pli tout en laissant la couche animation gerer le rendu", () => {
  // scenario existant de jeu d'une carte puis completion du pli
  // assertion: etatJeu.pliEnCours est correct
  // assertion complementaire: le flux ne depend pas du rendu de ZonePli
});
```

Le test peut etre indirect, mais doit couvrir le fait que `etatJeu.pliEnCours` reste alimente jusqu'au moment metier normal.

- [ ] **Step 5: Lancer le test cible**

Run:

```bash
cmd /c pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/useControleurJeuPli.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/hooks/useControleurJeu.ts apps/mobile/components/game/PlateauJeu.tsx apps/mobile/__tests__/useControleurJeuPli.test.ts
git commit -m "feat(mobile): resynchroniser le pli visuel depuis l'etat de jeu"
```

---

### Task 5: Verification finale du refactor

**Files:**

- Modify: aucun code attendu, verification uniquement

- [ ] **Step 1: Lancer la suite cible des tests du pli**

Run:

```bash
cmd /c pnpm --filter @belote/mobile test -- --runTestsByPath __tests__/useAnimations.test.ts __tests__/CoucheAnimation.test.tsx __tests__/ZonePli.test.tsx __tests__/useControleurJeuPli.test.ts __tests__/CarteAnimee.test.tsx
```

Expected: PASS

- [ ] **Step 2: Lancer le typecheck mobile**

Run:

```bash
cmd /c pnpm --filter @belote/mobile typecheck
```

Expected: PASS

- [ ] **Step 3: Si le diff final depasse la zone du pli, lancer la verification transverse**

Run:

```bash
cmd /c pnpm turbo typecheck test
```

Expected: PASS

- [ ] **Step 4: Commit de finalisation**

```bash
git add apps/mobile
git commit -m "fix(mobile): unifier le rendu du pli dans la couche animation"
```

- [ ] **Step 5: Resumer les risques residuels**

Verifier dans le compte-rendu final:

- si la resynchronisation n'a pas pu etre testee en web e2e
- si des cas de resize/reload restent a observer manuellement
- si `AVANCEMENT.md` merite une mise a jour ou non selon l'ampleur finale
