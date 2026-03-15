// Hook d'orchestration du jeu — pilote la machine XState, les bots et les animations
import { deciderBot } from "@belote/bot-engine";
import type { ContextePartie, EvenementPartie } from "@belote/game-logic";
import { getCartesJouables, machineBelote } from "@belote/game-logic";
import type {
  ActionBot,
  Carte,
  Couleur,
  Difficulte,
  PositionJoueur,
} from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Actor } from "xstate";
import { createActor } from "xstate";

import { ANIMATIONS } from "../constants/layout";
import { useAnimations } from "./useAnimations";
import { useDelaiBot } from "./useDelaiBot";

// --- Types exposés ---

export type PhaseUI =
  | "inactif"
  | "distribution"
  | "encheres"
  | "jeu"
  | "finPli"
  | "scoresManche"
  | "finPartie";

export interface EtatJeu {
  /** Phase actuelle de l'UI */
  phaseUI: PhaseUI;
  /** Main du joueur humain (sud) */
  mainJoueur: Carte[];
  /** Nombre de cartes par adversaire */
  nbCartesAdversaires: { nord: number; est: number; ouest: number };
  /** Cartes du pli en cours */
  pliEnCours: { joueur: PositionJoueur; carte: Carte }[];
  /** Couleur d'atout */
  couleurAtout: Couleur | null;
  /** Carte retournée (pour les enchères) */
  carteRetournee: Carte | null;
  /** Scores cumulés */
  scoreEquipe1: number;
  scoreEquipe2: number;
  /** Points de la manche en cours */
  pointsEquipe1: number;
  pointsEquipe2: number;
  /** Cartes jouables par le joueur humain */
  cartesJouables: Carte[];
  /** Est-ce le tour du joueur humain ? */
  estTourHumain: boolean;
  /** Position du joueur actif */
  joueurActif: PositionJoueur;
  /** Phase d'enchères (tour 1 ou 2) */
  phaseEncheres: "encheres1" | "encheres2" | null;
  /** Index du preneur */
  indexPreneur: number | null;
  /** Score objectif */
  scoreObjectif: number;
  /** Historique des plis complétés */
  historiquePlis: ContextePartie["historiquePlis"];
  /** Historique des enchères */
  historiqueEncheres: ContextePartie["historiqueEncheres"];
}

interface OptionsControleur {
  difficulte: Difficulte;
  scoreObjectif: number;
}

// --- Constantes ---

const INDEX_HUMAIN = 0; // sud

function getPositionPartenaire(position: PositionJoueur): PositionJoueur {
  const index = POSITIONS_JOUEUR.indexOf(position);
  return POSITIONS_JOUEUR[(index + 2) % 4];
}

// --- Tri des cartes du joueur (alternance rouge/noir, par force décroissante) ---

const ORDRE_RANG: Record<string, number> = {
  as: 7,
  "10": 6,
  roi: 5,
  dame: 4,
  valet: 3,
  "9": 2,
  "8": 1,
  "7": 0,
};

// Couleurs alternées : noir, rouge, noir, rouge
const ORDRE_COULEURS_ALTERNEES: Couleur[] = ["pique", "coeur", "trefle", "carreau"];

function trierMainJoueur(cartes: Carte[]): Carte[] {
  // Grouper par couleur
  const parCouleur = new Map<Couleur, Carte[]>();
  for (const couleur of ORDRE_COULEURS_ALTERNEES) {
    parCouleur.set(couleur, []);
  }
  for (const carte of cartes) {
    parCouleur.get(carte.couleur)!.push(carte);
  }

  // Trier chaque groupe par rang décroissant
  for (const groupe of parCouleur.values()) {
    groupe.sort((a, b) => ORDRE_RANG[b.rang] - ORDRE_RANG[a.rang]);
  }

  // Concaténer dans l'ordre alterné
  const resultat: Carte[] = [];
  for (const couleur of ORDRE_COULEURS_ALTERNEES) {
    resultat.push(...parCouleur.get(couleur)!);
  }
  return resultat;
}

