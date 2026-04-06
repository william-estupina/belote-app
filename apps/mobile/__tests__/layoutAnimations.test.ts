import { ANIMATIONS } from "../constants/layout";

describe("ANIMATIONS.distribution", () => {
  it("ralentit la redistribution speciale et accelere temporairement les bots pour le test", () => {
    expect(ANIMATIONS.distribution.dureeCarte).toBe(720);
    expect(ANIMATIONS.distribution.dureeCarteSecondTour).toBe(1080);
    expect(ANIMATIONS.distribution.delaiEntreJoueurs).toBe(300);
    expect(ANIMATIONS.distribution.dureeReorganisationMain).toBe(210);
    expect(ANIMATIONS.distribution.dureeSlideRetournee).toBe(360);
    expect(ANIMATIONS.distribution.dureeRetourPaquet).toBe(1200);
    expect(ANIMATIONS.distribution.delaiEntreVaguesRetourPaquet).toBe(360);
    expect(ANIMATIONS.distribution.pauseApresRetourPaquet).toBe(300);
    expect(ANIMATIONS.jeuCarte.duree).toBe(630);
    expect(ANIMATIONS.ramassagePli.duree).toBe(360);
    expect(ANIMATIONS.ramassagePli.delaiAvant).toBe(400);
    expect(ANIMATIONS.pauseAvantEncheres).toBe(900);
    expect(ANIMATIONS.delaiBot.min).toBe(250);
    expect(ANIMATIONS.delaiBot.max).toBe(500);
    expect(ANIMATIONS.delaiEncheres.min).toBe(1000);
    expect(ANIMATIONS.delaiEncheres.max).toBe(1500);
  });
});
