import type { Carte, PositionJoueur } from "@belote/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { useAnimationsDistribution } from "../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../hooks/useAtlasCartes";

jest.mock("react-native-reanimated", () => ({
  Easing: {
    cubic: "cubic",
    out: <T>(valeur: T) => valeur,
  },
  makeMutable: <T>(valeur: T) => ({ value: valeur }),
  withDelay: (_delai: number, valeur: number) => valeur,
  withTiming: (valeur: number) => valeur,
}));

function creerCarte(index: number): Carte {
  const couleurs: Carte["couleur"][] = ["pique", "coeur", "carreau", "trefle"];
  const rangs: Carte["rang"][] = ["7", "8", "9", "10", "valet", "dame", "roi", "as"];

  return {
    couleur: couleurs[index % couleurs.length],
    rang: rangs[index % rangs.length],
  };
}

function creerMain(position: PositionJoueur, quantite: number, base: number): Carte[] {
  return Array.from({ length: quantite }, (_, index) => ({
    ...creerCarte(base + index),
    couleur:
      position === "sud"
        ? "coeur"
        : position === "ouest"
          ? "pique"
          : position === "nord"
            ? "carreau"
            : "trefle",
  }));
}

describe("useAnimationsDistribution", () => {
  it("conserve les cartes adverses deja en main pendant la distribution restante", () => {
    const atlas: AtlasCartes = {
      image: {
        width: () => 1336,
        height: () => 1215,
      } as NonNullable<AtlasCartes["image"]>,
      largeurCellule: 167,
      hauteurCellule: 243,
      rectSource: () => ({ x: 0, y: 0, width: 167, height: 243 }),
      rectDos: () => ({ x: 0, y: 972, width: 167, height: 243 }),
    };

    const { result } = renderHook(() =>
      useAnimationsDistribution(atlas, { largeur: 1280, hauteur: 720 }),
    );

    act(() => {
      result.current.lancerDistribution(
        {
          sud: creerMain("sud", 3, 0),
          ouest: creerMain("ouest", 3, 10),
          nord: creerMain("nord", 3, 20),
          est: creerMain("est", 3, 30),
        },
        {
          nbCartesExistantesSud: 5,
          nbCartesExistantesAdversaires: {
            nord: 5,
            est: 5,
            ouest: 5,
          },
        },
      );
    });

    expect(result.current.cartesAtlasAdversaires).toHaveLength(24);
    expect(result.current.nbCartesActivesAdv.value).toBe(24);
  });
});
