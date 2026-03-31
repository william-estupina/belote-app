import { render } from "@testing-library/react-native";
import type { ComponentProps } from "react";

import { CoucheAnimation } from "../components/game/CoucheAnimation";

jest.mock("../components/game/CarteAnimee", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    CarteAnimee: () => <View testID="carte-animee" />,
  };
});

jest.mock("../components/game/CanvasCartesUnifie", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    CanvasCartesUnifie: () => <View testID="canvas-cartes-unifie" />,
  };
});

describe("CoucheAnimation", () => {
  const creerProps = () =>
    ({
      cartesEnVol: [
        {
          id: "jeu-1",
          carte: { couleur: "pique", rang: "as" } as const,
          depart: { x: 0.2, y: 0.8, rotation: 0, echelle: 1 },
          arrivee: { x: 0.6, y: 0.45, rotation: 8, echelle: 0.9 },
          faceVisible: true,
          duree: 300,
          segment: 0,
        },
      ],
      largeurEcran: 1200,
      hauteurEcran: 800,
      onAnimationTerminee: () => {},
      atlas: {
        image: null,
        largeurCellule: 0,
        hauteurCellule: 0,
        rectSource: () => ({ x: 0, y: 0, width: 0, height: 0 }),
        rectDos: () => ({ x: 0, y: 0, width: 0, height: 0 }),
      },
      cartesAtlas: [],
      progressions: [],
      donneesWorklet: { value: [] },
      nbCartesActives: { value: 0 },
    }) as unknown as ComponentProps<typeof CoucheAnimation>;

  it("affiche les cartes en vol sur la couche d'animation", () => {
    const { getByTestId } = render(<CoucheAnimation {...creerProps()} />);

    expect(getByTestId("carte-animee")).toBeTruthy();
  });

  it("monte le canvas unifie meme sans carte statique visible", () => {
    const { getByTestId } = render(<CoucheAnimation {...creerProps()} />);

    expect(getByTestId("canvas-cartes-unifie")).toBeTruthy();
  });
});
