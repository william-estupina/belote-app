// Machine à états XState v5 pour le jeu de Belote
import type {
  ActionEnchere,
  Carte,
  Couleur,
  IdEquipe,
  PliComplete,
  PositionJoueur,
} from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";
import { assign, setup } from "xstate";

import { creerPaquet, distribuerInitial, distribuerRestantes, melanger } from "./paquet";
import { evaluerPli } from "./pli";
import { getCartesJouables } from "./regles";
import { calculerScoreManche, getPointsPli } from "./score";

// --- Types du contexte ---

export interface ContextePartie {
  mains: [Carte[], Carte[], Carte[], Carte[]];
  restantes: Carte[];
  carteRetournee: Carte | null;
  couleurAtout: Couleur | null;
  indexDonneur: number;
  indexJoueurActif: number;
  indexPreneur: number | null;
  pliEnCours: { joueur: PositionJoueur; carte: Carte }[];
  historiquePlis: PliComplete[];
  historiqueEncheres: ActionEnchere[];
  plisEquipe1: number;
  plisEquipe2: number;
  pointsEquipe1: number;
  pointsEquipe2: number;
  scoreEquipe1: number;
  scoreEquipe2: number;
  beloteEquipe1: boolean;
  beloteEquipe2: boolean;
  annonceBelote: { joueur: PositionJoueur; type: "belote" | "rebelote" } | null;
  nombreRedistributions: number;
  scoreObjectif: number;
  scoreMancheEquipe1: number;
  scoreMancheEquipe2: number;
}

// --- Types des événements ---

export type EvenementPartie =
  | { type: "DEMARRER"; scoreObjectif?: number }
  | { type: "PRENDRE" }
  | { type: "ANNONCER"; couleur: Couleur }
  | { type: "PASSER" }
  | { type: "JOUER_CARTE"; carte: Carte }
  | { type: "CONTINUER" }
  | { type: "RECOMMENCER" };

// --- Helpers ---

function getPositionJoueur(index: number): PositionJoueur {
  return POSITIONS_JOUEUR[index % 4];
}

function getEquipeDuJoueur(index: number): IdEquipe {
  // sud (0) et nord (2) = equipe1, ouest (1) et est (3) = equipe2
  return index % 2 === 0 ? "equipe1" : "equipe2";
}

function getPositionPartenaire(position: PositionJoueur): PositionJoueur {
  const index = POSITIONS_JOUEUR.indexOf(position);
  return POSITIONS_JOUEUR[(index + 2) % 4];
}

function joueurSuivant(index: number): number {
  // Sens anti-horaire : sud(0) → est(3) → nord(2) → ouest(1)
  return (index + 3) % 4;
}

function premierJoueurApres(indexDonneur: number): number {
  // Le joueur à droite du donneur (sens anti-horaire)
  return (indexDonneur + 3) % 4;
}

function creerContexteInitial(): ContextePartie {
  return {
    mains: [[], [], [], []],
    restantes: [],
    carteRetournee: null,
    couleurAtout: null,
    indexDonneur: 1,
    indexJoueurActif: 0,
    indexPreneur: null,
    pliEnCours: [],
    historiquePlis: [],
    historiqueEncheres: [],
    plisEquipe1: 0,
    plisEquipe2: 0,
    pointsEquipe1: 0,
    pointsEquipe2: 0,
    scoreEquipe1: 0,
    scoreEquipe2: 0,
    beloteEquipe1: false,
    beloteEquipe2: false,
    annonceBelote: null,
    nombreRedistributions: 0,
    scoreObjectif: 1000,
    scoreMancheEquipe1: 0,
    scoreMancheEquipe2: 0,
  };
}

// --- Machine ---

