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

import {
  calculerDispositionMainJoueur,
  calculerPointAncrageCarteMainJoueurNormalisee,
} from "../components/game/mainJoueurDisposition";
import { calculerDispositionReserveCentrale } from "../components/game/reserve-centrale-disposition";
import { ANIMATIONS, RATIO_ASPECT_CARTE, RATIO_LARGEUR_CARTE } from "../constants/layout";
import {
  calculerCiblesEventailAdversaire,
  ECHELLE_MAIN_ADVERSE,
} from "./distributionLayoutAtlas";
import {
  demarrerTransitionDernierPli,
  terminerTransitionDernierPli,
} from "./etatDernierPliVisuel";
import { appliquerEtatVerrouillePendantFinPli } from "./etatFinPliVisuel";
import { ajouterCarteAuPliVisuel } from "./etatPliVisuel";
import { calculerDureeTotaleRamassagePli } from "./planRamassagePli";
import type { ResumeFinManche } from "./resume-fin-manche";
import { construireResumeFinManche } from "./resume-fin-manche";
import {
  construireTransitionTriMainInitiale,
  DELAI_SUPPLEMENTAIRE_TRI_MAIN_INITIALE_MS,
} from "./transition-tri-main-initiale";
import { trierMainJoueur } from "./triMainJoueur";
import {
  type CarteRetourPaquet,
  construireCartesGeleesDepuisPli,
  useAnimations,
} from "./useAnimations";
import { useAnimationsDistribution } from "./useAnimationsDistribution";
import { useAtlasCartes } from "./useAtlasCartes";
import { useDelaiBot } from "./useDelaiBot";

// --- Types exposés ---

export type PhaseUI =
  | "inactif"
  | "distribution"
  | "redistribution"
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
  /** Points de la manche en cours (cartes uniquement, sans 10 de der) */
  pointsEquipe1: number;
  pointsEquipe2: number;
  /** Score final de la manche (avec 10 de der, capot, chute) */
  scoreMancheEquipe1: number;
  scoreMancheEquipe2: number;
  /** Resume explicite de la fin de manche pour l UI */
  resumeFinManche: ResumeFinManche | null;
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
  /** Nombre de plis remportés par équipe */
  plisEquipe1: number;
  plisEquipe2: number;
  /** Annonce belote/rebelote en cours */
  annonceBelote: { joueur: PositionJoueur; type: "belote" | "rebelote" } | null;
  /** Nombre de cartes restantes dans le paquet central (pour l'animation) */
  cartesRestantesPaquet: number;
  /** Index du donneur courant */
  indexDonneur: number;
  /** Nombre de cartes vise pendant la distribution pour la main du joueur */
  nbCartesAnticipeesJoueur: number;
  /** Conserve temporairement l ordre de reception avant le tri visuel */
  triMainDiffere: boolean;
  /** Dernier pli actuellement visible dans le widget */
  dernierPliVisible: ContextePartie["historiquePlis"][number] | null;
  /** Ancien pli conserve temporairement pendant la transition */
  precedentDernierPliVisible: ContextePartie["historiquePlis"][number] | null;
  /** Transition du widget dernier pli en cours */
  transitionDernierPliActive: boolean;
  /** Duree de transition du widget dernier pli */
  dureeTransitionDernierPliMs: number;
  /** Clef pour relancer l'animation du widget dernier pli */
  cleTransitionDernierPli: number;
  /** Conserve temporairement les badges Passe avant le rappel des cartes */
  afficherActionsEnchereRedistribution: boolean;
}

interface OptionsControleur {
  difficulte: Difficulte;
  scoreObjectif: number;
  largeurEcran: number;
  hauteurEcran: number;
}

// --- Constantes ---

const INDEX_HUMAIN = 0; // sud
const COULEURS_FACTICES: Couleur[] = ["pique", "coeur", "carreau", "trefle"];
const RANGS_FACTICES = ["7", "8", "9", "10", "valet", "dame", "roi", "as"] as const;

function getPositionPartenaire(position: PositionJoueur): PositionJoueur {
  const index = POSITIONS_JOUEUR.indexOf(position);
  return POSITIONS_JOUEUR[(index + 2) % 4];
}

function estMemeCarte(a: Carte, b: Carte): boolean {
  return a.couleur === b.couleur && a.rang === b.rang;
}

function synchroniserOrdreVisibleMain(
  mainVisible: ReadonlyArray<Carte>,
  mainContexte: ReadonlyArray<Carte>,
): Carte[] {
  const cartesRestantes = [...mainContexte];
  const mainSynchronisee: Carte[] = [];

  for (const carteVisible of mainVisible) {
    const indexCarte = cartesRestantes.findIndex((carte) =>
      estMemeCarte(carte, carteVisible),
    );
    if (indexCarte === -1) continue;

    mainSynchronisee.push(cartesRestantes[indexCarte]);
    cartesRestantes.splice(indexCarte, 1);
  }

  return [...mainSynchronisee, ...cartesRestantes];
}

