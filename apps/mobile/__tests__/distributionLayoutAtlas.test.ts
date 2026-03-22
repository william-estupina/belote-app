import type { PositionJoueur } from "@belote/shared-types";

import { ADVERSAIRE, POSITIONS_MAINS, RATIO_LARGEUR_CARTE } from "../constants/layout";
import {
  obtenirCibleDistributionAtlas,
  obtenirOrdreDistribution,
  obtenirOrigineDistribution,
  obtenirPremierServi,
} from "../hooks/distributionLayoutAtlas";

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

  it.each<[number, PositionJoueur]>([
    [0, "est"],
    [1, "sud"],
    [2, "ouest"],
    [3, "nord"],
  ])("calcule le premier joueur servi pour le donneur %i", (indexDonneur, attendu) => {
    expect(obtenirPremierServi(indexDonneur)).toBe(attendu);
  });

  it.each<[number, PositionJoueur[]]>([
    [0, ["est", "nord", "ouest", "sud"]],
    [1, ["sud", "est", "nord", "ouest"]],
    [2, ["ouest", "sud", "est", "nord"]],
    [3, ["nord", "ouest", "sud", "est"]],
  ])(
    "fait tourner l'ordre de distribution pour le donneur %i",
    (indexDonneur, attendu) => {
      expect(obtenirOrdreDistribution(indexDonneur)).toEqual(attendu);
    },
  );

  it("place l'origine de distribution plus bas quand le donneur est sud", () => {
    const origine = obtenirOrigineDistribution(0);

    expect(origine.x).toBeCloseTo(0.5, 5);
    expect(origine.y).toBeGreaterThan(0.45);
    expect(Math.abs(origine.y - POSITIONS_MAINS.sud.y)).toBeLessThan(
      Math.abs(0.45 - POSITIONS_MAINS.sud.y),
    );
  });

  it("place l'origine de distribution pres du cote ouest quand le donneur est ouest", () => {
    const origine = obtenirOrigineDistribution(1);

    expect(origine.x).toBeLessThan(0.5);
    expect(Math.abs(origine.x - POSITIONS_MAINS.ouest.x)).toBeLessThan(
      Math.abs(0.5 - POSITIONS_MAINS.ouest.x),
    );
  });

  it("place l'origine de distribution pres du cote nord quand le donneur est nord", () => {
    const origine = obtenirOrigineDistribution(2);

    expect(origine.x).toBeCloseTo(0.5, 5);
    expect(origine.y).toBeLessThan(0.45);
    expect(Math.abs(origine.y - POSITIONS_MAINS.nord.y)).toBeLessThan(
      Math.abs(0.45 - POSITIONS_MAINS.nord.y),
    );
  });

  it("place l'origine de distribution pres du cote est quand le donneur est est", () => {
    const origine = obtenirOrigineDistribution(3);

    expect(origine.x).toBeGreaterThan(0.5);
    expect(Math.abs(origine.x - POSITIONS_MAINS.est.x)).toBeLessThan(
      Math.abs(0.5 - POSITIONS_MAINS.est.x),
    );
  });
});
