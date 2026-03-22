import type { Carte } from "@belote/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import * as layout from "../constants/layout";
import { useAnimations } from "../hooks/useAnimations";

const CARTE_TEST: Carte = { couleur: "pique", rang: "as" };

describe("useAnimations", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("n'appelle la fin d'une animation de jeu qu'apres le retrait de la carte en vol", () => {
    const surFin = jest.fn();
    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationJeuCarte(CARTE_TEST, "est", surFin);
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(surFin).not.toHaveBeenCalled();

    act(() => {
      result.current.surAnimationTerminee("jeu-1");
    });

    expect(surFin).toHaveBeenCalledTimes(1);
  });

  it("ne conserve pas de copie statique de la carte jouee sur le calque d'animation", () => {
    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationJeuCarte(CARTE_TEST, "est");
    });

    act(() => {
      result.current.surAnimationTerminee("jeu-1");
    });

    const valeurRetour = result.current as unknown as Record<string, unknown>;

    expect("cartesSurTapis" in valeurRetour).toBe(false);
  });

  it("deplace une carte jouee de cartesEnVol vers cartesPoseesAuPli a la fin du vol", () => {
    const { result } = renderHook(() => useAnimations());

    act(() => {
      result.current.lancerAnimationJeuCarte(CARTE_TEST, "est");
    });

    const obtenirEtatAnimation = () =>
      result.current as typeof result.current & {
        cartesPoseesAuPli: Array<{
          joueur: "est" | "nord" | "ouest" | "sud";
          carte: Carte;
          faceVisible: boolean;
        }>;
      };

    expect(obtenirEtatAnimation().cartesEnVol).toHaveLength(1);

    act(() => {
      result.current.surAnimationTerminee("jeu-1");
    });

    expect(obtenirEtatAnimation().cartesEnVol).toEqual([]);
    expect(obtenirEtatAnimation().cartesPoseesAuPli).toHaveLength(1);
    expect(obtenirEtatAnimation().cartesPoseesAuPli[0]).toMatchObject({
      joueur: "est",
      carte: CARTE_TEST,
      faceVisible: true,
    });
  });

  it("utilise les cartes posees au pli comme point de depart du ramassage", () => {
    const { result } = renderHook(() => useAnimations());
    const variationCartePliSpy = jest.spyOn(layout, "variationCartePli");
    variationCartePliSpy
      .mockReturnValueOnce({
        rotation: 17,
        decalageX: 0.031,
        decalageY: -0.022,
      })
      .mockReturnValueOnce({
        rotation: -4,
        decalageX: -0.015,
        decalageY: 0.01,
      });

    try {
      act(() => {
        result.current.lancerAnimationJeuCarte(CARTE_TEST, "est");
      });

      const obtenirEtatAnimation = () =>
        result.current as typeof result.current & {
          cartesPoseesAuPli: Array<{
            id: string;
            joueur: "est" | "nord" | "ouest" | "sud";
            carte: Carte;
            x: number;
            y: number;
            rotation: number;
            echelle: number;
            faceVisible: boolean;
          }>;
        };

      act(() => {
        result.current.surAnimationTerminee("jeu-1");
      });

      expect(obtenirEtatAnimation().cartesPoseesAuPli).toHaveLength(1);
      const cartePosee = obtenirEtatAnimation().cartesPoseesAuPli[0];

      expect(cartePosee).toMatchObject({
        joueur: "est",
        carte: CARTE_TEST,
        x: 0.611,
        y: 0.448,
        rotation: 17,
        echelle: 0.9,
        faceVisible: true,
      });

      act(() => {
        result.current.lancerAnimationRamassagePli(
          [{ joueur: cartePosee.joueur, carte: cartePosee.carte }],
          "nord",
        );
        jest.advanceTimersByTime(layout.ANIMATIONS.ramassagePli.delaiAvant);
      });

      expect(obtenirEtatAnimation().cartesPoseesAuPli).toEqual([]);
      const volRamassage = obtenirEtatAnimation().cartesEnVol.find((carte) =>
        carte.id.startsWith("ramassage-p1-"),
      );

      expect(volRamassage).toMatchObject({
        carte: CARTE_TEST,
        faceVisible: true,
        depart: {
          x: cartePosee.x,
          y: cartePosee.y,
          rotation: cartePosee.rotation,
          echelle: cartePosee.echelle,
        },
      });
    } finally {
      variationCartePliSpy.mockRestore();
    }
  });
});
