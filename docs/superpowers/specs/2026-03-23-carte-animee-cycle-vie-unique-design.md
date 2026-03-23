# Design : Cycle de vie unique CarteAnimee

**Date** : 2026-03-23
**Problème** : Clignotement visuel quand les cartes arrivent au pli — causé par le changement de composant entre `CarteAnimee` (Reanimated) et `CartePoseeAuPli` (View statique avec styles différents).

## Principe

Une carte jouée sur le pli est **une seule instance de `CarteAnimee`** qui traverse 3 phases sans jamais être démontée/remontée :

1. **Vol** : animation de la main vers le pli (progression 0→1)
2. **Repos** : gelée à sa position finale (progression reste à 1)
3. **Ramassage** : nouvelle animation vers la pile du gagnant (nouvelle progression 0→1)

**Règle absolue** : zéro changement de composant = zéro glitch visuel.

## Modifications

### `CarteAnimee.tsx`

Supporte un enchaînement de trajectoires :

- Quand la carte atteint `progression=1`, elle ne se démonte plus. Elle reste rendue à sa position d'arrivée.
- Expose la capacité de relancer une animation vers une nouvelle destination (phase ramassage) sans démonter le composant.
- Concrètement : les props `depart`/`arrivee`/`duree`/`faceVisible`/`easing` deviennent réactives. Quand elles changent (nouveau segment de trajectoire), la shared value `progres` est réinitialisée à 0 et relancée vers 1.
- La prop `segment` est ajoutée au tableau de dépendances du `useEffect` qui lance l'animation. Le changement de `segment` déclenche un re-render React, ce qui met à jour les valeurs JS capturées par les closures des `useAnimatedStyle` (`depart`, `arrivee`, `pointControle`). Le `useEffect` remet `progres.value = 0` puis relance `withTiming(1, ...)`.
- Les shadows actuellement appliquées par le wrapper statique dans `CoucheAnimation` (shadowColor, shadowOffset, shadowOpacity, elevation) sont reportées sur le style du conteneur animé dans `CarteAnimee` pour les cartes gelées/au repos.

### `useAnimations.ts`

Supprime entièrement le concept `cartesPoseesAuPli` :

- Supprime le state `cartesPoseesAuPli` et le ref `cartesPoseesAuPliRef`.
- Supprime `creerCartePoseeAuPli`, `creerCartePoseeAuPliDepuisVol`, `construireCartePoseeAuPli`, `construireCartesPoseesAuPliDepuisPli`.
- Supprime `remplacerCartesPoseesAuPliDepuisPli`.
- Les cartes "jeu-\*" restent dans `cartesEnVol` après la fin de leur animation (gelées).
- `surAnimationTerminee` pour les cartes "jeu-\*" : n'ajoute plus de `CartePoseeAuPli`, appelle juste le callback de fin et ne retire PAS la carte de `cartesEnVol`.

**Ramassage (nouveau flux)** :

Au lieu de créer de nouvelles `CarteEnVol` "ramassage-p1-_" / "ramassage-p2-_", on met à jour les cartes "jeu-\*" existantes :

1. Phase 1 (convergence) : les cartes "jeu-\*" reçoivent une nouvelle destination (position du gagnant). `CarteAnimee` détecte le changement de destination et relance l'animation.
2. Phase 2 (glissement) : les mêmes cartes reçoivent une seconde destination (pile d'équipe) + `faceVisible: false`.
3. Les cartes sont retirées de `cartesEnVol` seulement quand elles arrivent à la pile.

Pour que `CarteAnimee` détecte les changements de trajectoire, on ajoute un champ `segment: number` à `CarteEnVol` qui s'incrémente à chaque nouvelle trajectoire.

**Callbacks par segment** : `surAnimationTerminee` continue de se déclencher à chaque `progression=1`. Le comportement change selon le contexte :

- **Segment vol (jeu)** : appelle le callback métier (avancer XState), ne retire PAS la carte de `cartesEnVol`.
- **Segment ramassage phase 1 (convergence)** : déclenche la phase 2 (mise à jour destination + segment++) sur les mêmes cartes.
- **Segment ramassage phase 2 (glissement)** : retire la carte de `cartesEnVol` + appelle le callback de fin de ramassage.

Le `callbacksFinJeuRef` est mis à jour à chaque changement de segment pour mapper l'ID de la carte au callback approprié pour le segment courant.

### `CoucheAnimation.tsx`

- Supprime le rendu `cartesPoseesAuPli.map(...)` (lignes 100-125).
- Supprime les props `cartesPoseesAuPli`.
- Ne rend plus que `DistributionCanvas` + `cartesEnVol.map(...)`.

### `PlateauJeu.tsx` / `useControleurJeu.ts`

- Supprime le passage de `cartesPoseesAuPli` en props.
- Supprime les appels à `remplacerCartesPoseesAuPliDepuisPli`.

### `useControleurJeu.ts` — resynchronisation du pli

La fonction `remplacerCartesPoseesAuPliDepuisPli` servait à resynchroniser les cartes visuelles du pli depuis l'état XState. Son équivalent dans le nouveau design : recréer des `CarteEnVol` "jeu-\*" gelées (segment courant, progression=1) pour les cartes du pli qui ne sont pas déjà en vol.

Les cartes créées par resynchronisation utilisent des **IDs déterministes** au format `pli-${joueur}-${couleur}-${rang}` (comme l'ancien `construireCartesPoseesAuPliDepuisPli`). La logique vérifie par identité de carte (couleur + rang) si une entrée existe déjà dans `cartesEnVol` avant d'en créer une nouvelle.

## Ce qui ne change pas

- `CarteFaceAtlas` / `CarteDos` : inchangés
- `ZonePli` : inchangé (ne rend que le cadre décoratif)
- Flux d'orchestration XState : inchangé
- Distribution (`DistributionCanvas`) : inchangée
- `planRamassagePli.ts` : les timings restent les mêmes
- `annulerAnimations` : inchangé — il vide déjà `cartesEnVol`, ce qui couvre le nettoyage des cartes gelées

## Types modifiés

```typescript
// CarteEnVol — ajout du champ segment
interface CarteEnVol {
  id: string;
  carte: Carte;
  depart: PositionCarte;
  arrivee: PositionCarte;
  faceVisible: boolean;
  duree: number;
  segment: number; // ← nouveau : s'incrémente à chaque nouvelle trajectoire
  flipDe?: number;
  flipVers?: number;
  easing?: "out-cubic" | "inout-cubic";
}

// CartePoseeAuPli — SUPPRIMÉ
// construireCartePoseeAuPli — SUPPRIMÉ
// construireCartesPoseesAuPliDepuisPli — SUPPRIMÉ
```

## Tests impactés

- `useAnimations.test.ts` : supprimer les tests liés à `cartesPoseesAuPli`, ajouter des tests pour le nouveau flux ramassage (mise à jour in-place des cartes)
- `CoucheAnimation.test.tsx` : supprimer les tests liés au rendu des `cartesPoseesAuPli`
- `useControleurJeuPli.test.ts` : supprimer/adapter les tests qui importent `construireCartesPoseesAuPliDepuisPli`, adapter le test de resynchronisation au nouveau mécanisme (cartes gelées dans `cartesEnVol`)
- `ZonePli.test.tsx` : inchangé