// --- Hook principal ---

export function useControleurJeu({ difficulte, scoreObjectif }: OptionsControleur) {
  // Acteur XState
  const acteurRef = useRef<Actor<typeof machineBelote> | null>(null);

  // État de jeu exposé à l'UI
  const [etatJeu, setEtatJeu] = useState<EtatJeu>({
    phaseUI: "inactif",
    mainJoueur: [],
    nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
    pliEnCours: [],
    couleurAtout: null,
    carteRetournee: null,
    scoreEquipe1: 0,
    scoreEquipe2: 0,
    pointsEquipe1: 0,
    pointsEquipe2: 0,
    cartesJouables: [],
    estTourHumain: false,
    joueurActif: "sud",
    phaseEncheres: null,
    indexPreneur: null,
    scoreObjectif: 1000,
    historiquePlis: [],
    historiqueEncheres: [],
  });

  // Animations
  const animations = useAnimations();
  const { attendreDelaiBot, annulerDelai } = useDelaiBot();

  // Drapeaux pour éviter les boucles et courses
  const estOccupe = useRef(false);
  const estDemonte = useRef(false);
  const animationDistribEnCours = useRef(false);
  const animationPliEnCours = useRef(false);

  // Ref pour appeler lancerDistributionRestanteAnimee depuis les callbacks déclarés avant
  const distribRestanteRef = useRef<(ctx: ContextePartie) => void>(() => {});

  // --- Extraire l'état UI depuis le contexte XState ---
  const extraireEtatUI = useCallback(
    (contexte: ContextePartie, etatMachine: string): Partial<EtatJeu> => {
      const position = POSITIONS_JOUEUR[contexte.indexJoueurActif];
      const estHumain = contexte.indexJoueurActif === INDEX_HUMAIN;

      // Calculer les cartes jouables si c'est le tour du joueur humain en phase jeu
      let cartesJouables: Carte[] = [];
      if (estHumain && etatMachine === "jeu" && contexte.couleurAtout) {
        cartesJouables = getCartesJouables(
          contexte.mains[INDEX_HUMAIN],
          contexte.pliEnCours,
          contexte.couleurAtout,
          getPositionPartenaire("sud"),
        );
      }

      // Mapper l'état machine vers la phase UI
      let phaseUI: PhaseUI;
      switch (etatMachine) {
        case "inactif":
          phaseUI = "inactif";
          break;
        case "distribution":
        case "distributionRestante":
        case "redistribution":
          phaseUI = "distribution";
          break;
        case "encheres1":
        case "encheres2":
          phaseUI = "encheres";
          break;
        case "jeu":
        case "verificationPli":
          phaseUI = "jeu";
          break;
        case "finPli":
          phaseUI = "finPli";
          break;
        case "scoresManche":
          phaseUI = "scoresManche";
          break;
        case "finPartie":
          phaseUI = "finPartie";
          break;
        default:
          phaseUI = "inactif";
      }

      return {
        phaseUI,
        mainJoueur: trierMainJoueur(contexte.mains[INDEX_HUMAIN]),
        nbCartesAdversaires: {
          nord: contexte.mains[2].length,
          est: contexte.mains[3].length,
          ouest: contexte.mains[1].length,
        },
        pliEnCours: contexte.pliEnCours,
        couleurAtout: contexte.couleurAtout,
        carteRetournee: contexte.carteRetournee,
        scoreEquipe1: contexte.scoreEquipe1,
        scoreEquipe2: contexte.scoreEquipe2,
        pointsEquipe1: contexte.pointsEquipe1,
        pointsEquipe2: contexte.pointsEquipe2,
        cartesJouables,
        estTourHumain: estHumain,
        joueurActif: position,
        phaseEncheres:
          etatMachine === "encheres1" || etatMachine === "encheres2" ? etatMachine : null,
        indexPreneur: contexte.indexPreneur,
        scoreObjectif: contexte.scoreObjectif,
        historiquePlis: contexte.historiquePlis,
        historiqueEncheres: contexte.historiqueEncheres,
      };
    },
    [],
  );

  // --- Construire la vue bot ---
  const construireVueBot = useCallback(
    (
      contexte: ContextePartie,
      indexBot: number,
      phaseJeu: "encheres1" | "encheres2" | "jeu",
    ) => {
      const position = POSITIONS_JOUEUR[indexBot];
      const equipeBot = indexBot % 2 === 0 ? "equipe1" : "equipe2";

      return {
        maMain: contexte.mains[indexBot],
        maPosition: position,
        positionPartenaire: getPositionPartenaire(position),
        couleurAtout: contexte.couleurAtout,
        pliEnCours: contexte.pliEnCours,
        couleurDemandee:
          contexte.pliEnCours.length > 0 ? contexte.pliEnCours[0].carte.couleur : null,
        historiquePlis: contexte.historiquePlis,
        scoreMonEquipe:
          equipeBot === "equipe1" ? contexte.scoreEquipe1 : contexte.scoreEquipe2,
        scoreAdversaire:
          equipeBot === "equipe1" ? contexte.scoreEquipe2 : contexte.scoreEquipe1,
        phaseJeu,
        carteRetournee: contexte.carteRetournee,
        historiqueEncheres: contexte.historiqueEncheres,
      };
    },
    [],
  );

  // --- Convertir action bot en événement XState ---
  const actionBotVersEvenement = useCallback((action: ActionBot): EvenementPartie => {
    switch (action.type) {
      case "PRENDRE":
        return { type: "PRENDRE" };
      case "ANNONCER":
        return { type: "ANNONCER", couleur: action.couleur };
      case "PASSER":
        return { type: "PASSER" };
      case "JOUER_CARTE":
        return { type: "JOUER_CARTE", carte: action.carte };
    }
  }, []);

  // --- Boucle de jeu des bots ---
  const jouerBotSiNecessaire = useCallback(async () => {
    if (estDemonte.current || estOccupe.current || animationDistribEnCours.current)
      return;

    const acteur = acteurRef.current;
    if (!acteur) return;

    const snapshot = acteur.getSnapshot();
    const etatMachine = snapshot.value as string;
    const contexte = snapshot.context;

    // Vérifier si c'est le tour d'un bot
    if (contexte.indexJoueurActif === INDEX_HUMAIN) return;

    // Vérifier si on est dans un état où les bots peuvent agir
    if (
      etatMachine !== "encheres1" &&
      etatMachine !== "encheres2" &&
      etatMachine !== "jeu"
    ) {
      return;
    }

    estOccupe.current = true;

    try {
      // Attendre le délai réaliste du bot (plus long pendant les enchères)
      const estEncheres = etatMachine === "encheres1" || etatMachine === "encheres2";
      await attendreDelaiBot(
        estEncheres
          ? { min: ANIMATIONS.delaiEncheres.min, max: ANIMATIONS.delaiEncheres.max }
          : undefined,
      );

      if (estDemonte.current) return;

      // Recalculer le snapshot après le délai
      const snapActuel = acteur.getSnapshot();
      const etatActuel = snapActuel.value as string;
      const contexteActuel = snapActuel.context;

      // Vérifier que c'est toujours le tour du bot
      if (contexteActuel.indexJoueurActif === INDEX_HUMAIN) return;
      if (
        etatActuel !== "encheres1" &&
        etatActuel !== "encheres2" &&
        etatActuel !== "jeu"
      ) {
        return;
      }

      const indexBot = contexteActuel.indexJoueurActif;
      const phaseJeu = etatActuel as "encheres1" | "encheres2" | "jeu";
      const vueBot = construireVueBot(contexteActuel, indexBot, phaseJeu);
      const action = deciderBot(vueBot, difficulte);

      if (etatActuel === "jeu" && action.type === "JOUER_CARTE") {
        // Retirer visuellement la carte de la main du bot immédiatement
        const positionBot = POSITIONS_JOUEUR[indexBot];
        if (positionBot !== "sud") {
          const clef = positionBot as "nord" | "est" | "ouest";
          setEtatJeu((prev) => ({
            ...prev,
            nbCartesAdversaires: {
              ...prev.nbCartesAdversaires,
              [clef]: prev.nbCartesAdversaires[clef] - 1,
            },
          }));
        }

        // Animer le jeu de carte du bot
        animations.lancerAnimationJeuCarte(action.carte, positionBot, () => {
          if (estDemonte.current) return;
          // Envoyer l'événement après l'animation
          acteur.send(actionBotVersEvenement(action));
        });
      } else if (action.type === "PRENDRE" || action.type === "ANNONCER") {
        // Bot prend/annonce → distribution restante à animer
        animationDistribEnCours.current = true;
        acteur.send(actionBotVersEvenement(action));

        // Lancer directement l'animation de distribution restante
        const snapApres = acteur.getSnapshot();
        distribRestanteRef.current(snapApres.context);
      } else {
        // Bot passe
        acteur.send(actionBotVersEvenement(action));
      }
    } finally {
      estOccupe.current = false;
      // Après avoir relâché le verrou, vérifier si le prochain joueur est aussi un bot
      // (la souscription ne peut pas le faire car estOccupe était true quand elle a été appelée)
      setTimeout(() => jouerBotSiNecessaire(), 50);
    }
  }, [
    attendreDelaiBot,
    construireVueBot,
    difficulte,
    animations,
    actionBotVersEvenement,
  ]);

  // --- Lancer la distribution avec animation ---
  const lancerDistributionAnimee = useCallback(
    (contexte: ContextePartie) => {
      animationDistribEnCours.current = true;

      // Préparer les mains pour l'animation
      const mainsRecord: Record<PositionJoueur, Carte[]> = {
        sud: contexte.mains[0],
        ouest: contexte.mains[1],
        nord: contexte.mains[2],
        est: contexte.mains[3],
      };

      // Réinitialiser l'état visuel pendant l'animation
      setEtatJeu((prev) => ({
        ...prev,
        mainJoueur: [],
        nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
        pliEnCours: [],
      }));

      animations.lancerDistribution(mainsRecord, {
        onCarteArrivee: (joueur, carte) => {
          if (estDemonte.current) return;
          if (joueur === "sud") {
            setEtatJeu((prev) => ({
              ...prev,
              mainJoueur: trierMainJoueur([...prev.mainJoueur, carte]),
            }));
          } else {
            setEtatJeu((prev) => ({
              ...prev,
              nbCartesAdversaires: {
                ...prev.nbCartesAdversaires,
                [joueur]:
                  prev.nbCartesAdversaires[joueur as "nord" | "est" | "ouest"] + 1,
              },
            }));
          }
        },
        onTerminee: () => {
          if (estDemonte.current) return;

          // Relâcher le verrou d'animation AVANT la mise à jour
          animationDistribEnCours.current = false;

          // Mettre à jour l'état complet après la distribution
          const acteur = acteurRef.current;
          if (!acteur) return;
          const snap = acteur.getSnapshot();
          const etat = snap.value as string;
          const ctx = snap.context;
          setEtatJeu((prev) => ({
            ...prev,
            ...extraireEtatUI(ctx, etat),
            mainJoueur: trierMainJoueur(ctx.mains[INDEX_HUMAIN]),
            nbCartesAdversaires: {
              nord: ctx.mains[2].length,
              est: ctx.mains[3].length,
              ouest: ctx.mains[1].length,
            },
          }));

          // Pause pour montrer la carte retournée avant de lancer les enchères
          const estPhaseEncheres = etat === "encheres1" || etat === "encheres2";
          const delaiAvantBot = estPhaseEncheres ? ANIMATIONS.pauseAvantEncheres : 50;
          setTimeout(() => jouerBotSiNecessaire(), delaiAvantBot);
        },
      });
    },
    [animations, extraireEtatUI, jouerBotSiNecessaire],
  );

  // --- Lancer l'animation de ramassage du pli ---
  const lancerRamassagePli = useCallback(
    (contexte: ContextePartie) => {
      if (animationPliEnCours.current) return;
      animationPliEnCours.current = true;

      const dernierPli = contexte.historiquePlis[contexte.historiquePlis.length - 1];
      if (!dernierPli) {
        animationPliEnCours.current = false;
        return;
      }

      animations.lancerAnimationRamassagePli(
        dernierPli.cartes,
        dernierPli.gagnant,
        () => {
          if (estDemonte.current) return;
          animationPliEnCours.current = false;

          // Effacer le pli visuellement
          setEtatJeu((prev) => ({
            ...prev,
            pliEnCours: [],
          }));

          // Vérifier l'état actuel et agir
          const acteur = acteurRef.current;
          if (!acteur) return;
          const snap = acteur.getSnapshot();
          const etat = snap.value as string;
          const ctx = snap.context;

          setEtatJeu((prev) => ({
            ...prev,
            ...extraireEtatUI(ctx, etat),
          }));

          // Si la manche continue, déclencher le prochain tour
          if (etat === "jeu") {
            setTimeout(() => jouerBotSiNecessaire(), 50);
          }
        },
      );
    },
    [animations, extraireEtatUI, jouerBotSiNecessaire],
  );

  // --- Souscrire aux changements d'état de la machine ---
  useEffect(() => {
    estDemonte.current = false;

    const acteur = createActor(machineBelote);
    acteurRef.current = acteur;

    acteur.subscribe((snapshot) => {
      if (estDemonte.current) return;

      const etatMachine = snapshot.value as string;
      const contexte = snapshot.context;

      // Mettre à jour l'état UI — mais ne pas écraser les mains pendant l'animation
      const nouvelEtat = extraireEtatUI(contexte, etatMachine);
      if (animationDistribEnCours.current) {
        // Pendant la distribution animée, on ne met à jour que les champs non-visuels
        // (les mains, le nombre de cartes adversaires et la phaseUI sont gérés
        // par les callbacks d'animation — sinon la carte retournée et les enchères
        // apparaissent avant la fin de la distribution)
        setEtatJeu((prev) => ({
          ...prev,
          ...nouvelEtat,
          phaseUI: prev.phaseUI,
          mainJoueur: prev.mainJoueur,
          nbCartesAdversaires: prev.nbCartesAdversaires,
          carteRetournee: prev.carteRetournee,
          phaseEncheres: prev.phaseEncheres,
        }));
      } else {
        setEtatJeu((prev) => ({ ...prev, ...nouvelEtat }));
      }

      // Gérer les transitions automatiques selon l'état
      switch (etatMachine) {
        case "encheres1":
        case "encheres2":
          // Si c'est au bot de jouer les enchères
          if (contexte.indexJoueurActif !== INDEX_HUMAIN && !estOccupe.current) {
            setTimeout(() => jouerBotSiNecessaire(), 50);
          }
          break;

        case "jeu":
          // Si c'est au bot de jouer
          if (contexte.indexJoueurActif !== INDEX_HUMAIN && !estOccupe.current) {
            setTimeout(() => jouerBotSiNecessaire(), 50);
          }
          break;

        case "finPli":
          // Lancer l'animation de ramassage
          lancerRamassagePli(contexte);
          break;

        default:
          break;
      }
    });

    acteur.start();

    return () => {
      estDemonte.current = true;
      estOccupe.current = false;
      annulerDelai();
      animations.annulerAnimations();
      acteur.stop();
      acteurRef.current = null;
    };
  }, []);

  // --- Actions exposées à l'UI ---

  /** Démarrer une nouvelle partie */
  const demarrerPartie = useCallback(() => {
    const acteur = acteurRef.current;
    if (!acteur) return;

    // Marquer l'animation AVANT d'envoyer l'événement pour que
    // la souscription ne mette pas à jour les mains prématurément
    animationDistribEnCours.current = true;

    acteur.send({ type: "DEMARRER", scoreObjectif });

    // Lancer l'animation de distribution
    const snap = acteur.getSnapshot();
    const ctx = snap.context;
    lancerDistributionAnimee(ctx);
  }, [scoreObjectif, lancerDistributionAnimee]);

  /** Le joueur humain joue une carte */
  const jouerCarte = useCallback(
    (carte: Carte) => {
      const acteur = acteurRef.current;
      if (!acteur) return;

      const snap = acteur.getSnapshot();
      if (snap.value !== "jeu") return;
      if (snap.context.indexJoueurActif !== INDEX_HUMAIN) return;

      // Retirer la carte de la main visuellement immédiatement
      setEtatJeu((prev) => ({
        ...prev,
        mainJoueur: prev.mainJoueur.filter(
          (c) => c.rang !== carte.rang || c.couleur !== carte.couleur,
        ),
        cartesJouables: [],
        estTourHumain: false,
      }));

      // Lancer l'animation
      animations.lancerAnimationJeuCarte(carte, "sud", () => {
        if (estDemonte.current) return;

        // Ajouter la carte au pli visuellement
        setEtatJeu((prev) => ({
          ...prev,
          pliEnCours: [...prev.pliEnCours, { joueur: "sud" as PositionJoueur, carte }],
        }));

        // Envoyer l'événement à la machine
        acteur.send({ type: "JOUER_CARTE", carte });
      });
    },
    [animations],
  );

  /** Le joueur humain prend (enchères tour 1) */
  const prendre = useCallback(() => {
    const acteur = acteurRef.current;
    if (!acteur) return;
    const snap = acteur.getSnapshot();
    if (snap.value !== "encheres1") return;
    if (snap.context.indexJoueurActif !== INDEX_HUMAIN) return;

    animationDistribEnCours.current = true;
    acteur.send({ type: "PRENDRE" });

    // Distribution des cartes restantes — lancer l'animation
    const snapApres = acteur.getSnapshot();
    const etatApres = snapApres.value as string;
    if (etatApres === "jeu" || etatApres === "distributionRestante") {
      distribRestanteRef.current(snapApres.context);
    } else {
      animationDistribEnCours.current = false;
    }
  }, []);

  /** Le joueur humain annonce une couleur (enchères tour 2) */
  const annoncer = useCallback((couleur: Couleur) => {
    const acteur = acteurRef.current;
    if (!acteur) return;
    const snap = acteur.getSnapshot();
    if (snap.value !== "encheres2") return;
    if (snap.context.indexJoueurActif !== INDEX_HUMAIN) return;

    animationDistribEnCours.current = true;
    acteur.send({ type: "ANNONCER", couleur });

    // Distribution des cartes restantes
    const snapApres = acteur.getSnapshot();
    const etatApres = snapApres.value as string;
    if (etatApres === "jeu" || etatApres === "distributionRestante") {
      distribRestanteRef.current(snapApres.context);
    } else {
      animationDistribEnCours.current = false;
    }
  }, []);

  /** Le joueur humain passe (enchères) */
  const passer = useCallback(() => {
    const acteur = acteurRef.current;
    if (!acteur) return;
    const snap = acteur.getSnapshot();
    if (snap.value !== "encheres1" && snap.value !== "encheres2") return;
    if (snap.context.indexJoueurActif !== INDEX_HUMAIN) return;

    acteur.send({ type: "PASSER" });
  }, []);

  /** Continuer après le score de manche */
  const continuerApresScore = useCallback(() => {
    const acteur = acteurRef.current;
    if (!acteur) return;
    const snap = acteur.getSnapshot();
    if (snap.value !== "scoresManche") return;

    // Marquer avant l'envoi pour bloquer la souscription
    animationDistribEnCours.current = true;

    acteur.send({ type: "CONTINUER" });

    // Vérifier si la partie est terminée ou si on relance
    const snapApres = acteur.getSnapshot();
    const etatApres = snapApres.value as string;

    if (etatApres === "distribution") {
      lancerDistributionAnimee(snapApres.context);
    } else {
      // Pas de distribution (fin de partie) — on annule le flag
      animationDistribEnCours.current = false;
    }
  }, [lancerDistributionAnimee]);

  /** Recommencer une nouvelle partie après fin de partie */
  const recommencer = useCallback(() => {
    const acteur = acteurRef.current;
    if (!acteur) return;

    acteur.send({ type: "RECOMMENCER" });

    // Réinitialiser l'état UI
    setEtatJeu((prev) => ({
      ...prev,
      phaseUI: "inactif",
      mainJoueur: [],
      nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
      pliEnCours: [],
      couleurAtout: null,
      carteRetournee: null,
      scoreEquipe1: 0,
      scoreEquipe2: 0,
      pointsEquipe1: 0,
      pointsEquipe2: 0,
      cartesJouables: [],
      estTourHumain: false,
      phaseEncheres: null,
      indexPreneur: null,
      historiquePlis: [],
      historiqueEncheres: [],
    }));
  }, []);

  // --- Animation distribution restante (après enchères) ---
  const lancerDistributionRestanteAnimee = useCallback(
    (contexte: ContextePartie) => {
      // Les cartes restantes ont déjà été distribuées par la machine
      // On anime juste l'apparition des nouvelles cartes
      // La main passe de 5 à 8 cartes
      animationDistribEnCours.current = true;

      const mainsRecord: Record<PositionJoueur, Carte[]> = {
        sud: contexte.mains[0].slice(5),
        ouest: contexte.mains[1].slice(5),
        nord: contexte.mains[2].slice(5),
        est: contexte.mains[3].slice(5),
      };

      // Garder les 5 cartes visuelles existantes
      setEtatJeu((prev) => ({
        ...prev,
        phaseUI: "distribution",
      }));

      animations.lancerDistribution(mainsRecord, {
        onCarteArrivee: (joueur, carte) => {
          if (estDemonte.current) return;
          if (joueur === "sud") {
            setEtatJeu((prev) => ({
              ...prev,
              mainJoueur: trierMainJoueur([...prev.mainJoueur, carte]),
            }));
          } else {
            setEtatJeu((prev) => ({
              ...prev,
              nbCartesAdversaires: {
                ...prev.nbCartesAdversaires,
                [joueur]:
                  prev.nbCartesAdversaires[joueur as "nord" | "est" | "ouest"] + 1,
              },
            }));
          }
        },
        onTerminee: () => {
          if (estDemonte.current) return;

          // Relâcher le verrou
          animationDistribEnCours.current = false;

          const acteur = acteurRef.current;
          if (!acteur) return;
          const snap = acteur.getSnapshot();
          const etat = snap.value as string;
          const ctx = snap.context;

          setEtatJeu((prev) => ({
            ...prev,
            ...extraireEtatUI(ctx, etat),
            mainJoueur: trierMainJoueur(ctx.mains[INDEX_HUMAIN]),
            nbCartesAdversaires: {
              nord: ctx.mains[2].length,
              est: ctx.mains[3].length,
              ouest: ctx.mains[1].length,
            },
          }));

          setTimeout(() => jouerBotSiNecessaire(), 50);
        },
      });
    },
    [animations, extraireEtatUI, jouerBotSiNecessaire],
  );

  // Mettre à jour la ref pour que prendre/annoncer puissent appeler cette fonction
  distribRestanteRef.current = lancerDistributionRestanteAnimee;

  return {
    etatJeu,
    // Animations
    cartesEnVol: animations.cartesEnVol,
    surAnimationTerminee: animations.surAnimationTerminee,
    // Actions
    demarrerPartie,
    jouerCarte,
    prendre,
    annoncer,
    passer,
    continuerApresScore,
    recommencer,
  };
}
