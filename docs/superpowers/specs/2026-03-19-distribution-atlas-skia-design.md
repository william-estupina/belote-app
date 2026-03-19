# Design — Distribution Skia Atlas : arc, ease-out, withDelay natif

**Date** : 2026-03-19
**Statut** : Approuvé

## Contexte

Malgré les améliorations de la spec du 2026-03-18 (ralentissement, paquet central, easing), trois problèmes persistent sur l'animation de distribution :

1. **Trajectoire rectiligne** — les cartes volent en ligne droite du centre vers chaque main
2. **Manque de fluidité** — orchestration par `setTimeout` côté JS thread, micro-saccades
3. **Arrivée mécanique** — pas de décélération naturelle à l'atterrissage

## Décisions de design

### 1. Architecture : Skia Atlas (single draw call)

Pendant la distribution uniquement, remplacer les N composants `CarteAnimee` individuels par un **unique Canvas Skia** utilisant `drawAtlas` / `useRSXformBuffer`. Avantages :

- **1 seul draw call** pour dessiner jusqu'à 32 cartes simultanément
- Pas de reconciliation React pour chaque carte
- Transformations (position, rotation, scale) calculées par `RSXform` dans un worklet

**Scope limité** : seule la distribution utilise l'Atlas. Les animations de jeu de carte et de ramassage de pli restent sur `CarteAnimee` (enrichi avec arc + ease-out).

### 2. Sprite sheet pré-construite

Une image unique (~1336×1210px) contenant les 32 faces de cartes + 1 dos, organisée en grille 8×5 :

- **Lignes 1–4** : 8 cartes par ligne (8 rangs × 4 couleurs = 32 faces)
- **Ligne 5** : 1 dos de carte (cellule 0), reste vide
- Chaque cellule : ~167×242px (ratio 1.45)
- Ordre : trèfle, carreau, cœur, pique × 7, 8, 9, 10, V, D, R, As

**Fichiers** :

- `assets/sprites/sprite-sheet.png` — sprite sheet générée
- `assets/sprites/dos.png` — dos seul (pour usages hors Atlas)
- `apps/mobile/scripts/generer-sprite-sheet.ts` — script Node (sharp) pour assembler les PNG existants

**Module utilitaire** `apps/mobile/utils/atlas-cartes.ts` :

- `SPRITE_COLS = 8`, `SPRITE_ROWS = 5`
- `rectSource(couleur, rang) → SkRect` — retourne le rectangle source dans la sprite sheet
- `rectDos() → SkRect` — rectangle du dos (ligne 5, col 0)
- Charge la sprite sheet via `useImage(require('assets/sprites/sprite-sheet.png'))`

### 3. Trajectoire : arc subtil (Bézier quadratique)

Chaque carte suit un arc léger au lieu d'une ligne droite :

```
x(t) = (1-t)² × depart.x + 2(1-t)t × controle.x + t² × arrivee.x
y(t) = (1-t)² × depart.y + 2(1-t)t × controle.y + t² × arrivee.y
```

**Point de contrôle** : décalé de ~5% de la distance totale, perpendiculairement à l'axe depart→arrivee. Direction du décalage : vers la droite du vecteur de vol (sens horaire depuis le centre).

Constante dans `layout.ts` :

```ts
arcDistribution: {
  decalagePerpendiculaire: 0.05, // 5% de la distance, perpendiculaire
}
```

### 4. Atterrissage : ease-out fort

- **Easing** : `Easing.out(Easing.cubic)` — forte décélération, la carte ralentit naturellement en arrivant
- Remplace `inout-cubic` pour la distribution uniquement
- Les animations de jeu et ramassage utilisent aussi cet ease-out (appliqué dans `CarteAnimee`)

Constante dans `layout.ts` :

```ts
easingDistribution: "out-cubic" as const, // ease-out fort (était "inout-cubic")
```

### 5. Orchestration : withDelay natif Reanimated

Remplacer **tous les `setTimeout`** de la distribution par `withDelay(delai, withTiming(...))` :

- Chaque carte reçoit un délai calculé : `(indexJoueur × delaiEntreJoueurs) + (round × pauseEntreRounds)`
- L'intégralité de l'orchestration tourne sur le **UI thread** via worklets
- Les callbacks JS (`onPaquetArrive`, `onTerminee`) sont déclenchés via `runOnJS` depuis `withTiming({ finished })`

