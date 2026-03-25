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

  it.each(["nord", "ouest", "est"] as const)(
    "reduit les cartes de distribution pour %s afin de matcher la main adverse",
    (position) => {
      expect(obtenirCibleDistributionAtlas(position).echelleArrivee).toBeCloseTo(
        ADVERSAIRE.ratioLargeurCarte / RATIO_LARGEUR_CARTE,
        5,
      );
    },
  );

  it.each(["ouest", "est"] as const)(
    "tourne les cartes laterales a 90 degres pour %s",
    (position) => {
      expect(obtenirCibleDistributionAtlas(position).rotationArrivee).toBe(90);
    },
  );

  it.each([
    [0, "est"],
    [1, "sud"],
    [2, "ouest"],
    [3, "nord"],
  ])("calcule le premier joueur servi pour le donneur %i", (indexDonneur, attendu) => {
    expect(obtenirPremierServi(indexDonneur)).toBe(attendu);
  });

  it.each([
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

  it("retourne le point fixe central quel que soit l'index donneur", () => {
    for (let i = 0; i < 4; i++) {
      const origine = obtenirOrigineDistribution(i);
      expect(origine).toEqual({ x: 0.5, y: 0.45 });
    }
  });
});
