import { render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import type { SharedValue } from "react-native-reanimated";

import { CanvasAdversaires } from "../components/game/CanvasAdversaires";

const mockBuffersRsxform = jest.fn();

jest.mock("../components/game/Carte", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    CarteDos: () => <View testID="carte-dos-distribution-adverse" />,
  };
});

jest.mock("@shopify/react-native-skia", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);

  return {
    Atlas: () => React.createElement(View, { testID: "atlas-adversaires-skia" }),
    Canvas: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: "canvas-adversaires-skia" }, children),
    Group: Passthrough,
    Shadow: () => null,
    rect: (x: number, y: number, width: number, height: number) => ({
      x,
      y,
      width,
      height,
    }),
    useRSXformBuffer: (taille: number, calculer: unknown) => {
      mockBuffersRsxform(taille, calculer);
      return [];
    },
  };
});

jest.mock("react-native-reanimated", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (calculStyle: () => unknown) => calculStyle(),
  };
});

function creerSharedValueNombre(valeur: number): SharedValue<number> {
  return { value: valeur } as SharedValue<number>;
}

function creerSharedValueTableau(valeur: number[]): SharedValue<number[]> {
  return { value: valeur } as SharedValue<number[]>;
}

function creerProps(progression: number): ComponentProps<typeof CanvasAdversaires> {
  return {
    atlas: {
      image: {
        width: () => 1336,
        height: () => 1215,
      } as unknown as NonNullable<
        ComponentProps<typeof CanvasAdversaires>["atlas"]["image"]
      >,
      largeurCellule: 167,
      hauteurCellule: 243,
      rectSource: () => ({ x: 0, y: 0, width: 167, height: 243 }),
      rectDos: () => ({ x: 0, y: 972, width: 167, height: 243 }),
    },
    largeurEcran: 1000,
    hauteurEcran: 2000,
    cartesAtlasAdversaires: [
      {
        carte: { couleur: "pique", rang: "as" },
        joueur: "nord",
        depart: { x: 0.5, y: 0.5 },
        arrivee: { x: 0.5, y: 0.2 },
        controle: { x: 0.5, y: 0.35 },
        rotationDepart: 0,
        rotationArrivee: 0,
        echelleDepart: 1,
        echelleArrivee: 1,
        rectSource: { x: 0, y: 972, width: 167, height: 243 },
      },
    ],
    progressions: Array.from({ length: 24 }, (_, index) =>
      creerSharedValueNombre(index === 0 ? progression : -1),
    ),
    donneesWorklet: creerSharedValueTableau([0.5, 0.5, 0.5, 0.35, 0.5, 0.2, 0, 0, 1, 1]),
    nbCartesActives: creerSharedValueNombre(1),
    nbCartesAdversaires: { nord: 1, est: 0, ouest: 0 },
    distributionEnCours: true,
  };
}

describe("CanvasAdversaires", () => {
  beforeEach(() => {
    mockBuffersRsxform.mockClear();
  });

  it("reste monte hors distribution pour afficher les adversaires statiques", () => {
    render(
      <CanvasAdversaires
        {...creerProps(0.5)}
        cartesAtlasAdversaires={[]}
        distributionEnCours={false}
        nbCartesAdversaires={{ nord: 1, est: 0, ouest: 0 }}
      />,
    );

    expect(screen.getByTestId("canvas-adversaires-skia")).toBeTruthy();
    expect(screen.getByTestId("atlas-adversaires-skia")).toBeTruthy();
  });

  it("rend les adversaires en atlas Skia pendant la distribution", () => {
    render(<CanvasAdversaires {...creerProps(0.5)} />);

    expect(screen.getByTestId("canvas-adversaires-skia")).toBeTruthy();
    expect(screen.getByTestId("atlas-adversaires-skia")).toBeTruthy();
    expect(screen.queryByTestId("carte-dos-distribution-adverse")).toBeNull();
  });

  it("cache une carte adverse qui n'est pas encore visible", () => {
    render(<CanvasAdversaires {...creerProps(-1)} />);

    expect(mockBuffersRsxform).toHaveBeenCalledWith(24, expect.any(Function));
  });

  it("laisse visible une carte adverse en cours de distribution", () => {
    render(<CanvasAdversaires {...creerProps(0.5)} />);

    expect(screen.getByTestId("canvas-adversaires-skia")).toBeTruthy();
    expect(mockBuffersRsxform).toHaveBeenCalledWith(24, expect.any(Function));
  });
});
