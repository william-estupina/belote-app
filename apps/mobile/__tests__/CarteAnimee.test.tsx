import type { Carte } from "@belote/shared-types";
import { render } from "@testing-library/react-native";

import { CarteAnimee } from "../components/game/CarteAnimee";
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
      cubic: jest.fn(),
      out: jest.fn(() => jest.fn()),
      inOut: jest.fn(() => jest.fn()),
    },
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
  };
});

jest.mock("../components/game/Carte", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    CarteSkia: () => <View testID="carte-skia" />,
    CarteDos: () => <View testID="carte-dos" />,
    CarteFace: () => <View testID="carte-face" />,
    CarteFaceAtlas: () => <View testID="carte-face-atlas" />,
  };
});

const CARTE_TEST: Carte = { couleur: "pique", rang: "as" };

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

describe("CarteAnimee", () => {
  it("differe le callback de fin au frame suivant pour eviter un trou visuel", () => {
    const surFin = jest.fn();
    const callbacksAnimationFrame: FrameRequestCallback[] = [];
    const requestAnimationFrameOriginal = global.requestAnimationFrame;

    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callbacksAnimationFrame.push(callback);
      return 1;
    });

    render(
      <CarteAnimee
        carte={CARTE_TEST}
        depart={{ x: 0.2, y: 0.2, rotation: 0, echelle: 1 }}
        arrivee={{ x: 0.5, y: 0.5, rotation: 5, echelle: 0.9 }}
        faceVisible
        duree={300}
        largeurEcran={1200}
        hauteurEcran={800}
        atlas={ATLAS_TEST}
        onTerminee={surFin}
      />,
    );

    expect(surFin).not.toHaveBeenCalled();
    expect(callbacksAnimationFrame).toHaveLength(1);

    callbacksAnimationFrame[0](16);

    expect(surFin).toHaveBeenCalledTimes(1);

    global.requestAnimationFrame = requestAnimationFrameOriginal;
  });

  it("utilise l'atlas pour une carte face en vol quand il est disponible", () => {
    const { getByTestId, queryByTestId } = render(
      <CarteAnimee
        carte={CARTE_TEST}
        depart={{ x: 0.2, y: 0.2, rotation: 0, echelle: 1 }}
        arrivee={{ x: 0.5, y: 0.5, rotation: 5, echelle: 0.9 }}
        faceVisible
        duree={300}
        largeurEcran={1200}
        hauteurEcran={800}
        atlas={ATLAS_TEST}
      />,
    );

    expect(getByTestId("carte-face-atlas")).toBeTruthy();
    expect(queryByTestId("carte-skia")).toBeNull();
  });
});
