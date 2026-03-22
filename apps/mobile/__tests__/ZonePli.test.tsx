import type { Carte } from "@belote/shared-types";
import { render } from "@testing-library/react-native";
import type { ComponentProps } from "react";

import { ZonePli } from "../components/game/ZonePli";
import type { AtlasCartes } from "../hooks/useAtlasCartes";

jest.mock("../components/game/Carte", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    CarteFaceAtlas: () => <View testID="carte-face-atlas" />,
  };
});

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

const CARTE_TEST: Carte = { couleur: "pique", rang: "as" };

describe("ZonePli", () => {
  it("ne rend plus les cartes du pli", () => {
    const props = {
      cartes: [{ joueur: "est" as const, carte: CARTE_TEST }],
      largeurEcran: 1200,
      hauteurEcran: 800,
      couleurAtout: null,
      afficherCadre: true,
      atlas: ATLAS_TEST,
    } as unknown as ComponentProps<typeof ZonePli>;

    const { queryByTestId } = render(<ZonePli {...props} />);

    expect(queryByTestId("carte-face-atlas")).toBeNull();
  });
});
