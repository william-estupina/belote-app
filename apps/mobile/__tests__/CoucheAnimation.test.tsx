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

jest.mock("../components/game/DistributionCanvas", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    DistributionCanvas: () => <View testID="distribution-canvas" />,
  };
});

jest.mock("../components/game/Carte", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    CarteFaceAtlas: () => <View testID="carte-face-atlas" />,
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
        },
      ],
      largeurEcran: 1200,
      hauteurEcran: 800,
      onAnimationTerminee: () => {},
    } as unknown as ComponentProps<typeof CoucheAnimation>;

    const { getByTestId } = render(<CoucheAnimation {...props} />);

    expect(getByTestId("carte-animee")).toBeTruthy();
  });

  it("affiche aussi les cartes posees au pli sur la couche d'animation", () => {
    const props = {
      cartesEnVol: [],
      cartesPoseesAuPli: [
        {
          id: "pli-est-as-pique",
          joueur: "est",
          carte: { couleur: "pique", rang: "as" } as const,
          x: 0.58,
          y: 0.47,
          rotation: 8,
          echelle: 0.9,
          faceVisible: true,
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
    } as unknown as ComponentProps<typeof CoucheAnimation> & {
      cartesPoseesAuPli: Array<{
        id: string;
        joueur: "est";
        carte: { couleur: "pique"; rang: "as" };
        x: number;
        y: number;
        rotation: number;
        echelle: number;
        faceVisible: boolean;
      }>;
    };

    const { getByTestId } = render(<CoucheAnimation {...props} />);

    expect(getByTestId("carte-face-atlas")).toBeTruthy();
  });
});
