import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ReserveCentrale } from "../components/game/ReserveCentrale";
import { RATIO_LARGEUR_CARTE } from "../constants/layout";

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

  it("rend un paquet plus massif au depart puis nettement aminci quand il se vide", () => {
    const { rerender } = render(
      <ReserveCentrale
        afficherPaquet={true}
        cartesPaquetVisibles={32}
        carteRetournee={null}
        largeurEcran={1000}
        hauteurEcran={700}
        atlas={atlas as never}
      />,
    );

    const couchesPleines = screen.getAllByTestId("carte-dos");
    const styleDerniereCouchePleine = StyleSheet.flatten(
      screen.getByTestId("reserve-paquet-couche-7").props.style,
    );

    rerender(
      <ReserveCentrale
        afficherPaquet={true}
        cartesPaquetVisibles={4}
        carteRetournee={null}
        largeurEcran={1000}
        hauteurEcran={700}
        atlas={atlas as never}
      />,
    );

    const couchesVides = screen.getAllByTestId("carte-dos");

    expect(couchesPleines).toHaveLength(8);
    expect(couchesVides).toHaveLength(1);
    expect(styleDerniereCouchePleine.left).toBeGreaterThan(6);
    expect(styleDerniereCouchePleine.top).toBeLessThan(-10);
  });

  it("place le paquet a gauche et la carte retournee a droite du paquet", () => {
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

    const largeurCarte = 1000 * RATIO_LARGEUR_CARTE * 0.85;
    const stylePaquet = StyleSheet.flatten(
      screen.getByTestId("reserve-paquet").props.style,
    );
    const styleCarteRetournee = StyleSheet.flatten(
      screen.getByTestId("reserve-carte-retournee").props.style,
    );

    expect(stylePaquet.left).toBe(0);
    expect(stylePaquet.width).toBeCloseTo(largeurCarte, 4);
    expect(styleCarteRetournee.left).toBeCloseTo(largeurCarte + 6, 4);
  });

  it("peut garder la carte retournee montee mais invisible pendant la revelation", () => {
    render(
      <ReserveCentrale
        afficherPaquet={true}
        cartesPaquetVisibles={12}
        carteRetournee={{ couleur: "coeur", rang: "as" }}
        opaciteCarteRetournee={0}
        largeurEcran={1000}
        hauteurEcran={700}
        atlas={atlas as never}
      />,
    );

    const styleCarteRetournee = StyleSheet.flatten(
      screen.getByTestId("reserve-carte-retournee").props.style,
    );

    expect(styleCarteRetournee.opacity).toBe(0);
  });

  it("masque le paquet quand il n'y a plus de cartes visibles meme si la reserve reste montee", () => {
    const { queryByTestId } = render(
      <ReserveCentrale
        afficherPaquet={true}
        cartesPaquetVisibles={0}
        carteRetournee={null}
        largeurEcran={1000}
        hauteurEcran={700}
        atlas={atlas as never}
      />,
    );

    expect(queryByTestId("reserve-paquet")).toBeNull();
    expect(queryByTestId("carte-dos")).toBeNull();
  });

  it("garde le paquet exactement au meme endroit avec ou sans carte retournee", () => {
    const { rerender } = render(
      <ReserveCentrale
        afficherPaquet={true}
        cartesPaquetVisibles={32}
        carteRetournee={null}
        largeurEcran={1000}
        hauteurEcran={700}
        atlas={atlas as never}
      />,
    );

    const styleSansCarte = StyleSheet.flatten(
      screen.getByTestId("reserve-centrale").props.style,
    );

    rerender(
      <ReserveCentrale
        afficherPaquet={true}
        cartesPaquetVisibles={12}
        carteRetournee={{ couleur: "coeur", rang: "as" }}
        largeurEcran={1000}
        hauteurEcran={700}
        atlas={atlas as never}
      />,
    );

    const styleAvecCarte = StyleSheet.flatten(
      screen.getByTestId("reserve-centrale").props.style,
    );
    const largeurCarte = 1000 * RATIO_LARGEUR_CARTE * 0.85;
    const positionHistoriquePaquet = 1000 * 0.5 - (largeurCarte * 2 + 6) / 2;

    expect(styleSansCarte.left).toBeCloseTo(positionHistoriquePaquet, 4);
    expect(styleAvecCarte.left).toBeCloseTo(positionHistoriquePaquet, 4);
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
