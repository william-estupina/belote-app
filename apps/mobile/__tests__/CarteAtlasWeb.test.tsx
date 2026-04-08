import type { Carte } from "@belote/shared-types";
import { render, screen } from "@testing-library/react-native";
import { Platform, type StyleProp, type ViewStyle } from "react-native";

import { CanvasCartesAtlas } from "../components/game/CanvasCartesAtlas";

jest.mock("../hooks/useAtlasCartes", () => ({
  SPRITE_SHEET_SOURCE: "/assets/sprites/sprite-sheet.png",
}));

jest.mock("@shopify/react-native-skia", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);
  const canvasMock = jest.fn(
    ({
      children,
      testID,
      style,
    }: {
      children?: React.ReactNode;
      testID?: string;
      style?: StyleProp<ViewStyle>;
    }) => React.createElement(View, { testID: testID ?? "canvas-skia", style }, children),
  );

  return {
    Atlas: () => React.createElement(View, { testID: "atlas-skia" }),
    Canvas: canvasMock,
    Group: Passthrough,
    RoundedRect: () => React.createElement(View, { testID: "overlay-gris-skia" }),
    Shadow: () => null,
    rect: (x: number, y: number, width: number, height: number) => ({
      x,
      y,
      width,
      height,
    }),
    useRSXformBuffer: () => [],
  };
});

const CARTE_DEBUG: Carte = {
  couleur: "coeur",
  rang: "7",
};

const ATLAS_MOCK = {
  image: {
    width: () => 1336,
    height: () => 1215,
  },
  largeurCellule: 167,
  hauteurCellule: 243,
  rectSource: () => ({ x: 0, y: 0, width: 167, height: 243 }),
  rectDos: () => ({ x: 0, y: 972, width: 167, height: 243 }),
} as unknown as import("../hooks/useAtlasCartes").AtlasCartes;

describe("Carte atlas sur le web", () => {
  const plateformeOriginale = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "web",
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: plateformeOriginale,
    });
  });

  it("garde le rendu face en skia plutot qu une image html", () => {
    render(
      <CanvasCartesAtlas
        atlas={ATLAS_MOCK}
        largeur={180}
        hauteur={261}
        cartes={[
          {
            id: "debug-face",
            type: "recto",
            carte: CARTE_DEBUG,
            x: 0,
            y: 0,
            largeur: 180,
            hauteur: 261,
          },
        ]}
      />,
    );

    expect(screen.getByTestId("canvas-cartes-atlas")).toBeTruthy();
    expect(screen.getByTestId("atlas-skia")).toBeTruthy();
  });

  it("garde aussi le rendu du dos en skia sur le web", () => {
    render(
      <CanvasCartesAtlas
        atlas={ATLAS_MOCK}
        largeur={180}
        hauteur={261}
        cartes={[
          {
            id: "debug-dos",
            type: "dos",
            x: 0,
            y: 0,
            largeur: 180,
            hauteur: 261,
          },
        ]}
      />,
    );

    expect(screen.getByTestId("canvas-cartes-atlas")).toBeTruthy();
    expect(screen.getByTestId("atlas-skia")).toBeTruthy();
  });

  it("ne retombe pas sur un dos react quand l'atlas n'est pas pret", () => {
    const atlasSansImage = { ...ATLAS_MOCK, image: null };
    const { toJSON } = render(
      <CanvasCartesAtlas
        atlas={atlasSansImage}
        largeur={180}
        hauteur={261}
        cartes={[
          {
            id: "debug-dos",
            type: "dos",
            x: 0,
            y: 0,
            largeur: 180,
            hauteur: 261,
          },
        ]}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it("aplatit le style transmis au canvas skia sur le web", () => {
    render(
      <CanvasCartesAtlas
        atlas={ATLAS_MOCK}
        largeur={180}
        hauteur={261}
        style={[{ position: "absolute", left: 12 }, { top: 24 }]}
        cartes={[
          {
            id: "debug-face-style",
            type: "recto",
            carte: CARTE_DEBUG,
            x: 0,
            y: 0,
            largeur: 180,
            hauteur: 261,
          },
        ]}
      />,
    );

    const canvas = screen.getByTestId("canvas-cartes-atlas");

    expect(Array.isArray(canvas.props.style)).toBe(false);
    expect(canvas.props.style).toMatchObject({
      width: 180,
      height: 261,
      position: "absolute",
      left: 12,
      top: 24,
    });
  });
});
