import { ANIMATIONS } from "../constants/layout";

describe("ANIMATIONS.distribution", () => {
  it("accelere de 50 % les timings visuels centralises sans toucher aux bots", () => {
    expect(ANIMATIONS.distribution.dureeCarte).toBe(400);
    expect(ANIMATIONS.distribution.delaiEntreJoueurs).toBe(250);
    expect(ANIMATIONS.distribution.dureeReorganisationMain).toBe(175);
    expect(ANIMATIONS.distribution.pauseAvantTri).toBe(125);
    expect(ANIMATIONS.distribution.dureeSlideRetournee).toBe(300);
    expect(ANIMATIONS.jeuCarte.duree).toBe(150);
    expect(ANIMATIONS.ramassagePli.duree).toBe(200);
    expect(ANIMATIONS.ramassagePli.delaiAvant).toBe(400);
    expect(ANIMATIONS.pauseAvantEncheres).toBe(750);
    expect(ANIMATIONS.delaiBot.min).toBe(500);
    expect(ANIMATIONS.delaiBot.max).toBe(1000);
    expect(ANIMATIONS.delaiEncheres.min).toBe(2000);
    expect(ANIMATIONS.delaiEncheres.max).toBe(3000);
  });
});
