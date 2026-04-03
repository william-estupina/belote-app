import type { Carte } from "@belote/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { ANIMATIONS, POSITIONS_PLI } from "../constants/layout";
import { planifierRamassagePli } from "../hooks/planRamassagePli";
import { useAnimations } from "../hooks/useAnimations";

const CARTE_TEST: Carte = { couleur: "pique", rang: "as" };
const CARTES_PLI_TEST = [
  { joueur: "sud" as const, carte: { couleur: "coeur", rang: "10" } as const },
  { joueur: "ouest" as const, carte: { couleur: "trefle", rang: "roi" } as const },
  { joueur: "nord" as const, carte: { couleur: "carreau", rang: "9" } as const },
  { joueur: "est" as const, carte: { couleur: "pique", rang: "as" } as const },
];

describe("useAnimations", () => {
  let requestAnimationFrameOriginal: typeof global.requestAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();
    requestAnimationFrameOriginal = global.requestAnimationFrame;
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    global.requestAnimationFrame = requestAnimationFrameOriginal;
  });

  it("garde la carte jeu-* dans cartesEnVol apres la fin de l'animation (gelee)", () => {
    const surFin = jest.fn();
    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      cb(16);
      return 1;
    });

    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationJeuCarte(CARTE_TEST, "est", surFin);
    });

    act(() => {
      result.current.surAnimationTerminee("jeu-1");
    });

    expect(surFin).toHaveBeenCalledTimes(1);
    expect(result.current.cartesEnVol).toHaveLength(1);
    expect(result.current.cartesEnVol[0].id).toBe("jeu-1");
  });

  it("initialise les cartes jeu-* avec segment 0", () => {
    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationJeuCarte(CARTE_TEST, "est");
    });

    expect(result.current.cartesEnVol[0].segment).toBe(0);
  });

  it("configure une arrivee de carte au pli plus lente sans rebond final", () => {
    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationJeuCarte(CARTE_TEST, "est");
    });

    expect(result.current.cartesEnVol[0]).toMatchObject({
      id: "jeu-1",
      duree: 420,
      easing: "out-cubic",
      segment: 0,
    });
  });

  it("conserve un depart personnalise complet pour la carte sud", () => {
    const departPersonnalise = {
      x: 0.37,
      y: 0.83,
      rotation: -14,
      echelle: 1,
    };
    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationJeuCarte(
        CARTE_TEST,
        "sud",
        undefined,
        departPersonnalise,
      );
    });

    expect(result.current.cartesEnVol[0]).toMatchObject({
      id: "jeu-1",
      depart: departPersonnalise,
    });
  });

  it("peut preparer une carte sud sans lancer encore son mouvement", () => {
    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationJeuCarte(CARTE_TEST, "sud", undefined, undefined, {
        demarrageDiffere: true,
      });
    });

    expect(result.current.cartesEnVol[0]).toMatchObject({
      id: "jeu-1",
      estEnPause: true,
      estVisible: false,
      segment: 0,
    });

    act(() => {
      result.current.demarrerAnimationJeuCarte("jeu-1");
    });

    expect(result.current.cartesEnVol[0]).toMatchObject({
      id: "jeu-1",
      estEnPause: false,
      estVisible: true,
      segment: 1,
    });
  });

  it("declenche le callback quand l overlay de jeu est pret a prendre le relais", () => {
    const surPretAffichage = jest.fn();
    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationJeuCarte(CARTE_TEST, "sud", undefined, undefined, {
        demarrageDiffere: true,
        surPretAffichage,
      });
    });

    act(() => {
      result.current.surCarteJeuPreteAffichage("jeu-1");
    });

    expect(surPretAffichage).toHaveBeenCalledWith("jeu-1");
  });

  it("cree des cartes retour-* face cachee et appelle le callback de fin", () => {
    const surFin = jest.fn();
    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationRetourPaquet(
        [
          {
            carte: CARTE_TEST,
            depart: { x: 0.5, y: 0.92, rotation: 0, echelle: 1 },
            delai: 0,
            flipDe: 180,
            flipVers: 0,
          },
          {
            carte: { couleur: "coeur", rang: "roi" },
            depart: { x: 0.1, y: 0.5, rotation: 90, echelle: 0.6 },
            delai: ANIMATIONS.distribution.delaiEntreVaguesRetourPaquet,
          },
        ],
        { x: 0.38, y: 0.45 },
        surFin,
      );
    });

    expect(result.current.cartesEnVol).toHaveLength(2);
    expect(result.current.cartesEnVol[0]).toMatchObject({
      id: "retour-1",
      carte: CARTE_TEST,
      faceVisible: false,
      segment: 0,
      delai: 0,
      arrivee: { x: 0.38, y: 0.45, echelle: 0.85 },
      flipDe: 180,
      flipVers: 0,
    });
    expect(result.current.cartesEnVol[1]).toMatchObject({
      id: "retour-2",
      faceVisible: false,
      segment: 0,
      delai: ANIMATIONS.distribution.delaiEntreVaguesRetourPaquet,
      arrivee: { echelle: 0.85 },
      flipDe: undefined,
      flipVers: undefined,
    });

    act(() => {
      jest.advanceTimersByTime(
        ANIMATIONS.distribution.dureeRetourPaquet +
          ANIMATIONS.distribution.delaiEntreVaguesRetourPaquet +
          ANIMATIONS.distribution.pauseApresRetourPaquet -
          1,
      );
    });

    expect(surFin).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
      result.current.surAnimationTerminee("retour-1");
      result.current.surAnimationTerminee("retour-2");
    });

    expect(result.current.cartesEnVol).toHaveLength(0);
    expect(surFin).toHaveBeenCalledTimes(1);
  });

  describe("ramassage in-place", () => {
    it("met a jour les cartes jeu-* existantes pour la convergence (segment 1)", () => {
      const { result } = renderHook(() => useAnimations());

      act(() => {
        result.current.lancerAnimationJeuCarte(CARTE_TEST, "est");
      });

      act(() => {
        result.current.surAnimationTerminee("jeu-1");
      });

      const carteAvant = result.current.cartesEnVol[0];
      expect(carteAvant.segment).toBe(0);

      act(() => {
        result.current.lancerAnimationRamassagePli(
          [{ joueur: "est", carte: CARTE_TEST }],
          "nord",
        );
        jest.advanceTimersByTime(ANIMATIONS.ramassagePli.delaiAvant);
      });

      const carteApres = result.current.cartesEnVol.find((c) => c.id === "jeu-1");
      expect(carteApres).toBeDefined();
      expect(carteApres!.segment).toBe(1);
    });

    it("fusionne les cartes du pli en une seule carte de collecte avant le depart vers la pile", () => {
      const onTerminee = jest.fn();
      const { delaiPhase2, dureeGlissement } = planifierRamassagePli();
      const { result } = renderHook(() => useAnimations());

      act(() => {
        result.current.lancerAnimationJeuCarte(CARTE_TEST, "est");
      });

      act(() => {
        result.current.surAnimationTerminee("jeu-1");
      });

      act(() => {
        result.current.lancerAnimationRamassagePli(
          [{ joueur: "est", carte: CARTE_TEST }],
          "nord",
          onTerminee,
        );
        jest.advanceTimersByTime(ANIMATIONS.ramassagePli.delaiAvant);
      });

      act(() => {
        jest.advanceTimersByTime(delaiPhase2);
      });

      expect(result.current.cartesEnVol).toHaveLength(1);
      expect(result.current.cartesEnVol[0].id.startsWith("ramassage-")).toBe(true);
      expect(result.current.cartesEnVol[0]).toMatchObject({
        faceVisible: false,
        depart: {
          x: POSITIONS_PLI.nord.x,
          y: POSITIONS_PLI.nord.y,
          rotation: 0,
          echelle: 0.85,
        },
      });

      act(() => {
        result.current.surAnimationTerminee(result.current.cartesEnVol[0].id);
      });

      expect(result.current.cartesEnVol).toHaveLength(0);
      expect(onTerminee).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(dureeGlissement);
      });

      expect(onTerminee).toHaveBeenCalledTimes(1);
    });

    it("anime aussi les cartes gelees rehydratees du pli", () => {
      const { result } = renderHook(() => useAnimations());

      act(() => {
        result.current.ajouterCartesGelees([
          {
            id: "pli-est-pique-as",
            carte: CARTE_TEST,
            depart: { x: 0.58, y: 0.47, rotation: 8, echelle: 0.9 },
            arrivee: { x: 0.58, y: 0.47, rotation: 8, echelle: 0.9 },
            faceVisible: true,
            duree: 0,
            segment: 0,
          },
        ]);
      });

      act(() => {
        result.current.lancerAnimationRamassagePli(
          [{ joueur: "est", carte: CARTE_TEST }],
          "nord",
        );
        jest.advanceTimersByTime(ANIMATIONS.ramassagePli.delaiAvant);
      });

      const carteApres = result.current.cartesEnVol.find(
        (carte) => carte.id === "pli-est-pique-as",
      );

      expect(carteApres).toBeDefined();
      expect(carteApres!.segment).toBe(1);
    });

    it("rejoue le ramassage pour une meme carte rehydratee sur un cycle suivant", () => {
      const { result } = renderHook(() => useAnimations());

      const ajouterCarteGelee = () => {
        result.current.ajouterCartesGelees([
          {
            id: "pli-est-pique-as",
            carte: CARTE_TEST,
            depart: { x: 0.58, y: 0.47, rotation: 8, echelle: 0.9 },
            arrivee: { x: 0.58, y: 0.47, rotation: 8, echelle: 0.9 },
            faceVisible: true,
            duree: 0,
            segment: 0,
          },
        ]);
      };

      act(() => {
        ajouterCarteGelee();
        result.current.lancerAnimationRamassagePli(
          [{ joueur: "est", carte: CARTE_TEST }],
          "nord",
        );
        jest.advanceTimersByTime(ANIMATIONS.ramassagePli.delaiAvant);
      });

      act(() => {
        result.current.surAnimationTerminee("pli-est-pique-as");
        jest.advanceTimersByTime(planifierRamassagePli().delaiPhase2);
      });

      const idRamassage = result.current.cartesEnVol[0]?.id;

      act(() => {
        if (idRamassage) {
          result.current.surAnimationTerminee(idRamassage);
        }
      });

      expect(result.current.cartesEnVol).toHaveLength(0);

      act(() => {
        ajouterCarteGelee();
        result.current.lancerAnimationRamassagePli(
          [{ joueur: "est", carte: CARTE_TEST }],
          "nord",
        );
        jest.advanceTimersByTime(ANIMATIONS.ramassagePli.delaiAvant);
      });

      const carteApresSecondCycle = result.current.cartesEnVol.find(
        (carte) => carte.id === "pli-est-pique-as",
      );

      expect(carteApresSecondCycle).toBeDefined();
      expect(carteApresSecondCycle!.segment).toBe(1);
    });

    it("remplace les quatre cartes convergentes par une seule carte de collecte au debut du glissement", () => {
      const { delaiPhase2 } = planifierRamassagePli();
      const { result } = renderHook(() => useAnimations());

      act(() => {
        result.current.ajouterCartesGelees(
          CARTES_PLI_TEST.map(({ joueur, carte }) => ({
            id: `pli-${joueur}-${carte.couleur}-${carte.rang}`,
            carte,
            depart: {
              x: POSITIONS_PLI[joueur].x,
              y: POSITIONS_PLI[joueur].y,
              rotation: 0,
              echelle: 0.9,
            },
            arrivee: {
              x: POSITIONS_PLI[joueur].x,
              y: POSITIONS_PLI[joueur].y,
              rotation: 0,
              echelle: 0.9,
            },
            faceVisible: true,
            duree: 0,
            segment: 0,
          })),
        );
        result.current.lancerAnimationRamassagePli(CARTES_PLI_TEST, "nord");
        jest.advanceTimersByTime(ANIMATIONS.ramassagePli.delaiAvant);
      });

      expect(result.current.cartesEnVol).toHaveLength(4);
      expect(result.current.cartesEnVol.every((carte) => carte.segment === 1)).toBe(true);

      act(() => {
        result.current.surAnimationTerminee("pli-sud-coeur-10");
      });

      expect(result.current.cartesEnVol.every((carte) => carte.segment === 1)).toBe(true);

      act(() => {
        jest.advanceTimersByTime(delaiPhase2 + 1);
      });

      expect(result.current.cartesEnVol).toHaveLength(1);
      expect(result.current.cartesEnVol[0].id.startsWith("ramassage-")).toBe(true);
      expect(result.current.cartesEnVol[0]).toMatchObject({
        faceVisible: false,
        depart: {
          x: POSITIONS_PLI.nord.x,
          y: POSITIONS_PLI.nord.y,
        },
      });
    });
  });
});
