import type { PositionJoueur } from "@belote/shared-types";

import { ADVERSAIRE, POSITIONS_MAINS, RATIO_LARGEUR_CARTE } from "../constants/layout";
import { obtenirCibleDistributionAtlas } from "../hooks/distributionLayoutAtlas";

describe("distributionLayoutAtlas", () => {
  it("garde la cible sud a taille normale et sans rotation", () => {
    expect(obtenirCibleDistributionAtlas("sud")).toEqual({
      arrivee: POSITIONS_MAINS.sud,
      rotationArrivee: 0,
      echelleArrivee: 1,
    });
  });

  it.each<PositionJoueur>(["nord", "ouest", "est"])(
    "reduit les cartes de distribution pour %s afin de matcher la main adverse",
    (position) => {
      expect(obtenirCibleDistributionAtlas(position).echelleArrivee).toBeCloseTo(
        ADVERSAIRE.ratioLargeurCarte / RATIO_LARGEUR_CARTE,
        5,
      );
    },
  );

  it.each<PositionJoueur>(["ouest", "est"])(
    "tourne les cartes laterales a 90 degres pour %s",
    (position) => {
      expect(obtenirCibleDistributionAtlas(position).rotationArrivee).toBe(90);
    },
  );
});
