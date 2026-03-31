# Recalibrage visuel du paquet central

**Date :** 2026-03-31

## Contexte

Le paquet central visible pendant la distribution, la revelation de la carte retournee et les encheres donne actuellement une impression trop plate. Le nombre maximal de couches est limite a `5` et le decalage entre couches est faible, ce qui reduit a la fois la sensation de paquet plein au depart et la perception de vidage au fil de la donne.

## Objectif

Renforcer localement le rendu du paquet dans la reserve centrale pour obtenir :

1. un paquet visuellement plus epais au depart de la distribution ;
2. une diminution plus lisible de son volume quand le nombre de cartes baisse ;
3. aucun changement d'ancrage ni de comportement de la carte retournee.

## Decision

Approche retenue : recalibrer ensemble le nombre de couches visibles et leur dispersion.

- Le nombre de couches visibles suivra une progression plus sensible sur les `32` cartes du paquet.
- Le decalage horizontal et vertical entre couches augmentera quand le paquet est plein.
- Ce decalage diminuera avec les cartes restantes pour rendre l'amincissement plus perceptible.

## Portee

Fichier principal :

- `apps/mobile/components/game/ReserveCentrale.tsx`
- `apps/mobile/hooks/useControleurJeu.ts`

Fichier de test :

- `apps/mobile/__tests__/reserve-centrale.test.tsx`
- `apps/mobile/__tests__/useControleurJeuDistribution.test.ts`

## Note de continuite visuelle

La donne initiale doit faire descendre le paquet de `32` cartes vers `12`, pas de `20` vers `0`. Le volume du paquet reste ainsi stable au moment de `revelationCarte` et n'a plus besoin de regrossir juste avant l'animation de la carte retournee.

Le vidage visuel du paquet doit etre pilote par le depart des cartes depuis la reserve centrale, pas par leur arrivee en main. Ainsi, la reserve diminue pendant que les cartes sont en vol et disparait exactement quand les derniers paquets quittent le paquet.

## Hors scope

- refonte des animations de distribution ;
- ajout d'ombres, de rotations ou d'effets 3D supplementaires ;
- modification de la geometrie de la reserve centrale ou du positionnement de la carte retournee.
