import type { Carte } from "@belote/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { EcranDebugCartes } from "../components/debug/DebugCartesContenu";

jest.mock("../components/game/Carte", () => ({
  CarteFaceAtlas: ({ carte }: { carte: Carte }) => {
    const React = require("react") as typeof import("react");
    const { Text } = require("react-native") as typeof import("react-native");
    return <Text testID="debug-carte-main">{`${carte.rang}-${carte.couleur}`}</Text>;
  },
}));

jest.mock("../hooks/useAtlasCartes", () => ({
  useAtlasCartes: () => ({
    image: {
      width: () => 1336,
      height: () => 1215,
    },
    largeurCellule: 167,
    hauteurCellule: 243,
    rectSource: () => ({ x: 0, y: 0, width: 167, height: 243 }),
    rectDos: () => ({ x: 0, y: 972, width: 167, height: 243 }),
  }),
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

describe("ComparaisonRenduCarte", () => {
  it("affiche deux selecteurs independants et une colonne de superposition avec bascule", () => {
    render(<EcranDebugCartes />);

    expect(screen.getByText("Comparaison des rendus")).toBeTruthy();
    expect(screen.getByText("Main joueur (CarteFaceAtlas)")).toBeTruthy();
    expect(screen.getByText("Atlas distribution (Skia Canvas)")).toBeTruthy();
    expect(screen.getByText("Superposition")).toBeTruthy();
    expect(screen.getByText("Rendu affiche : gauche")).toBeTruthy();
    expect(screen.getByTestId("superposition-bascule")).toBeTruthy();
    expect(screen.getAllByTestId("debug-carte-main")).toHaveLength(2);
    expect(screen.getAllByTestId("debug-carte-atlas")).toHaveLength(2);
    expect(screen.getByTestId("superposition-carte-gauche")).toBeTruthy();
    expect(screen.getByTestId("superposition-carte-droite")).toBeTruthy();

    fireEvent.press(screen.getByTestId("selecteur-carte-gauche-bouton"));
    fireEvent.press(screen.getByText("As de pique"));

    fireEvent.press(screen.getByTestId("selecteur-carte-droite-bouton"));
    fireEvent.press(screen.getByText("10 de carreau"));

    expect(screen.getByText("Carte gauche : As de pique")).toBeTruthy();
    expect(screen.getByText("Carte droite : 10 de carreau")).toBeTruthy();
    expect(screen.getAllByTestId("debug-carte-main")[0].props.children).toBe("as-pique");

    fireEvent.press(screen.getByTestId("superposition-bascule"));

    expect(screen.getByText("Rendu affiche : droite")).toBeTruthy();
    expect(screen.getByText("Afficher le rendu gauche")).toBeTruthy();
  });
});
