# Design — Animation distribution en éventail groupé

**Date** : 2026-03-18
**Statut** : Approuvé

## Contexte

L'animation de distribution actuelle envoie les cartes une par une avec un stagger de 40ms entre chaque carte d'un même paquet. Le résultat est peu lisible et pas fluide. L'objectif est d'avoir des paquets de cartes (3 puis 2) qui volent groupés en éventail du centre vers la main de chaque joueur.

## Décisions de design

- **Distribution séquentielle** : joueur par joueur (sud → ouest → nord → est), comme une vraie distribution
- **Paquets groupés** : les 3 (ou 2) cartes d'un même paquet partent exactement au même instant, pas de stagger
- **Éventail perpendiculaire** : les cartes se déploient latéralement par rapport à la trajectoire de vol
- **Éventail à pleine taille dès le départ** : les cartes partent déjà déployées en éventail (facteur 1.0), pas empilées puis s'ouvrant progressivement (l'ancien facteur 0.4 créait un éventail timide au départ). Chaque `CarteAnimee` interpole linéairement de sa position de départ (avec spread) vers l'arrivée (sans spread) — l'éventail se referme naturellement en approchant la main
- **Convergence à l'arrivée** : les cartes convergent vers le point central de la main du joueur. C'est le comportement actuel (arrivée = posMain), inchangé
- **S'applique aux deux distributions** : la distribution initiale (3+2) et la distribution restante (après enchères) utilisent la même fonction `lancerDistribution`, donc les changements s'appliquent aux deux

## Changements techniques

### 1. `apps/mobile/constants/layout.ts`

Ajuster les constantes d'animation de distribution :

```typescript
distribution: {
  dureeCarte: 350,           // 300 → 350ms (groupe plus visible)
  delaiEntreJoueurs: 250,    // 200 → 250ms (plus d'espace entre joueurs)
  pauseEntreRounds: 400,     // 350 → 400ms (pause marquée entre round 3 et 2)
  staggerIntraPaquet: 0,     // 40 → 0ms (SUPPRIMÉ : toutes les cartes partent en même temps)
  eventailVol: {
    ecartX: 0.03,            // 0.025 → 0.03 (éventail un peu plus large)
    ecartRotation: 10,       // 8 → 10° (rotation plus prononcée)
  },
  // reste inchangé
}
```

### 2. `apps/mobile/hooks/useAnimations.ts` — `lancerDistribution`

Modifier la boucle interne pour que toutes les cartes d'un paquet partagent le même délai (pas de `+ idx * staggerIntraPaquet`).

L'éventail spatial reste identique (offset perpendiculaire centré autour de 0 basé sur `ecartX` et `ecartRotation`), mais les facteurs de réduction au départ passent de 0.4 (position) et 0.3 (rotation) à **1.0** pour les deux. Les cartes partent donc à leur pleine taille d'éventail.

Les positions d'arrivée convergent toutes vers `posMain.x, posMain.y` (inchangé).

Le calcul du callback `onPaquetArrive` est simplifié : il se déclenche après `delaiPaquet + dureeCarte` (plus de stagger à additionner).

Le calcul de `onTerminee` est aussi simplifié puisqu'il n'y a plus de stagger dans le dernier paquet.

Note : le champ `staggerIntraPaquet` est mis à 0 dans les constantes. Le code de multiplication existant (`idx * staggerIntraPaquet`) produit 0 automatiquement, mais on peut aussi nettoyer le code pour supprimer ces multiplications devenues inutiles.

### Fichiers impactés

| Fichier                              | Nature du changement          |
| ------------------------------------ | ----------------------------- |
| `apps/mobile/constants/layout.ts`    | Constantes timing et éventail |
| `apps/mobile/hooks/useAnimations.ts` | Logique `lancerDistribution`  |

### Fichiers NON impactés

- `CarteAnimee.tsx` — l'interpolation linéaire position→position reste identique
- `CoucheAnimation.tsx` — aucun changement de structure
- `useControleurJeu.ts` — l'interface `lancerDistribution` ne change pas
