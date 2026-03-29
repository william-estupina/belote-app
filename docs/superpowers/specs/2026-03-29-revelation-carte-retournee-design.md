# Spec : Révélation fluide de la carte retournée

## Problème

L'animation actuelle (`lancerAnimationRevelationCarteRetournee` dans `useAnimations.ts`) présente trois défauts visuels :

1. **Mauvaise position de départ** — la carte démarre depuis `originX=0.5` (centre écran), alors que le paquet est décalé à gauche (`x ≈ 0.462`) pour laisser la place à la carte retournée.
2. **Saccades entre phases** — l'animation à 3 segments enchaîne des `setCartesEnVol` entre chaque phase. Chaque transition déclenche un re-render React → `progres.value = 0` dans `CarteAnimee` → micro-saut visuel.
3. **Arc Bézier parasite** — `CarteAnimee` applique un arc Bézier (`decalagePerpendiculaire: 0.05`) à chaque segment, ce qui déforme les courts déplacements du soulevement.

## Solution

Remplacer le système multi-segments par un composant Reanimated autonome `CarteRevelation` qui orchestre toutes les phases en une seule animation continue, sans aucun state React entre phases.

## Chorégraphie

3 phases enchaînées via `withSequence`, pilotées par une seule `useSharedValue` :

| Phase       | Durée | Easing        | Action                                                                                                                  |
| ----------- | ----- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Soulevement | 200ms | `out`         | Carte monte légèrement depuis le centre du paquet : `translateY -8px`, rotation `-5°`, scale `0.85→1.0`. Dos visible.   |
| Flip        | 300ms | `inOut`       | Flip horizontal `rotateY 0°→180°`. Dos disparaît à 90°, face apparaît grâce à `backfaceVisibility: hidden`.             |
| Placement   | 350ms | `inOut cubic` | Glissement en ligne droite vers la position finale (centre de la zone carte retournée). Face visible. Pas d'arc Bézier. |

Total : ~850ms.

## Architecture

### Nouveau composant : `CarteRevelation.tsx`

```
apps/mobile/components/game/CarteRevelation.tsx
```

**Props :**

```ts
interface PropsCarteRevelation {
  carte: Carte;
  departX: number; // pixels — centre du paquet
  departY: number; // pixels — centre du paquet
  arriveeX: number; // pixels — centre zone carte retournée
  arriveeY: number; // pixels — centre zone carte retournée
  largeurCarte: number; // pixels
  hauteurCarte: number; // pixels
  atlas: AtlasCartes;
  onTerminee: () => void;
}
```

**Comportement interne :**

- Un seul `useSharedValue<number>(0)` qui progresse de `0` à `3` via `withSequence`
- `useAnimatedStyle` calcule position, rotation, scale et flip à partir de cette valeur en utilisant `interpolate`
- Deux `Animated.View` superposées (dos + face) avec `backfaceVisibility: hidden` pour le flip
- `runOnJS(onTerminee)()` dans le callback de `withSequence`
- Positionné en `position: absolute` dans le parent

**Calculs de position :**

- Utilise les coordonnées en pixels (pas normalisées) passées directement en props
- La position absolue CSS = `left: x - largeurCarte/2`, `top: y - hauteurCarte/2`
- Le soulevement est un `translateY` additionnel interpolé sur la phase 1

### Nouvelle phase UI : `"revelationCarte"`

Ajouter `"revelationCarte"` au type `PhaseUI` dans `useControleurJeu.ts` :

```ts
export type PhaseUI =
  | "inactif"
  | "distribution"
  | "redistribution"
  | "revelationCarte" // nouvelle
  | "encheres"
  | "jeu"
  | "finPli"
  | "scoresManche"
  | "finPartie";
```

Pendant `revelationCarte` :

- `ReserveCentrale` affiche le paquet uniquement (pas de `carteRetourneeReserve`)
- `CarteRevelation` est monté avec la carte concernée
- Quand `onTerminee` est appelée → `finaliserEntreeEncheres()` → `phaseUI = "encheres"`

### Modifications `useControleurJeu.ts`

Remplacer l'appel à `animations.lancerAnimationRevelationCarteRetournee(...)` par :

```ts
setEtatJeu((prev) => ({
  ...prev,
  phaseUI: "revelationCarte",
  carteRetournee: carteRetournee,
}));
```

`finaliserEntreeEncheres` reste inchangée — elle est passée à `PlateauJeu` via le hook et appelée par `CarteRevelation.onTerminee`.

### Modifications `PlateauJeu.tsx`

