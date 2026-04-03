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
- La reception visuelle des cartes sud reste toujours dans l ordre de donne.
- Le tri partage ne s applique qu au moment de l animation de tri, jamais pendant l arrivee des cartes.

## Decision d architecture

- `apps/mobile/hooks/triMainJoueur.ts` reste la source de verite du classement.
- La distribution atlas conserve l ordre de donne pendant la reception sud.
- Le tri final atlas reste l unique moment ou l ordre partage est applique visuellement.

## Verification visee

- Tests unitaires sur l ordre des couleurs et la force intra-couleur.
- Test d integration sur la distribution initiale pour verifier que l ordre sud transmis a l atlas correspond au meme tri que l UI React.
