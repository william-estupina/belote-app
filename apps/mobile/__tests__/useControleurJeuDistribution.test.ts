import { getCartesJouables } from "@belote/game-logic";
import type { Carte, PositionJoueur } from "@belote/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { useControleurJeu } from "../hooks/useControleurJeu";

interface VueBotTest {
  maMain: Carte[];
  positionPartenaire: PositionJoueur;
  pliEnCours: Array<{ joueur: PositionJoueur; carte: Carte }>;
  couleurAtout: Carte["couleur"] | null;
  phaseJeu: "encheres1" | "encheres2" | "jeu";
}

type ActionBotTest = { type: "PASSER" } | { type: "JOUER_CARTE"; carte: Carte };

function creerProgressionsFactices(taille: number): Array<{ value: number }> {
  return Array.from({ length: taille }, () => ({ value: 0 }));
}

const mockDeciderBot = jest.fn<ActionBotTest, [VueBotTest?]>((_vueBot?: VueBotTest) => ({
  type: "PASSER",
}));
const mockLancerDistribution = jest.fn();
const mockTerminerDistribution = jest.fn();
const mockAjouterCartesGelees = jest.fn();
const mockAnnulerAnimations = jest.fn();
const mockLancerAnimationJeuCarte = jest.fn();
const mockLancerAnimationRamassagePli = jest.fn();
const mockLancerAnimationRetourPaquet = jest.fn();
const mockGlisserCarteRetournee = jest.fn();
const mockSurAnimationTerminee = jest.fn();
const mockAttendreDelaiBot = jest.fn(() => Promise.resolve());
const mockAnnulerDelai = jest.fn();
let mockProgressionsAdv = creerProgressionsFactices(24);
let mockProgressionsSud = creerProgressionsFactices(8);
let dernierLancementDistribution:
  | {
      mains: Record<"sud" | "ouest" | "nord" | "est", Carte[]>;
      options?: {
        onPaquetDepart?: (
          position: "sud" | "ouest" | "nord" | "est",
          cartes: Carte[],
        ) => void;
        onPaquetArrive?: (
          position: "sud" | "ouest" | "nord" | "est",
          cartes: Carte[],
        ) => void;
      };
    }
  | undefined;

jest.mock("@belote/bot-engine", () => ({
  deciderBot: (...args: Parameters<typeof mockDeciderBot>) => mockDeciderBot(...args),
}));

jest.mock("../hooks/useAnimations", () => ({
  construireCartesGeleesDepuisPli: () => [],
  useAnimations: () => ({
    cartesEnVol: [],
    surAnimationTerminee: mockSurAnimationTerminee,
    glisserCarteRetournee: mockGlisserCarteRetournee,
    lancerAnimationJeuCarte: mockLancerAnimationJeuCarte,
    lancerAnimationRamassagePli: mockLancerAnimationRamassagePli,
    lancerAnimationRetourPaquet: mockLancerAnimationRetourPaquet,
    ajouterCartesGelees: mockAjouterCartesGelees,
    annulerAnimations: mockAnnulerAnimations,
  }),
}));

jest.mock("../hooks/useAnimationsDistribution", () => ({
  useAnimationsDistribution: () => ({
    lancerDistribution: mockLancerDistribution,
    terminerDistribution: mockTerminerDistribution,
    cartesAtlasAdversaires: [],
    cartesAtlasSud: [],
    progressionsAdv: mockProgressionsAdv,
    donneesWorkletAdv: { value: [] },
    nbCartesActivesAdv: { value: 0 },
    progressionsSud: mockProgressionsSud,
    donneesWorkletSud: { value: [] },
    nbCartesActivesSud: { value: 0 },
    enCours: false,
  }),
}));

jest.mock("../hooks/useAtlasCartes", () => ({
  useAtlasCartes: () => ({
    image: {},
    largeurCellule: 1,
    hauteurCellule: 1,
  }),
}));

jest.mock("../hooks/useDelaiBot", () => ({
  useDelaiBot: () => ({
    attendreDelaiBot: mockAttendreDelaiBot,
    annulerDelai: mockAnnulerDelai,
  }),
}));

function configurerDistributionImmediate(): void {
  dernierLancementDistribution = undefined;
  mockLancerDistribution.mockImplementation(
    (
      mains: Record<"sud" | "ouest" | "nord" | "est", Carte[]>,
      options?: {
        onPaquetDepart?: (
          position: "sud" | "ouest" | "nord" | "est",
          cartes: Carte[],
        ) => void;
        onPaquetArrive?: (
          position: "sud" | "ouest" | "nord" | "est",
          cartes: Carte[],
        ) => void;
      },
    ) => {
      dernierLancementDistribution = { mains, options };
      for (const position of ["sud", "ouest", "nord", "est"] as const) {
        const cartes = mains[position];
        options?.onPaquetDepart?.(position, cartes);
        options?.onPaquetArrive?.(position, cartes);
      }
    },
  );
}

