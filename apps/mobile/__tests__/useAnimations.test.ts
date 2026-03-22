import type { Carte } from "@belote/shared-types";
import { act, renderHook } from "@testing-library/react-native";

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
});
