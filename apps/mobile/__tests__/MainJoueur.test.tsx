import type { Carte } from "@belote/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";

import { MainJoueur } from "../components/game/MainJoueur";
import { calculerDispositionMainJoueur } from "../components/game/mainJoueurDisposition";
import { RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../constants/layout";

const mockWithTiming = jest.fn(
  (valeur: number, config?: { duration?: number; easing?: unknown }) => valeur,
);
jest.mock("react-native-reanimated", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    __esModule: true,
    default: {
      View,
    },
    Easing: {
      cubic: jest.fn(),
      inOut: jest.fn(() => jest.fn()),
    },
    makeMutable: <T,>(valeur: T) => ({ value: valeur }),
    useSharedValue: (valeur: number) => ({ value: valeur }),
    useAnimatedStyle: (calculStyle: () => unknown) => calculStyle(),
    withTiming: (valeur: number, config?: { duration?: number; easing?: unknown }) =>
      mockWithTiming(valeur, config),
  };
});

jest.mock("../components/game/CanvasMainJoueurAtlas", () => ({
  CanvasMainJoueurAtlas: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="canvas-main-joueur-atlas" />;
  },
}));

const CARTES: Carte[] = [
  { couleur: "pique", rang: "as" },
  { couleur: "coeur", rang: "roi" },
  { couleur: "trefle", rang: "dame" },
];

const QUATRE_CARTES: Carte[] = [...CARTES, { couleur: "carreau", rang: "10" }];

const MOCK_ATLAS = {
  image: null,
  largeurCellule: 0,
  hauteurCellule: 0,
  rectSource: () => ({ x: 0, y: 0, width: 0, height: 0 }),
} as unknown as import("../hooks/useAtlasCartes").AtlasCartes;

const creerMockValeursAnimation = () =>
  ({
    x: Array.from({ length: 8 }, () => ({ value: 0 })),
    decalageY: Array.from({ length: 8 }, () => ({ value: 0 })),
    angle: Array.from({ length: 8 }, () => ({ value: 0 })),
    echelle: Array.from({ length: 8 }, () => ({ value: 1 })),
  }) as unknown as import("../hooks/useBufferCanvasUnifie").ValeursAnimationMainJoueur;

const MOCK_VALEURS_ANIMATION = creerMockValeursAnimation();

