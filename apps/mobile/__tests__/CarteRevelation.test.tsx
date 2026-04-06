import type { Carte } from "@belote/shared-types";
import { render } from "@testing-library/react-native";

import { CarteRevelation } from "../components/game/CarteRevelation";
import type { AtlasCartes } from "../hooks/useAtlasCartes";

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native") as typeof import("react-native");

  return {
    __esModule: true,
    default: {
      View,
    },
    Easing: {
      ease: jest.fn(),
      out: jest.fn(() => jest.fn()),
      inOut: jest.fn(() => jest.fn()),
      cubic: jest.fn(),
    },
    interpolate: jest.fn(
      (_value: number, _input: number[], output: number[]) => output[0],
    ),
    runOnJS: jest.fn((fonction: (...args: unknown[]) => unknown) => fonction),
    useSharedValue: (valeur: number) => ({ value: valeur }),
    useAnimatedStyle: (calculStyle: () => unknown) => calculStyle(),
    withTiming: jest.fn(
      (valeur: number, _config: unknown, surFin?: (termine?: boolean) => void) => {
        surFin?.(true);
        return valeur;
      },
    ),
    withSequence: jest.fn((...valeurs: unknown[]) => valeurs.at(-1)),
  };
});

jest.mock("../components/game/Carte", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    CarteDos: () => <View testID="carte-dos" />,
    CarteFaceAtlas: () => <View testID="carte-face-atlas" />,
  };
});

const CARTE_TEST: Carte = { couleur: "coeur", rang: "as" };

const ATLAS_TEST = {
  image: {
    width: () => 1336,
    height: () => 1215,
  },
  largeurCellule: 167,
  hauteurCellule: 243,
  rectSource: () => ({ x: 0, y: 0, width: 167, height: 243 }),
  rectDos: () => ({ x: 0, y: 972, width: 167, height: 243 }),
} as unknown as AtlasCartes;

