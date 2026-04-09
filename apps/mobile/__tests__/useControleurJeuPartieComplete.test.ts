/**
 * Tests d'intégration — Parties complètes simulées
 *
 * Valide l'orchestration UI de bout en bout :
 * enchères → 8 plis → scoresManche → nouvelle manche → finPartie
 */
import { getCartesJouables } from "@belote/game-logic";
import type { Carte, Couleur, PositionJoueur } from "@belote/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { useControleurJeu } from "../hooks/useControleurJeu";

// --- Types pour les mocks ---

interface VueBotTest {
  maMain: Carte[];
  positionPartenaire: PositionJoueur;
  pliEnCours: Array<{ joueur: PositionJoueur; carte: Carte }>;
  couleurAtout: Carte["couleur"] | null;
  couleurDemandee: Couleur | null;
  phaseJeu: "encheres1" | "encheres2" | "jeu";
  carteRetournee: Carte | null;
  historiqueEncheres: Array<{
    joueur: PositionJoueur;
    action: string;
    couleur?: Couleur;
  }>;
}

type ActionBotTest =
  | { type: "PASSER" }
  | { type: "JOUER_CARTE"; carte: Carte }
  | { type: "PRENDRE" }
  | { type: "ANNONCER"; couleur: Couleur };

// --- Mocks ---

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
function creerProgressionsFactices(taille: number): Array<{ value: number }> {
  return Array.from({ length: taille }, () => ({ value: 0 }));
}
let mockProgressionsAdv = creerProgressionsFactices(24);
let mockProgressionsSud = creerProgressionsFactices(8);
let mockZIndexesSud = creerProgressionsFactices(8);

jest.mock("@belote/bot-engine", () => ({
  deciderBot: (...args: Parameters<typeof mockDeciderBot>) => mockDeciderBot(...args),
}));

jest.mock("../hooks/useAnimations", () => ({
  construireCartesGeleesDepuisPli: () => [],
  useAnimations: () => ({
    cartesEnVol: [],
    surAnimationTerminee: mockSurAnimationTerminee,
    surCarteJeuPreteAffichage: jest.fn(),
    glisserCarteRetournee: mockGlisserCarteRetournee,
    lancerAnimationJeuCarte: mockLancerAnimationJeuCarte,
    demarrerAnimationJeuCarte: jest.fn(),
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
    cartesAtlasSud: [],
    progressionsSud: mockProgressionsSud,
    donneesWorkletSud: { value: [] },
    nbCartesActivesSud: { value: 0 },
    zIndexesSud: mockZIndexesSud,
    enCours: false,
  }),
}));

