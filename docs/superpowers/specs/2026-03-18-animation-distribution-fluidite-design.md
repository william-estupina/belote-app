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
- `pauseAvantEncheres` : 3000 → **1500ms** (compenser la durée totale plus longue)
- Nouvelle constante `easingDistribution: "inout-cubic"` dans `ANIMATIONS.distribution` de `layout.ts`
- Easing de la distribution : `out-cubic` → **`inout-cubic`** (démarrage et arrivée doux)
- L'éventail en vol (ecartX=0.03, ecartRotation=10) reste inchangé

**Impact sur la durée totale** : la distribution passe de ~3.1s à ~4.3s (+39%), mais la réduction de `pauseAvantEncheres` (3000→1500) compense — le joueur ne verra les enchères que ~1.5s plus tard qu'avant au total.

Dans `useAnimations.ts` / `lancerDistribution`, ajouter `easing: distribution.easingDistribution` à chaque objet `CarteEnVol` construit dans la boucle (au même niveau que `duree`).

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
- Props : `cartesRestantes: number`, `largeurEcran: number`, `hauteurEcran: number`
- Visible uniquement pendant `phaseUI === "distribution"`
- Utilise les mêmes dimensions que les cartes en vol (`RATIO_LARGEUR_CARTE`, `RATIO_ASPECT_CARTE`)
- **z-index : 30** — au-dessus du fond et de `ZonePli` mais en dessous de `CoucheAnimation` (z-index 50), pour que les cartes en vol passent par-dessus le paquet
- Dans `PlateauJeu.tsx`, placé juste avant `CoucheAnimation` dans le JSX

#### Compteur de cartes restantes (`cartesRestantesPaquet: number`)

- Nouveau champ `cartesRestantesPaquet: number` dans l'interface `EtatJeu` (type `number`, valeur initiale 0)
- **Distribution initiale** : initialisé à `20` (5 cartes × 4 joueurs) au début de `lancerDistributionAnimee`
- **Distribution restante** : initialisé à la somme des cartes dans `mainsRecord` (+ 1 pour la carte retournée si applicable) au début de `lancerDistributionRestanteAnimee`
- Décrémenté dans le callback `onPaquetArrive` : `prev.cartesRestantesPaquet - cartes.length` (appelé 4 fois par round, une fois par joueur — ex: round 1 = 4×3 = 12 cartes retirées)
- Remis à 0 dans `lancerPhase3` / `lancerPhase3Restante`

### 3. Cartes non triées puis tri groupé

**Constat après analyse** : le comportement désiré est **déjà en place**. Les cartes dans `contexte.mains[0]` (XState) sont dans l'ordre de distribution (confirmé : `distribuerInitial` dans `paquet.ts` splice depuis un paquet mélangé sans trier). `onPaquetArrive` les ajoute à `mainJoueur` sans tri. Le tri n'intervient que dans `lancerPhase3` via `trierMainJoueur`.

`CarteEventailAnimee` anime déjà les réarrangements avec `withTiming` — quand le tri modifie l'ordre, chaque carte glisse vers sa nouvelle position.

**Aucun changement de code nécessaire** pour cette partie. Le ralentissement du vol (section 1) rendra cet effet plus visible car les cartes resteront non triées plus longtemps avant le tri.

## Changements techniques

### Fichiers modifiés

| Fichier                                      | Nature du changement                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `apps/mobile/constants/layout.ts`            | Constantes timing + `easingDistribution` + `pauseAvantEncheres`                         |
| `apps/mobile/hooks/useAnimations.ts`         | Ajouter `easing: distribution.easingDistribution` à chaque `CarteEnVol` de distribution |
| `apps/mobile/hooks/useControleurJeu.ts`      | Ajouter `cartesRestantesPaquet` à `EtatJeu`, init + décrement dans callbacks            |
| `apps/mobile/components/game/PlateauJeu.tsx` | Intégrer `PaquetCentral` pendant la distribution                                        |

### Fichiers créés

| Fichier                                         | Rôle                                        |
| ----------------------------------------------- | ------------------------------------------- |
| `apps/mobile/components/game/PaquetCentral.tsx` | Composant pile de cartes empilées au centre |

### Fichiers NON impactés

- `CarteAnimee.tsx` — l'interpolation reste identique, le champ `easing` est déjà supporté
- `CoucheAnimation.tsx` — aucun changement
- `MainJoueur.tsx` / `CarteEventailAnimee` — déjà gère les réarrangements animés (section 3 = no-op)
- `ZoneCarteRetournee.tsx` — inchangé, visible pendant `phaseUI === "encheres"` uniquement (pas de conflit avec `PaquetCentral` qui est visible pendant `phaseUI === "distribution"`)
