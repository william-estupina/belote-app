import { ANIMATIONS } from "../constants/layout";

describe("ANIMATIONS.distribution", () => {
  it("ralentit d environ 20 % les animations visibles principales sans toucher aux bots", () => {
    expect(ANIMATIONS.distribution.dureeCarte).toBe(480);
    expect(ANIMATIONS.distribution.delaiEntreJoueurs).toBe(300);
    expect(ANIMATIONS.distribution.dureeReorganisationMain).toBe(210);
    expect(ANIMATIONS.distribution.pauseAvantTri).toBe(150);
    expect(ANIMATIONS.distribution.dureeSlideRetournee).toBe(360);
    expect(ANIMATIONS.distribution.dureeRetourPaquet).toBe(540);
    expect(ANIMATIONS.distribution.delaiEntreVaguesRetourPaquet).toBe(120);
    expect(ANIMATIONS.distribution.pauseApresRetourPaquet).toBe(110);
    expect(ANIMATIONS.jeuCarte.duree).toBe(240);
    expect(ANIMATIONS.ramassagePli.duree).toBe(360);
    expect(ANIMATIONS.ramassagePli.delaiAvant).toBe(400);
    expect(ANIMATIONS.pauseAvantEncheres).toBe(900);
    expect(ANIMATIONS.delaiBot.min).toBe(500);
    expect(ANIMATIONS.delaiBot.max).toBe(1000);
    expect(ANIMATIONS.delaiEncheres.min).toBe(2000);
    expect(ANIMATIONS.delaiEncheres.max).toBe(3000);
  });
});