function configurerDistributionControlee(): void {
  dernierLancementDistribution = undefined;
  mockLancerDistribution.mockImplementation(
    (
      mains: Record<"sud" | "ouest" | "nord" | "est", Carte[]>,
      options?: {
        onPaquetDepart?: (
          position: "sud" | "ouest" | "nord" | "est",
          cartes: Carte[],
        ) => void;
        onPaquetArrive?: (
          position: "sud" | "ouest" | "nord" | "est",
          cartes: Carte[],
        ) => void;
      },
    ) => {
      dernierLancementDistribution = { mains, options };
    },
  );
}

async function viderFileEvenements(iterations = 12): Promise<void> {
  for (let index = 0; index < iterations; index += 1) {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });
  }
}

async function avancerJusqua(
  condition: () => boolean,
  iterationsMax = 20,
): Promise<void> {
  for (let index = 0; index < iterationsMax; index += 1) {
    if (condition()) {
      return;
    }

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });
  }
}

describe("useControleurJeu - redistribution", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockProgressionsAdv = creerProgressionsFactices(24);
    mockProgressionsSud = creerProgressionsFactices(8);
    configurerDistributionImmediate();
    mockLancerAnimationRetourPaquet.mockImplementation(
      (_cartes, _arrivee: { x: number; y: number }, onTerminee?: () => void) =>
        onTerminee?.(),
    );
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("relance la distribution animee quand tout le monde passe aux deux tours", async () => {
    const { result } = renderHook(() =>
      useControleurJeu({
        difficulte: "facile",
        scoreObjectif: 1000,
        largeurEcran: 1280,
        hauteurEcran: 720,
      }),
    );

    await viderFileEvenements();

    act(() => {
      result.current.onRevelationTerminee();
    });

    expect(mockLancerDistribution).toHaveBeenCalledTimes(1);
    expect(result.current.etatJeu.phaseEncheres).toBe("encheres1");

    act(() => {
      result.current.passer();
    });

    await viderFileEvenements();

    expect(result.current.etatJeu.phaseEncheres).toBe("encheres2");

    act(() => {
      result.current.passer();
    });

    await viderFileEvenements();

    act(() => {
      result.current.onRetourCarteRetourneeTerminee();
    });

    await viderFileEvenements();

    expect(mockLancerDistribution).toHaveBeenCalledTimes(2);
  });

  it("passe en phase revelationCarte apres la distribution, puis en encheres quand la revelation est terminee", async () => {
    const { result } = renderHook(() =>
      useControleurJeu({
        difficulte: "facile",
        scoreObjectif: 1000,
        largeurEcran: 1280,
        hauteurEcran: 720,
      }),
    );

    await viderFileEvenements();

    // Phase revelationCarte déclenchée
    expect(result.current.etatJeu.phaseUI).toBe("revelationCarte");
    expect(result.current.etatJeu.carteRetournee).not.toBeNull();
    expect(result.current.etatJeu.phaseEncheres).toBeNull();

    // Simuler la fin de l'animation
    act(() => {
      result.current.onRevelationTerminee();
    });

    expect(result.current.etatJeu.phaseUI).toBe("encheres");
    expect(result.current.etatJeu.phaseEncheres).toBe("encheres1");
    expect(result.current.etatJeu.carteRetournee).not.toBeNull();
  });

  it("conserve les 12 cartes restantes dans le paquet a la fin de la donne initiale", async () => {
    const { result } = renderHook(() =>
      useControleurJeu({
        difficulte: "facile",
        scoreObjectif: 1000,
        largeurEcran: 1280,
        hauteurEcran: 720,
      }),
    );

    expect(result.current.etatJeu.phaseUI).toBe("distribution");
    expect(result.current.etatJeu.cartesRestantesPaquet).toBe(12);

    await viderFileEvenements();

    expect(result.current.etatJeu.phaseUI).toBe("revelationCarte");
    expect(result.current.etatJeu.cartesRestantesPaquet).toBe(12);
  });

  it("reste en mode cinematique-distribution jusqu'au handoff final", async () => {
    const { result } = renderHook(() =>
      useControleurJeu({
        difficulte: "facile",
        scoreObjectif: 1000,
        largeurEcran: 1280,
        hauteurEcran: 720,
      }),
    );

    expect(result.current.etatJeu.phaseUI).toBe("distribution");
    expect(result.current.modeRenduCartes).toBe("cinematique-distribution");

    await viderFileEvenements();

    expect(result.current.etatJeu.phaseUI).toBe("revelationCarte");
    expect(result.current.modeRenduCartes).toBe("cinematique-distribution");
  });

  it("appelle directement finaliserEntreeEncheres si les dimensions sont nulles au moment de la transition", async () => {
    const { result } = renderHook(
      ({ largeurEcran, hauteurEcran }) =>
        useControleurJeu({
          difficulte: "facile",
          scoreObjectif: 1000,
          largeurEcran,
          hauteurEcran,
        }),
      { initialProps: { largeurEcran: 0, hauteurEcran: 0 } },
    );

    await viderFileEvenements();

    // Dimensions nulles : pas de phase revelationCarte, directement encheres
    expect(result.current.etatJeu.phaseUI).toBe("encheres");
  });

  it("laisse voir les Passe, rappelle les cartes puis deplace le dealer avant la nouvelle distribution", async () => {
    let terminerRetourPaquet: (() => void) | undefined;
    let cartesRetourPaquet:
      | Array<{
          carte: { couleur: string; rang: string };
          depart: { x: number; y: number; rotation: number; echelle: number };
          delai?: number;
          faceVisible?: boolean;
          flipDe?: number;
          flipVers?: number;
        }>
      | undefined;
    mockLancerAnimationRetourPaquet.mockImplementation(
      (cartes, _arrivee: { x: number; y: number }, onTerminee?: () => void) => {
        cartesRetourPaquet = cartes;
        terminerRetourPaquet = onTerminee;
      },
    );

    const { result } = renderHook(() =>
      useControleurJeu({
        difficulte: "facile",
        scoreObjectif: 1000,
        largeurEcran: 1280,
        hauteurEcran: 720,
      }),
    );

    await viderFileEvenements();

    act(() => {
      result.current.onRevelationTerminee();
    });

    const indexDonneurAvantRedistribution = result.current.etatJeu.indexDonneur;

    act(() => {
      result.current.passer();
    });

    await avancerJusqua(() => result.current.etatJeu.phaseEncheres === "encheres2");

    act(() => {
      result.current.passer();
    });

    await avancerJusqua(() => result.current.etatJeu.phaseUI === "redistribution");

    expect(mockLancerAnimationRetourPaquet).toHaveBeenCalledTimes(0);
    expect(result.current.etatJeu.historiqueEncheres).toHaveLength(8);
    expect(result.current.etatJeu.indexDonneur).toBe(indexDonneurAvantRedistribution);
    expect(mockLancerDistribution).toHaveBeenCalledTimes(1);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    // Après pauseAvantRappel : carteRetourneeEnRetour est posée, on attend le callback
    expect(mockLancerAnimationRetourPaquet).toHaveBeenCalledTimes(0);
    expect(result.current.etatJeu.carteRetourneeEnRetour).not.toBeNull();
    expect(result.current.etatJeu.historiqueEncheres).toHaveLength(0);
    expect(result.current.etatJeu.mainJoueur).toEqual([]);
    expect(result.current.etatJeu.nbCartesAdversaires).toEqual({
      nord: 0,
      est: 0,
      ouest: 0,
    });
    expect(result.current.etatJeu.cartesRestantesPaquet).toBe(1);
    expect(result.current.etatJeu.indexDonneur).toBe(indexDonneurAvantRedistribution);

    act(() => {
      result.current.onRetourCarteRetourneeTerminee();
    });

    expect(result.current.etatJeu.carteRetourneeEnRetour).toBeNull();
    expect(mockLancerAnimationRetourPaquet).toHaveBeenCalledTimes(1);
    expect(cartesRetourPaquet).toHaveLength(20);
    expect(new Set(cartesRetourPaquet?.map((carte) => carte.delai)).size).toBe(5);
    expect(cartesRetourPaquet?.filter((carte) => carte.faceVisible)).toHaveLength(0);
    expect(
      cartesRetourPaquet?.filter((carte) => carte.flipDe === 180 && carte.flipVers === 0),
    ).toHaveLength(5);
    expect(result.current.etatJeu.cartesRestantesPaquet).toBe(1);
    expect(result.current.etatJeu.indexDonneur).toBe(indexDonneurAvantRedistribution);

    act(() => {
      terminerRetourPaquet?.();
    });

    expect(result.current.etatJeu.cartesRestantesPaquet).toBe(32);
    expect(result.current.etatJeu.indexDonneur).toBe(0);
    expect(mockLancerDistribution).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(mockLancerDistribution).toHaveBeenCalledTimes(2);
  });

  it("vide le paquet au depart des derniers paquets de distribution restante", async () => {
    configurerDistributionControlee();

    const { result } = renderHook(() =>
      useControleurJeu({
        difficulte: "facile",
        scoreObjectif: 1000,
        largeurEcran: 1280,
        hauteurEcran: 720,
      }),
    );

    await viderFileEvenements();

    act(() => {
      result.current.onRevelationTerminee();
    });

    act(() => {
      result.current.prendre();
    });

    expect(result.current.etatJeu.phaseUI).toBe("distribution");
    expect(result.current.etatJeu.cartesRestantesPaquet).toBeGreaterThan(0);
    expect(dernierLancementDistribution).toBeDefined();

    const lancement = dernierLancementDistribution!;
    const ordre = ["sud", "ouest", "nord", "est"] as const;

    act(() => {
      for (const position of ordre) {
        const cartes = lancement.mains[position];
        lancement.options?.onPaquetDepart?.(position, cartes);
      }
    });

    expect(result.current.etatJeu.cartesRestantesPaquet).toBe(0);

    act(() => {
      for (const position of ordre) {
        const cartes = lancement.mains[position];
        lancement.options?.onPaquetArrive?.(position, cartes);
      }
    });

    expect(result.current.etatJeu.cartesRestantesPaquet).toBe(0);
  });

  it("relance le ramassage du premier pli meme apres plusieurs redistributions consecutives", async () => {
    mockDeciderBot.mockImplementation((vueBot?: VueBotTest) => {
      if (!vueBot) {
        return { type: "PASSER" as const };
      }

      if (vueBot.phaseJeu === "jeu") {
        const cartesJouables = getCartesJouables(
          vueBot.maMain,
          vueBot.pliEnCours,
          vueBot.couleurAtout!,
          vueBot.positionPartenaire,
        );

        return { type: "JOUER_CARTE" as const, carte: cartesJouables[0] };
      }

      return { type: "PASSER" as const };
    });
    mockLancerAnimationJeuCarte.mockImplementation(
      (_carte, _joueur, onTerminee?: () => void) => {
        if (onTerminee) {
          setTimeout(onTerminee, 0);
        }
      },
    );
    mockGlisserCarteRetournee.mockImplementation(
      (_carte, _xDepart, _yDepart, _preneur, onTerminee?: () => void) => {
        if (onTerminee) {
          setTimeout(onTerminee, 0);
        }
      },
    );
    mockLancerAnimationRamassagePli.mockImplementation(
      (_cartes, _gagnant, onTerminee?: () => void, onDebutRamassage?: () => void) => {
        setTimeout(() => {
          onDebutRamassage?.();
          onTerminee?.();
        }, 0);
      },
    );

    const { result } = renderHook(() =>
      useControleurJeu({
        difficulte: "facile",
        scoreObjectif: 1000,
        largeurEcran: 1280,
        hauteurEcran: 720,
      }),
    );

    const passerJusquaRedistribution = async () => {
      act(() => {
        result.current.passer();
      });

      await viderFileEvenements();

      act(() => {
        result.current.passer();
      });

      await viderFileEvenements();

      act(() => {
        result.current.onRetourCarteRetourneeTerminee();
      });

      await viderFileEvenements();

      act(() => {
        result.current.onRevelationTerminee();
      });

      await viderFileEvenements();
    };

    await viderFileEvenements();

    act(() => {
      result.current.onRevelationTerminee();
    });

    await passerJusquaRedistribution();
    await passerJusquaRedistribution();
    await passerJusquaRedistribution();
    await passerJusquaRedistribution();

    expect(result.current.etatJeu.phaseEncheres).toBe("encheres1");
    expect(result.current.etatJeu.estTourHumain).toBe(true);

    act(() => {
      result.current.prendre();
    });

    await viderFileEvenements(30);

    expect(result.current.etatJeu.phaseUI).toBe("jeu");
    expect(result.current.etatJeu.estTourHumain).toBe(true);
    expect(result.current.etatJeu.cartesJouables.length).toBeGreaterThan(0);

    act(() => {
      result.current.jouerCarte(result.current.etatJeu.cartesJouables[0]);
    });

    await viderFileEvenements(30);

    expect(result.current.etatJeu.historiquePlis.length).toBe(1);
    expect(mockLancerAnimationRamassagePli).toHaveBeenCalledTimes(1);
  });
});
