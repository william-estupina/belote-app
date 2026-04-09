import type { Carte, PositionJoueur } from "@belote/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import {
  MAX_SLOTS_ATLAS,
  SLOTS_ADVERSAIRES,
  STRIDE_UNIFIE,
} from "../constants/canvas-unifie";
import { ANIMATIONS } from "../constants/layout";
import { calculerCiblesEventailAdversaire } from "../hooks/distributionLayoutAtlas";
import { useAnimationsDistribution } from "../hooks/useAnimationsDistribution";
import type { AtlasCartes } from "../hooks/useAtlasCartes";
import type { BufferCanvasUnifie } from "../hooks/useBufferCanvasUnifie";

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
  runOnUI: (callback: () => void) => callback,
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

/** Crée un mock minimal du BufferCanvasUnifie pour les tests */
function creerMockBufferUnifie(): BufferCanvasUnifie {
  const makeMutableMock = <T>(valeur: T) => {
    let valeurCourante = valeur;
    const sv: SharedValueMock<T> = {
      historique: [valeur],
      get value() {
        return valeurCourante;
      },
      set value(nouvelleValeur: T) {
        valeurCourante = nouvelleValeur;
        sv.historique.push(nouvelleValeur);
      },
    };
    return sv;
  };

  const donneesWorklet = makeMutableMock(
    new Array(MAX_SLOTS_ATLAS * STRIDE_UNIFIE).fill(0),
  );
  const progressions = Array.from({ length: MAX_SLOTS_ATLAS }, () => makeMutableMock(-1));
  const sprites = Array.from({ length: MAX_SLOTS_ATLAS }, () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }));

  return {
    donneesWorklet: donneesWorklet as unknown as BufferCanvasUnifie["donneesWorklet"],
    progressions: progressions as unknown as BufferCanvasUnifie["progressions"],
    sprites: sprites as unknown as BufferCanvasUnifie["sprites"],
    colors: [] as unknown as BufferCanvasUnifie["colors"],
    valeursMain: {
      x: [],
      decalageY: [],
      angle: [],
      echelle: [],
    } as unknown as BufferCanvasUnifie["valeursMain"],
    flip: null,
    mettreAJourPiles: jest.fn(),
    mettreAJourReserve: jest.fn(),
    mettreAJourAdversaires: jest.fn(),
    mettreAJourMainJoueurSprites: jest.fn(),
    parquerSlot: jest.fn(),
    ecrireSlotStatique: jest.fn(),
    mettreAJourSprite: jest.fn(),
    allouerSlotAnimation: jest.fn(),
    libererSlotAnimation: jest.fn(),
    ecrireSlotAnime: jest.fn(),
  };
}

