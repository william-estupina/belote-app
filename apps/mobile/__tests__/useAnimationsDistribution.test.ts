import type { Carte, PositionJoueur } from "@belote/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { ANIMATIONS } from "../constants/layout";
import { calculerCiblesEventailAdversaire } from "../hooks/distributionLayoutAtlas";
import { useAnimationsDistribution } from "../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../hooks/useAtlasCartes";

type ValeurAnimeeMock = {
  delai: number;
  valeur: {
    type: "timing";
    valeur: number;
    duration: number;
  };
};

type SharedValueMock<T> = {
  historique: T[];
  value: T;
};

jest.mock("react-native-reanimated", () => ({
  Easing: {
    cubic: "cubic",
    out: <T>(valeur: T) => valeur,
  },
  makeMutable: <T>(valeur: T) => {
    let valeurCourante = valeur;
    const sharedValue: SharedValueMock<T> = {
      historique: [valeur],
      get value() {
        return valeurCourante;
      },
      set value(nouvelleValeur: T) {
        valeurCourante = nouvelleValeur;
        sharedValue.historique.push(nouvelleValeur);
      },
    };

    return sharedValue;
  },
  withDelay: (delai: number, valeur: unknown) => ({ delai, valeur }),
  withTiming: (valeur: number, config: { duration: number }) => ({
    type: "timing",
    valeur,
    duration: config.duration,
  }),
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
  it("conserve les cartes adverses deja en main pendant la distribution restante dans le pool unique", () => {
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

    expect(result.current.cartesAtlas).toHaveLength(32);
    expect(result.current.nbCartesActives.value).toBe(32);
  });

  it("decale les cartes adverses deja presentes vers l'eventail final dans le pool unique", () => {
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

    const ciblesNordAttendues = calculerCiblesEventailAdversaire(
      "nord",
      0,
      5,
      8,
      1280,
      720,
    );
    const cartesNordExistantes = result.current.cartesAtlas.slice(8, 13);

    expect(cartesNordExistantes).toHaveLength(5);

    for (let index = 0; index < cartesNordExistantes.length; index += 1) {
      expect(cartesNordExistantes[index].arrivee.x).toBeCloseTo(
        ciblesNordAttendues[index].arrivee.x,
        5,
      );
      expect(cartesNordExistantes[index].arrivee.y).toBeCloseTo(
        ciblesNordAttendues[index].arrivee.y,
        5,
      );
      expect(cartesNordExistantes[index].rotationArrivee).toBeCloseTo(
        ciblesNordAttendues[index].rotationArrivee,
        5,
      );
    }
  });

  it("fait glisser les cartes adverses deja presentes depuis leur eventail courant dans le pool unique", () => {
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

    const ciblesNordDepart = calculerCiblesEventailAdversaire("nord", 0, 5, 5, 1280, 720);
    const cartesNordExistantes = result.current.cartesAtlas.slice(8, 13);

    expect(cartesNordExistantes).toHaveLength(5);

    for (let index = 0; index < cartesNordExistantes.length; index += 1) {
      expect(cartesNordExistantes[index].depart.x).toBeCloseTo(
        ciblesNordDepart[index].arrivee.x,
        5,
      );
      expect(cartesNordExistantes[index].depart.y).toBeCloseTo(
        ciblesNordDepart[index].arrivee.y,
        5,
      );
      expect(cartesNordExistantes[index].rotationDepart).toBeCloseTo(
        ciblesNordDepart[index].rotationArrivee,
        5,
      );
    }

    expect(result.current.progressions[8].value).toEqual({
      delai: ANIMATIONS.distribution.delaiEntreJoueurs,
      valeur: {
        type: "timing",
        valeur: 1,
        duration: ANIMATIONS.distribution.dureeCarte,
      },
    });
  });

  it("garde visibles les cartes adverses deja presentes avant leur glissement differe dans le pool unique", () => {
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

    const progressionNord = result.current.progressions[8] as unknown as SharedValueMock<
      number | ValeurAnimeeMock
    >;

    const historiqueRecent = progressionNord.historique.slice(-3);

    expect(historiqueRecent[0]).toBe(-1);
    expect(historiqueRecent[1]).toBe(0);
    expect(historiqueRecent[2]).toEqual({
      delai: ANIMATIONS.distribution.delaiEntreJoueurs,
      valeur: {
        type: "timing",
        valeur: 1,
        duration: ANIMATIONS.distribution.dureeCarte,
      },
    });
  });

  it("masque uniquement les slots sud sans terminer la distribution logique", () => {
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
      result.current.lancerDistribution({
        sud: creerMain("sud", 5, 0),
        ouest: creerMain("ouest", 5, 10),
        nord: creerMain("nord", 5, 20),
        est: creerMain("est", 5, 30),
      });
    });

    act(() => {
      result.current.masquerCartesSud();
    });

    expect(
      result.current.progressions
        .slice(0, 8)
        .every((progression) => progression.value < 0),
    ).toBe(true);
    expect(result.current.enCours).toBe(true);
  });
});
