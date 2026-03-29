# Spec — Animation retour paquet lors de la redistribution

**Date :** 2026-03-29
**Contexte :** Quand tout le monde a refusé l'enchère, les cartes des mains volent vers le centre de l'écran au lieu du paquet, et la carte retournée disparaît sans animation. L'objectif est de corriger les deux problèmes en une séquence fluide en deux phases.

---

## Problèmes actuels

1. **Carte retournée disparaît sans animation** — dans `lancerRedistributionAnimee`, le premier `setEtatJeu` met `carteRetournee: null` immédiatement. De plus, `PlateauJeu.tsx` ne montre `carteRetourneeReserve` que pour `phaseUI === "encheres"`, donc elle disparaît dès le changement de phase.

2. **Mauvaise cible pour les cartes des mains** — `lancerAnimationRetourPaquet` envoie toutes les cartes vers `{ x: originX, y: originY }` = `(0.5, 0.45)`, le centre de l'écran. Mais le paquet est décalé à gauche pour laisser de la place à la carte retournée. La vraie position normalisée est calculée par `calculerDispositionReserveCentrale`.

---

## Séquence cible

1. **Pause 300ms** (`pauseAvantRappel`) — badges "Passe" visibles, carte retournée toujours affichée sur le tapis
2. **Phase 1** (~500ms) — la carte retournée vole de `centreCarteRetournee` → `centrePaquet`, flip face visible (180°) → face cachée (0°)
3. **Phase 2** — les cartes des 4 mains volent en vagues vers `centrePaquet` (comportement existant, cible corrigée)

---

## Fichiers modifiés

### `apps/mobile/constants/layout.ts`

Ajouter dans `ANIMATIONS.redistribution` :

```ts
dureeRetourCarteRetournee: ralentirDureeAnimationMajeure(500), // duree du retour de la carte retournee vers le paquet (ms)
```

### `apps/mobile/components/game/PlateauJeu.tsx`

Étendre la condition de visibilité de la carte retournée :

```ts
// Avant
const carteRetourneeReserve =
  etatJeu.phaseUI === "encheres" ? etatJeu.carteRetournee : null;

// Après
const carteRetourneeReserve =
  etatJeu.phaseUI === "encheres" || etatJeu.phaseUI === "redistribution"
    ? etatJeu.carteRetournee
    : null;
```

### `apps/mobile/hooks/useAnimations.ts`

**Nouvelle fonction `lancerAnimationRetourCarteRetournee` :**

```ts
lancerAnimationRetourCarteRetournee(
  carte: Carte,
  depart: { x: number; y: number; rotation: number; echelle: number },
  arrivee: { x: number; y: number },
  onTerminee?: () => void,
): void
```

- Crée un `carteEnVol` : `depart` → `{ ...arrivee, rotation: 0, echelle: 0.85 }`
- `faceVisible: true` (la carte part face visible)
- `flipDe: 180`, `flipVers: 0` (flip face visible → face cachée pendant le vol)
- `duree: ANIMATIONS.redistribution.dureeRetourCarteRetournee`
- `easing: "inout-cubic"`
- `onTerminee` déclenché après `dureeRetourCarteRetournee` (pas de pause supplémentaire)
- Exposée dans le retour de `useAnimations`

**Modifier `lancerAnimationRetourPaquet` — ajout du paramètre `arrivee` :**

```ts
// Avant
lancerAnimationRetourPaquet(
  cartes: ReadonlyArray<CarteRetourPaquet>,
  onTerminee?: () => void,
): void

// Après
lancerAnimationRetourPaquet(
  cartes: ReadonlyArray<CarteRetourPaquet>,
  arrivee: { x: number; y: number },
  onTerminee?: () => void,
): void
```

Remplacer `ANIMATIONS.distribution.originX` / `originY` par `arrivee.x` / `arrivee.y` dans le corps de la fonction.

### `apps/mobile/hooks/useControleurJeu.ts`