### 6. Hook dédié : useAnimationsDistribution

Nouveau hook qui encapsule toute la logique Atlas :

```ts
useAnimationsDistribution(params: {
  spriteSheet: SkImage;
  largeurEcran: number;
  hauteurEcran: number;
  onPaquetArrive: (joueur: PositionJoueur, cartes: CarteId[]) => void;
  onTerminee: () => void;
}) => {
  lancerDistribution: (plan: PlanDistribution) => void;
  composantAtlas: React.ReactNode; // le <Canvas> Skia à rendre
  enCours: boolean;
}
```

- Gère les `SharedValue` Reanimated pour chaque carte (progression 0→1)
- Calcule les `RSXform` dans `useRSXformBuffer` : Bézier + rotation + scale
- Appelle `runOnJS(onPaquetArrive)` quand un paquet atterrit
- Appelle `runOnJS(onTerminee)` quand toutes les cartes sont arrivées

### 7. Composant DistributionCanvas

Composant wrapper léger :

```tsx
// Rendu conditionnel dans CoucheAnimation
{phaseDistribution ? (
  <DistributionCanvas {...propsDistribution} />
) : (
  // CarteAnimee existants pour jeu/ramassage
)}
```

- Reçoit les props du hook `useAnimationsDistribution`
- Rend le `<Canvas>` Skia avec `drawAtlas`
- Visible uniquement pendant la distribution

## Changements sur les animations existantes (jeu/ramassage)

`CarteAnimee.tsx` est enrichi pour les animations non-distribution :

- **Arc subtil** : même Bézier quadratique avec décalage perpendiculaire ~5%
- **Ease-out** : `Easing.out(Easing.cubic)` au lieu de linéaire
- Pas de migration vers Atlas (composants individuels suffisent pour 1-4 cartes)

## Changements techniques

### Fichiers créés

| Fichier                                              | Rôle                                                  |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `assets/sprites/sprite-sheet.png`                    | Sprite sheet 8×5 (32 faces + 1 dos)                   |
| `assets/sprites/dos.png`                             | Dos de carte seul                                     |
| `apps/mobile/scripts/generer-sprite-sheet.ts`        | Script génération sprite sheet (sharp)                |
| `apps/mobile/utils/atlas-cartes.ts`                  | Utilitaire : rectSource, rectDos, chargement image    |
| `apps/mobile/components/game/DistributionCanvas.tsx` | Canvas Skia Atlas pour la distribution                |
| `apps/mobile/hooks/useAnimationsDistribution.ts`     | Hook orchestration distribution (withDelay + RSXform) |

### Fichiers modifiés

| Fichier                                           | Nature du changement                                                             |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/mobile/constants/layout.ts`                 | Ajout `arcDistribution.decalagePerpendiculaire`, changement easing → `out-cubic` |
| `apps/mobile/hooks/useAnimations.ts`              | Retirer la logique distribution, déléguer à `useAnimationsDistribution`          |
| `apps/mobile/components/game/CoucheAnimation.tsx` | Routage conditionnel : `DistributionCanvas` si distribution, sinon `CarteAnimee` |
| `apps/mobile/components/game/CarteAnimee.tsx`     | Ajouter arc Bézier + ease-out pour jeu/ramassage                                 |

### Fichiers NON impactés

- `Carte.tsx` — rendu des cartes dans la main (pas en vol)
- `PaquetCentral.tsx` — paquet visuel au centre (reste identique)
- `MainJoueur.tsx` — éventail du joueur (pas d'animation de vol)
- `ZoneCarteRetournee.tsx` — carte retournée pendant enchères
- `PlateauJeu.tsx` — structure générale (le routage est dans `CoucheAnimation`)

## Risques et mitigations

| Risque                                                   | Mitigation                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Skia `drawAtlas` pas supporté sur toutes les plateformes | Tester iOS, Android, Web. Fallback : garder `CarteAnimee` si Atlas non dispo  |
| Sprite sheet trop lourde en mémoire                      | ~1336×1210 ≈ 6.5MB décompressé, acceptable pour un jeu mobile                 |
| `useRSXformBuffer` : API Skia peut évoluer               | Encapsuler dans `useAnimationsDistribution`, changement localisé              |
| `runOnJS` latence pour callbacks                         | Acceptable : les callbacks ne sont pas time-critical (mise à jour état React) |
