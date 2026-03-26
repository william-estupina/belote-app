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

jest.mock("../components/game/CanvasAdversaires", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    CanvasAdversaires: () => <View testID="canvas-adversaires" />,
  };
});

jest.mock("../components/game/DistributionCanvasSud", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    DistributionCanvasSud: () => <View testID="distribution-canvas-sud" />,
  };
});

describe("CoucheAnimation", () => {
  it("affiche les cartes en vol sur la couche d'animation", () => {
    const props = {
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
      nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
      cartesAtlasAdversaires: [],
      progressionsAdv: [],
      donneesWorkletAdv: { value: [] },
      nbCartesActivesAdv: { value: 0 },
    } as unknown as ComponentProps<typeof CoucheAnimation>;

    const { getByTestId } = render(<CoucheAnimation {...props} />);

    expect(getByTestId("carte-animee")).toBeTruthy();
  });
});
