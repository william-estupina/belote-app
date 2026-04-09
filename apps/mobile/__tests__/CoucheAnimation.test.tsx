import { render } from "@testing-library/react-native";
import type { ComponentProps } from "react";

import { CoucheAnimation } from "../components/game/CoucheAnimation";

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
      largeurEcran: 1200,
      hauteurEcran: 800,
      atlas: { image: null, largeurCellule: 0, hauteurCellule: 0 },
    }) as unknown as ComponentProps<typeof CoucheAnimation>;

  it("rend un conteneur de couche d'animation", () => {
    const { toJSON } = render(<CoucheAnimation {...creerProps()} />);

    expect(toJSON()).toBeTruthy();
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
    props.zIndexesSud = [{ value: 0 }] as typeof props.zIndexesSud;

    const { getByTestId } = render(<CoucheAnimation {...props} />);

    expect(getByTestId("couche-animation-scene-atlas")).toBeTruthy();
  });
});
