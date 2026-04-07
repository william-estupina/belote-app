import type { Carte } from "@belote/shared-types";
import { render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { CarteDosAtlas, CarteFaceAtlas } from "../components/game/Carte";

jest.mock("../hooks/useAtlasCartes", () => ({
  SPRITE_SHEET_SOURCE: "/assets/sprites/sprite-sheet.png",
}));

jest.mock("@shopify/react-native-skia", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);

  return {
    Atlas: () => React.createElement(View, { testID: "atlas-skia" }),
    Canvas: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: "canvas-skia" }, children),
    Group: Passthrough,
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
      <CarteFaceAtlas
        atlas={ATLAS_MOCK}
        carte={CARTE_DEBUG}
        largeur={180}
        hauteur={261}
      />,
    );

    expect(screen.getByTestId("canvas-skia")).toBeTruthy();
    expect(screen.getByTestId("atlas-skia")).toBeTruthy();
  });

  it("garde aussi le rendu du dos en skia sur le web", () => {
    render(<CarteDosAtlas atlas={ATLAS_MOCK} largeur={180} hauteur={261} />);

    expect(screen.getByTestId("canvas-skia")).toBeTruthy();
    expect(screen.getByTestId("atlas-skia")).toBeTruthy();
  });

  it("ne retombe pas sur un dos react quand l'atlas n'est pas pret", () => {
    const atlasSansImage = { ...ATLAS_MOCK, image: null };
    const { toJSON } = render(
      <CarteDosAtlas atlas={atlasSansImage} largeur={180} hauteur={261} />,
    );

    expect(toJSON()).toBeNull();
  });
});