describe("useAnimationsDistribution", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

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

    const mockBuffer = creerMockBufferUnifie();
    const { result } = renderHook(() =>
      useAnimationsDistribution(atlas, { largeur: 1280, hauteur: 720 }, mockBuffer),
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

    // 24 cartes adversaires écrites dans le buffer unifié (3 positions × 8 cartes)
    expect(mockBuffer.mettreAJourSprite).toHaveBeenCalledTimes(24);
  });

  it("conserve les cartes sud deja en main pendant la distribution restante", () => {
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
    const cartesExistantesSud = creerMain("sud", 5, 40);
    const nouvellesCartesSud = creerMain("sud", 3, 0);

    const mockBuffer = creerMockBufferUnifie();
    const { result } = renderHook(() =>
      useAnimationsDistribution(atlas, { largeur: 1280, hauteur: 720 }, mockBuffer),
    );

    act(() => {
      result.current.lancerDistribution(
        {
          sud: nouvellesCartesSud,
          ouest: creerMain("ouest", 3, 10),
          nord: creerMain("nord", 3, 20),
          est: creerMain("est", 3, 30),
        },
        {
          cartesExistantesSud,
          nbCartesExistantesSud: 5,
          nbCartesExistantesAdversaires: {
            nord: 5,
            est: 5,
            ouest: 5,
          },
        },
      );
    });

    expect(result.current.cartesAtlasSud).toHaveLength(8);
    expect(result.current.nbCartesActivesSud.value).toBe(8);
    expect(
      result.current.cartesAtlasSud
        .slice(0, 5)
        .map((carteAtlas) => carteAtlas.carte.rang),
    ).toEqual(cartesExistantesSud.map((carte) => carte.rang));
  });

  it("reorganise le premier paquet sud depuis son etat courant sans rejouer l'echelle de vol", () => {
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

    const mockBuffer = creerMockBufferUnifie();
    const { result } = renderHook(() =>
      useAnimationsDistribution(atlas, { largeur: 1280, hauteur: 720 }, mockBuffer),
    );

    act(() => {
      result.current.lancerDistribution({
        sud: creerMain("sud", 5, 0),
        ouest: creerMain("ouest", 5, 10),
        nord: creerMain("nord", 5, 20),
        est: creerMain("est", 5, 30),
      });
    });

    const donneesAvantDecalage = [...result.current.donneesWorkletSud.value];

    act(() => {
      jest.runAllTimers();
    });

    for (let index = 0; index < 3; index += 1) {
      const offset = index * 10;
      expect(result.current.donneesWorkletSud.value[offset + 6]).toBeCloseTo(
        donneesAvantDecalage[offset + 7],
        5,
      );
      expect(result.current.donneesWorkletSud.value[offset + 8]).toBeCloseTo(
        donneesAvantDecalage[offset + 9],
        5,
      );
    }
  });

  it("ralentit le second tour de distribution par rapport au premier", () => {
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

    const mockBuffer = creerMockBufferUnifie();
    const { result } = renderHook(() =>
      useAnimationsDistribution(atlas, { largeur: 1280, hauteur: 720 }, mockBuffer),
    );

    act(() => {
      result.current.lancerDistribution({
        sud: creerMain("sud", 5, 0),
        ouest: creerMain("ouest", 5, 10),
        nord: creerMain("nord", 5, 20),
        est: creerMain("est", 5, 30),
      });
    });

    expect(result.current.progressionsSud[0].value).toMatchObject({
      valeur: {
        duration: ANIMATIONS.distribution.dureeCarte,
      },
    });
    expect(result.current.progressionsSud[3].value).toMatchObject({
      valeur: {
        duration: ANIMATIONS.distribution.dureeCarteSecondTour,
      },
    });
  });

  it("decale aussi le premier paquet nord de 3 vers 5 cartes quand le second paquet part", () => {
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

    const mockBuffer = creerMockBufferUnifie();
    const { result } = renderHook(() =>
      useAnimationsDistribution(atlas, { largeur: 1280, hauteur: 720 }, mockBuffer),
    );

    act(() => {
      result.current.lancerDistribution({
        sud: creerMain("sud", 5, 0),
        ouest: creerMain("ouest", 5, 10),
        nord: creerMain("nord", 5, 20),
        est: creerMain("est", 5, 30),
      });
    });

    // Vérifie que des données adversaires ont été écrites dans le buffer unifié
    const buf = mockBuffer.donneesWorklet.value as number[];

    // 15 cartes adversaires (5 par position × 3 positions)
    // Vérifie que les slots adversaires ont des données non nulles (arrivées)
    let slotsEcrits = 0;
    for (let i = 0; i < 15; i += 1) {
      const offset = (SLOTS_ADVERSAIRES.debut + i) * STRIDE_UNIFIE;
      if (buf[offset + 4] !== 0 || buf[offset + 5] !== 0) {
        slotsEcrits += 1;
      }
    }
    expect(slotsEcrits).toBe(15);

    act(() => {
      jest.runAllTimers();
    });

    // Après les timers, le décalage du premier paquet doit avoir mis à jour le buffer
    const bufApres = mockBuffer.donneesWorklet.value as number[];
    let slotsEcritsApres = 0;
    for (let i = 0; i < 15; i += 1) {
      const offset = (SLOTS_ADVERSAIRES.debut + i) * STRIDE_UNIFIE;
      if (bufApres[offset + 4] !== 0 || bufApres[offset + 5] !== 0) {
        slotsEcritsApres += 1;
      }
    }
    expect(slotsEcritsApres).toBe(15);
  });

  it("decale les cartes adverses deja presentes vers l'eventail final", () => {
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

    const mockBuffer = creerMockBufferUnifie();
    const { result } = renderHook(() =>
      useAnimationsDistribution(atlas, { largeur: 1280, hauteur: 720 }, mockBuffer),
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

    // 24 cartes adversaires (5 existantes + 3 nouvelles × 3 positions) écrites dans le buffer
    const buf = mockBuffer.donneesWorklet.value as number[];
    let slotsEcrits = 0;
    for (let i = 0; i < 24; i += 1) {
      const offset = (SLOTS_ADVERSAIRES.debut + i) * STRIDE_UNIFIE;
      if (buf[offset + 4] !== 0 || buf[offset + 5] !== 0) {
        slotsEcrits += 1;
      }
    }
    expect(slotsEcrits).toBe(24);
  });

  it("fait glisser les cartes adverses deja presentes depuis leur eventail courant", () => {
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

    const mockBuffer = creerMockBufferUnifie();
    const { result } = renderHook(() =>
      useAnimationsDistribution(atlas, { largeur: 1280, hauteur: 720 }, mockBuffer),
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

    // Vérifier les positions de départ des 5 cartes nord existantes dans le buffer unifié
    const buf = mockBuffer.donneesWorklet.value as number[];
    for (let index = 0; index < 5; index += 1) {
      const offset = (SLOTS_ADVERSAIRES.debut + index) * STRIDE_UNIFIE;
      expect(buf[offset + 0]).toBeCloseTo(ciblesNordDepart[index].arrivee.x, 5);
      expect(buf[offset + 1]).toBeCloseTo(ciblesNordDepart[index].arrivee.y, 5);
      expect(buf[offset + 6]).toBeCloseTo(ciblesNordDepart[index].rotationArrivee, 5);
    }

    const progressionNord0 = mockBuffer.progressions[SLOTS_ADVERSAIRES.debut];
    expect(progressionNord0.value).toEqual({
      delai: ANIMATIONS.distribution.delaiEntreJoueurs,
      valeur: {
        type: "timing",
        valeur: 1,
        duration: ANIMATIONS.distribution.dureeCarte,
      },
    });
  });

  it("garde visibles les cartes adverses deja presentes avant leur glissement differe", () => {
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

    const mockBuffer = creerMockBufferUnifie();
    const { result } = renderHook(() =>
      useAnimationsDistribution(atlas, { largeur: 1280, hauteur: 720 }, mockBuffer),
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

    const progressionNord = mockBuffer.progressions[
      SLOTS_ADVERSAIRES.debut
    ] as unknown as SharedValueMock<number | ValeurAnimeeMock>;

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

  it("ne masque pas le dernier paquet sud a la fin de la distribution", () => {
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

    const mockBuffer = creerMockBufferUnifie();
    const { result } = renderHook(() =>
      useAnimationsDistribution(atlas, { largeur: 1280, hauteur: 720 }, mockBuffer),
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
      jest.runAllTimers();
    });

    expect(result.current.progressionsSud[4].value).not.toBe(2);
  });
});
