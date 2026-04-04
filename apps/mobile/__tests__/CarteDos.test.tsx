import { render } from "@testing-library/react-native";
import { StyleSheet, View } from "react-native";

import { CarteDos } from "../components/game/Carte";

jest.mock("@shopify/react-native-skia", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);

  return {
    Atlas: () => React.createElement(View),
    Canvas: Passthrough,
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

function extraireStylesDos(largeur: number, hauteur: number) {
  const rendu = render(<CarteDos largeur={largeur} hauteur={hauteur} />);
  const vues = rendu.UNSAFE_getAllByType(View);

  return {
    carte: StyleSheet.flatten(vues[0].props.style),
    cadreExterieur: StyleSheet.flatten(vues[1].props.style),
    motifInterieur: StyleSheet.flatten(vues[2].props.style),
  };
}

describe("CarteDos", () => {
  it("fait varier les liseres dores proportionnellement a la largeur de carte", () => {
    const stylesPetits = extraireStylesDos(90, 130);
    const stylesGrands = extraireStylesDos(180, 261);

    expect(stylesGrands.carte.borderWidth).toBeCloseTo(
      stylesPetits.carte.borderWidth * 2,
      2,
    );
    expect(stylesGrands.cadreExterieur.borderWidth).toBeCloseTo(
      stylesPetits.cadreExterieur.borderWidth * 2,
      2,
    );
    expect(stylesGrands.motifInterieur.borderWidth).toBeCloseTo(
      stylesPetits.motifInterieur.borderWidth * 2,
      2,
    );
  });
});