const mockProgressionsBuffer = Array.from({ length: 44 }, () => ({ value: 0 }));
jest.mock("../hooks/useBufferCanvasUnifie", () => ({
  useBufferCanvasUnifie: () => ({
    donneesWorklet: { value: [] },
    progressions: mockProgressionsBuffer,
    sprites: Array.from({ length: 44 }, () => ({ x: 0, y: 0, width: 1, height: 1 })),
    colors: Array.from({ length: 44 }, () => 1),
    valeursMain: {
      x: Array.from({ length: 8 }, () => ({ value: 0 })),
      decalageY: Array.from({ length: 8 }, () => ({ value: 0 })),
      angle: Array.from({ length: 8 }, () => ({ value: 0 })),
      echelle: Array.from({ length: 8 }, () => ({ value: 1 })),
    },
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

// --- Helpers ---

/** Configure les animations pour se résoudre immédiatement */
function configurerAnimationsImmediat(): void {
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
      for (const position of ["sud", "ouest", "nord", "est"] as const) {
        const cartes = mains[position];
        options?.onPaquetDepart?.(position, cartes);
        options?.onPaquetArrive?.(position, cartes);
      }
      options?.onTriSudTermine?.();
    },
  );

  mockLancerAnimationJeuCarte.mockImplementation(
    (
      _carte: Carte,
      _joueur: PositionJoueur,
      onTerminee?: () => void,
      _positionDepart?: { x: number; y: number },
    ) => {
      if (onTerminee) setTimeout(onTerminee, 0);
    },
  );

  mockLancerAnimationRamassagePli.mockImplementation(
    (
      _cartes: Array<{ joueur: PositionJoueur; carte: Carte }>,
      _gagnant: PositionJoueur,
      onTerminee?: () => void,
      onDebutRamassage?: () => void,
    ) => {
      setTimeout(() => {
        onDebutRamassage?.();
        onTerminee?.();
      }, 0);
    },
  );

  mockLancerAnimationRetourPaquet.mockImplementation(
    (_cartes: unknown[], _arrivee: { x: number; y: number }, onTerminee?: () => void) => {
      if (onTerminee) setTimeout(onTerminee, 0);
    },
  );

  mockGlisserCarteRetournee.mockImplementation(
    (
      _carte: Carte,
      _xDepart: number,
      _yDepart: number,
      _preneur: PositionJoueur,
      onTerminee?: () => void,
    ) => {
      if (onTerminee) setTimeout(onTerminee, 0);
    },
  );
}

/** Configure le bot pour jouer la première carte jouable en jeu, passer aux enchères */
function configurerBotJouePremiereCarteJouable(): void {
  mockDeciderBot.mockImplementation((vueBot?: VueBotTest) => {
    if (!vueBot) return { type: "PASSER" as const };

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
}

/** Configure le bot pour prendre au tour 1 quand c'est son tour */
function configurerBotPrendTour1(): void {
  mockDeciderBot.mockImplementation((vueBot?: VueBotTest) => {
    if (!vueBot) return { type: "PASSER" as const };

    if (vueBot.phaseJeu === "encheres1") {
      return { type: "PRENDRE" as const };
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
}

async function viderFileEvenements(iterations = 20): Promise<void> {
  for (let index = 0; index < iterations; index += 1) {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });
  }
}

async function avancerJusqua(
  condition: () => boolean,
  iterationsMax = 200,
): Promise<void> {
  for (let index = 0; index < iterationsMax; index += 1) {
    if (condition()) return;
    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });
  }
}

/** Joue la première carte jouable de l'humain quand c'est son tour */
async function jouerCarteHumainSiTour(result: {
  current: ReturnType<typeof useControleurJeu>;
}): Promise<void> {
  await avancerJusqua(
    () =>
      result.current.etatJeu.estTourHumain &&
      result.current.etatJeu.phaseUI === "jeu" &&
      result.current.etatJeu.cartesJouables.length > 0,
    100,
  );

  if (
    result.current.etatJeu.estTourHumain &&
    result.current.etatJeu.cartesJouables.length > 0
  ) {
    act(() => {
      result.current.jouerCarte(result.current.etatJeu.cartesJouables[0]);
    });
    await viderFileEvenements(15);
  }
}

/** Joue une manche complète de 8 plis (bot joue automatiquement, humain joue la 1re carte jouable) */
async function jouerMancheComplete(result: {
  current: ReturnType<typeof useControleurJeu>;
}): Promise<void> {
  for (let pli = 0; pli < 8; pli += 1) {
    // Attendre que l'humain ait la main ou que la phase change (scoresManche / finPartie)
    await avancerJusqua(
      () =>
        (result.current.etatJeu.estTourHumain &&
          result.current.etatJeu.phaseUI === "jeu" &&
          result.current.etatJeu.cartesJouables.length > 0) ||
        result.current.etatJeu.phaseUI === "scoresManche" ||
        result.current.etatJeu.phaseUI === "finPartie",
    );

    if (
      result.current.etatJeu.phaseUI === "scoresManche" ||
      result.current.etatJeu.phaseUI === "finPartie"
    ) {
      return;
    }

    await jouerCarteHumainSiTour(result);

    // Laisser les bots finir le pli et l'animation de ramassage se résoudre
    await viderFileEvenements(40);
  }

  // Attendre la fin de la manche
  await avancerJusqua(
    () =>
      result.current.etatJeu.phaseUI === "scoresManche" ||
      result.current.etatJeu.phaseUI === "finPartie",
  );
}

/** Lecture de phaseUI en tant que string pour éviter le narrowing TS dans les boucles */
function phaseUI(result: { current: ReturnType<typeof useControleurJeu> }): string {
  return result.current.etatJeu.phaseUI;
}

function creerHook(scoreObjectif = 1000) {
  return renderHook(() =>
    useControleurJeu({
      difficulte: "facile",
      scoreObjectif,
      largeurEcran: 1280,
      hauteurEcran: 720,
    }),
  );
}

/** Passe la distribution initiale + révélation et arrive aux enchères */
async function passerDistributionJusquaEncheres(result: {
  current: ReturnType<typeof useControleurJeu>;
}): Promise<void> {
  await viderFileEvenements();

  act(() => {
    result.current.onRevelationTerminee();
  });

  await avancerJusqua(() => result.current.etatJeu.phaseUI === "encheres", 20);
}

// === Tests ===

jest.setTimeout(60_000);

describe("useControleurJeu - parties completes", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockProgressionsAdv = creerProgressionsFactices(24);
    mockProgressionsSud = creerProgressionsFactices(8);
    configurerAnimationsImmediat();
    configurerBotJouePremiereCarteJouable();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  // --- Manche complète : humain prend ---

  it("joue une manche complete quand l'humain prend au tour 1", async () => {
    const { result } = creerHook();

    await passerDistributionJusquaEncheres(result);

    expect(result.current.etatJeu.phaseUI).toBe("encheres");
    expect(result.current.etatJeu.phaseEncheres).toBe("encheres1");
    expect(result.current.etatJeu.estTourHumain).toBe(true);

    // L'humain prend
    act(() => {
      result.current.prendre();
    });

    await viderFileEvenements(20);

    // On doit être en phase jeu
    await avancerJusqua(() => result.current.etatJeu.phaseUI === "jeu", 30);
    expect(result.current.etatJeu.phaseUI).toBe("jeu");
    expect(result.current.etatJeu.couleurAtout).not.toBeNull();

    // Jouer les 8 plis
    await jouerMancheComplete(result);

    expect(result.current.etatJeu.phaseUI).toBe("scoresManche");
    expect(result.current.etatJeu.historiquePlis).toHaveLength(8);
    expect(
      result.current.etatJeu.scoreMancheEquipe1 +
        result.current.etatJeu.scoreMancheEquipe2,
    ).toBeGreaterThan(0);
    expect(result.current.etatJeu.resumeFinManche).not.toBeNull();
  });

  // --- Manche complète : bot prend ---

  it("joue une manche complete quand un bot prend au tour 1", async () => {
    // Configurer : le bot prend dès son tour, l'humain passe
    configurerBotPrendTour1();

    const { result } = creerHook();

    await passerDistributionJusquaEncheres(result);

    expect(result.current.etatJeu.phaseEncheres).toBe("encheres1");

    // L'humain passe → le bot suivant va prendre
    act(() => {
      result.current.passer();
    });

    await viderFileEvenements(20);

    // Le bot a pris, distribution restante, puis jeu
    await avancerJusqua(() => result.current.etatJeu.phaseUI === "jeu", 50);
    expect(result.current.etatJeu.phaseUI).toBe("jeu");
    expect(result.current.etatJeu.indexPreneur).not.toBeNull();
    // Le preneur n'est pas l'humain (index 0)
    expect(result.current.etatJeu.indexPreneur).not.toBe(0);

    // Jouer les 8 plis
    await jouerMancheComplete(result);

    expect(result.current.etatJeu.phaseUI).toBe("scoresManche");
    expect(result.current.etatJeu.historiquePlis).toHaveLength(8);
  });

  // --- Annonce tour 2 par l'humain ---

  it("joue une manche complete quand l'humain annonce au tour 2", async () => {
    // Les bots passent toujours → on arrive au tour 2
    const { result } = creerHook();

    await passerDistributionJusquaEncheres(result);

    expect(result.current.etatJeu.phaseEncheres).toBe("encheres1");

    // Humain passe au tour 1
    act(() => {
      result.current.passer();
    });

    await avancerJusqua(() => result.current.etatJeu.phaseEncheres === "encheres2", 30);

    // Attendre que ce soit le tour de l'humain au tour 2
    await avancerJusqua(
      () =>
        result.current.etatJeu.estTourHumain &&
        result.current.etatJeu.phaseEncheres === "encheres2",
      30,
    );

    // Choisir une couleur différente de la retournée pour l'annonce
    const couleurRetournee = result.current.etatJeu.carteRetournee?.couleur;
    const couleurs: Couleur[] = ["coeur", "carreau", "trefle", "pique"];
    const couleurAnnonce = couleurs.find((c) => c !== couleurRetournee) ?? "coeur";

    act(() => {
      result.current.annoncer(couleurAnnonce);
    });

    await viderFileEvenements(20);

    await avancerJusqua(() => result.current.etatJeu.phaseUI === "jeu", 30);

    expect(result.current.etatJeu.phaseUI).toBe("jeu");
    expect(result.current.etatJeu.couleurAtout).toBe(couleurAnnonce);

    // Jouer les 8 plis
    await jouerMancheComplete(result);

    expect(result.current.etatJeu.phaseUI).toBe("scoresManche");
    expect(result.current.etatJeu.historiquePlis).toHaveLength(8);
  });

  // --- Partie complète jusqu'à finPartie ---

  it("joue des manches jusqu'a atteindre le score objectif et affiche finPartie", async () => {
    // Score objectif bas pour terminer en 1-2 manches
    const { result } = creerHook(162);

    await passerDistributionJusquaEncheres(result);

    let manchesJouees = 0;
    const MANCHES_MAX = 10;

    while (phaseUI(result) !== "finPartie" && manchesJouees < MANCHES_MAX) {
      // Attendre que l'humain ait la main aux enchères (le donneur tourne)
      await avancerJusqua(
        () =>
          (phaseUI(result) === "encheres" && result.current.etatJeu.estTourHumain) ||
          phaseUI(result) === "finPartie",
        80,
      );

      if (phaseUI(result) === "finPartie") break;

      // L'humain prend au tour 1 pour garantir qu'on joue
      act(() => {
        result.current.prendre();
      });
      await viderFileEvenements(20);

      await avancerJusqua(
        () => phaseUI(result) === "jeu" || phaseUI(result) === "finPartie",
        80,
      );

      if (phaseUI(result) === "finPartie") break;

      await jouerMancheComplete(result);

      if (phaseUI(result) === "finPartie") break;

      if (phaseUI(result) !== "scoresManche") break;
      manchesJouees += 1;

      act(() => {
        result.current.continuerApresScore();
      });

      await viderFileEvenements(30);

      // Si finPartie après continuer, sortir
      if (phaseUI(result) === "finPartie") break;

      // Attendre la distribution et la révélation de la manche suivante
      await avancerJusqua(
        () =>
          phaseUI(result) === "revelationCarte" ||
          phaseUI(result) === "encheres" ||
          phaseUI(result) === "finPartie",
        50,
      );

      if (phaseUI(result) === "finPartie") break;

      if (phaseUI(result) === "revelationCarte") {
        act(() => {
          result.current.onRevelationTerminee();
        });
        await avancerJusqua(
          () => phaseUI(result) === "encheres" || phaseUI(result) === "finPartie",
          30,
        );
      }
    }

    expect(result.current.etatJeu.phaseUI).toBe("finPartie");
    expect(manchesJouees).toBeLessThan(MANCHES_MAX);

    // Au moins une équipe a atteint le score objectif
    const scoreMax = Math.max(
      result.current.etatJeu.scoreEquipe1,
      result.current.etatJeu.scoreEquipe2,
    );
    expect(scoreMax).toBeGreaterThanOrEqual(162);
  });

  // --- Recommencer après fin de partie ---

  it("remet les scores a zero et relance la distribution apres recommencer", async () => {
    const { result } = creerHook(162);

    await passerDistributionJusquaEncheres(result);

    // Jouer jusqu'à finPartie
    let manchesJouees = 0;
    while (phaseUI(result) !== "finPartie" && manchesJouees < 10) {
      // Attendre que l'humain ait la main aux enchères
      await avancerJusqua(
        () =>
          (phaseUI(result) === "encheres" && result.current.etatJeu.estTourHumain) ||
          phaseUI(result) === "finPartie",
        50,
      );
      if (phaseUI(result) === "finPartie") break;

      act(() => {
        result.current.prendre();
      });
      await viderFileEvenements(20);

      await avancerJusqua(
        () => phaseUI(result) === "jeu" || phaseUI(result) === "finPartie",
        50,
      );
      if (phaseUI(result) === "finPartie") break;

      await jouerMancheComplete(result);

      if (phaseUI(result) === "finPartie") break;

      manchesJouees += 1;
      act(() => {
        result.current.continuerApresScore();
      });
      await viderFileEvenements(30);

      if (phaseUI(result) === "finPartie") break;

      await avancerJusqua(
        () =>
          phaseUI(result) === "revelationCarte" ||
          phaseUI(result) === "encheres" ||
          phaseUI(result) === "finPartie",
        50,
      );

      if (phaseUI(result) === "finPartie") break;

      if (phaseUI(result) === "revelationCarte") {
        act(() => {
          result.current.onRevelationTerminee();
        });
        await avancerJusqua(
          () => phaseUI(result) === "encheres" || phaseUI(result) === "finPartie",
          30,
        );
      }
    }

    expect(result.current.etatJeu.phaseUI).toBe("finPartie");

    // Recommencer
    act(() => {
      result.current.recommencer();
    });

    await viderFileEvenements(20);

    // Scores remis à zéro
    expect(result.current.etatJeu.scoreEquipe1).toBe(0);
    expect(result.current.etatJeu.scoreEquipe2).toBe(0);

    // Nouvelle distribution en cours
    await avancerJusqua(
      () =>
        result.current.etatJeu.phaseUI === "distribution" ||
        result.current.etatJeu.phaseUI === "revelationCarte" ||
        result.current.etatJeu.phaseUI === "encheres",
      20,
    );

    expect(["distribution", "revelationCarte", "encheres"]).toContain(
      result.current.etatJeu.phaseUI,
    );
    expect(result.current.etatJeu.historiquePlis).toHaveLength(0);
  });

  // --- Redistribution puis partie complète ---

  it("gere une redistribution quand tous passent puis joue une manche complete", async () => {
    // Les bots passent toujours aux enchères
    const { result } = creerHook();

    await passerDistributionJusquaEncheres(result);

    expect(result.current.etatJeu.phaseEncheres).toBe("encheres1");
    expect(result.current.etatJeu.estTourHumain).toBe(true);

    // Tour 1 : humain passe → les 3 bots passent
    act(() => {
      result.current.passer();
    });

    await avancerJusqua(() => result.current.etatJeu.phaseEncheres === "encheres2", 30);

    // Tour 2 : humain passe → les 3 bots passent → redistribution
    await avancerJusqua(
      () =>
        result.current.etatJeu.estTourHumain &&
        result.current.etatJeu.phaseEncheres === "encheres2",
      20,
    );

    act(() => {
      result.current.passer();
    });

    // Attendre que la carte retournée soit prête pour le retour (timer pauseAvantRappel)
    await avancerJusqua(() => result.current.etatJeu.carteRetourneeEnRetour !== null, 50);

    // Compléter l'animation de retour de la carte retournée
    act(() => {
      result.current.onRetourCarteRetourneeTerminee();
    });

    // Laisser l'animation de retour paquet + glissement dealer + distribution se terminer
    await viderFileEvenements(40);

    // Nouvelle distribution → révélation → enchères
    await avancerJusqua(
      () =>
        result.current.etatJeu.phaseUI === "revelationCarte" ||
        result.current.etatJeu.phaseUI === "encheres",
      50,
    );

    if (result.current.etatJeu.phaseUI === "revelationCarte") {
      act(() => {
        result.current.onRevelationTerminee();
      });
      await viderFileEvenements(10);
    }

    await avancerJusqua(
      () =>
        result.current.etatJeu.phaseUI === "encheres" &&
        result.current.etatJeu.phaseEncheres !== null,
      30,
    );

    expect(result.current.etatJeu.phaseEncheres).toBe("encheres1");

    // Maintenant l'humain prend et joue la manche
    await avancerJusqua(() => result.current.etatJeu.estTourHumain, 20);

    act(() => {
      result.current.prendre();
    });

    await viderFileEvenements(20);

    await avancerJusqua(() => result.current.etatJeu.phaseUI === "jeu", 30);

    await jouerMancheComplete(result);

    expect(result.current.etatJeu.phaseUI).toBe("scoresManche");
    expect(result.current.etatJeu.historiquePlis).toHaveLength(8);
  });

  // --- Vérification des scores cohérents ---

  it("maintient des scores coherents apres continuerApresScore", async () => {
    const { result } = creerHook();

    await passerDistributionJusquaEncheres(result);

    // L'humain prend
    act(() => {
      result.current.prendre();
    });

    await viderFileEvenements(20);

    await avancerJusqua(() => result.current.etatJeu.phaseUI === "jeu", 30);

    await jouerMancheComplete(result);

    expect(result.current.etatJeu.phaseUI).toBe("scoresManche");

    const scoreManche1 = result.current.etatJeu.scoreMancheEquipe1;
    const scoreManche2 = result.current.etatJeu.scoreMancheEquipe2;
    const scoreCumule1 = result.current.etatJeu.scoreEquipe1;
    const scoreCumule2 = result.current.etatJeu.scoreEquipe2;

    // Les scores cumulés doivent inclure les scores de la manche
    // (en tenant compte de la chute éventuelle)
    expect(scoreCumule1 + scoreCumule2).toBeGreaterThan(0);
    // Au moins un score de manche doit être > 0
    expect(Math.max(scoreManche1, scoreManche2)).toBeGreaterThan(0);

    // Continuer
    act(() => {
      result.current.continuerApresScore();
    });

    await viderFileEvenements(20);

    await avancerJusqua(
      () =>
        result.current.etatJeu.phaseUI === "revelationCarte" ||
        result.current.etatJeu.phaseUI === "encheres" ||
        result.current.etatJeu.phaseUI === "finPartie",
      30,
    );

    // Les scores cumulés sont toujours là après la transition
    if (result.current.etatJeu.phaseUI !== "finPartie") {
      expect(result.current.etatJeu.scoreEquipe1).toBe(scoreCumule1);
      expect(result.current.etatJeu.scoreEquipe2).toBe(scoreCumule2);
      // L'historique des plis est remis à zéro pour la nouvelle manche
      expect(result.current.etatJeu.historiquePlis).toHaveLength(0);
    }
  });
});
