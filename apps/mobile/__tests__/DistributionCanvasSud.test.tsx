import type { Carte } from "@belote/shared-types";
import { render } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import type { SharedValue } from "react-native-reanimated";

import { CanvasCartesUnifie } from "../components/game/CanvasCartesUnifie";

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

function creerSharedValue(valeur: number): SharedValue<number> {
  return { value: valeur } as SharedValue<number>;
}

function creerCanvasProps(
  progression: number,
): ComponentProps<typeof CanvasCartesUnifie> {
  const carte: Carte = { couleur: "pique", rang: "as" };
  const cartesAtlas = Array.from({ length: 32 }, (_, index) => ({
    carte,
    joueur: index < 8 ? ("sud" as const) : ("nord" as const),
    depart: { x: 0.5, y: 0.5 },
    arrivee: { x: 0.8, y: 0.8 },
    controle: { x: 0.65, y: 0.45 },
    rotationDepart: 0,
    rotationArrivee: 0,
    echelleDepart: 0.5,
    echelleArrivee: 1,
    rectSource: { x: 0, y: 0, width: 167, height: 243 },
  }));
  const progressions = Array.from({ length: 32 }, (_, index) =>
    creerSharedValue(index === 0 ? progression : -1),
  );
  const donnees = new Array(32 * 10).fill(0);
  donnees.splice(0, 10, 0.5, 0.5, 0.65, 0.45, 0.8, 0.8, 0, 0, 0.5, 1);

  return {
    atlas: {
      image: {
        width: () => 1336,
        height: () => 1215,
      } as unknown as NonNullable<
        ComponentProps<typeof CanvasCartesUnifie>["atlas"]["image"]
      >,
      largeurCellule: 167,
      hauteurCellule: 243,
      rectSource: () => ({ x: 0, y: 0, width: 167, height: 243 }),
      rectDos: () => ({ x: 0, y: 972, width: 167, height: 243 }),
    },
    cartesAtlas,
    progressions,
    donneesWorklet: {
      value: donnees,
    } as SharedValue<number[]>,
    nbCartesActives: creerSharedValue(1),
    largeurEcran: 1000,
    hauteurEcran: 2000,
  };
}

describe("CanvasCartesUnifie", () => {
  beforeEach(() => {
    transformationsCapturees.length = 0;
    ombresCapturees.length = 0;
  });

  it("cache une carte atlas qui n'a pas encore commence a voler", () => {
    render(<CanvasCartesUnifie {...creerCanvasProps(-1)} />);

    expect(transformationsCapturees[0]).toEqual(TRANSFORMATION_HORS_ECRAN);
  });

  it("cache une carte atlas deja arrivee a destination", () => {
    render(<CanvasCartesUnifie {...creerCanvasProps(2)} />);

    expect(transformationsCapturees[0]).toEqual(TRANSFORMATION_HORS_ECRAN);
  });

  it("laisse visible une carte atlas en cours de vol", () => {
    render(<CanvasCartesUnifie {...creerCanvasProps(0.5)} />);

    expect(transformationsCapturees[0]).not.toEqual(TRANSFORMATION_HORS_ECRAN);
  });

  it("applique une ombre skia alignee sur les cartes statiques", () => {
    render(<CanvasCartesUnifie {...creerCanvasProps(0.5)} />);

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
