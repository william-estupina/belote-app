// Hook d'orchestration du jeu — pilote la machine XState, les bots et les animations
import { deciderBot } from "@belote/bot-engine";
import type { ContextePartie } from "@belote/game-logic";
import { machineBelote } from "@belote/game-logic";
import type { Carte, Couleur, Difficulte, PositionJoueur } from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Actor } from "xstate";
import { createActor } from "xstate";

import { ANIMATIONS } from "../constants/layout";
import {
  demarrerTransitionDernierPli,
  terminerTransitionDernierPli,
} from "./etatDernierPliVisuel";
import { appliquerEtatVerrouillePendantFinPli } from "./etatFinPliVisuel";
import { ajouterCarteAuPliVisuel } from "./etatPliVisuel";
import {
  actionBotVersEvenement,
  construireVueBot,
  extraireEtatUI,
  synchroniserOrdreVisibleMain,
} from "./extraireEtatUI";
import { calculerDureeTotaleRamassagePli } from "./planRamassagePli";
import type { ResumeFinManche } from "./resume-fin-manche";
import {
  construireCartesGeleesDepuisPli,
  type DepartAnimationJeuCarte,
  useAnimations,
} from "./useAnimations";
import { useAnimationsDistribution } from "./useAnimationsDistribution";
import { useAtlasCartes } from "./useAtlasCartes";
import { useDelaiBot } from "./useDelaiBot";
import { useOrchestrationDistribution } from "./useOrchestrationDistribution";
import { estMemeCarte } from "./utils-cartes";

// --- Types exposés ---

export type PhaseUI =
  | "inactif"
  | "distribution"
  | "redistribution"
  | "revelationCarte"
  | "encheres"
  | "jeu"
  | "finPli"
  | "scoresManche"
  | "finPartie";

export type ModeRenduCartes = "cinematique-distribution" | "jeu-interactif";

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
  /** Carte retournée en cours d'animation de retour vers le paquet (redistribution) */
  carteRetourneeEnRetour: Carte | null;
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

function calculerModeRenduCartes(phaseUI: PhaseUI): ModeRenduCartes {
  if (
    phaseUI === "jeu" ||
    phaseUI === "finPli" ||
    phaseUI === "scoresManche" ||
    phaseUI === "finPartie"
  ) {
    return "jeu-interactif";
  }

  return "cinematique-distribution";
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
    carteRetourneeEnRetour: null,
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
    dernierPliVisible: null,
    precedentDernierPliVisible: null,
    transitionDernierPliActive: false,
    dureeTransitionDernierPliMs: 0,
    cleTransitionDernierPli: 0,
    afficherActionsEnchereRedistribution: false,
  });
  const [cartesMasqueesMainJoueur, setCartesMasqueesMainJoueur] = useState<Carte[]>([]);
  const [cartesEnPoseMainJoueur, setCartesEnPoseMainJoueur] = useState<Carte[]>([]);
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

  const onRevelationTermineeRef = useRef<(() => void) | null>(null);
  const onRetourCarteRetourneeRef = useRef<(() => void) | null>(null);

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
  }, [attendreDelaiBot, difficulte, animations]);

  // --- Orchestration distribution (hook extrait) ---
  const { distribRestanteRef, lancerDistributionAnimee, lancerRedistributionAnimee } =
    useOrchestrationDistribution(
      {
        acteurRef,
        etatJeuRef,
        dimensionsEcranRef,
        estDemonte,
        animationDistribEnCours,
        nbPlisVus,
        timeoutsControleurRef,
        onRevelationTermineeRef,
        onRetourCarteRetourneeRef,
      },
      {
        setEtatJeu,
        animations,
        animDistribution,
        jouerBotSiNecessaire,
      },
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
    [animations, jouerBotSiNecessaire],
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
    async (carte: Carte, departAnimation?: DepartAnimationJeuCarte) => {
      const acteur = acteurRef.current;
      if (!acteur) return;

      const snap = acteur.getSnapshot();
      if (snap.value !== "jeu") return;
      if (snap.context.indexJoueurActif !== INDEX_HUMAIN) return;

      setEtatJeu((prev) => ({
        ...prev,
        cartesJouables: [],
        estTourHumain: false,
      }));
      setCartesEnPoseMainJoueur([carte]);

      // Preparer l'overlay d'animation, puis masquer la source juste avant son depart
      animations.lancerAnimationJeuCarte(
        carte,
        "sud",
        () => {
          if (estDemonte.current) return;
          setCartesEnPoseMainJoueur((precedent) =>
            precedent.filter((carteEnPose) => !estMemeCarte(carteEnPose, carte)),
          );
          setCartesMasqueesMainJoueur((precedent) =>
            precedent.filter((carteMasquee) => !estMemeCarte(carteMasquee, carte)),
          );

          // Ajouter la carte au pli visuellement
          setEtatJeu((prev) =>
            ajouterCarteAuPliVisuel(
              {
                ...prev,
                mainJoueur: prev.mainJoueur.filter((c) => !estMemeCarte(c, carte)),
              },
              "sud",
              carte,
            ),
          );

          // Envoyer l'événement à la machine
          acteur.send({ type: "JOUER_CARTE", carte });
        },
        departAnimation,
        {
          demarrageDiffere: true,
          surPretAffichage: (idAnimation) => {
            if (estDemonte.current) return;
            setCartesMasqueesMainJoueur([carte]);
            animations.demarrerAnimationJeuCarte(idAnimation);
          },
        },
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
      // Pas de distribution (fin de partie) — on annule le flag et on synchronise phaseUI
      animationDistribEnCours.current = false;
      const nouvelEtat = extraireEtatUI(snapApres.context, etatApres);
      setEtatJeu((prev) => ({ ...prev, ...nouvelEtat }));
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

  const onRevelationTerminee = useCallback(() => {
    const fn = onRevelationTermineeRef.current;
    onRevelationTermineeRef.current = null;
    fn?.();
  }, []);

  const onRetourCarteRetourneeTerminee = useCallback(() => {
    const fn = onRetourCarteRetourneeRef.current;
    onRetourCarteRetourneeRef.current = null;
    fn?.();
  }, []);

  return {
    etatJeu,
    modeRenduCartes: calculerModeRenduCartes(etatJeu.phaseUI),
    cartesMasqueesMainJoueur,
    cartesEnPoseMainJoueur,
    // Animations
    cartesEnVol: animations.cartesEnVol,
    surAnimationTerminee: animations.surAnimationTerminee,
    surCarteJeuPreteAffichage: animations.surCarteJeuPreteAffichage,
    // Distribution Atlas
    atlas,
    cartesAtlasAdversaires: animDistribution.cartesAtlasAdversaires,
    progressionsAdv: animDistribution.progressionsAdv,
    donneesWorkletAdv: animDistribution.donneesWorkletAdv,
    nbCartesActivesAdv: animDistribution.nbCartesActivesAdv,
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
    onRevelationTerminee,
    onRetourCarteRetourneeTerminee,
  };
}
