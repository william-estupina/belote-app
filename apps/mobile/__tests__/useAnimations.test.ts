import type { Carte } from "@belote/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { ANIMATIONS } from "../constants/layout";
import { useAnimations } from "../hooks/useAnimations";

const CARTE_TEST: Carte = { couleur: "pique", rang: "as" };

describe("useAnimations", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
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
    expect(obtenirEtatAnimation().cartesPoseesAuPli).toEqual([]);

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

    act(() => {
      result.current.lancerAnimationJeuCarte(CARTE_TEST, "est");
      result.current.surAnimationTerminee("jeu-1");
    });

    act(() => {
      result.current.lancerAnimationRamassagePli(
        [{ joueur: "est", carte: CARTE_TEST }],
        "nord",
      );
      jest.advanceTimersByTime(ANIMATIONS.ramassagePli.delaiAvant);
    });

    const obtenirEtatAnimation = () =>
      result.current as typeof result.current & {
        cartesPoseesAuPli: Array<{
          joueur: "est" | "nord" | "ouest" | "sud";
          carte: Carte;
          faceVisible: boolean;
        }>;
      };

    expect(obtenirEtatAnimation().cartesPoseesAuPli).toEqual([]);
    expect(
      obtenirEtatAnimation().cartesEnVol.some((carte) =>
        carte.id.startsWith("ramassage-p1-"),
      ),
    ).toBe(true);
  });
});
