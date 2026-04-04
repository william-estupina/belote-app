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
      nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
      cartesAtlasAdversaires: [],
      progressionsAdv: [],
      donneesWorkletAdv: { value: [] },
      nbCartesActivesAdv: { value: 0 },
    }) as unknown as ComponentProps<typeof CoucheAnimation>;

  it("affiche les cartes en vol sur la couche d'animation", () => {
    const { getByTestId } = render(<CoucheAnimation {...creerProps()} />);

    expect(getByTestId("carte-animee")).toBeTruthy();
  });

  it("ne monte pas le canvas adversaires quand aucune carte statique n'est visible", () => {
    const { queryByTestId } = render(<CoucheAnimation {...creerProps()} />);

    expect(queryByTestId("canvas-adversaires")).toBeNull();
  });

  it("garde le canvas adversaires quand la distribution est terminee mais que la main adverse reste visible", () => {
    const props = creerProps();
    props.nbCartesAdversaires = { nord: 5, est: 0, ouest: 0 };
    props.distributionEnCours = false;

    const { getByTestId } = render(<CoucheAnimation {...props} />);

    expect(getByTestId("canvas-adversaires")).toBeTruthy();
  });

  it("monte le canvas adversaires pendant la distribution", () => {
    const props = creerProps();
    props.nbCartesAdversaires = { nord: 5, est: 0, ouest: 0 };
    props.distributionEnCours = true;

    const { getByTestId } = render(<CoucheAnimation {...props} />);

    expect(getByTestId("canvas-adversaires")).toBeTruthy();
  });

  it("garde une scene atlas principale quand le mode reste cinematique hors distributionEnCours", () => {
    const props = creerProps();
    props.modeRenduCartes = "cinematique-distribution";
    props.distributionEnCours = false;
    props.cartesAtlasSud = [
      {
        carte: { couleur: "coeur", rang: "as" },
        joueur: "sud",
        depart: { x: 0.5, y: 0.5 },
        arrivee: { x: 0.5, y: 0.5 },
        controle: { x: 0.5, y: 0.5 },
        rotationDepart: 0,
        rotationArrivee: 0,
        echelleDepart: 1,
        echelleArrivee: 1,
        rectSource: { x: 0, y: 0, width: 1, height: 1 },
      },
    ];
    props.progressionsSud = [{ value: 1 }] as typeof props.progressionsSud;
    props.donneesWorkletSud = {
      value: new Array(10).fill(0),
    } as typeof props.donneesWorkletSud;
    props.nbCartesActivesSud = { value: 1 } as typeof props.nbCartesActivesSud;

    const { getByTestId } = render(<CoucheAnimation {...props} />);

    expect(getByTestId("couche-animation-scene-atlas")).toBeTruthy();
  });
});
