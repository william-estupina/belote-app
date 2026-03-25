import { act, renderHook } from "@testing-library/react-native";

import { useControleurJeu } from "../hooks/useControleurJeu";

const mockDeciderBot = jest.fn(() => ({ type: "PASSER" as const }));
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
    cartesAtlas: [],
    progressions: [],
    donneesWorklet: { value: [] },
    nbCartesActives: { value: 0 },
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
  mockLancerDistribution.mockImplementation(
    (
      mains: Record<
        "sud" | "ouest" | "nord" | "est",
        Array<{ couleur: string; rang: string }>
      >,
      options?: {
        onPaquetDepart?: (
          position: "sud" | "ouest" | "nord" | "est",
          cartes: Array<{ couleur: string; rang: string }>,
        ) => void;
        onPaquetArrive?: (
          position: "sud" | "ouest" | "nord" | "est",
          cartes: Array<{ couleur: string; rang: string }>,
        ) => void;
      },
    ) => {
      for (const position of ["sud", "ouest", "nord", "est"] as const) {
        const cartes = mains[position];
        options?.onPaquetDepart?.(position, cartes);
        options?.onPaquetArrive?.(position, cartes);
      }
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

describe("useControleurJeu - redistribution", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    configurerDistributionImmediate();
    mockLancerAnimationRetourPaquet.mockImplementation(
      (_cartes, onTerminee?: () => void) => onTerminee?.(),
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

    expect(mockLancerDistribution).toHaveBeenCalledTimes(2);
  });

  it("deplace le dealer et attend la fin du rappel des mains avant de relancer la distribution", async () => {
    let terminerRetourPaquet: (() => void) | undefined;
    mockLancerAnimationRetourPaquet.mockImplementation(
      (_cartes, onTerminee?: () => void) => {
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
      result.current.passer();
    });

    await viderFileEvenements();

    act(() => {
      result.current.passer();
    });

    await viderFileEvenements();

    expect(mockLancerAnimationRetourPaquet).toHaveBeenCalledTimes(1);
    expect(result.current.etatJeu.indexDonneur).toBe(0);
    expect(mockLancerDistribution).toHaveBeenCalledTimes(1);

    act(() => {
      terminerRetourPaquet?.();
    });

    await viderFileEvenements();

    expect(mockLancerDistribution).toHaveBeenCalledTimes(2);
  });
});
