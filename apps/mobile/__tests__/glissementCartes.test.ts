import { construireGlissementCarteDepuisEtatCourant } from "../hooks/glissementCartes";

describe("glissementCartes", () => {
  it("construit un glissement depuis l etat courant vers la cible en preservant rotation et echelle", () => {
    const glissement = construireGlissementCarteDepuisEtatCourant({
      depart: {
        x: 0.42,
        y: 0.78,
        rotation: -18,
        echelle: 0.85,
      },
      arrivee: {
        x: 0.57,
        y: 0.74,
        rotation: 12,
        echelle: 1,
      },
    });

    expect(glissement.depart).toEqual({
      x: 0.42,
      y: 0.78,
      rotation: -18,
      echelle: 0.85,
    });
    expect(glissement.arrivee).toEqual({
      x: 0.57,
      y: 0.74,
      rotation: 12,
      echelle: 1,
    });
    expect(glissement.controle).toEqual({
      x: 0.495,
      y: 0.76,
    });
  });
});
