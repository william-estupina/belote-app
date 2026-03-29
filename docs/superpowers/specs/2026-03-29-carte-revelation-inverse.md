# Spec — `CarteRevelation` inverse pour le retour au paquet

**Date :** 2026-03-29
**Contexte :** Quand tout le monde passe les enchères, la carte retournée doit voler vers le paquet avec une animation qui est l'exact miroir temporel de la révélation, au lieu d'utiliser `CarteAnimee` avec un flip linéaire pendant le vol.

**Remplace :** La spec `2026-03-29-animation-retour-paquet-redistribution.md` pour ce qui concerne la phase 1 (retour de la carte retournée). La phase 2 (retour des mains) et la correction de cible `lancerAnimationRetourPaquet` restent inchangées.

---

## Problème résolu

La spec précédente prévoyait `lancerAnimationRetourCarteRetournee` dans `useAnimations.ts`, qui créait une `CarteEnVol` passant par `CoucheAnimation`/`CarteAnimee`. Cette approche produisait un flip linéaire pendant le vol — visuellement différent de la révélation. La solution est de réutiliser `CarteRevelation` avec un prop `inverse`.

---

## Séquence cible

1. **Pause 300ms** — badges "Passe" visibles, carte retournée affichée statiquement
2. **Phase 1** (~500ms) — `CarteRevelation inverse` : la carte glisse de `centreCarteRetournee` → position au-dessus du paquet, flip face→dos sur place, descente dans le paquet
3. **Phase 2** — cartes des 4 mains volent en vagues vers `centrePaquet` (inchangé, cible corrigée)

---

## Fichiers modifiés

### `apps/mobile/components/game/CarteRevelation.tsx`

Ajouter `inverse?: boolean` aux props.

Quand `inverse: true`, les interpolations du conteneur échangent depart/arrivee :

```ts
// Position x (original : depart → depart → depart → arrivee)
const x = inverse
  ? interpolate(p, [0, 1, 2, 3], [arriveeX, departX, departX, departX])
  : interpolate(p, [0, 1, 2, 3], [departX, departX, departX, arriveeX]);

// Position y (original : departY → departY-PX → departY-PX → arriveeY)
// Note inverse : le soulèvement se fait par rapport à la position réelle de départ de la carte
// (= arriveeY, la zone carte retournée), pas par rapport au paquet (departY).
const y = inverse
  ? interpolate(
      p,
      [0, 1, 2, 3],
      [arriveeY, arriveeY - PX_SOULEVEMENT, arriveeY - PX_SOULEVEMENT, departY],
    )
  : interpolate(
      p,
      [0, 1, 2, 3],
      [departY, departY - PX_SOULEVEMENT, departY - PX_SOULEVEMENT, arriveeY],
    );

// Échelle (original : 0.85 → 1.0 → 1.0 → 1.0)
const echelle = inverse
  ? interpolate(p, [0, 1, 2, 3], [1.0, 1.0, 1.0, 0.85])
  : interpolate(p, [0, 1, 2, 3], [0.85, 1.0, 1.0, 1.0]);

// Rotation : identique dans les deux sens (0 → -5 → -5 → 0).
// En mode inverse, la carte s'incline légèrement au départ (phase de glissement) puis
// se redresse avant de descendre dans le paquet — cohérent visuellement avec une "pose" de carte.
```

Pour le flip, `styleDos` et `styleFace` échangent leurs formules rotY + opacity :

```ts
// styleDos inverse = formules de styleFace original
const rotYDos = inverse
  ? interpolate(p, [1, 1.5, 2], [-90, -90, 0], "clamp")
  : interpolate(p, [1, 1.5, 2], [0, 90, 90], "clamp");
const opacityDos = inverse
  ? interpolate(p, [1, 1.5, 1.6, 2], [0, 0, 1, 1], "clamp")
  : interpolate(p, [0, 1, 1.4, 1.5], [1, 1, 1, 0], "clamp");

// styleFace inverse = formules de styleDos original
const rotYFace = inverse
  ? interpolate(p, [1, 1.5, 2], [0, 90, 90], "clamp")
  : interpolate(p, [1, 1.5, 2], [-90, -90, 0], "clamp");
const opacityFace = inverse
  ? interpolate(p, [0, 1, 1.4, 1.5], [1, 1, 1, 0], "clamp")
  : interpolate(p, [1, 1.5, 1.6, 2], [0, 0, 1, 1], "clamp");
```

