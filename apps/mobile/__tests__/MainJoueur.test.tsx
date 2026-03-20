import type { Carte } from "@belote/shared-types";
import { render } from "@testing-library/react-native";

import { MainJoueur } from "../components/game/MainJoueur";

const mockMontagesCarte: string[] = [];
const mockDemontagesCarte: string[] = [];

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
    withTiming: (valeur: number) => valeur,
  };
});

jest.mock("../components/game/Carte", () => ({
  CarteSkia: ({ carte }: { carte: Carte }) => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");
    const id = `${carte.couleur}-${carte.rang}`;

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

describe("MainJoueur", () => {
  beforeEach(() => {
    mockMontagesCarte.length = 0;
    mockDemontagesCarte.length = 0;
  });

  it("ne remonte pas les cartes restantes quand le tour humain se desactive", () => {
    const { rerender } = render(
      <MainJoueur
        cartes={CARTES}
        largeurEcran={1400}
        hauteurEcran={1000}
        cartesJouables={CARTES}
        interactionActive
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
        onCarteJouee={() => {}}
      />,
    );

    expect(mockDemontagesCarte).toEqual([]);
    expect(mockMontagesCarte).toEqual([]);
  });
});
