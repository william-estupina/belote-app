# Tri main sud unifie design

## Objectif

Remplacer les deux comportements actuels de tri/ordonnancement de la main sud par une seule strategie partagee entre la main visible React et la distribution atlas.

## Regles retenues

- Les cartes sont groupees par couleur.
- Dans chaque couleur, les cartes sont triees par force.
- Si la couleur est l atout, l ordre de force est celui de l atout.
- La premiere couleur est toujours l atout si connu, sinon la couleur de la carte retournee si elle existe.
- Pour les couleurs restantes, on alterne noir et rouge quand c est possible.
- Quand plusieurs choix donnent une alternance valide, on garde un ordre canonique stable : `pique`, `coeur`, `carreau`, `trefle`.

## Decision d architecture

- `apps/mobile/hooks/triMainJoueur.ts` reste la source de verite du classement.
- La distribution atlas recoit explicitement l ordre final voulu pour la main sud.
- Les cartes sud deja visibles et les nouvelles cartes sud sont placees directement vers leur indice final dans cet ordre partage.
- Le tri final atlas reste appele, mais devient un filet de securite idempotent plutot qu une seconde logique concurrente.

## Verification visee

- Tests unitaires sur l ordre des couleurs et la force intra-couleur.
- Test d integration sur la distribution initiale pour verifier que l ordre sud transmis a l atlas correspond au meme tri que l UI React.
