# Fix rendu main sud : suppression du clignotement et alignement visuel Atlas/MainJoueur

## Probleme

La main du joueur sud a deux systemes de rendu qui se succedent :

1. **`DistributionCanvasSud`** — Canvas Skia Atlas ephemere pour les cartes en vol pendant la distribution
2. **`MainJoueur`** — composants React individuels (`CarteEventailAnimee` -> `CarteFaceAtlas`) pour l'eventail interactif

Le commit `04f145a` a modifie le timing de masquage des cartes sud dans l'Atlas : le masquage se fait desormais **a l'arrivee** du paquet (meme tick que `onPaquetArrive`), ce qui provoque un **clignotement** car le masquage Atlas et l'apparition de MainJoueur ne tombent pas dans le meme frame de rendu.

Avant ce commit, il n'y avait pas de clignotement mais un **leger decalage de couleur** entre les deux rendus : `CarteFaceAtlas` enveloppe chaque sprite dans une `View` avec des ombres (`shadowColor`, `shadowOpacity: 0.35`, `shadowRadius: 4`), ce que l'Atlas brut ne fait pas.

## Solution

Deux modifications ciblees, 2 fichiers impactes.

### 1. Revert du timing de masquage — `useAnimationsDistribution.ts`

**Etats de progression des cartes sud :**

- `-1` = en attente (pas encore en vol)
- `[0..1]` = en vol (interpolation Bezier)
- `1` = arrivee (carte visible, position finale)
- `2` = masquee (cachee de l'Atlas)

Revenir a la logique d'avant `04f145a` :

- Les cartes sud restent visibles dans l'Atlas (`progression = 1`) apres leur arrivee
- Le masquage (`progression = 2`) se fait au **depart du paquet suivant**, pas a l'arrivee
- Cela laisse un court chevauchement pendant lequel les deux rendus coexistent — invisible grace au point 2
- Le `onPaquetArrive` continue d'etre appele a l'arrivee pour alimenter `MainJoueur`

Concretement, restaurer le pattern :

- Accumuler les `indicesSudArrivees` au fur et a mesure
- Au `onPaquetDepart` du paquet sud suivant, masquer les indices accumules (`progression = 2`)
- Separer a nouveau le masquage Atlas du callback `onPaquetArrive`

**Cas du dernier paquet sud :** le dernier paquet n'a pas de paquet suivant pour declencher son masquage. Ces cartes restent a `progression = 1` dans l'Atlas jusqu'au demontage du canvas. C'est acceptable car le chevauchement avec `MainJoueur` est visuellement identique grace au DropShadow (point 2). Par securite, masquer les indices restants dans le callback `onTerminee`.

### 2. Ajouter Shadow Skia — `DistributionCanvasSud.tsx`

Dans `@shopify/react-native-skia` v2.2.12, le composant est `Shadow` (pas `DropShadow`), importe depuis le package principal. C'est un image filter enfant d'un `Group`.

Envelopper l'`Atlas` dans un `Group` avec un `Shadow` Skia qui reproduit les parametres de `faceAtlasStyles.conteneur` :

```tsx
import { Atlas, Canvas, Group, Shadow, rect, useRSXformBuffer } from "@shopify/react-native-skia";

// Dans le JSX :
<Canvas ...>
  <Group>
    <Shadow dx={1} dy={2} blur={4} color="rgba(0, 0, 0, 0.35)" />
    <Atlas image={atlas.image} sprites={sprites} transforms={transforms} />
  </Group>
</Canvas>
```

Parametres alignes sur `faceAtlasStyles.conteneur` :
| React Native shadow | Skia Shadow |
|---------------------|-------------|
| `shadowOffset: { width: 1, height: 2 }` | `dx={1} dy={2}` |
| `shadowOpacity: 0.35` | `color="rgba(0, 0, 0, 0.35)"` |
| `shadowRadius: 4` | `blur={4}` |

**Note :** le mapping `shadowRadius` -> `blur` peut ne pas etre exactement 1:1 entre React Native (iOS) et Skia. Commencer avec `blur={4}` et ajuster visuellement sur device si necessaire.

**Note Android :** `faceAtlasStyles.conteneur` inclut `elevation: 5` qui n'a pas d'equivalent Skia. La difference est negligeable car l'elevation Android produit un effet subtil deja approxime par le Shadow Skia.

### Fichiers modifies

| Fichier                                                 | Modification                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/mobile/hooks/useAnimationsDistribution.ts`        | Revert timing masquage : masquer au depart du paquet suivant |
| `apps/mobile/components/game/DistributionCanvasSud.tsx` | Ajouter Shadow Skia sur l'Atlas                              |

### Resultat attendu

- **Pas de clignotement** : le masquage Atlas est differe, il y a chevauchement doux
- **Pas de decalage de couleur** : les ombres Skia matchent les ombres React Native
- **Performance preservee** : le DropShadow est ephemere (seulement pendant la distribution)
