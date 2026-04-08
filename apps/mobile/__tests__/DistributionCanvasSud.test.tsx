import type { Carte } from "@belote/shared-types";
import { render } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import { StyleSheet } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { DistributionCanvasSud } from "../components/game/DistributionCanvasSud";
import { RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../constants/layout";

const mockStylesAnimes: unknown[] = [];

jest.mock("react-native-reanimated", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    __esModule: true,
    default: {
      View,
    },
    useAnimatedStyle: (calculStyle: () => unknown) => {
      const style = calculStyle();
      mockStylesAnimes.push(style);
      return style;
    },
  };
});

jest.mock("../components/game/CanvasCartesAtlas", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    CanvasCartesAtlas: ({ testID }: { testID?: string }) => (
      <View testID={testID ?? "canvas-cartes-atlas"} />
    ),
  };
});

function creerSharedValue(valeur: number): SharedValue<number> {
  return { value: valeur } as SharedValue<number>;
}

function creerCanvasProps(
  progression: number,
): ComponentProps<typeof DistributionCanvasSud> {
  const carte: Carte = { couleur: "pique", rang: "as" };

  return {
    atlas: {
      image: {
        width: () => 1336,
        height: () => 1215,
      } as unknown as NonNullable<
        ComponentProps<typeof DistributionCanvasSud>["atlas"]["image"]
      >,
      largeurCellule: 167,
      hauteurCellule: 243,
      rectSource: () => ({ x: 0, y: 0, width: 167, height: 243 }),
      rectDos: () => ({ x: 0, y: 972, width: 167, height: 243 }),
    },
    cartesAtlas: [
      {
        carte,
        joueur: "sud" as const,
        depart: { x: 0.5, y: 0.5 },
        arrivee: { x: 0.8, y: 0.8 },
        controle: { x: 0.65, y: 0.45 },
        rotationDepart: 0,
        rotationArrivee: 0,
        echelleDepart: 0.5,
        echelleArrivee: 1,
        rectSource: { x: 0, y: 0, width: 167, height: 243 },
      },
    ],
    progressions: [creerSharedValue(progression)],
    donneesWorklet: {
      value: [0.5, 0.5, 0.65, 0.45, 0.8, 0.8, 0, 0, 0.5, 1],
    } as SharedValue<number[]>,
    nbCartesActives: creerSharedValue(1),
    zIndexes: [creerSharedValue(0)],
    largeurEcran: 1000,
    hauteurEcran: 2000,
  };
}

describe("DistributionCanvasSud", () => {
  beforeEach(() => {
    mockStylesAnimes.length = 0;
  });

  it("cache une carte atlas qui n'a pas encore commence a voler", () => {
    render(<DistributionCanvasSud {...creerCanvasProps(-1)} />);

    expect(mockStylesAnimes[0]).toMatchObject({
      left: -10000,
      opacity: 0,
      top: -10000,
    });
  });

  it("cache une carte atlas deja arrivee a destination", () => {
    render(<DistributionCanvasSud {...creerCanvasProps(2)} />);

    expect(mockStylesAnimes[0]).toMatchObject({
      left: -10000,
      opacity: 0,
      top: -10000,
    });
  });

  it("laisse visible une carte atlas en cours de vol", () => {
    render(<DistributionCanvasSud {...creerCanvasProps(0.5)} />);

    expect(mockStylesAnimes[0]).toMatchObject({
      opacity: 1,
    });
  });

  it("ancre le bas de la carte sud sur la position d'arrivee pour eviter le rognage", () => {
    render(<DistributionCanvasSud {...creerCanvasProps(1)} />);

    const largeurCarte = Math.round(1000 * RATIO_LARGEUR_CARTE);
    const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);
    const styleCarte = StyleSheet.flatten(mockStylesAnimes[0]) as {
      top?: number;
      transformOrigin?: string;
    };

    expect(styleCarte.top).toBe(2000 * 0.8 - hauteurCarte);
    expect(styleCarte.transformOrigin).toBe(`${largeurCarte / 2}px ${hauteurCarte}px`);
  });
});
