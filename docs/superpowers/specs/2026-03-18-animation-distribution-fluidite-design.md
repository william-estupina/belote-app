# Design — Fluidité animation distribution (paquet central, vol lent, tri groupé)

**Date** : 2026-03-18
**Statut** : Approuvé

## Contexte

Suite à la première itération de l'animation distribution en éventail groupé, trois problèmes ont été identifiés :

1. Le vol des cartes centre → main est trop rapide, pas fluide
2. Les cartes apparaissent de nulle part — il n'y a pas de paquet visible au centre
3. L'arrivée dans la main saccade — les cartes devraient arriver en vrac puis être triées d'un coup

## Décisions de design

### 1. Vol plus lent et fluide

- `dureeCarte` : 350 → **500ms**
- `delaiEntreJoueurs` : 250 → **350ms**
- `pauseEntreRounds` : 400 → **500ms**
- Easing de la distribution : `out-cubic` → **`inout-cubic`** (démarrage et arrivée doux)
- L'éventail en vol (ecartX=0.03, ecartRotation=10) reste inchangé

### 2. Paquet central empilé (diminue visuellement)

Nouveau composant `PaquetCentral` :

- Affiche un tas de dos de cartes empilées au centre du tapis (`originX=0.5`, `originY=0.45`)
- Chaque couche a un micro-décalage (0.5px horizontal, 1px vertical) pour simuler l'épaisseur
- Nombre de couches = `min(5, ceil(cartesRestantes / 6))` :
  - 32 cartes → 5 couches
  - 20 cartes → 4 couches
  - 12 cartes → 2 couches
  - 1 carte → 1 couche (la retournée, gérée par `ZoneCarteRetournee`)
  - 0 → composant masqué
- Props : `cartesRestantes: number`, `largeurEcran`, `hauteurEcran`
- Mis à jour à chaque callback `onPaquetArrive` dans `useControleurJeu`
- Visible uniquement pendant `phaseUI === "distribution"`
- Utilise les mêmes dimensions que les cartes en vol (`RATIO_LARGEUR_CARTE`, `RATIO_ASPECT_CARTE`)

#### Compteur de cartes restantes

- Nouvel état `cartesRestantesPaquet` dans `EtatJeu` (initialisé à 32 au début de la distribution, ou au nombre de cartes restantes pour la distribution restante)
- Décrémenté dans le callback `onPaquetArrive` (soustrait `cartes.length` à chaque paquet)
- Remis à 0 quand la distribution est terminée

### 3. Cartes non triées puis tri groupé

Actuellement, `lancerDistributionAnimee` appelle `onPaquetArrive` qui ajoute les cartes à `mainJoueur`. Le tri est appliqué dans `lancerPhase3` via `trierMainJoueur`.

**Problème** : les cartes sont ajoutées dans l'ordre de la main XState (déjà distribuées), mais `MainJoueur` utilise une `key` basée sur `couleur-rang` et `CarteEventailAnimee` anime l'entrée depuis le centre. Le rendu est correct mais les cartes n'ont pas d'ordre "en vrac" visible.

**Solution** : l'ordre des cartes dans `mains[0]` (XState) est déjà l'ordre de distribution (non trié). Il suffit de :

1. Dans `lancerDistributionAnimee` et `lancerDistributionRestanteAnimee`, ajouter les cartes à `mainJoueur` telles quelles (pas de tri)
2. Le tri est déjà déclenché dans `lancerPhase3` / `lancerPhase3Restante` via `trierMainJoueur` — ce comportement est inchangé
3. `CarteEventailAnimee` anime déjà les réarrangements avec `withTiming` (position + angle) — quand le tri modifie l'ordre, chaque carte glisse vers sa nouvelle position automatiquement

**Vérification** : confirmer que `contexte.mains[0]` de XState est bien dans l'ordre de distribution (non trié par couleur). Si ce n'est pas le cas, il faudra stocker l'ordre brut séparément.

## Changements techniques

### Fichiers modifiés

| Fichier                                      | Nature du changement                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `apps/mobile/constants/layout.ts`            | Constantes timing (dureeCarte, delaiEntreJoueurs, pauseEntreRounds)            |
| `apps/mobile/hooks/useAnimations.ts`         | Passer `easing: "inout-cubic"` aux `CarteEnVol` de la distribution             |
| `apps/mobile/hooks/useControleurJeu.ts`      | Ajouter `cartesRestantesPaquet` à `EtatJeu`, décrémenter dans `onPaquetArrive` |
| `apps/mobile/components/game/PlateauJeu.tsx` | Intégrer `PaquetCentral` pendant la distribution                               |

### Fichiers créés

| Fichier                                         | Rôle                                        |
| ----------------------------------------------- | ------------------------------------------- |
| `apps/mobile/components/game/PaquetCentral.tsx` | Composant pile de cartes empilées au centre |

### Fichiers NON impactés

- `CarteAnimee.tsx` — l'interpolation reste identique, le champ `easing` est déjà supporté
- `CoucheAnimation.tsx` — aucun changement
- `MainJoueur.tsx` / `CarteEventailAnimee` — déjà gère les réarrangements animés
- `ZoneCarteRetournee.tsx` — inchangé, continue à afficher la carte retournée pendant les enchères