**Dans `lancerRedistributionAnimee` :**

1. Retirer `carteRetournee: null` du `setEtatJeu` immédiat — la carte reste visible pendant la pause.

2. Dans le `setTimeout` (callback de `pauseAvantRappel`) :

```ts
const { largeur, hauteur } = dimensionsEcranRef.current;
const disposition = calculerDispositionReserveCentrale({
  largeurEcran: largeur,
  hauteurEcran: hauteur,
});
const centrePaquet = {
  x: disposition.centrePaquet.x / largeur,
  y: disposition.centrePaquet.y / hauteur,
};
const centreCarteRetournee = {
  x: disposition.centreCarteRetournee.x / largeur,
  y: disposition.centreCarteRetournee.y / hauteur,
};

const carteRetournee = etatJeuRef.current.carteRetournee;
const cartesRetour = construireCartesRetourPaquet();

// Effacer l'état (carteRetournee: null + vider les mains) dans le même rendu
// que l'ajout du carteEnVol → pas de flash.
// Note sur le batching : `setEtatJeu` et `setCartesEnVol` (appelé en interne par
// `lancerAnimationRetourCarteRetournee`) sont tous deux invoqués de façon synchrone
// dans le même callback `setTimeout`, sans `await` entre eux. React 18 (actif via
// Expo SDK 50+) batch automatiquement tous les setState dans un même callback,
// ce qui garantit un seul rendu. Si un flash était constaté sur un appareil,
// envelopper dans `unstable_batchedUpdates` comme solution de repli.
setEtatJeu((prev) => ({
  ...prev,
  mainJoueur: [],
  nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
  carteRetournee: null,
  phaseEncheres: null,
  historiqueEncheres: [],
  cartesRestantesPaquet: 1,
  afficherActionsEnchereRedistribution: false,
}));

// Phase 1 : carte retournée → paquet
if (carteRetournee) {
  animations.lancerAnimationRetourCarteRetournee(
    carteRetournee,
    { x: centreCarteRetournee.x, y: centreCarteRetournee.y, rotation: 0, echelle: 0.85 },
    centrePaquet,
    () => {
      // Phase 2 : mains → paquet
      animations.lancerAnimationRetourPaquet(cartesRetour, centrePaquet, () => {
        // suite existante : cartesRestantesPaquet: 32, glissement dealer, etc.
      });
    },
  );
} else {
  // Pas de carte retournée (cas défensif) — phase 2 directement
  animations.lancerAnimationRetourPaquet(cartesRetour, centrePaquet, () => {
    // suite existante
  });
}
```

---

## Ce qui ne change pas

- Le comportement global de `lancerRedistributionAnimee` (timing global, glissement dealer, nouvelle distribution)
- La structure de `CarteRetourPaquet`
- Le rendu de `ReserveCentrale` et `ZoneCarteRetournee`
- Les tests existants sur le ramassage de pli (`planRamassagePli`)

---

## Tests à vérifier / écrire

- `useAnimations.test.ts` : **mettre à jour le test existant** de `lancerAnimationRetourPaquet` — il appelle actuellement `lancerAnimationRetourPaquet(cartes, surFin)` avec l'ancienne signature à deux arguments. Après le changement, le deuxième argument est `arrivee: { x, y }` ; passer explicitement un objet `{ x: 0.4, y: 0.45 }` (ou similaire) et déplacer le callback en troisième position.
- `useAnimations.test.ts` : vérifier que `lancerAnimationRetourCarteRetournee` crée un `carteEnVol` avec `faceVisible: true`, `flipDe: 180`, `flipVers: 0`, la bonne durée, et la bonne cible normalisée
- `useAnimations.test.ts` : vérifier que `lancerAnimationRetourPaquet` utilise bien `arrivee.x` / `arrivee.y` dans les coordonnées d'arrivée des cartes en vol
- Vérification manuelle de la séquence visuelle sur appareil / simulateur