### `apps/mobile/constants/layout.ts`

Ajouter dans `ANIMATIONS.redistribution` :

```ts
dureeRetourCarteRetournee: ralentirDureeAnimationMajeure(500),
```

En mode inverse, `CarteRevelation` accepte une prop optionnelle `dureeTotale?: number`. Quand elle est fournie, les 3 durées de phases sont calculées proportionnellement — en utilisant la somme des constantes comme dénominateur (pas de valeur en dur) :

```ts
const DUREE_TOTALE_REF = DUREE_SOULEVEMENT + DUREE_FLIP + DUREE_PLACEMENT;
const dureeSoulevement = Math.round((DUREE_SOULEVEMENT / DUREE_TOTALE_REF) * dureeTotale);
const dureeFlip = Math.round((DUREE_FLIP / DUREE_TOTALE_REF) * dureeTotale);
const dureePlacement = dureeTotale - dureeSoulevement - dureeFlip; // absorbe l'arrondi
```

L'appelant passe `dureeTotale={ANIMATIONS.redistribution.dureeRetourCarteRetournee}`. `dureeTotale` n'est applicable qu'en mode `inverse: true` — en mode normal, la prop est ignorée même si fournie.

### `apps/mobile/stores/etat-jeu-ui.ts` (ou fichier équivalent)

Ajouter dans `EtatJeuUI` :

```ts
carteRetourneeEnRetour: Carte | null;
```

Initialisé à `null`.

### `apps/mobile/components/game/PlateauJeu.tsx`

Ajouter le rendu conditionnel de l'animation inverse, symétrique à la révélation :

```tsx
{
  /* Animation retour de la carte retournée vers le paquet */
}
{
  etatJeu.carteRetourneeEnRetour !== null && largeur > 0 && (
    <CarteRevelation
      inverse
      carte={etatJeu.carteRetourneeEnRetour}
      departX={dispositionReserve.centrePaquet.x}
      departY={dispositionReserve.centrePaquet.y}
      arriveeX={dispositionReserve.centreCarteRetournee.x}
      arriveeY={dispositionReserve.centreCarteRetournee.y}
      largeurCarte={largeurCarte}
      hauteurCarte={hauteurCarte}
      atlas={atlas}
      onTerminee={onRetourCarteRetourneeTerminee}
    />
  );
}
```

La carte statique (`carteRetourneeReserve`) disparaît sans flash car `carteRetournee: null` est mis à jour dans le même batch React que `carteRetourneeEnRetour: carte`.

**Retirer** `etatJeu.phaseUI === "redistribution"` de la condition `carteRetourneeReserve` — si cette ligne avait été ajoutée par la spec précédente, la supprimer. C'est `carteRetourneeEnRetour` qui prend le relais pour la phase de redistribution.

### `apps/mobile/hooks/useAnimations.ts`

Modifier `lancerAnimationRetourPaquet` — ajout du paramètre `arrivee` explicite (inchangé par rapport à la spec précédente) :

```ts
// Avant
lancerAnimationRetourPaquet(cartes, onTerminee?)

// Après
lancerAnimationRetourPaquet(cartes, arrivee: { x: number; y: number }, onTerminee?)
```

`lancerAnimationRetourCarteRetournee` **n'est pas créée** — cette fonction est supprimée du scope.

### `apps/mobile/hooks/useControleurJeu.ts`

Le pattern suit exactement `onRevelationTerminee` / `onRevelationTermineeRef` déjà en place.

**1. Ajouter un ref pour stocker le callback de fin :**

```ts
const onRetourCarteRetourneeRef = useRef<(() => void) | null>(null);
```