function creerCarteFactice(index: number): Carte {
  return {
    couleur: COULEURS_FACTICES[Math.floor(index / RANGS_FACTICES.length) % 4],
    rang: RANGS_FACTICES[index % RANGS_FACTICES.length],
  };
}

function conserverHistoriqueEncheresAvantRedistribution(etat: EtatJeu) {
  if (etat.phaseEncheres !== "encheres2" || etat.historiqueEncheres.length >= 8) {
    return etat.historiqueEncheres;
  }

  return [
    ...etat.historiqueEncheres,
    {
      type: "PASSER" as const,
      joueur: POSITIONS_JOUEUR[etat.indexDonneur],
    },
  ];
}

// --- Hook principal ---

export function useControleurJeu({
  difficulte,
  scoreObjectif,
  largeurEcran,
  hauteurEcran,
}: OptionsControleur) {
  // Acteur XState
  const acteurRef = useRef<Actor<typeof machineBelote> | null>(null);

  // État de jeu exposé à l'UI
  const [etatJeu, setEtatJeu] = useState<EtatJeu>({
    phaseUI: "distribution",
    mainJoueur: [],
    nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
    pliEnCours: [],
    couleurAtout: null,
    carteRetournee: null,
    scoreEquipe1: 0,
    scoreEquipe2: 0,
    pointsEquipe1: 0,
    pointsEquipe2: 0,
    scoreMancheEquipe1: 0,
    scoreMancheEquipe2: 0,
    resumeFinManche: null,
    cartesJouables: [],
    estTourHumain: false,
    joueurActif: "sud",
    phaseEncheres: null,
    indexPreneur: null,
    scoreObjectif: 1000,
    historiquePlis: [],
    historiqueEncheres: [],
    plisEquipe1: 0,
    plisEquipe2: 0,
    annonceBelote: null,
    cartesRestantesPaquet: 0,
    indexDonneur: 1,
    nbCartesAnticipeesJoueur: 0,
    triMainDiffere: false,
    dernierPliVisible: null,
    precedentDernierPliVisible: null,
    transitionDernierPliActive: false,
    dureeTransitionDernierPliMs: 0,
    cleTransitionDernierPli: 0,
    afficherActionsEnchereRedistribution: false,
  });
  const etatJeuRef = useRef(etatJeu);
  etatJeuRef.current = etatJeu;
  const dimensionsEcranRef = useRef({ largeur: largeurEcran, hauteur: hauteurEcran });
  dimensionsEcranRef.current = { largeur: largeurEcran, hauteur: hauteurEcran };

  // Timer pour effacer la bulle belote/rebelote
  const timerBeloteRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const animations = useAnimations();
  const atlas = useAtlasCartes();
  const animDistribution = useAnimationsDistribution(atlas, {
    largeur: largeurEcran,
    hauteur: hauteurEcran,
  });
  const { attendreDelaiBot, annulerDelai } = useDelaiBot();

  // Drapeaux pour éviter les boucles et courses
  const estOccupe = useRef(false);
  const estDemonte = useRef(false);
  const animationDistribEnCours = useRef(false);
  const animationPliEnCours = useRef(false);
  const nbPlisVus = useRef(0);
  const nbRedistributionsVues = useRef(0);
  const timeoutsControleurRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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

      const resumeFinManche =
        etatMachine === "scoresManche" && contexte.indexPreneur !== null
          ? construireResumeFinManche({
              indexPreneur: contexte.indexPreneur,
              scoreEquipe1: contexte.scoreEquipe1,
              scoreEquipe2: contexte.scoreEquipe2,
              scoreMancheEquipe1: contexte.scoreMancheEquipe1,
              scoreMancheEquipe2: contexte.scoreMancheEquipe2,
            })
          : null;

      return {
        phaseUI,
        mainJoueur: trierMainJoueur(contexte.mains[INDEX_HUMAIN], {
          couleurPrioritaire:
            contexte.couleurAtout ?? contexte.carteRetournee?.couleur ?? null,
          couleurAtout: contexte.couleurAtout,
        }),
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
        scoreMancheEquipe1: contexte.scoreMancheEquipe1,
        scoreMancheEquipe2: contexte.scoreMancheEquipe2,
        resumeFinManche,
        cartesJouables,
        estTourHumain: estHumain,
        joueurActif: position,
        phaseEncheres:
          etatMachine === "encheres1" || etatMachine === "encheres2" ? etatMachine : null,
        indexPreneur: contexte.indexPreneur,
        scoreObjectif: contexte.scoreObjectif,
        historiquePlis: contexte.historiquePlis,
        historiqueEncheres: contexte.historiqueEncheres,
        plisEquipe1: contexte.plisEquipe1,
        plisEquipe2: contexte.plisEquipe2,
        annonceBelote: contexte.annonceBelote,
        indexDonneur: contexte.indexDonneur,
        nbCartesAnticipeesJoueur: contexte.mains[INDEX_HUMAIN].length,
        afficherActionsEnchereRedistribution: false,
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
        positionPreneur:
          contexte.indexPreneur !== null ? POSITIONS_JOUEUR[contexte.indexPreneur] : null,
        positionDonneur: POSITIONS_JOUEUR[contexte.indexDonneur],
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
    if (
      estDemonte.current ||
      estOccupe.current ||
      animationDistribEnCours.current ||
      animationPliEnCours.current
    )
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

        // Animer le jeu de carte du bot et attendre la fin avant de relâcher estOccupe
        await new Promise<void>((resolve) => {
          animations.lancerAnimationJeuCarte(action.carte, positionBot, () => {
            if (estDemonte.current) {
              resolve();
              return;
            }

            setEtatJeu((prev) =>
              ajouterCarteAuPliVisuel(prev, positionBot, action.carte),
            );

            // Envoyer l'événement après l'animation
            acteur.send(actionBotVersEvenement(action));
            resolve();
          });
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

  // --- Phase 3 : tri et finalisation après distribution ---
  const lancerPhase3 = useCallback(
    (contexte: ContextePartie) => {
      const { distribution } = ANIMATIONS;

      const timeout = setTimeout(() => {
        if (estDemonte.current) return;

        const acteur = acteurRef.current;
        if (!acteur) return;
        const snap = acteur.getSnapshot();
        const etat = snap.value as string;
        const ctx = snap.context;
        const carteRetournee = ctx.carteRetournee;
        const mainTriee = trierMainJoueur(ctx.mains[INDEX_HUMAIN], {
          couleurPrioritaire: ctx.couleurAtout ?? ctx.carteRetournee?.couleur ?? null,
          couleurAtout: ctx.couleurAtout,
        });
        const transitionTri = construireTransitionTriMainInitiale(
          ctx.mains[INDEX_HUMAIN],
          mainTriee,
        );

        animationDistribEnCours.current = false;
        // Masquer les cartes sud dans l'Atlas avant de démonter le canvas,
        // pour éviter un flash dû au double rendu (Atlas + MainJoueur).
        for (const p of animDistribution.progressionsSud) {
          p.value = 2;
        }
        animDistribution.terminerDistribution();

        const appliquerEtatAvantEncheres = () =>
          setEtatJeu((prev) => ({
            ...prev,
            ...transitionTri.etatAvantTri,
            phaseUI: "distribution",
            phaseEncheres: null,
            carteRetournee: null,
            nbCartesAdversaires: {
              nord: ctx.mains[2].length,
              est: ctx.mains[3].length,
              ouest: ctx.mains[1].length,
            },
            cartesRestantesPaquet: 12,
            nbCartesAnticipeesJoueur: ctx.mains[INDEX_HUMAIN].length,
          }));

        const finaliserEntreeEncheres = () => {
          if (estDemonte.current) return;

          setEtatJeu((prev) => ({
            ...prev,
            ...extraireEtatUI(ctx, etat),
            mainJoueur: mainTriee,
            triMainDiffere: false,
            nbCartesAdversaires: {
              nord: ctx.mains[2].length,
              est: ctx.mains[3].length,
              ouest: ctx.mains[1].length,
            },
            cartesRestantesPaquet: 12,
            nbCartesAnticipeesJoueur: ctx.mains[INDEX_HUMAIN].length,
          }));

          const timeoutBot = setTimeout(() => jouerBotSiNecessaire(), 50);
          timeoutsControleurRef.current.push(timeoutBot);
        };

        appliquerEtatAvantEncheres();

        const timeoutTri = setTimeout(() => {
          if (estDemonte.current) return;

          const acteurCourant = acteurRef.current;
          if (!acteurCourant) return;
          const snapshotCourant = acteurCourant.getSnapshot();

          if (snapshotCourant.context.mains[INDEX_HUMAIN].length !== mainTriee.length) {
            return;
          }

          setEtatJeu((prev) => ({
            ...prev,
            ...transitionTri.etatApresTri,
          }));
        }, DELAI_SUPPLEMENTAIRE_TRI_MAIN_INITIALE_MS);
        timeoutsControleurRef.current.push(timeoutTri);

        const dimensionsCourantes = dimensionsEcranRef.current;

        if (
          !carteRetournee ||
          dimensionsCourantes.largeur <= 0 ||
          dimensionsCourantes.hauteur <= 0
        ) {
          finaliserEntreeEncheres();
          return;
        }

        const dispositionReserve = calculerDispositionReserveCentrale({
          largeurEcran: dimensionsCourantes.largeur,
          hauteurEcran: dimensionsCourantes.hauteur,
        });

        animations.lancerAnimationRevelationCarteRetournee(
          carteRetournee,
          {
            x: dispositionReserve.centreCarteRetournee.x / dimensionsCourantes.largeur,
            y: dispositionReserve.centreCarteRetournee.y / dimensionsCourantes.hauteur,
          },
          finaliserEntreeEncheres,
        );
      }, distribution.pauseAvantTri);

      timeoutsControleurRef.current.push(timeout);
    },
    [extraireEtatUI, jouerBotSiNecessaire, animDistribution, animations],
  );

  const construireCartesRetourPaquet = useCallback((): CarteRetourPaquet[] => {
    const etatVisible = etatJeuRef.current;
    const { largeur: larg, hauteur: haut } = dimensionsEcranRef.current;
    if (larg <= 0 || haut <= 0) {
      return [];
    }

    const largeurCarte = Math.round(larg * RATIO_LARGEUR_CARTE);
    const hauteurCarte = Math.round(largeurCarte * RATIO_ASPECT_CARTE);
    const delaiEntreVagues = ANIMATIONS.distribution.delaiEntreVaguesRetourPaquet;

    const dispositionSud = calculerDispositionMainJoueur({
      mode: "eventail",
      nbCartes: etatVisible.mainJoueur.length,
      largeurEcran: larg,
      hauteurEcran: haut,
      largeurCarte,
      hauteurCarte,
    });

    const cartesSud = etatVisible.mainJoueur.map((carte, index) => {
      const positionCarte = dispositionSud.cartes[index];
      if (!positionCarte) return null;

      return {
        carte,
        flipDe: 180,
        flipVers: 0,
        depart: {
          ...calculerPointAncrageCarteMainJoueurNormalisee({
            x: positionCarte.x,
            decalageY: positionCarte.decalageY,
            largeurEcran: larg,
            hauteurEcran: haut,
            largeurCarte,
            hauteurCarte,
          }),
          rotation: positionCarte.angle,
          echelle: 1,
        },
      };
    });

    const cartesParPosition = {
      sud: cartesSud,
      ouest: calculerCiblesEventailAdversaire(
        "ouest",
        0,
        etatVisible.nbCartesAdversaires.ouest,
        etatVisible.nbCartesAdversaires.ouest,
        larg,
        haut,
      ).map((cible, index) => ({
        carte: creerCarteFactice(index),
        depart: {
          x: cible.arrivee.x,
          y: cible.arrivee.y,
          rotation: cible.rotationArrivee,
          echelle: ECHELLE_MAIN_ADVERSE,
        },
      })),
      nord: calculerCiblesEventailAdversaire(
        "nord",
        0,
        etatVisible.nbCartesAdversaires.nord,
        etatVisible.nbCartesAdversaires.nord,
        larg,
        haut,
      ).map((cible, index) => ({
        carte: creerCarteFactice(8 + index),
        depart: {
          x: cible.arrivee.x,
          y: cible.arrivee.y,
          rotation: cible.rotationArrivee,
          echelle: ECHELLE_MAIN_ADVERSE,
        },
      })),
      est: calculerCiblesEventailAdversaire(
        "est",
        0,
        etatVisible.nbCartesAdversaires.est,
        etatVisible.nbCartesAdversaires.est,
        larg,
        haut,
      ).map((cible, index) => ({
        carte: creerCarteFactice(16 + index),
        depart: {
          x: cible.arrivee.x,
          y: cible.arrivee.y,
          rotation: cible.rotationArrivee,
          echelle: ECHELLE_MAIN_ADVERSE,
        },
      })),
    } satisfies Record<PositionJoueur, Array<Omit<CarteRetourPaquet, "delai"> | null>>;

    const nbVagues = Math.max(
      cartesParPosition.sud.length,
      cartesParPosition.ouest.length,
      cartesParPosition.nord.length,
      cartesParPosition.est.length,
    );

    const cartesRetour: CarteRetourPaquet[] = [];
    for (let indexVague = 0; indexVague < nbVagues; indexVague += 1) {
      const delai = indexVague * delaiEntreVagues;

      for (const position of ["sud", "ouest", "nord", "est"] as const) {
        const carte = cartesParPosition[position][indexVague];
        if (!carte) continue;
        cartesRetour.push({ ...carte, delai });
      }
    }

    return cartesRetour;
  }, []);

  // --- Lancer la distribution avec animation ---
  const lancerDistributionAnimee = useCallback(
    (contexte: ContextePartie) => {
      animationDistribEnCours.current = true;
      nbPlisVus.current = 0;

      const mainsRecord: Record<PositionJoueur, Carte[]> = {
        sud: contexte.mains[0],
        ouest: contexte.mains[1],
        nord: contexte.mains[2],
        est: contexte.mains[3],
      };

      // Calculer le nombre total de cartes à distribuer (5 par joueur = 20)
      let totalCartesAttendues = 0;
      for (const pos of POSITIONS_JOUEUR) {
        totalCartesAttendues += mainsRecord[pos].length;
      }

      setEtatJeu((prev) => ({
        ...prev,
        phaseUI: "distribution",
        mainJoueur: [],
        nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
        pliEnCours: [],
        cartesRestantesPaquet: totalCartesAttendues,
        nbCartesAnticipeesJoueur: 0,
        triMainDiffere: false,
        dernierPliVisible: null,
        precedentDernierPliVisible: null,
        transitionDernierPliActive: false,
        dureeTransitionDernierPliMs: 0,
        cleTransitionDernierPli: 0,
        afficherActionsEnchereRedistribution: false,
      }));

      let cartesRecues = 0;

      animDistribution.lancerDistribution(mainsRecord, {
        indexDonneur: contexte.indexDonneur,
        cartesVisibles: mainsRecord.sud,
        onPaquetDepart: (position, cartes) => {
          if (position !== "sud" || estDemonte.current) return;

          setEtatJeu((prev) => ({
            ...prev,
            nbCartesAnticipeesJoueur: Math.max(
              prev.nbCartesAnticipeesJoueur,
              prev.mainJoueur.length + cartes.length,
            ),
          }));
        },
        onPaquetArrive: (position, cartes) => {
          if (estDemonte.current) return;

          if (position === "sud") {
            setEtatJeu((prev) => ({
              ...prev,
              mainJoueur: [...prev.mainJoueur, ...cartes],
              cartesRestantesPaquet: prev.cartesRestantesPaquet - cartes.length,
            }));
          } else {
            setEtatJeu((prev) => ({
              ...prev,
              nbCartesAdversaires: {
                ...prev.nbCartesAdversaires,
                [position]:
                  prev.nbCartesAdversaires[position as "nord" | "est" | "ouest"] +
                  cartes.length,
              },
              cartesRestantesPaquet: prev.cartesRestantesPaquet - cartes.length,
            }));
          }

          cartesRecues += cartes.length;
          if (cartesRecues >= totalCartesAttendues) {
            lancerPhase3(contexte);
          }
        },
      });
    },
    [animDistribution, lancerPhase3],
  );

  const lancerRedistributionAnimee = useCallback(
    (contexte: ContextePartie) => {
      animationDistribEnCours.current = true;
      nbPlisVus.current = 0;

      setEtatJeu((prev) => ({
        ...prev,
        phaseUI: "redistribution",
        indexDonneur: prev.indexDonneur,
        joueurActif: POSITIONS_JOUEUR[contexte.indexJoueurActif],
        phaseEncheres: prev.phaseEncheres,
        indexPreneur: null,
        couleurAtout: null,
        cartesRestantesPaquet: 1,
        historiqueEncheres: conserverHistoriqueEncheresAvantRedistribution(prev),
        cartesJouables: [],
        estTourHumain: false,
        afficherActionsEnchereRedistribution: true,
      }));

      const timeoutAvantRappel = setTimeout(() => {
        if (estDemonte.current) return;

        const { largeur, hauteur } = dimensionsEcranRef.current;
        const disposition = calculerDispositionReserveCentrale({
          largeurEcran: largeur,
          hauteurEcran: hauteur,
        });
        const centrePaquet = {
          x: disposition.centrePaquet.x / largeur,
          y: disposition.centrePaquet.y / hauteur,
        };
        const centreCarteRetournee = {
          x: disposition.centreCarteRetournee.x / largeur,
          y: disposition.centreCarteRetournee.y / hauteur,
        };

        const carteRetournee = etatJeuRef.current.carteRetournee;
        const cartesRetour = construireCartesRetourPaquet();

        // Effacer l'état et démarrer l'animation dans le même rendu (React 18 batch)
        setEtatJeu((prev) => ({
          ...prev,
          mainJoueur: [],
          nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
          carteRetournee: null,
          phaseEncheres: null,
          historiqueEncheres: [],
          cartesRestantesPaquet: 1,
          afficherActionsEnchereRedistribution: false,
        }));

        const lancerPhase2 = () => {
          animations.lancerAnimationRetourPaquet(cartesRetour, centrePaquet, () => {
            if (estDemonte.current) return;

            setEtatJeu((prev) => ({
              ...prev,
              cartesRestantesPaquet: 32,
              indexDonneur: contexte.indexDonneur,
            }));

            const timeoutApresDealer = setTimeout(() => {
              if (estDemonte.current) return;
              lancerDistributionAnimee(contexte);
            }, ANIMATIONS.redistribution.dureeGlissementDealer);

            timeoutsControleurRef.current.push(timeoutApresDealer);
          });
        };

        if (carteRetournee) {
          // Phase 1 : carte retournée → paquet
          animations.lancerAnimationRetourCarteRetournee(
            carteRetournee,
            {
              x: centreCarteRetournee.x,
              y: centreCarteRetournee.y,
              rotation: 0,
              echelle: 0.85,
            },
            centrePaquet,
            lancerPhase2,
          );
        } else {
          lancerPhase2();
        }
      }, ANIMATIONS.redistribution.pauseAvantRappel);

      timeoutsControleurRef.current.push(timeoutAvantRappel);
    },
    [animations, construireCartesRetourPaquet, lancerDistributionAnimee],
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
      const dureeTransitionDernierPliMs = calculerDureeTotaleRamassagePli();

      animations.lancerAnimationRamassagePli(
        dernierPli.cartes,
        dernierPli.gagnant,
        () => {
          if (estDemonte.current) return;
          animationPliEnCours.current = false;

          // Vérifier l'état actuel et agir
          const acteur = acteurRef.current;
          if (!acteur) return;
          const snap = acteur.getSnapshot();
          const etat = snap.value as string;
          const ctx = snap.context;

          // Mettre à jour l'état complet (pliEnCours sera vide via le contexte machine)
          setEtatJeu((prev) =>
            terminerTransitionDernierPli({
              ...prev,
              ...extraireEtatUI(ctx, etat),
              mainJoueur: synchroniserOrdreVisibleMain(
                prev.mainJoueur,
                ctx.mains[INDEX_HUMAIN],
              ),
            }),
          );

          // Si la manche continue, déclencher le prochain tour
          if (etat === "jeu") {
            setTimeout(() => jouerBotSiNecessaire(), 50);
          }
        },
        // Quand les cartes commencent à voler, effacer les cartes statiques du centre
        () => {
          if (estDemonte.current) return;
          setEtatJeu((prev) => ({
            ...demarrerTransitionDernierPli(
              prev,
              dernierPli,
              dureeTransitionDernierPliMs,
            ),
            pliEnCours: [],
          }));
        },
      );
    },
    [animations, extraireEtatUI, jouerBotSiNecessaire],
  );

  const lancerNouvellePartie = useCallback(
    (acteur: Actor<typeof machineBelote>) => {
      animationDistribEnCours.current = true;
      acteur.send({ type: "DEMARRER", scoreObjectif });
      lancerDistributionAnimee(acteur.getSnapshot().context);
    },
    [scoreObjectif, lancerDistributionAnimee],
  );

  // --- Souscrire aux changements d'état de la machine ---
  useEffect(() => {
    estDemonte.current = false;

    const acteur = createActor(machineBelote);
    acteurRef.current = acteur;
    animationDistribEnCours.current = true;

    acteur.subscribe((snapshot) => {
      if (estDemonte.current) return;

      const etatMachine = snapshot.value as string;
      const contexte = snapshot.context;
      const redistributionDetectee =
        contexte.nombreRedistributions > nbRedistributionsVues.current;
      nbRedistributionsVues.current = contexte.nombreRedistributions;

      if (redistributionDetectee && !animationDistribEnCours.current) {
        lancerRedistributionAnimee(contexte);
        return;
      }

      // Mettre à jour l'état UI — mais ne pas écraser les mains pendant l'animation
      const nouvelEtat = extraireEtatUI(contexte, etatMachine);
      const construireEtatSansRetri = (mainVisible: ReadonlyArray<Carte>) => ({
        ...nouvelEtat,
        mainJoueur: synchroniserOrdreVisibleMain(
          mainVisible,
          contexte.mains[INDEX_HUMAIN],
        ),
      });

      // Détecter un nouveau pli AVANT la mise à jour d'état
      const nouveauPliDetecte = contexte.historiquePlis.length > nbPlisVus.current;

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
          nbCartesAnticipeesJoueur: prev.nbCartesAnticipeesJoueur,
        }));
      } else if (nouveauPliDetecte) {
        // Nouveau pli complété — afficher les 4 cartes depuis l'historique
        // (le contexte machine a déjà vidé pliEnCours, on le restaure ici)
        // Préserver le nombre de plis des piles pour ne pas les afficher
        // avant que l'animation de ramassage n'arrive
        const dernierPli = contexte.historiquePlis[contexte.historiquePlis.length - 1];
        setEtatJeu((prev) =>
          appliquerEtatVerrouillePendantFinPli(
            prev,
            construireEtatSansRetri(prev.mainJoueur),
            dernierPli.cartes,
          ),
        );
      } else if (animationPliEnCours.current) {
        // Pendant le ramassage du pli, préserver les cartes visuelles au centre
        // et ne pas mettre à jour les piles avant la fin de l'animation
        setEtatJeu((prev) =>
          appliquerEtatVerrouillePendantFinPli(
            prev,
            construireEtatSansRetri(prev.mainJoueur),
          ),
        );
      } else {
        setEtatJeu((prev) => ({
          ...prev,
          ...construireEtatSansRetri(prev.mainJoueur),
        }));
      }

      // Afficher temporairement la bulle belote/rebelote
      if (contexte.annonceBelote) {
        if (timerBeloteRef.current) clearTimeout(timerBeloteRef.current);
        timerBeloteRef.current = setTimeout(() => {
          if (estDemonte.current) return;
          setEtatJeu((prev) => ({ ...prev, annonceBelote: null }));
          timerBeloteRef.current = null;
        }, 2000);
      }

      // Lancer l'animation de ramassage pour le nouveau pli détecté
      if (nouveauPliDetecte) {
        nbPlisVus.current = contexte.historiquePlis.length;
        lancerRamassagePli(contexte);
        return; // Ne pas lancer le bot, on attend la fin de l'animation
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

        default:
          break;
      }
    });

    acteur.start();
    lancerNouvellePartie(acteur);

    return () => {
      estDemonte.current = true;
      estOccupe.current = false;
      annulerDelai();
      if (timerBeloteRef.current) clearTimeout(timerBeloteRef.current);
      animations.annulerAnimations();
      for (const t of timeoutsControleurRef.current) clearTimeout(t);
      timeoutsControleurRef.current = [];
      acteur.stop();
      acteurRef.current = null;
    };
  }, []);

  // --- Actions exposées à l'UI ---

  /** Le joueur humain joue une carte */
  const jouerCarte = useCallback(
    async (carte: Carte, positionDepart?: { x: number; y: number }) => {
      const acteur = acteurRef.current;
      if (!acteur) return;

      const snap = acteur.getSnapshot();
      if (snap.value !== "jeu") return;
      if (snap.context.indexJoueurActif !== INDEX_HUMAIN) return;

      // Retirer la carte de la main visuellement juste avant l'animation.
      setEtatJeu((prev) => ({
        ...prev,
        mainJoueur: prev.mainJoueur.filter(
          (c) => c.rang !== carte.rang || c.couleur !== carte.couleur,
        ),
        cartesJouables: [],
        estTourHumain: false,
      }));

      // Lancer l'animation depuis la position réelle de la carte dans l'éventail
      animations.lancerAnimationJeuCarte(
        carte,
        "sud",
        () => {
          if (estDemonte.current) return;

          // Ajouter la carte au pli visuellement
          setEtatJeu((prev) => ajouterCarteAuPliVisuel(prev, "sud", carte));

          // Envoyer l'événement à la machine
          acteur.send({ type: "JOUER_CARTE", carte });
        },
        positionDepart,
      );
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

    // Masquer immédiatement le dialogue de fin de manche
    setEtatJeu((prev) => ({
      ...prev,
      phaseUI: "distribution",
    }));

    acteur.send({ type: "CONTINUER" });

    // Vérifier si la partie est terminée ou si on relance
    const snapApres = acteur.getSnapshot();
    const etatApres = snapApres.value as string;

    // L'état "distribution" est transitoire (always → encheres1),
    // donc après CONTINUER on atterrit directement en "encheres1"
    if (etatApres === "encheres1") {
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

    animationDistribEnCours.current = true;
    acteur.send({ type: "RECOMMENCER" });
    lancerNouvellePartie(acteur);
  }, [lancerNouvellePartie]);

  // --- Phase 3 restante : tri et finalisation après distribution restante ---
  const lancerPhase3Restante = useCallback(
    (contexte: ContextePartie) => {
      const { distribution } = ANIMATIONS;

      const timeout = setTimeout(() => {
        if (estDemonte.current) return;

        const acteur = acteurRef.current;
        if (!acteur) return;
        const snap = acteur.getSnapshot();
        const etat = snap.value as string;
        const ctx = snap.context;

        animationDistribEnCours.current = false;
        for (const p of animDistribution.progressionsSud) {
          p.value = 2;
        }
        animDistribution.terminerDistribution();

        setEtatJeu((prev) => ({
          ...prev,
          ...extraireEtatUI(ctx, etat),
          mainJoueur: trierMainJoueur(ctx.mains[INDEX_HUMAIN], {
            couleurPrioritaire: ctx.couleurAtout ?? ctx.carteRetournee?.couleur ?? null,
            couleurAtout: ctx.couleurAtout,
          }),
          triMainDiffere: false,
          nbCartesAdversaires: {
            nord: ctx.mains[2].length,
            est: ctx.mains[3].length,
            ouest: ctx.mains[1].length,
          },
          cartesRestantesPaquet: 0,
          nbCartesAnticipeesJoueur: ctx.mains[INDEX_HUMAIN].length,
        }));

        setTimeout(() => jouerBotSiNecessaire(), 50);
      }, distribution.pauseAvantTri);

      timeoutsControleurRef.current.push(timeout);
    },
    [extraireEtatUI, jouerBotSiNecessaire, animDistribution],
  );

  // --- Animation distribution restante (après enchères) ---
  const lancerDistributionRestanteAnimee = useCallback(
    (contexte: ContextePartie) => {
      animationDistribEnCours.current = true;

      const indexPreneur = contexte.indexPreneur!;
      const positionPreneur = POSITIONS_JOUEUR[indexPreneur];

      const premierServi = POSITIONS_JOUEUR[(contexte.indexDonneur + 3) % 4];
      const estPreneurPremier = positionPreneur === premierServi;

      const mainsRecord: Record<PositionJoueur, Carte[]> = {
        sud: [],
        ouest: [],
        nord: [],
        est: [],
      };

      for (let i = 0; i < 4; i++) {
        const pos = POSITIONS_JOUEUR[i];
        if (i === indexPreneur) {
          mainsRecord[pos] = contexte.mains[i].slice(6);
        } else {
          mainsRecord[pos] = contexte.mains[i].slice(5);
        }
      }

      const carteRetournee = contexte.carteRetournee;

      // Nombre de cartes que sud a déjà en main quand la distribution restante démarre
      // Cas particulier : si sud est preneur et la carte retournée lui est glissée
      // séparément (!estPreneurPremier), il a 6 cartes au lieu de 5
      const sudEstPreneur = indexPreneur === 0;
      const nbCartesExistantesSud =
        sudEstPreneur && !estPreneurPremier && carteRetournee ? 6 : 5;

      // Compter les cartes attendues
      let totalCartesAttendues = 0;
      for (const pos of POSITIONS_JOUEUR) {
        totalCartesAttendues += mainsRecord[pos].length;
      }
      if (carteRetournee) {
        totalCartesAttendues += 1;
      }

      setEtatJeu((prev) => ({
        ...prev,
        phaseUI: "distribution",
        carteRetournee: null,
        cartesRestantesPaquet: totalCartesAttendues,
        nbCartesAnticipeesJoueur: prev.mainJoueur.length,
        triMainDiffere: false,
      }));

      let cartesRecues = 0;

      const gererPaquetArrive = (position: PositionJoueur, cartes: Carte[]) => {
        if (estDemonte.current) return;

        if (position === "sud") {
          setEtatJeu((prev) => ({
            ...prev,
            mainJoueur: [...prev.mainJoueur, ...cartes],
            cartesRestantesPaquet: prev.cartesRestantesPaquet - cartes.length,
          }));
        } else {
          setEtatJeu((prev) => ({
            ...prev,
            nbCartesAdversaires: {
              ...prev.nbCartesAdversaires,
              [position]:
                prev.nbCartesAdversaires[position as "nord" | "est" | "ouest"] +
                cartes.length,
            },
            cartesRestantesPaquet: prev.cartesRestantesPaquet - cartes.length,
          }));
        }

        cartesRecues += cartes.length;
        if (cartesRecues >= totalCartesAttendues) {
          lancerPhase3Restante(contexte);
        }
      };

      const lancerDistribRestante = () => {
        const cartesVisiblesSud = mainsRecord.sud;
        const cartesVisibles =
          estPreneurPremier && carteRetournee
            ? [carteRetournee, ...cartesVisiblesSud]
            : [...cartesVisiblesSud];

        const mainsADistribuer = estPreneurPremier
          ? {
              ...mainsRecord,
              [positionPreneur]: carteRetournee
                ? [carteRetournee, ...mainsRecord[positionPreneur]]
                : mainsRecord[positionPreneur],
            }
          : mainsRecord;

        // Calculer les cartes existantes par adversaire avant cette distribution
        const nbCartesExistantesAdversaires: Partial<
          Record<"nord" | "est" | "ouest", number>
        > = {};
        for (const pos of ["nord", "est", "ouest"] as const) {
          const idx = POSITIONS_JOUEUR.indexOf(pos);
          nbCartesExistantesAdversaires[pos] =
            contexte.mains[idx].length - mainsADistribuer[pos].length;
        }

        animDistribution.lancerDistribution(mainsADistribuer, {
          indexDonneur: contexte.indexDonneur,
          nbCartesExistantesSud,
          nbCartesExistantesAdversaires,
          cartesVisibles,
          onPaquetDepart: (position, cartes) => {
            if (position !== "sud" || estDemonte.current) return;

            setEtatJeu((prev) => ({
              ...prev,
              nbCartesAnticipeesJoueur: Math.max(
                prev.nbCartesAnticipeesJoueur,
                prev.mainJoueur.length + cartes.length,
              ),
            }));
          },
          onPaquetArrive: gererPaquetArrive,
        });
      };

      if (!estPreneurPremier && carteRetournee) {
        animations.glisserCarteRetournee(
          carteRetournee,
          0.5,
          0.35,
          positionPreneur,
          () => {
            gererPaquetArrive(positionPreneur, [carteRetournee]);
            lancerDistribRestante();
          },
        );
      } else {
        lancerDistribRestante();
      }
    },
    [animations, animDistribution, lancerPhase3Restante],
  );

  // Mettre à jour la ref pour que prendre/annoncer puissent appeler cette fonction
  distribRestanteRef.current = lancerDistributionRestanteAnimee;

  // Resynchroniser : créer des cartes gelées pour les cartes du pli absentes de cartesEnVol
  useEffect(() => {
    const cartesGelees = construireCartesGeleesDepuisPli(
      etatJeu.pliEnCours,
      animations.cartesEnVol,
    );
    if (cartesGelees.length > 0) {
      animations.ajouterCartesGelees(cartesGelees);
    }
  }, [etatJeu.pliEnCours, animations]);

  return {
    etatJeu,
    // Animations
    cartesEnVol: animations.cartesEnVol,
    surAnimationTerminee: animations.surAnimationTerminee,
    // Distribution Atlas — pool adversaires (CanvasAdversaires)
    atlas,
    cartesAtlasAdversaires: animDistribution.cartesAtlasAdversaires,
    progressionsAdv: animDistribution.progressionsAdv,
    donneesWorkletAdv: animDistribution.donneesWorkletAdv,
    nbCartesActivesAdv: animDistribution.nbCartesActivesAdv,
    // Distribution Atlas — pool sud (DistributionCanvasSud)
    cartesAtlasSud: animDistribution.cartesAtlasSud,
    progressionsSud: animDistribution.progressionsSud,
    donneesWorkletSud: animDistribution.donneesWorkletSud,
    nbCartesActivesSud: animDistribution.nbCartesActivesSud,
    distributionEnCours: animDistribution.enCours,
    // Actions
    jouerCarte,
    prendre,
    annoncer,
    passer,
    continuerApresScore,
    recommencer,
  };
}
