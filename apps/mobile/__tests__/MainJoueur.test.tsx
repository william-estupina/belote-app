import type { Carte } from "@belote/shared-types";
import { render } from "@testing-library/react-native";
import type { ComponentProps } from "react";

import { MainJoueur } from "../components/game/MainJoueur";

const mockMontagesCarte: string[] = [];
const mockDemontagesCarte: string[] = [];
const mockWithTiming = jest.fn(
  (valeur: number, config?: { duration?: number; easing?: unknown }) => valeur,
);
const mockPropsCartesAtlas: Array<{ id: string; grisee?: boolean }> = [];

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
    useSharedValue: (valeur: number) => ({ value: valeur }),
    useAnimatedStyle: (calculStyle: () => unknown) => calculStyle(),
    withTiming: (valeur: number, config?: { duration?: number; easing?: unknown }) =>
      mockWithTiming(valeur, config),
  };
});

jest.mock("../components/game/Carte", () => ({
  CarteFaceAtlas: ({ carte, grisee }: { carte: Carte; grisee?: boolean }) => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");
    const id = `${carte.couleur}-${carte.rang}`;

    mockPropsCartesAtlas.push({ id, grisee });

    React.useEffect(() => {
      mockMontagesCarte.push(id);
      return () => {
        mockDemontagesCarte.push(id);
      };
    }, [id]);

    return <View testID={`carte-${id}`} />;
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

describe("MainJoueur", () => {
  beforeEach(() => {
    mockMontagesCarte.length = 0;
    mockDemontagesCarte.length = 0;
    mockPropsCartesAtlas.length = 0;
    mockWithTiming.mockClear();
  });

  it("ne remonte pas les cartes restantes quand le tour humain se desactive", () => {
    const { rerender } = render(
      <MainJoueur
        cartes={CARTES}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={CARTES}
        interactionActive
        atlas={MOCK_ATLAS}
        onCarteJouee={() => {}}
      />,
    );

    mockMontagesCarte.length = 0;
    mockDemontagesCarte.length = 0;

    rerender(
      <MainJoueur
        cartes={CARTES}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={[]}
        interactionActive={false}
        atlas={MOCK_ATLAS}
        onCarteJouee={() => {}}
      />,
    );

    expect(mockDemontagesCarte).toEqual([]);
    expect(mockMontagesCarte).toEqual([]);
  });

  it("n anime pas une seconde entree pour les nouvelles cartes pendant la distribution", () => {
    const propsBase: ComponentProps<typeof MainJoueur> = {
      cartes: CARTES,
      largeurEcran: 1400,
      hauteurEcran: 1000,
      cartesJouables: CARTES,
      interactionActive: false,
      atlas: MOCK_ATLAS,
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

  it("grise les cartes non jouables quand c est le tour humain", () => {
    render(
      <MainJoueur
        cartes={CARTES}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={[CARTES[0]]}
        interactionActive
        atlas={MOCK_ATLAS}
        onCarteJouee={() => {}}
      />,
    );

    expect(mockPropsCartesAtlas).toEqual(
      expect.arrayContaining([
        { id: "pique-as", grisee: false },
        { id: "coeur-roi", grisee: true },
        { id: "trefle-dame", grisee: true },
      ]),
    );
  });

  it("reorganise la main 50 % plus vite et accelere aussi le fondu d entree", () => {
    render(
      <MainJoueur
        cartes={CARTES}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={CARTES}
        interactionActive={false}
        atlas={MOCK_ATLAS}
        onCarteJouee={() => {}}
      />,
    );

    expect(mockWithTiming).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ duration: 175 }),
    );
    expect(mockWithTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: 50 }),
    );
  });
});