describe("MainJoueur", () => {
  beforeEach(() => {
    mockWithTiming.mockClear();
  });

  it("rend les zones de hit de la main sud (rendu visuel delegue au canvas unifie)", () => {
    render(
      <MainJoueur
        cartes={CARTES}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={CARTES}
        interactionActive
        atlas={MOCK_ATLAS}
        valeursAnimation={MOCK_VALEURS_ANIMATION}
        onCarteJouee={() => {}}
      />,
    );

    expect(screen.getByTestId("main-joueur")).toBeTruthy();
    expect(screen.getByTestId("carte-main-pique-as")).toBeTruthy();
  });

  it("conserve les zones de hit quand le tour humain se desactive", () => {
    const { rerender } = render(
      <MainJoueur
        cartes={CARTES}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={CARTES}
        interactionActive
        atlas={MOCK_ATLAS}
        valeursAnimation={MOCK_VALEURS_ANIMATION}
        onCarteJouee={() => {}}
      />,
    );

    rerender(
      <MainJoueur
        cartes={CARTES}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={[]}
        interactionActive={false}
        atlas={MOCK_ATLAS}
        valeursAnimation={MOCK_VALEURS_ANIMATION}
        onCarteJouee={() => {}}
      />,
    );

    expect(screen.getByTestId("main-joueur")).toBeTruthy();
    expect(screen.getByTestId("carte-main-pique-as")).toBeTruthy();
  });

  it("n anime pas une seconde entree pour les nouvelles cartes pendant la distribution", () => {
    const propsBase: ComponentProps<typeof MainJoueur> = {
      cartes: CARTES,
      largeurEcran: 1400,
      hauteurEcran: 1000,
      cartesJouables: CARTES,
      interactionActive: false,
      atlas: MOCK_ATLAS,
      valeursAnimation: MOCK_VALEURS_ANIMATION,
      onCarteJouee: () => {},
    };

    const { rerender } = render(<MainJoueur {...propsBase} />);

    mockWithTiming.mockClear();

    const propsDistribution = {
      ...propsBase,
      cartes: QUATRE_CARTES,
      animerNouvellesCartes: false,
    } as ComponentProps<typeof MainJoueur>;

    rerender(<MainJoueur {...propsDistribution} />);

    expect(mockWithTiming).toHaveBeenCalledTimes(9);
  });

  it("desactive les cartes non jouables quand c est le tour humain", () => {
    render(
      <MainJoueur
        cartes={CARTES}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={[CARTES[0]]}
        interactionActive
        atlas={MOCK_ATLAS}
        valeursAnimation={MOCK_VALEURS_ANIMATION}
        onCarteJouee={() => {}}
      />,
    );

    expect(screen.getByTestId("carte-main-pique-as").props.accessibilityState).toEqual({
      disabled: false,
    });
    expect(screen.getByTestId("carte-main-coeur-roi").props.accessibilityState).toEqual({
      disabled: true,
    });
    expect(screen.getByTestId("carte-main-trefle-dame").props.accessibilityState).toEqual(
      { disabled: true },
    );
  });

  it("expose des testID stables pour la main et chaque carte", () => {
    render(
      <MainJoueur
        cartes={CARTES}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={CARTES}
        interactionActive
        atlas={MOCK_ATLAS}
        valeursAnimation={MOCK_VALEURS_ANIMATION}
        onCarteJouee={() => {}}
      />,
    );

    expect(screen.getByTestId("main-joueur")).toBeTruthy();
    expect(screen.getByTestId("carte-main-pique-as")).toBeTruthy();
    expect(screen.getByTestId("carte-main-coeur-roi")).toBeTruthy();
    expect(screen.getByTestId("carte-main-trefle-dame")).toBeTruthy();
  });

  it("ralentit legerement la reorganisation principale tout en gardant le petit fondu rapide", () => {
    render(
      <MainJoueur
        cartes={CARTES}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={CARTES}
        interactionActive={false}
        atlas={MOCK_ATLAS}
        valeursAnimation={MOCK_VALEURS_ANIMATION}
        onCarteJouee={() => {}}
      />,
    );

    expect(mockWithTiming).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ duration: 210 }),
    );
    expect(mockWithTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: 50 }),
    );
  });

  it("accelere le resserrement quand une carte quitte la main sud", () => {
    const { rerender } = render(
      <MainJoueur
        cartes={CARTES}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={CARTES}
        interactionActive={false}
        atlas={MOCK_ATLAS}
        valeursAnimation={MOCK_VALEURS_ANIMATION}
        onCarteJouee={() => {}}
      />,
    );

    mockWithTiming.mockClear();

    rerender(
      <MainJoueur
        cartes={CARTES.slice(0, 2)}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={CARTES.slice(0, 2)}
        interactionActive={false}
        atlas={MOCK_ATLAS}
        valeursAnimation={MOCK_VALEURS_ANIMATION}
        onCarteJouee={() => {}}
      />,
    );

    expect(mockWithTiming).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ duration: 120 }),
    );
    expect(mockWithTiming).not.toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ duration: 210 }),
    );
  });

  it("supporte le passage de la derniere carte a une main vide", () => {
    const { rerender, queryByTestId } = render(
      <MainJoueur
        cartes={[CARTES[0]]}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={[CARTES[0]]}
        interactionActive={false}
        atlas={MOCK_ATLAS}
        valeursAnimation={MOCK_VALEURS_ANIMATION}
        onCarteJouee={() => {}}
      />,
    );

    expect(() =>
      rerender(
        <MainJoueur
          cartes={[]}
          largeurEcran={1400}
          hauteurEcran={1000}
          cartesJouables={[]}
          interactionActive={false}
          atlas={MOCK_ATLAS}
          valeursAnimation={MOCK_VALEURS_ANIMATION}
          onCarteJouee={() => {}}
        />,
      ),
    ).not.toThrow();
    expect(queryByTestId("main-joueur")).toBeNull();
  });

  it("masque uniquement la carte en cours de pose tout en conservant son emplacement", () => {
    render(
      <MainJoueur
        cartes={CARTES}
        cartesMasquees={[CARTES[1]]}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={CARTES}
        interactionActive={false}
        atlas={MOCK_ATLAS}
        valeursAnimation={MOCK_VALEURS_ANIMATION}
        onCarteJouee={() => {}}
      />,
    );

    expect(screen.getByTestId("carte-main-coeur-roi").props.style).toEqual(
      expect.objectContaining({ opacity: 0 }),
    );
    expect(screen.getByTestId("carte-main-pique-as").props.style).toEqual(
      expect.objectContaining({ opacity: 1 }),
    );
  });

  it("remonte l etat visuel complet de la carte jouee", () => {
    const surCarteJouee = jest.fn();
    const largeurEcran = 1400;
    const hauteurEcran = 1000;
    const largeurCarte = Math.round(largeurEcran * RATIO_LARGEUR_CARTE);
    const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);
    const disposition = calculerDispositionMainJoueur({
      mode: "eventail",
      nbCartes: CARTES.length,
      largeurEcran,
      hauteurEcran,
      largeurCarte,
      hauteurCarte,
    });
    const carteDisposition = disposition.cartes[0];
    const angleRadians = (carteDisposition.angle * Math.PI) / 180;
    const xCentreCarte = carteDisposition.x + largeurCarte / 2;
    const yCentreCarte =
      1 -
      (carteDisposition.decalageY + hauteurCarte / 2 - hauteurCarte * 0.15) /
        hauteurEcran;
    const xAttendu =
      (xCentreCarte + (hauteurCarte / 2 + 8) * Math.sin(angleRadians)) / largeurEcran;
    const yAttendu =
      yCentreCarte +
      ((hauteurCarte / 2) * (1 - Math.cos(angleRadians)) - 8 * Math.cos(angleRadians)) /
        hauteurEcran;

    render(
      <MainJoueur
        cartes={CARTES}
        largeurEcran={largeurEcran}
        hauteurEcran={hauteurEcran}
        cartesJouables={CARTES}
        interactionActive
        atlas={MOCK_ATLAS}
        valeursAnimation={MOCK_VALEURS_ANIMATION}
        onCarteJouee={surCarteJouee}
      />,
    );

    fireEvent.press(screen.getByTestId("carte-main-pique-as"));

    expect(surCarteJouee).toHaveBeenCalledWith(
      CARTES[0],
      expect.objectContaining({
        x: xAttendu,
        y: yAttendu,
        rotation: carteDisposition.angle,
        echelle: 1,
      }),
    );
  });

  it("conserve le soulevement de la carte pendant l attente du relais", () => {
    render(
      <MainJoueur
        cartes={CARTES}
        cartesEnPose={[CARTES[1]]}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={CARTES}
        interactionActive={false}
        atlas={MOCK_ATLAS}
        valeursAnimation={MOCK_VALEURS_ANIMATION}
        onCarteJouee={() => {}}
      />,
    );

    const styleCarteEnPose = screen.getByTestId("carte-main-coeur-roi").props.style;
    const styleCarteNormale = screen.getByTestId("carte-main-pique-as").props.style;

    expect(styleCarteEnPose).toEqual(
      expect.objectContaining({ transform: [{ translateY: -8 }] }),
    );
    expect(styleCarteNormale).toEqual(expect.objectContaining({ transform: [] }));
  });
});
