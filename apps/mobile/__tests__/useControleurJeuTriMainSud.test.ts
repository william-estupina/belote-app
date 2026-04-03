import type { Carte, PositionJoueur } from "@belote/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { trierMainJoueur } from "../hooks/triMainJoueur";
import { useControleurJeu } from "../hooks/useControleurJeu";

interface VueBotTest {
  maMain: Carte[];
  positionPartenaire: PositionJoueur;
  pliEnCours: Array<{ joueur: PositionJoueur; carte: Carte }>;
  couleurAtout: Carte["couleur"] | null;
  phaseJeu: "encheres1" | "encheres2" | "jeu";
}

type ActionBotTest = { type: "PASSER" };

function creerProgressionsFactices(taille: number): Array<{ value: number }> {
  return Array.from({ length: taille }, () => ({ value: 0 }));
}

const mockDeciderBot = jest.fn<ActionBotTest, [VueBotTest?]>((_vueBot?: VueBotTest) => ({
  type: "PASSER",
}));
const mockLancerDistribution = jest.fn();
const mockTerminerDistribution = jest.fn();
const mockAnimerTriSud = jest.fn(({ onTerminee }: { onTerminee: () => void }) =>
  setTimeout(onTerminee, 0),
);
const mockAjouterCartesGelees = jest.fn();
const mockAnnulerAnimations = jest.fn();
const mockLancerAnimationJeuCarte = jest.fn();
const mockDemarrerAnimationJeuCarte = jest.fn();
const mockLancerAnimationRamassagePli = jest.fn();
const mockLancerAnimationRetourPaquet = jest.fn();
const mockGlisserCarteRetournee = jest.fn();
const mockSurAnimationTerminee = jest.fn();
const mockSurCarteJeuPreteAffichage = jest.fn();
const mockAttendreDelaiBot = jest.fn(() => Promise.resolve());
const mockAnnulerDelai = jest.fn();
let mockProgressionsAdv = creerProgressionsFactices(24);
let mockProgressionsSud = creerProgressionsFactices(8);

jest.mock("@belote/bot-engine", () => ({
  deciderBot: (...args: Parameters<typeof mockDeciderBot>) => mockDeciderBot(...args),
}));

jest.mock("../hooks/useAnimations", () => ({
  construireCartesGeleesDepuisPli: () => [],
  useAnimations: () => ({
    cartesEnVol: [],
    surAnimationTerminee: mockSurAnimationTerminee,
    surCarteJeuPreteAffichage: mockSurCarteJeuPreteAffichage,
    glisserCarteRetournee: mockGlisserCarteRetournee,
    lancerAnimationJeuCarte: mockLancerAnimationJeuCarte,
    demarrerAnimationJeuCarte: mockDemarrerAnimationJeuCarte,
    lancerAnimationRamassagePli: mockLancerAnimationRamassagePli,
    lancerAnimationRetourPaquet: mockLancerAnimationRetourPaquet,
    ajouterCartesGelees: mockAjouterCartesGelees,
    annulerAnimations: mockAnnulerAnimations,
  }),
}));

jest.mock("../hooks/useAnimationsDistribution", () => ({
  useAnimationsDistribution: () => ({
    lancerDistribution: mockLancerDistribution,
    animerTriSud: mockAnimerTriSud,
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
  mockLancerDistribution.mockImplementation(
    (
      mains: Record<"sud" | "ouest" | "nord" | "est", Carte[]>,
      options?: {
        mainSudOrdonnee?: Carte[];
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

describe("useControleurJeu - tri main sud", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockProgressionsAdv = creerProgressionsFactices(24);
    mockProgressionsSud = creerProgressionsFactices(8);
    configurerDistributionImmediate();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("transmet le meme ordre sud trie a la distribution atlas des la donne initiale", async () => {
    const { result } = renderHook(() =>
      useControleurJeu({
        difficulte: "facile",
        scoreObjectif: 1000,
        largeurEcran: 1280,
        hauteurEcran: 720,
      }),
    );

    await viderFileEvenements();

    const appelAvecOrdreSud = mockLancerDistribution.mock.calls.find(
      (appel) => appel[1]?.mainSudOrdonnee !== undefined,
    ) as
      | [
          Record<"sud" | "ouest" | "nord" | "est", Carte[]>,
          { mainSudOrdonnee?: Carte[] } | undefined,
        ]
      | undefined;

    expect(appelAvecOrdreSud).toBeDefined();

    const mainRecue = appelAvecOrdreSud?.[0].sud ?? [];
    const couleurPrioritaire = result.current.etatJeu.carteRetournee?.couleur ?? null;

    expect(appelAvecOrdreSud?.[1]?.mainSudOrdonnee).toEqual(
      trierMainJoueur(mainRecue, {
        couleurPrioritaire,
      }),
    );
  });
});
