import {
  accelererDureeAnimation,
  accelererTensionAnimation,
  ANIMATIONS_CARTE_RETOURNEE,
  ANIMATIONS_DIALOGUE_FIN_MANCHE,
  DUREE_FONDU_ENTREE_MAIN,
  DUREE_PULSE_JOUEUR_ACTIF,
  FACTEUR_ACCELERATION_ANIMATIONS_VISUELLES,
  FACTEUR_RALENTISSEMENT_ANIMATIONS_MAJEURES,
  ralentirDureeAnimationMajeure,
  ralentirTensionAnimationMajeure,
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

  it("ralentit de 20 % les animations majeures sans toucher aux micro-effets", () => {
    expect(FACTEUR_RALENTISSEMENT_ANIMATIONS_MAJEURES).toBe(1.2);
    expect(ralentirDureeAnimationMajeure(200)).toBe(240);
    expect(ralentirTensionAnimationMajeure(120)).toBe(100);
    expect(DUREE_PULSE_JOUEUR_ACTIF).toBe(350);
    expect(DUREE_FONDU_ENTREE_MAIN).toBe(50);
    expect(ANIMATIONS_CARTE_RETOURNEE).toEqual({
      delaiFlip: 120,
      dureeFlip: 240,
    });
    expect(ANIMATIONS_DIALOGUE_FIN_MANCHE).toEqual({
      delaiScoresManche: 120,
      dureeApparitionManche: 240,
      delaiSectionTotal: 480,
      dureeApparitionTotal: 180,
      delaiComptage: 720,
      dureeComptage: 480,
      delaiBouton: 1320,
      dureeApparitionBouton: 180,
      dureeFonduOverlay: 120,
      delaiEntreePanneau: 60,
      tensionEntreePanneau: 100,
      dureePicEclair: 120,
      dureeSortieEclair: 180,
    });
  });
});
