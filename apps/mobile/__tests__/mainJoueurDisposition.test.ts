import {
  calculerDispositionMainJoueur,
  calculerPointAncrageCarteMainJoueurNormalisee,
  calculerPositionCarteMainJoueurNormalisee,
} from "../components/game/mainJoueurDisposition";

describe("calculerDispositionMainJoueur", () => {
  it("garde un eventail pendant la reception des cartes", () => {
    const disposition = calculerDispositionMainJoueur({
      mode: "reception",
      nbCartes: 5,
      largeurEcran: 1400,
      hauteurEcran: 1000,
      largeurCarte: 126,
      hauteurCarte: 183,
    });

    expect(disposition.cartes).toHaveLength(5);
    expect(disposition.cartes[0].angle).toBeLessThan(0);
    expect(disposition.cartes[2].angle).toBe(0);
    expect(disposition.cartes[4].angle).toBeGreaterThan(0);
    expect(disposition.cartes[2].decalageY).toBeGreaterThan(
      disposition.cartes[0].decalageY,
    );
    expect(disposition.cartes[2].decalageY).toBeGreaterThan(
      disposition.cartes[4].decalageY,
    );

    for (let index = 1; index < disposition.cartes.length; index += 1) {
      expect(disposition.cartes[index].x).toBeGreaterThan(
        disposition.cartes[index - 1].x,
      );
    }
  });

  it("calcule un point d ancrage plus bas que le centre pour aligner l eventail Atlas", () => {
    const centre = calculerPositionCarteMainJoueurNormalisee({
      x: 500,
      decalageY: 32,
      largeurEcran: 1400,
      hauteurEcran: 1000,
      largeurCarte: 126,
      hauteurCarte: 183,
    });

    const ancrage = calculerPointAncrageCarteMainJoueurNormalisee({
      x: 500,
      decalageY: 32,
      largeurEcran: 1400,
      hauteurEcran: 1000,
      largeurCarte: 126,
      hauteurCarte: 183,
    });

    expect(ancrage.x).toBeCloseTo(centre.x);
    expect(ancrage.y).toBeGreaterThan(centre.y);
  });
});
