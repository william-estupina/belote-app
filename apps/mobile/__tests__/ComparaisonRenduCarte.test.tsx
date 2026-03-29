import type { Carte } from "@belote/shared-types";
import { render, screen } from "@testing-library/react-native";

import { ComparaisonRenduCarte } from "../components/debug/ComparaisonRenduCarte";

jest.mock("../components/game/Carte", () => ({
  CarteFaceAtlas: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");
    return <View testID="debug-carte-main" />;
  },
}));

jest.mock("@shopify/react-native-skia", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  const Passthrough = ({
    children,
    testID,
  }: {
    children?: React.ReactNode;
    testID?: string;
  }) => React.createElement(View, { testID }, children);

  return {
    Atlas: () => null,
    Canvas: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
      React.createElement(View, { testID }, children),
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

describe("ComparaisonRenduCarte", () => {
  it("affiche la meme carte via les deux rendus avec des libelles explicites", () => {
    render(
      <ComparaisonRenduCarte
        atlas={ATLAS_MOCK}
        carte={CARTE_DEBUG}
        largeurCarte={180}
        hauteurCarte={261}
      />,
    );

    expect(screen.getByText("Comparaison des rendus")).toBeTruthy();
    expect(screen.getByText("Main joueur (React Native / Image web)")).toBeTruthy();
    expect(screen.getByText("Atlas distribution (Skia Canvas)")).toBeTruthy();
    expect(screen.getByTestId("debug-carte-main")).toBeTruthy();
    expect(screen.getByTestId("debug-carte-atlas")).toBeTruthy();
  });
});