**2. Dans `lancerRedistributionAnimee`, dans le callback du `setTimeout` (après `pauseAvantRappel`) :**

```ts
const carteRetournee = etatJeuRef.current.carteRetournee;
const cartesRetour = construireCartesRetourPaquet();

const { largeur, hauteur } = dimensionsEcranRef.current;
const disposition = calculerDispositionReserveCentrale({
  largeurEcran: largeur,
  hauteurEcran: hauteur,
});
const centrePaquet = {
  x: disposition.centrePaquet.x / largeur,
  y: disposition.centrePaquet.y / hauteur,
};

const lancerPhase2 = () => {
  setEtatJeu((prev) => ({ ...prev, carteRetourneeEnRetour: null }));
  animations.lancerAnimationRetourPaquet(cartesRetour, centrePaquet, () => {
    // suite existante : cartesRestantesPaquet: 32, glissement dealer, etc.
  });
};

if (carteRetournee) {
  // Stocker lancerPhase2 → sera appelé par onRetourCarteRetourneeTerminee depuis PlateauJeu
  onRetourCarteRetourneeRef.current = lancerPhase2;
  setEtatJeu((prev) => ({
    ...prev,
    mainJoueur: [],
    nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
    carteRetournee: null,
    carteRetourneeEnRetour: carteRetournee,
    phaseEncheres: null,
    historiqueEncheres: [],
    cartesRestantesPaquet: 1,
    afficherActionsEnchereRedistribution: false,
  }));
} else {
  // Pas de carte retournée (cas défensif) — phase 2 directement
  setEtatJeu((prev) => ({
    ...prev,
    mainJoueur: [],
    nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
    phaseEncheres: null,
    historiqueEncheres: [],
    cartesRestantesPaquet: 1,
    afficherActionsEnchereRedistribution: false,
  }));
  lancerPhase2();
}
```

**3. Exposer le callback (pattern identique à `onRevelationTerminee`) :**

```ts
const onRetourCarteRetourneeTerminee = useCallback(() => {
  const fn = onRetourCarteRetourneeRef.current;
  onRetourCarteRetourneeRef.current = null;
  fn?.();
}, []);
```

Ajouter `onRetourCarteRetourneeTerminee` dans l'objet retourné par le hook.

**PlateauJeu** passe ce callback à `<CarteRevelation inverse ... onTerminee={onRetourCarteRetourneeTerminee} />`.

---

## Ce qui disparaît de la spec précédente

| Élément supprimé                                                 | Raison                                 |
| ---------------------------------------------------------------- | -------------------------------------- |
| `lancerAnimationRetourCarteRetournee` dans `useAnimations.ts`    | Remplacé par `CarteRevelation inverse` |
| Test de `lancerAnimationRetourCarteRetournee`                    | N'existe plus                          |
| Extension condition `carteRetourneeReserve` à `"redistribution"` | Remplacée par `carteRetourneeEnRetour` |

---

## Tests

### `apps/mobile/__tests__/CarteRevelation.test.tsx`

Ajouter des cas pour `inverse: true` :

- Le composant se monte sans erreur avec `inverse`
- `onTerminee` est appelé après la fin de l'animation
- La position initiale du conteneur correspond à `arriveeX/arriveeY` (pas `departX/departY`) — vérifie que les coords de départ sont inversées. Avec le mock `interpolate` qui retourne `output[0]`, le style initial doit avoir `left = arriveeX - largeurCarte/2`.
- `styleDos` initial a `rotY = -90` (formule de face en mode normal, clampée à `p < 1`) — vérifie que les rôles dos/face sont bien échangés.

### `apps/mobile/__tests__/useAnimations.test.ts`

Mettre à jour le test existant de `lancerAnimationRetourPaquet` pour la nouvelle signature (deuxième argument = `arrivee: { x, y }`).

---

## Ce qui ne change pas

- Le comportement global de `lancerRedistributionAnimee` (timing, glissement dealer, nouvelle distribution)
- `CarteRetourPaquet`, `CoucheAnimation`, `CarteAnimee`
- Les tests existants sur le ramassage de pli
