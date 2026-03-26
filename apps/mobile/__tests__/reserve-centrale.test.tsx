import { render, screen } from "@testing-library/react-native";

import { ReserveCentrale } from "../components/game/ReserveCentrale";

jest.mock("../components/game/Carte", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    CarteDos: () => <View testID="carte-dos" />,
    CarteFaceAtlas: () => <View testID="carte-face" />,
  };
});

jest.mock("react-native-reanimated", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    __esModule: true,
    default: { View },
    Easing: {
      ease: jest.fn(),
      inOut: jest.fn(() => jest.fn()),
    },
    interpolate: jest.fn(
      (_value: number, _input: number[], output: number[]) => output[0],
    ),
    useSharedValue: (valeur: number) => ({ value: valeur }),
    useAnimatedStyle: (calculStyle: () => unknown) => calculStyle(),
    withDelay: (_delai: number, valeur: number) => valeur,
    withTiming: (valeur: number) => valeur,
  };
});

describe("ReserveCentrale", () => {
  const atlas = {
    image: {},
    largeurCellule: 1,
    hauteurCellule: 1,
    rectSource: jest.fn(() => ({ x: 0, y: 0, width: 1, height: 1 })),
    rectDos: jest.fn(() => ({ x: 0, y: 0, width: 1, height: 1 })),
  };

  it("affiche le paquet central pendant la distribution et la redistribution", () => {
    render(
      <ReserveCentrale
        afficherPaquet={true}
        cartesPaquetVisibles={32}
        carteRetournee={null}
        largeurEcran={1000}
        hauteurEcran={700}
        atlas={atlas as never}
      />,
    );

    expect(screen.getByTestId("reserve-centrale")).toBeTruthy();
    expect(screen.getByTestId("reserve-paquet")).toBeTruthy();
  });

  it("garde le meme paquet et ajoute la carte retournee pendant les encheres", () => {
    render(
      <ReserveCentrale
        afficherPaquet={true}
        cartesPaquetVisibles={12}
        carteRetournee={{ couleur: "coeur", rang: "as" }}
        largeurEcran={1000}
        hauteurEcran={700}
        atlas={atlas as never}
      />,
    );

    expect(screen.getByTestId("reserve-paquet")).toBeTruthy();
    expect(screen.getByTestId("reserve-carte-retournee")).toBeTruthy();
  });

  it("ne rend rien sans paquet ni carte retournee", () => {
    const { queryByTestId } = render(
      <ReserveCentrale
        afficherPaquet={false}
        cartesPaquetVisibles={0}
        carteRetournee={null}
        largeurEcran={1000}
        hauteurEcran={700}
        atlas={atlas as never}
      />,
    );

    expect(queryByTestId("reserve-centrale")).toBeNull();
  });
});
