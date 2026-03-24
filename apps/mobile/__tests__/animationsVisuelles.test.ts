import {
  accelererDureeAnimation,
  accelererTensionAnimation,
  ANIMATIONS_CARTE_RETOURNEE,
  ANIMATIONS_DIALOGUE_FIN_MANCHE,
  DUREE_FONDU_ENTREE_MAIN,
  DUREE_PULSE_JOUEUR_ACTIF,
  FACTEUR_ACCELERATION_ANIMATIONS_VISUELLES,
} from "../constants/animations-visuelles";

describe("animations visuelles", () => {
  it("applique un coefficient global de 0,5 sur les durees", () => {
    expect(FACTEUR_ACCELERATION_ANIMATIONS_VISUELLES).toBe(0.5);
    expect(accelererDureeAnimation(700)).toBe(350);
    expect(accelererDureeAnimation(400)).toBe(200);
    expect(accelererDureeAnimation(100)).toBe(50);
  });

  it("accelere aussi le ressort du dialogue de fin de manche", () => {
    expect(accelererTensionAnimation(60)).toBe(120);
  });

  it("centralise les timings locaux reduits de moitie", () => {
    expect(DUREE_PULSE_JOUEUR_ACTIF).toBe(350);
    expect(DUREE_FONDU_ENTREE_MAIN).toBe(50);
    expect(ANIMATIONS_CARTE_RETOURNEE).toEqual({
      delaiFlip: 100,
      dureeFlip: 200,
    });
    expect(ANIMATIONS_DIALOGUE_FIN_MANCHE).toEqual({
      delaiScoresManche: 100,
      dureeApparitionManche: 200,
      delaiSectionTotal: 400,
      dureeApparitionTotal: 150,
      delaiComptage: 600,
      dureeComptage: 400,
      delaiBouton: 1100,
      dureeApparitionBouton: 150,
      dureeFonduOverlay: 100,
      delaiEntreePanneau: 50,
      dureePicEclair: 100,
      dureeSortieEclair: 150,
    });
  });
});