describe("CarteRevelation", () => {
  it("differe le callback de fin au frame suivant pour eviter un clignotement", () => {
    const surTerminee = jest.fn();
    const callbacksAnimationFrame: FrameRequestCallback[] = [];
    const requestAnimationFrameOriginal = global.requestAnimationFrame;

    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callbacksAnimationFrame.push(callback);
      return 1;
    });

    render(
      <CarteRevelation
        carte={CARTE_TEST}
        departX={100}
        departY={200}
        arriveeX={180}
        arriveeY={220}
        largeurCarte={80}
        hauteurCarte={116}
        atlas={ATLAS_TEST}
        onTerminee={surTerminee}
      />,
    );

    expect(surTerminee).not.toHaveBeenCalled();
    expect(callbacksAnimationFrame).toHaveLength(1);

    callbacksAnimationFrame[0](16);

    expect(surTerminee).toHaveBeenCalledTimes(1);

    global.requestAnimationFrame = requestAnimationFrameOriginal;
  });

  it("transmet une fonction JS stable a runOnJS depuis le callback worklet", () => {
    const animated = require("react-native-reanimated") as {
      runOnJS: jest.Mock;
      withTiming: jest.Mock;
    };

    animated.runOnJS.mockClear();
    animated.withTiming.mockClear();

    render(
      <CarteRevelation
        carte={CARTE_TEST}
        departX={100}
        departY={200}
        arriveeX={180}
        arriveeY={220}
        largeurCarte={80}
        hauteurCarte={116}
        atlas={ATLAS_TEST}
        onTerminee={() => {}}
      />,
    );

    const appelTimingFinal = animated.withTiming.mock.calls.at(-1) as
      | [number, unknown, ((termine?: boolean) => void) | undefined]
      | undefined;
    const notifierFin = appelTimingFinal?.[2];

    expect(notifierFin).toEqual(expect.any(Function));

    animated.runOnJS.mockClear();
    notifierFin?.(true);
    notifierFin?.(true);

    expect(animated.runOnJS).toHaveBeenCalledTimes(2);
    expect(animated.runOnJS.mock.calls[1][0]).toBe(animated.runOnJS.mock.calls[0][0]);
  });

  describe("mode inverse", () => {
    it("se monte sans erreur avec inverse", () => {
      expect(() =>
        render(
          <CarteRevelation
            inverse
            carte={CARTE_TEST}
            departX={100}
            departY={200}
            arriveeX={180}
            arriveeY={220}
            largeurCarte={80}
            hauteurCarte={116}
            atlas={ATLAS_TEST}
            onTerminee={() => {}}
          />,
        ),
      ).not.toThrow();
    });

    it("appelle onTerminee apres la fin de l'animation en mode inverse", () => {
      const surTerminee = jest.fn();
      const callbacksAnimationFrame: FrameRequestCallback[] = [];
      const requestAnimationFrameOriginal = global.requestAnimationFrame;

      global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
        callbacksAnimationFrame.push(callback);
        return 1;
      });

      render(
        <CarteRevelation
          inverse
          carte={CARTE_TEST}
          departX={100}
          departY={200}
          arriveeX={180}
          arriveeY={220}
          largeurCarte={80}
          hauteurCarte={116}
          atlas={ATLAS_TEST}
          onTerminee={surTerminee}
        />,
      );

      expect(surTerminee).not.toHaveBeenCalled();
      expect(callbacksAnimationFrame).toHaveLength(1);

      callbacksAnimationFrame[0](16);
      expect(surTerminee).toHaveBeenCalledTimes(1);

      global.requestAnimationFrame = requestAnimationFrameOriginal;
    });

    it("position initiale du conteneur correspond a arriveeX/Y en mode inverse", () => {
      // Mock interpolate retourne output[0], donc p=0 → position initiale.
      // En inverse, output[0] = arriveeX/Y → left = arriveeX - largeurCarte/2
      const animated = require("react-native-reanimated");
      animated.interpolate.mockClear();

      render(
        <CarteRevelation
          inverse
          carte={CARTE_TEST}
          departX={100}
          departY={200}
          arriveeX={180}
          arriveeY={220}
          largeurCarte={80}
          hauteurCarte={116}
          atlas={ATLAS_TEST}
          onTerminee={() => {}}
        />,
      );

      // useAnimatedStyle est appelé et retourne le style calculé au moment du rendu
      // interpolate retourne output[0] → en inverse, x = arriveeX
      // Vérifier que interpolate a été appelé avec arriveeX comme premier élément de output
      // pour la position X (premier appel pour les positions)
      const calls = animated.interpolate.mock.calls as unknown[][];
      const positionXCall = calls.find(
        (call: unknown[]) =>
          Array.isArray(call[2]) &&
          (call[2] as number[])[0] === 180 &&
          (call[2] as number[])[1] === 148 &&
          (call[2] as number[])[2] === 118 &&
          (call[2] as number[])[3] === 100,
      );

      // En mode inverse, la position X initiale doit commencer à arriveeX
      expect(positionXCall).toBeDefined();
    });

    it("styleDos initial a rotY=-90 en mode inverse (roles dos/face echanges)", () => {
      const animated = require("react-native-reanimated");
      animated.interpolate.mockClear();

      render(
        <CarteRevelation
          inverse
          carte={CARTE_TEST}
          departX={100}
          departY={200}
          arriveeX={180}
          arriveeY={220}
          largeurCarte={80}
          hauteurCarte={116}
          atlas={ATLAS_TEST}
          onTerminee={() => {}}
        />,
      );

      expect(animated.interpolate).toHaveBeenCalledWith(
        expect.anything(),
        [1, 1.45, 2],
        [-90, -90, 0],
        "clamp",
      );
    });
  });

  it("configure une revelation fluide plus courte avec un flip centre dans le trajet", () => {
    const animated = require("react-native-reanimated");
    animated.withTiming.mockClear();
    animated.interpolate.mockClear();

    render(
      <CarteRevelation
        carte={CARTE_TEST}
        departX={100}
        departY={200}
        arriveeX={180}
        arriveeY={220}
        largeurCarte={80}
        hauteurCarte={116}
        atlas={ATLAS_TEST}
        onTerminee={() => {}}
      />,
    );

    expect(animated.withTiming).toHaveBeenNthCalledWith(
      1,
      1,
      expect.objectContaining({ duration: 120 }),
    );
    expect(animated.withTiming).toHaveBeenNthCalledWith(
      2,
      2,
      expect.objectContaining({ duration: 220 }),
    );
    expect(animated.withTiming).toHaveBeenNthCalledWith(
      3,
      3,
      expect.objectContaining({ duration: 220 }),
      expect.any(Function),
    );
    expect(animated.interpolate).toHaveBeenCalledWith(
      expect.anything(),
      [0, 1, 2, 3],
      [100, 118, 148, 180],
    );
  });

  it("recalibre aussi le mode inverse avec les durees proportionnelles de la version fluide", () => {
    const animated = require("react-native-reanimated");
    animated.withTiming.mockClear();

    render(
      <CarteRevelation
        inverse
        carte={CARTE_TEST}
        departX={100}
        departY={200}
        arriveeX={180}
        arriveeY={220}
        largeurCarte={80}
        hauteurCarte={116}
        atlas={ATLAS_TEST}
        dureeTotale={500}
        onTerminee={() => {}}
      />,
    );

    expect(animated.withTiming).toHaveBeenNthCalledWith(
      1,
      1,
      expect.objectContaining({ duration: 107 }),
    );
    expect(animated.withTiming).toHaveBeenNthCalledWith(
      2,
      2,
      expect.objectContaining({ duration: 196 }),
    );
    expect(animated.withTiming).toHaveBeenNthCalledWith(
      3,
      3,
      expect.objectContaining({ duration: 197 }),
      expect.any(Function),
    );
  });
});
