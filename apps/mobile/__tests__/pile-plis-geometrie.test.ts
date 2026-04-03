import { calculerCibleAnimationPilePlis } from "../components/game/pile-plis-geometrie";

describe("pile-plis-geometrie", () => {
  it("vise la position du prochain pli visible pour la pile adverse tournee", () => {
    const cible = calculerCibleAnimationPilePlis({
      equipe: "equipe2",
      nbPlisAvantRamassage: 1,
      largeurEcran: 1200,
      hauteurEcran: 800,
    });

    expect(cible.x).toBeCloseTo(0.08, 5);
    expect(cible.y).toBeCloseTo(0.19776, 5);
  });
});
