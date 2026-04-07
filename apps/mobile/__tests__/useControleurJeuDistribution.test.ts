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
let mockZIndexesSud = creerProgressionsFactices(8);
const OPTIONS_HOOK_CONTROLEUR = {
  difficulte: "facile" as const,
  scoreObjectif: 1000,
  largeurEcran: 1280,
  hauteurEcran: 720,
};
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
        onTriSudTermine?: () => void;
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
    terminerDistribution: mockTerminerDistribution,
    cartesAtlasAdversaires: [],
    cartesAtlasSud: [],
    progressionsAdv: mockProgressionsAdv,
    donneesWorkletAdv: { value: [] },
    nbCartesActivesAdv: { value: 0 },
    progressionsSud: mockProgressionsSud,
    donneesWorkletSud: { value: [] },
    nbCartesActivesSud: { value: 0 },
    zIndexesSud: mockZIndexesSud,
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
        onTriSudTermine?: () => void;
      },
    ) => {
      dernierLancementDistribution = { mains, options };
      for (const position of ["sud", "ouest", "nord", "est"] as const) {
        const cartes = mains[position];
        options?.onPaquetDepart?.(position, cartes);
        options?.onPaquetArrive?.(position, cartes);
      }
      options?.onTriSudTermine?.();
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
        onTriSudTermine?: () => void;
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

function creerHookControleur(overrides?: Partial<typeof OPTIONS_HOOK_CONTROLEUR>) {
  return renderHook(() =>
    useControleurJeu({
      ...OPTIONS_HOOK_CONTROLEUR,
      ...overrides,
    }),
  );
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
    const { result } = creerHookControleur();

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
    const { result } = creerHookControleur();

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

  it("expose la main triee apres la revelation initiale", async () => {
    const { result } = creerHookControleur();

    await viderFileEvenements();

    expect(dernierLancementDistribution).toBeDefined();
    const mainRecue = dernierLancementDistribution!.mains.sud;
    const ordreCouleurs = ["pique", "coeur", "carreau", "trefle"] as const;
    const mainTriee = [...mainRecue].sort(
      (a, b) => ordreCouleurs.indexOf(a.couleur) - ordreCouleurs.indexOf(b.couleur),
    );

    expect(result.current.etatJeu.phaseUI).toBe("revelationCarte");
    expect(result.current.etatJeu.mainJoueur).toEqual(mainTriee);

    act(() => {
      result.current.onRevelationTerminee();
    });

    expect(result.current.etatJeu.phaseUI).toBe("encheres");
    expect(result.current.etatJeu.mainJoueur).toEqual(mainTriee);
  });

  it("conserve les 12 cartes restantes dans le paquet a la fin de la donne initiale", async () => {
    const { result } = creerHookControleur();

    expect(result.current.etatJeu.phaseUI).toBe("distribution");
    expect(result.current.etatJeu.cartesRestantesPaquet).toBe(12);

    await viderFileEvenements();

    expect(result.current.etatJeu.phaseUI).toBe("revelationCarte");
    expect(result.current.etatJeu.cartesRestantesPaquet).toBe(12);
  });

  it("retire la carte sud de la main des le depart visuel puis l ajoute au pli a l arrivee", async () => {
    let terminerAnimationJeu: (() => void) | undefined;
    let surPretAffichage: ((idAnimation: string) => void) | undefined;
    mockLancerAnimationJeuCarte.mockImplementation(
      (
        _carte: Carte,
        _joueur: PositionJoueur,
        onTerminee?: () => void,
        _depart?: unknown,
        options?: { surPretAffichage?: (idAnimation: string) => void },
      ) => {
        terminerAnimationJeu = onTerminee;
        surPretAffichage = options?.surPretAffichage;
      },
    );

    const { result } = creerHookControleur();

    await viderFileEvenements();

    act(() => {
      result.current.onRevelationTerminee();
    });

    await viderFileEvenements();

    expect(result.current.etatJeu.phaseUI).toBe("encheres");
    expect(result.current.etatJeu.estTourHumain).toBe(true);

    act(() => {
      result.current.prendre();
    });

    await viderFileEvenements(30);

    expect(result.current.etatJeu.phaseUI).toBe("jeu");
    expect(result.current.etatJeu.estTourHumain).toBe(true);
    expect(result.current.etatJeu.cartesJouables.length).toBeGreaterThan(0);

    const carteJouee = result.current.etatJeu.cartesJouables[0];

    act(() => {
      result.current.jouerCarte(carteJouee);
    });

    expect(mockLancerAnimationJeuCarte).toHaveBeenCalledTimes(1);
    expect(result.current.etatJeu.mainJoueur).toContainEqual(carteJouee);
    expect(result.current.etatJeu.estTourHumain).toBe(false);
    expect(result.current.etatJeu.cartesJouables).toEqual([]);
    expect(result.current.etatJeu.pliEnCours).toEqual([]);

    act(() => {
      surPretAffichage?.("jeu-1");
    });

    expect(result.current.etatJeu.mainJoueur).not.toContainEqual(carteJouee);
    expect(result.current.etatJeu.pliEnCours).toEqual([]);

    act(() => {
      terminerAnimationJeu?.();
    });

    await viderFileEvenements();

    expect(result.current.etatJeu.mainJoueur).not.toContainEqual(carteJouee);
    expect(result.current.etatJeu.pliEnCours).toContainEqual({
      joueur: "sud",
      carte: carteJouee,
    });
  });

  it("relaie un depart complet a l animation de pose de la carte sud", async () => {
    const departAnimation = {
      x: 0.37,
      y: 0.83,
      rotation: -14,
      echelle: 1,
    };

    const { result } = creerHookControleur();

    await viderFileEvenements();

    act(() => {
      result.current.onRevelationTerminee();
    });

    await viderFileEvenements();

    act(() => {
      result.current.prendre();
    });

    await viderFileEvenements(30);

    const carteJouee = result.current.etatJeu.cartesJouables[0];

    act(() => {
      result.current.jouerCarte(carteJouee, departAnimation);
    });

    expect(mockLancerAnimationJeuCarte).toHaveBeenCalledWith(
      carteJouee,
      "sud",
      expect.any(Function),
      departAnimation,
      expect.objectContaining({
        demarrageDiffere: true,
        surPretAffichage: expect.any(Function),
      }),
    );
  });

  it("termine la distribution restante avant de rendre le jeu interactif", async () => {
    const { result } = creerHookControleur();

    await viderFileEvenements();

    act(() => {
      result.current.onRevelationTerminee();
    });

    await viderFileEvenements();
    mockTerminerDistribution.mockClear();

    act(() => {
      result.current.prendre();
    });

    expect(result.current.etatJeu.phaseUI).toBe("jeu");
    expect(result.current.modeRenduCartes).toBe("jeu-interactif");
    expect(mockTerminerDistribution).toHaveBeenCalledTimes(1);
  });

  it("masque la carte sud apres le signal de prise de relais puis demarre l animation", async () => {
    const departAnimation = {
      x: 0.37,
      y: 0.83,
      rotation: -14,
      echelle: 1,
    };
    let surPretAffichage: ((idAnimation: string) => void) | undefined;

    mockLancerAnimationJeuCarte.mockImplementation(
      (_carte, _joueur, _onTerminee, _depart, options) => {
        surPretAffichage = options?.surPretAffichage;
        return "jeu-1";
      },
    );

    const { result } = creerHookControleur();

    await viderFileEvenements();

    act(() => {
      result.current.onRevelationTerminee();
    });

    await viderFileEvenements();

    act(() => {
      result.current.prendre();
    });

    await viderFileEvenements(30);

    const carteJouee = result.current.etatJeu.cartesJouables[0];

    act(() => {
      result.current.jouerCarte(carteJouee, departAnimation);
    });

    expect(result.current.cartesEnPoseMainJoueur).toEqual([carteJouee]);
    expect(result.current.cartesMasqueesMainJoueur).toEqual([]);
    expect(mockDemarrerAnimationJeuCarte).not.toHaveBeenCalled();

    act(() => {
      surPretAffichage?.("jeu-1");
    });

    expect(result.current.cartesEnPoseMainJoueur).toEqual([carteJouee]);
    expect(result.current.cartesMasqueesMainJoueur).toEqual([carteJouee]);
    expect(result.current.etatJeu.mainJoueur).not.toContainEqual(carteJouee);
    expect(mockDemarrerAnimationJeuCarte).toHaveBeenCalledWith("jeu-1");
  });

  it("reste en mode cinematique-distribution jusqu'au handoff final", async () => {
    const { result } = creerHookControleur();

    expect(result.current.etatJeu.phaseUI).toBe("distribution");
    expect(result.current.modeRenduCartes).toBe("cinematique-distribution");

    await viderFileEvenements();

    expect(result.current.etatJeu.phaseUI).toBe("revelationCarte");
    expect(result.current.modeRenduCartes).toBe("cinematique-distribution");
  });

  it("appelle directement finaliserEntreeEncheres si les dimensions sont nulles au moment de la transition", async () => {
    const { result } = creerHookControleur({ largeurEcran: 0, hauteurEcran: 0 });

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

    const { result } = creerHookControleur();

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
