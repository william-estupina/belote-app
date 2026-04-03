import { render } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import type { SharedValue } from "react-native-reanimated";

import { CanvasAdversaires } from "../components/game/CanvasAdversaires";

type TransformationCapturee = [number, number, number, number];
type OmbreCapturee = {
  blur: number;
  color: string;
  dx: number;
  dy: number;
};

const transformationsCapturees: TransformationCapturee[] = [];
const ombresCapturees: OmbreCapturee[] = [];
const TRANSFORMATION_HORS_ECRAN: TransformationCapturee = [0, 0, -10000, -10000];

jest.mock("@shopify/react-native-skia", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);

  return {
    Canvas: Passthrough,
    Atlas: () => null,
    Group: Passthrough,
    Shadow: (props: OmbreCapturee) => {
      ombresCapturees.push(props);
      return null;
    },
    rect: (x: number, y: number, width: number, height: number) => ({
      x,
      y,
      width,
      height,
    }),
    useRSXformBuffer: (
      nbCartes: number,
      calculerTransformation: (
        valeur: { set: (...transformation: TransformationCapturee) => void },
        index: number,
      ) => void,
    ) => {
      transformationsCapturees.length = 0;

      for (let index = 0; index < nbCartes; index += 1) {
        calculerTransformation(
          {
            set: (...transformation: TransformationCapturee) => {
              transformationsCapturees[index] = transformation;
            },
          },
          index,
        );
      }

      return transformationsCapturees;
    },
  };
});

function creerSharedValueNombre(valeur: number): SharedValue<number> {
  return { value: valeur } as SharedValue<number>;
}

function creerSharedValueTableau(valeur: number[]): SharedValue<number[]> {
  return { value: valeur } as SharedValue<number[]>;
}

function creerProps(
  progression: number,
  distributionEnCours = true,
): ComponentProps<typeof CanvasAdversaires> {
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
    nbCartesAdversaires: { nord: 1, est: 0, ouest: 0 },
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
    progressions: [creerSharedValueNombre(progression)],
    donneesWorklet: creerSharedValueTableau([0.5, 0.5, 0.5, 0.35, 0.5, 0.2, 0, 0, 1, 1]),
    nbCartesActives: creerSharedValueNombre(1),
    distributionEnCours,
  };
}

describe("CanvasAdversaires", () => {
  beforeEach(() => {
    transformationsCapturees.length = 0;
    ombresCapturees.length = 0;
  });

  it("cache une carte adverse qui n'est pas encore visible", () => {
    render(<CanvasAdversaires {...creerProps(-1)} />);

    expect(transformationsCapturees[0]).toEqual(TRANSFORMATION_HORS_ECRAN);
  });

  it("laisse visible une carte adverse pendant son rendu atlas", () => {
    render(<CanvasAdversaires {...creerProps(0.5)} />);

    expect(transformationsCapturees[0]).not.toEqual(TRANSFORMATION_HORS_ECRAN);
  });

  it("applique la meme ombre skia que les autres dos de cartes atlas", () => {
    render(<CanvasAdversaires {...creerProps(0.5)} />);

    expect(ombresCapturees).toEqual([
      {
        blur: 4,
        color: "rgba(0, 0, 0, 0.35)",
        dx: 1,
        dy: 2,
      },
    ]);
  });
});