```tsx
// Adapter afficherReserveCentrale
const afficherReserveCentrale =
  etatJeu.phaseUI === "distribution" ||
  etatJeu.phaseUI === "revelationCarte" || // ajout
  etatJeu.phaseUI === "encheres" ||
  etatJeu.phaseUI === "redistribution";

// carteRetourneeReserve reste inchangé (null pendant revelationCarte)
const carteRetourneeReserve =
  etatJeu.phaseUI === "encheres" ? etatJeu.carteRetournee : null;

// Monter CarteRevelation pendant la phase revelationCarte
{
  etatJeu.phaseUI === "revelationCarte" && etatJeu.carteRetournee && (
    <CarteRevelation
      carte={etatJeu.carteRetournee}
      departX={dispositionReserve.centrePaquet.x}
      departY={dispositionReserve.centrePaquet.y}
      arriveeX={dispositionReserve.centreCarteRetournee.x}
      arriveeY={dispositionReserve.centreCarteRetournee.y}
      largeurCarte={dispositionReserve.largeurCarte}
      hauteurCarte={dispositionReserve.hauteurCarte}
      atlas={atlas}
      onTerminee={finaliserEntreeEncheres}
    />
  );
}
```

`dispositionReserve` est calculé depuis `calculerDispositionReserveCentrale` — à extraire en variable dans le corps de `PlateauJeu`. Les dimensions `largeur/hauteur` sont déjà disponibles via le `onLayout` existant dans `PlateauJeu` (state `dimensions`). Si `largeur === 0`, ne pas monter `CarteRevelation` (guard identique à celui déjà présent dans `useControleurJeu.ts` ligne 628).

**Note :** `finaliserEntreeEncheres` doit être exposée par `useControleurJeu` (elle est actuellement interne). L'exposer via le hook retourné, sous le nom `onRevelationTerminee`.

**Note :** `finaliserEntreeEncheres` appelle `...extraireEtatUI(ctx, etat)` qui retourne déjà `phaseUI: "encheres"` pour l'état machine courant — la phase `"revelationCarte"` sera bien écrasée. Vérifier que `extraireEtatUI` effectue bien ce mapping avant de finaliser le plan.

### Nettoyage

| Fichier                             | Action                                                                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useAnimations.ts`                  | Supprimer `lancerAnimationRevelationCarteRetournee` et les constantes `DECALAGE_X/Y_SOULEVEMENT_RETOURNEE`, `ROTATION_*`, `ECHELLE_*`, `ROTATION_APEX_RETOURNEE`, `ECHELLE_APEX_RETOURNEE` |
| `constants/animations-visuelles.ts` | Supprimer `ANIMATIONS_CARTE_RETOURNEE`                                                                                                                                                     |
| `ZoneCarteRetournee.tsx`            | Supprimer après vérification qu'il n'est importé nulle part (grep préalable)                                                                                                               |

## Fichiers impactés

| Fichier                                          | Modification                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `components/game/CarteRevelation.tsx`            | **Créer**                                                                                  |
| `hooks/useControleurJeu.ts`                      | Ajouter `"revelationCarte"` à `PhaseUI`, remplacer appel animation, exposer callback       |
| `components/game/PlateauJeu.tsx`                 | Monter `CarteRevelation`, adapter `afficherReserveCentrale`, calculer `dispositionReserve` |
| `hooks/useAnimations.ts`                         | Supprimer `lancerAnimationRevelationCarteRetournee`                                        |
| `constants/animations-visuelles.ts`              | Supprimer `ANIMATIONS_CARTE_RETOURNEE`                                                     |
| `components/game/ZoneCarteRetournee.tsx`         | **Supprimer** après grep de confirmation                                                   |
| `__tests__/useAnimations.test.ts`                | Supprimer tests liés à `lancerAnimationRevelationCarteRetournee`                           |
| `__tests__/useControleurJeuDistribution.test.ts` | Adapter les tests de transition vers enchères                                              |

## Notes pour le plan d'implémentation

- **`distributionEnCours`** dans `PlateauJeu` : vérifier si ce flag est toujours `false` pendant `revelationCarte` (entre la fin de la distribution et le début des enchères). Il doit l'être pour que `doitAfficherUIEncheres` se comporte correctement.
- **Tests** : les tests `useControleurJeuDistribution` couvrent la transition vers les enchères — adapter les assertions sur `phaseUI` (qui est désormais `"revelationCarte"` avant `"encheres"`).

## Résultat attendu

- La carte part visuellement du centre du paquet
- L'animation est continue, sans rupture ni saut entre phases
- Le soulevement est subtil (~8px vers le haut)
- Le flip est propre grâce à `backfaceVisibility: hidden` sur deux vues superposées
- Le placement est un glissement en ligne droite, sans arc Bézier
