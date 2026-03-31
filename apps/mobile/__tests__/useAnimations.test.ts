import type { Carte } from "@belote/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { useAnimations } from "../hooks/useAnimations";

const CARTE_TEST: Carte = { couleur: "pique", rang: "as" };

describe("useAnimations", () => {
  let requestAnimationFrameOriginal: typeof global.requestAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();
    requestAnimationFrameOriginal = global.requestAnimationFrame;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    global.requestAnimationFrame = requestAnimationFrameOriginal;
  });

  it("garde la carte visible un frame de plus pendant la pose du pli", () => {
    const surFin = jest.fn();
    const callbacksAnimationFrame: FrameRequestCallback[] = [];

    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callbacksAnimationFrame.push(callback);
      return 1;
    });

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
    expect(result.current.cartesEnVol).toHaveLength(1);
    expect(callbacksAnimationFrame).toHaveLength(1);

    act(() => {
      callbacksAnimationFrame[0](16);
    });

    expect(result.current.cartesEnVol).toHaveLength(0);
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
