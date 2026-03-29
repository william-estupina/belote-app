import type { Carte } from "@belote/shared-types";
import { render } from "@testing-library/react-native";

import { CarteRevelation } from "../components/game/CarteRevelation";
import type { AtlasCartes } from "../hooks/useAtlasCartes";

jest.mock("react-native-reanimated", () => {
  const React = require("react") as typeof import("react");
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
    runOnJS: (fonction: (...args: unknown[]) => unknown) => fonction,
    useSharedValue: (valeur: number) => ({ value: valeur }),
    useAnimatedStyle: (calculStyle: () => unknown) => calculStyle(),
    withTiming: (
      valeur: number,
      _config: unknown,
      surFin?: (termine?: boolean) => void,
    ) => {
      surFin?.(true);
      return valeur;
    },
    withSequence: (...valeurs: unknown[]) => valeurs.at(-1),
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
});
