# Design — Animation distribution en éventail groupé

**Date** : 2026-03-18
**Statut** : Approuvé

## Contexte

L'animation de distribution actuelle envoie les cartes une par une avec un stagger de 40ms entre chaque carte d'un même paquet. Le résultat est peu lisible et pas fluide. L'objectif est d'avoir des paquets de cartes (3 puis 2) qui volent groupés en éventail du centre vers la main de chaque joueur.

## Décisions de design

- **Distribution séquentielle** : joueur par joueur (sud → ouest → nord → est), comme une vraie distribution
- **Paquets groupés** : les 3 (ou 2) cartes d'un même paquet partent exactement au même instant, pas de stagger
- **Éventail perpendiculaire** : les cartes se déploient latéralement par rapport à la trajectoire de vol
- **Éventail constant** : même écartement du départ à l'arrivée, pas d'ouverture progressive
- **Convergence à l'arrivée** : les cartes convergent vers le point central de la main du joueur (l'éventail disparaît à destination)

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

L'éventail spatial reste identique (offset perpendiculaire centré autour de 0 basé sur `ecartX` et `ecartRotation`), mais au départ les cartes ont leur spread complet (facteur 1.0 au lieu de 0.4 actuellement) pour un éventail constant.

Les positions d'arrivée convergent toutes vers `posMain.x, posMain.y` (inchangé).

Le calcul du callback `onPaquetArrive` est simplifié : il se déclenche après `delaiPaquet + dureeCarte` (plus de stagger à additionner).

Le calcul de `onTerminee` est aussi simplifié puisqu'il n'y a plus de stagger dans le dernier paquet.

### Fichiers impactés

| Fichier                              | Nature du changement          |
| ------------------------------------ | ----------------------------- |
| `apps/mobile/constants/layout.ts`    | Constantes timing et éventail |
| `apps/mobile/hooks/useAnimations.ts` | Logique `lancerDistribution`  |

### Fichiers NON impactés

- `CarteAnimee.tsx` — l'interpolation linéaire position→position reste identique
- `CoucheAnimation.tsx` — aucun changement de structure
- `useControleurJeu.ts` — l'interface `lancerDistribution` ne change pas