export const machineBelote = setup({
  types: {
    context: {} as ContextePartie,
    events: {} as EvenementPartie,
  },
  guards: {
    pliComplet: ({ context }) => context.pliEnCours.length === 4,
    mancheTerminee: ({ context }) => context.historiquePlis.length === 8,
    partieTerminee: ({ context }) =>
      context.scoreEquipe1 >= context.scoreObjectif ||
      context.scoreEquipe2 >= context.scoreObjectif,
    tousPasseTour1: ({ context }) =>
      // Le guard s'exécute avant l'action : 3 passes dans l'historique + le PASSER courant = 4
      context.historiqueEncheres.length === 3 &&
      context.historiqueEncheres.every((a) => a.type === "PASSER"),
    tousPasseTour2: ({ context }) => {
      // 4 passes du tour 1 + 3 passes du tour 2 dans l'historique + le PASSER courant = 8
      const encheresTour2 = context.historiqueEncheres.slice(4);
      return (
        encheresTour2.length === 3 && encheresTour2.every((a) => a.type === "PASSER")
      );
    },
    coupValide: ({ context, event }) => {
      if (event.type !== "JOUER_CARTE") return false;
      const position = getPositionJoueur(context.indexJoueurActif);
      const main = context.mains[context.indexJoueurActif];
      const posPartenaire = getPositionPartenaire(position);
      const jouables = getCartesJouables(
        main,
        context.pliEnCours,
        context.couleurAtout!,
        posPartenaire,
      );
      return jouables.some(
        (c) => c.couleur === event.carte.couleur && c.rang === event.carte.rang,
      );
    },
    annonceValide: ({ context, event }) => {
      if (event.type !== "ANNONCER") return false;
      // Au tour 2, on ne peut pas annoncer la couleur de la retourne
      return (
        context.carteRetournee !== null &&
        event.couleur !== context.carteRetournee.couleur
      );
    },
  },
  actions: {
    distribuer: assign(({ context }) => {
      const paquet = melanger(creerPaquet());
      const { mains, restantes, carteRetournee } = distribuerInitial(paquet);
      return {
        mains,
        restantes,
        carteRetournee,
        pliEnCours: [],
        historiquePlis: [],
        historiqueEncheres: [],
        plisEquipe1: 0,
        plisEquipe2: 0,
        pointsEquipe1: 0,
        pointsEquipe2: 0,
        beloteEquipe1: false,
        beloteEquipe2: false,
        annonceBelote: null,
        couleurAtout: null,
        indexPreneur: null,
        indexJoueurActif: premierJoueurApres(context.indexDonneur),
      };
    }),
    enregistrerPrise: assign(({ context }) => {
      return {
        couleurAtout: context.carteRetournee!.couleur,
        indexPreneur: context.indexJoueurActif,
        historiqueEncheres: [
          ...context.historiqueEncheres,
          {
            type: "PRENDRE" as const,
            joueur: getPositionJoueur(context.indexJoueurActif),
          },
        ],
      };
    }),
    enregistrerAnnonce: assign(({ context, event }) => {
      if (event.type !== "ANNONCER") return {};
      return {
        couleurAtout: event.couleur,
        indexPreneur: context.indexJoueurActif,
        historiqueEncheres: [
          ...context.historiqueEncheres,
          {
            type: "ANNONCER" as const,
            joueur: getPositionJoueur(context.indexJoueurActif),
            couleur: event.couleur,
          },
        ],
      };
    }),
    enregistrerPasse: assign(({ context }) => ({
      historiqueEncheres: [
        ...context.historiqueEncheres,
        {
          type: "PASSER" as const,
          joueur: getPositionJoueur(context.indexJoueurActif),
        },
      ],
      indexJoueurActif: joueurSuivant(context.indexJoueurActif),
    })),
    distribuerRestantes: assign(({ context }) => {
      const mainsCompletes = distribuerRestantes(
        context.mains,
        context.restantes,
        context.indexPreneur!,
      );
      return {
        mains: mainsCompletes,
        restantes: [],
        indexJoueurActif: premierJoueurApres(context.indexDonneur),
      };
    }),
    jouerCarte: assign(({ context, event }) => {
      if (event.type !== "JOUER_CARTE") return {};
      const indexJoueur = context.indexJoueurActif;
      const position = getPositionJoueur(indexJoueur);
      const main = context.mains[indexJoueur];
      const nouvelleMains = context.mains.map((m, i) => {
        if (i !== indexJoueur) return m;
        return m.filter(
          (c) => !(c.couleur === event.carte.couleur && c.rang === event.carte.rang),
        );
      }) as [Carte[], Carte[], Carte[], Carte[]];

      // Détection belote/rebelote : dame ou roi d'atout joué
      let annonceBelote = null as ContextePartie["annonceBelote"];
      let beloteEquipe1 = context.beloteEquipe1;
      let beloteEquipe2 = context.beloteEquipe2;
      const equipe = getEquipeDuJoueur(indexJoueur);

      if (
        context.couleurAtout &&
        event.carte.couleur === context.couleurAtout &&
        (event.carte.rang === "dame" || event.carte.rang === "roi")
      ) {
        // Vérifier si le joueur possède les deux (dame + roi d'atout) dans sa main actuelle
        const aDame = main.some(
          (c) => c.couleur === context.couleurAtout && c.rang === "dame",
        );
        const aRoi = main.some(
          (c) => c.couleur === context.couleurAtout && c.rang === "roi",
        );

        if (aDame && aRoi) {
          // Première carte : "belote"
          annonceBelote = { joueur: position, type: "belote" };
          if (equipe === "equipe1") beloteEquipe1 = true;
          else beloteEquipe2 = true;
        } else {
          // Le joueur n'a plus qu'une des deux → c'est la deuxième carte
          const dejaAnnonce =
            equipe === "equipe1" ? context.beloteEquipe1 : context.beloteEquipe2;
          if (dejaAnnonce) {
            annonceBelote = { joueur: position, type: "rebelote" };
          }
        }
      }

      return {
        mains: nouvelleMains,
        pliEnCours: [...context.pliEnCours, { joueur: position, carte: event.carte }],
        indexJoueurActif: joueurSuivant(indexJoueur),
        annonceBelote,
        beloteEquipe1,
        beloteEquipe2,
      };
    }),
    evaluerPli: assign(({ context }) => {
      const gagnant = evaluerPli(context.pliEnCours, context.couleurAtout!);
      const pointsPli = getPointsPli(
        context.pliEnCours.map((e) => e.carte),
        context.couleurAtout!,
      );
      const indexGagnant = POSITIONS_JOUEUR.indexOf(gagnant);
      const equipeGagnante = getEquipeDuJoueur(indexGagnant);

      const pliComplete: PliComplete = {
        cartes: [...context.pliEnCours],
        gagnant,
        points: pointsPli,
      };

      return {
        historiquePlis: [...context.historiquePlis, pliComplete],
        pliEnCours: [],
        indexJoueurActif: indexGagnant,
        plisEquipe1: context.plisEquipe1 + (equipeGagnante === "equipe1" ? 1 : 0),
        plisEquipe2: context.plisEquipe2 + (equipeGagnante === "equipe2" ? 1 : 0),
        pointsEquipe1:
          context.pointsEquipe1 + (equipeGagnante === "equipe1" ? pointsPli : 0),
        pointsEquipe2:
          context.pointsEquipe2 + (equipeGagnante === "equipe2" ? pointsPli : 0),
      };
    }),
    calculerScoreManche: assign(({ context }) => {
      const equipePreneur = getEquipeDuJoueur(context.indexPreneur!);
      const dernierPli = context.historiquePlis[context.historiquePlis.length - 1];
      const equipeDernierPli = getEquipeDuJoueur(
        POSITIONS_JOUEUR.indexOf(dernierPli.gagnant),
      );

      const pointsPreneur =
        equipePreneur === "equipe1" ? context.pointsEquipe1 : context.pointsEquipe2;
      const pointsDefenseur =
        equipePreneur === "equipe1" ? context.pointsEquipe2 : context.pointsEquipe1;
      const plisPreneur =
        equipePreneur === "equipe1" ? context.plisEquipe1 : context.plisEquipe2;
      const plisDefenseur =
        equipePreneur === "equipe1" ? context.plisEquipe2 : context.plisEquipe1;
      const belotePreneur =
        equipePreneur === "equipe1" ? context.beloteEquipe1 : context.beloteEquipe2;
      const beloteDefenseur =
        equipePreneur === "equipe1" ? context.beloteEquipe2 : context.beloteEquipe1;

      const resultat = calculerScoreManche({
        pointsEquipePreneur: pointsPreneur,
        pointsEquipeDefenseur: pointsDefenseur,
        plisEquipePreneur: plisPreneur,
        plisEquipeDefenseur: plisDefenseur,
        dernierPliPreneur:
          (equipePreneur === "equipe1" && equipeDernierPli === "equipe1") ||
          (equipePreneur === "equipe2" && equipeDernierPli === "equipe2"),
        belotePreneur,
        beloteDefenseur,
      });

      const scoreMancheEquipe1 =
        equipePreneur === "equipe1" ? resultat.scorePreneur : resultat.scoreDefenseur;
      const scoreMancheEquipe2 =
        equipePreneur === "equipe2" ? resultat.scorePreneur : resultat.scoreDefenseur;

      return {
        scoreEquipe1: context.scoreEquipe1 + scoreMancheEquipe1,
        scoreEquipe2: context.scoreEquipe2 + scoreMancheEquipe2,
        scoreMancheEquipe1,
        scoreMancheEquipe2,
      };
    }),
    passerDonneur: assign(({ context }) => ({
      indexDonneur: joueurSuivant(context.indexDonneur),
    })),
    redistribuer: assign(({ context }) => ({
      nombreRedistributions: context.nombreRedistributions + 1,
      indexDonneur: joueurSuivant(context.indexDonneur),
    })),
    initialiserScoreObjectif: assign(({ event }) => {
      if (event.type !== "DEMARRER") return {};
      return {
        scoreObjectif: event.scoreObjectif ?? 1000,
      };
    }),
  },
}).createMachine({
  id: "belote",
  initial: "inactif",
  context: creerContexteInitial(),
  states: {
    inactif: {
      on: {
        DEMARRER: {
          target: "distribution",
          actions: ["initialiserScoreObjectif"],
        },
      },
    },

    distribution: {
      entry: ["distribuer"],
      always: {
        target: "encheres1",
      },
    },

    encheres1: {
      on: {
        PRENDRE: {
          target: "distributionRestante",
          actions: ["enregistrerPrise"],
        },
        PASSER: [
          {
            guard: "tousPasseTour1",
            target: "encheres2",
            actions: ["enregistrerPasse"],
          },
          {
            target: "encheres1",
            actions: ["enregistrerPasse"],
          },
        ],
      },
    },

    encheres2: {
      on: {
        ANNONCER: {
          guard: "annonceValide",
          target: "distributionRestante",
          actions: ["enregistrerAnnonce"],
        },
        PASSER: [
          {
            guard: "tousPasseTour2",
            target: "redistribution",
            actions: ["enregistrerPasse"],
          },
          {
            target: "encheres2",
            actions: ["enregistrerPasse"],
          },
        ],
      },
    },

    redistribution: {
      entry: ["redistribuer"],
      always: {
        target: "distribution",
      },
    },

    distributionRestante: {
      entry: ["distribuerRestantes"],
      always: {
        target: "jeu",
      },
    },

    jeu: {
      on: {
        JOUER_CARTE: {
          guard: "coupValide",
          actions: ["jouerCarte"],
          target: "verificationPli",
        },
      },
    },

    verificationPli: {
      always: [
        {
          guard: "pliComplet",
          target: "finPli",
        },
        {
          target: "jeu",
        },
      ],
    },

    finPli: {
      entry: ["evaluerPli"],
      always: [
        {
          guard: "mancheTerminee",
          target: "scoresManche",
        },
        {
          target: "jeu",
        },
      ],
    },

    scoresManche: {
      entry: ["calculerScoreManche"],
      on: {
        CONTINUER: [
          {
            guard: "partieTerminee",
            target: "finPartie",
          },
          {
            target: "distribution",
            actions: ["passerDonneur"],
          },
        ],
      },
    },

    finPartie: {
      on: {
        RECOMMENCER: {
          target: "inactif",
          actions: assign(creerContexteInitial),
        },
      },
    },
  },
});
