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

import type { CarteSurTapis } from "../components/game/CoucheAnimation";
import { ANIMATIONS, POSITIONS_MAINS } from "../constants/layout";
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
  /** Points de la manche en cours (cartes uniquement, sans 10 de der) */
  pointsEquipe1: number;
  pointsEquipe2: number;
  /** Score final de la manche (avec 10 de der, capot, chute) */
  scoreMancheEquipe1: number;
  scoreMancheEquipe2: number;
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

/** Force hors atout (ordre normal : As > 10 > Roi > Dame > Valet > 9 > 8 > 7) */
const FORCE_HORS_ATOUT: Record<string, number> = {
  as: 7,
  "10": 6,
  roi: 5,
  dame: 4,
  valet: 3,
  "9": 2,
  "8": 1,
  "7": 0,
};

/** Force à l'atout (ordre spécial : Valet > 9 > As > 10 > Roi > Dame > 8 > 7) */
const FORCE_ATOUT: Record<string, number> = {
  valet: 7,
  "9": 6,
  as: 5,
  "10": 4,
  roi: 3,
  dame: 2,
  "8": 1,
  "7": 0,
};

// Couleurs alternées : noir, rouge, noir, rouge
const ORDRE_COULEURS_ALTERNEES: Couleur[] = ["pique", "coeur", "trefle", "carreau"];

function trierMainJoueur(cartes: Carte[], couleurAtout?: Couleur | null): Carte[] {
  if (couleurAtout) {
    return trierMainAvecAtout(cartes, couleurAtout);
  }

  // Grouper par couleur
  const parCouleur = new Map<Couleur, Carte[]>();
  for (const couleur of ORDRE_COULEURS_ALTERNEES) {
    parCouleur.set(couleur, []);
  }
  for (const carte of cartes) {
    parCouleur.get(carte.couleur)!.push(carte);
  }

  // Trier chaque groupe par puissance décroissante (hors atout)
  for (const groupe of parCouleur.values()) {
    groupe.sort((a, b) => FORCE_HORS_ATOUT[b.rang] - FORCE_HORS_ATOUT[a.rang]);
  }

  // Concaténer dans l'ordre alterné
  const resultat: Carte[] = [];
  for (const couleur of ORDRE_COULEURS_ALTERNEES) {
    resultat.push(...parCouleur.get(couleur)!);
  }
  return resultat;
}

/** Tri avec les atouts à gauche, puis les couleurs restantes en alternance noir/rouge */
function trierMainAvecAtout(cartes: Carte[], couleurAtout: Couleur): Carte[] {
  const atouts = cartes.filter((c) => c.couleur === couleurAtout);
  const nonAtouts = cartes.filter((c) => c.couleur !== couleurAtout);

  atouts.sort((a, b) => FORCE_ATOUT[b.rang] - FORCE_ATOUT[a.rang]);

  // Alternance noir/rouge pour les couleurs non-atout
  const noires: Couleur[] = (["pique", "trefle"] as Couleur[]).filter(
    (c) => c !== couleurAtout,
  );
  const rouges: Couleur[] = (["coeur", "carreau"] as Couleur[]).filter(
    (c) => c !== couleurAtout,
  );

  // Commencer par le groupe le plus fourni pour une meilleure alternance
  const couleursOrdonnees: Couleur[] = [];
  const commencerParNoir = noires.length >= rouges.length;
  let iN = 0;
  let iR = 0;
  while (iN < noires.length || iR < rouges.length) {
    if (commencerParNoir) {
      if (iN < noires.length) couleursOrdonnees.push(noires[iN++]);
      if (iR < rouges.length) couleursOrdonnees.push(rouges[iR++]);
    } else {
      if (iR < rouges.length) couleursOrdonnees.push(rouges[iR++]);
      if (iN < noires.length) couleursOrdonnees.push(noires[iN++]);
    }
  }

  const parCouleur = new Map<Couleur, Carte[]>();
  for (const c of couleursOrdonnees) parCouleur.set(c, []);
  for (const carte of nonAtouts) parCouleur.get(carte.couleur)!.push(carte);
  for (const groupe of parCouleur.values()) {
    groupe.sort((a, b) => FORCE_HORS_ATOUT[b.rang] - FORCE_HORS_ATOUT[a.rang]);
  }

  return [...atouts, ...couleursOrdonnees.flatMap((c) => parCouleur.get(c)!)];
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
    scoreMancheEquipe1: 0,
    scoreMancheEquipe2: 0,
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
  });

  // Timer pour effacer la bulle belote/rebelote
  const timerBeloteRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animations
  const animations = useAnimations();
  const { attendreDelaiBot, annulerDelai } = useDelaiBot();

  // Drapeaux pour éviter les boucles et courses
  const estOccupe = useRef(false);
  const estDemonte = useRef(false);
  const animationDistribEnCours = useRef(false);
  const animationPliEnCours = useRef(false);
  const nbPlisVus = useRef(0);
  const cartesTapisParJoueurRef = useRef<Record<PositionJoueur, CarteSurTapis[]>>({
    sud: [],
    ouest: [],
    nord: [],
    est: [],
  });
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

      return {
        phaseUI,
        mainJoueur: trierMainJoueur(contexte.mains[INDEX_HUMAIN], contexte.couleurAtout),
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

        animationDistribEnCours.current = false;

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

        cartesTapisParJoueurRef.current = { sud: [], ouest: [], nord: [], est: [] };

        const estPhaseEncheres = etat === "encheres1" || etat === "encheres2";
        const delaiAvantBot = estPhaseEncheres ? ANIMATIONS.pauseAvantEncheres : 50;
        setTimeout(() => jouerBotSiNecessaire(), delaiAvantBot);
      }, distribution.pauseAvantTri);

      timeoutsControleurRef.current.push(timeout);
    },
    [extraireEtatUI, jouerBotSiNecessaire],
  );

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

      setEtatJeu((prev) => ({
        ...prev,
        mainJoueur: [],
        nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
        pliEnCours: [],
      }));

      const prisesTerminees = { count: 0 };
      const nbJoueurs = 4;

      const lancerPhase2PourJoueur = (position: PositionJoueur) => {
        const { distribution } = ANIMATIONS;

        const timeoutPrise = setTimeout(() => {
          if (estDemonte.current) return;

          const cartesTapis = cartesTapisParJoueurRef.current[position];
          const posArrivee = POSITIONS_MAINS[position];
          const positionsArrivee = cartesTapis.map(() => ({
            x: posArrivee.x,
            y: posArrivee.y,
          }));

          const estSud = position === "sud";

          animations.lancerPriseEnMain(position, cartesTapis, positionsArrivee, {
            flipVers: estSud ? 180 : undefined,
            onTerminee: () => {
              prisesTerminees.count += 1;

              if (position === "sud") {
                setEtatJeu((prev) => ({
                  ...prev,
                  mainJoueur: [...prev.mainJoueur, ...mainsRecord[position]],
                }));
              } else {
                setEtatJeu((prev) => ({
                  ...prev,
                  nbCartesAdversaires: {
                    ...prev.nbCartesAdversaires,
                    [position]:
                      prev.nbCartesAdversaires[position as "nord" | "est" | "ouest"] +
                      mainsRecord[position].length,
                  },
                }));
              }

              if (prisesTerminees.count >= nbJoueurs) {
                lancerPhase3(contexte);
              }
            },
          });
        }, distribution.pauseAvantPrise);

        timeoutsControleurRef.current.push(timeoutPrise);
      };

      cartesTapisParJoueurRef.current = { sud: [], ouest: [], nord: [], est: [] };

      animations.lancerDistribution(mainsRecord, {
        onCarteArrivee: (cst) => {
          cartesTapisParJoueurRef.current[cst.position].push(cst);
        },
        onJoueurComplet: (position) => {
          if (estDemonte.current) return;
          lancerPhase2PourJoueur(position);
        },
      });
    },
    [animations, lancerPhase3],
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

          // Vérifier l'état actuel et agir
          const acteur = acteurRef.current;
          if (!acteur) return;
          const snap = acteur.getSnapshot();
          const etat = snap.value as string;
          const ctx = snap.context;

          // Mettre à jour l'état complet (pliEnCours sera vide via le contexte machine)
          setEtatJeu((prev) => ({
            ...prev,
            ...extraireEtatUI(ctx, etat),
          }));

          // Si la manche continue, déclencher le prochain tour
          if (etat === "jeu") {
            setTimeout(() => jouerBotSiNecessaire(), 50);
          }
        },
        // Quand les cartes commencent à voler, effacer les cartes statiques du centre
        () => {
          if (estDemonte.current) return;
          setEtatJeu((prev) => ({
            ...prev,
            pliEnCours: [],
          }));
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
        }));
      } else if (nouveauPliDetecte) {
        // Nouveau pli complété — afficher les 4 cartes depuis l'historique
        // (le contexte machine a déjà vidé pliEnCours, on le restaure ici)
        const dernierPli = contexte.historiquePlis[contexte.historiquePlis.length - 1];
        setEtatJeu((prev) => ({
          ...prev,
          ...nouvelEtat,
          pliEnCours: dernierPli.cartes,
        }));
      } else if (animationPliEnCours.current) {
        // Pendant le ramassage du pli, préserver les cartes visuelles au centre
        setEtatJeu((prev) => ({
          ...prev,
          ...nouvelEtat,
          pliEnCours: prev.pliEnCours,
        }));
      } else {
        setEtatJeu((prev) => ({ ...prev, ...nouvelEtat }));
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

    return () => {
      estDemonte.current = true;
      estOccupe.current = false;
      annulerDelai();
      if (timerBeloteRef.current) clearTimeout(timerBeloteRef.current);
      animations.annulerAnimations();
      for (const t of timeoutsControleurRef.current) clearTimeout(t);
      timeoutsControleurRef.current = [];
      cartesTapisParJoueurRef.current = { sud: [], ouest: [], nord: [], est: [] };
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
    (carte: Carte, positionDepart?: { x: number; y: number }) => {
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

      // Lancer l'animation depuis la position réelle de la carte dans l'éventail
      animations.lancerAnimationJeuCarte(
        carte,
        "sud",
        () => {
          if (estDemonte.current) return;

          // Ajouter la carte au pli visuellement
          setEtatJeu((prev) => ({
            ...prev,
            pliEnCours: [...prev.pliEnCours, { joueur: "sud" as PositionJoueur, carte }],
          }));

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
      scoreMancheEquipe1: 0,
      scoreMancheEquipe2: 0,
      cartesJouables: [],
      estTourHumain: false,
      phaseEncheres: null,
      indexPreneur: null,
      historiquePlis: [],
      historiqueEncheres: [],
      plisEquipe1: 0,
      plisEquipe2: 0,
      annonceBelote: null,
    }));
  }, []);

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

        cartesTapisParJoueurRef.current = { sud: [], ouest: [], nord: [], est: [] };

        if (ctx.couleurAtout) {
          setTimeout(() => {
            if (estDemonte.current) return;
            setEtatJeu((prev) => ({
              ...prev,
              mainJoueur: trierMainAvecAtout(prev.mainJoueur, ctx.couleurAtout!),
            }));
          }, 500);
        }

        setTimeout(() => jouerBotSiNecessaire(), 600);
      }, distribution.pauseAvantTri);

      timeoutsControleurRef.current.push(timeout);
    },
    [extraireEtatUI, jouerBotSiNecessaire],
  );

  // --- Animation distribution restante (après enchères) ---
  const lancerDistributionRestanteAnimee = useCallback(
    (contexte: ContextePartie) => {
      animationDistribEnCours.current = true;

      cartesTapisParJoueurRef.current = { sud: [], ouest: [], nord: [], est: [] };

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

      setEtatJeu((prev) => ({
        ...prev,
        phaseUI: "distribution",
      }));

      const prisesTerminees = { count: 0 };
      const nbJoueurs = 4;

      const lancerPhase2Restante = (position: PositionJoueur) => {
        const { distribution } = ANIMATIONS;

        const timeoutPrise = setTimeout(() => {
          if (estDemonte.current) return;

          const cartesTapis = cartesTapisParJoueurRef.current[position];
          const posArrivee = POSITIONS_MAINS[position];
          const positionsArrivee = cartesTapis.map(() => ({
            x: posArrivee.x,
            y: posArrivee.y,
          }));

          const estSud = position === "sud";

          animations.lancerPriseEnMain(position, cartesTapis, positionsArrivee, {
            flipVers: estSud ? 180 : undefined,
            onTerminee: () => {
              prisesTerminees.count += 1;

              if (position === "sud") {
                setEtatJeu((prev) => ({
                  ...prev,
                  mainJoueur: [...prev.mainJoueur, ...contexte.mains[0].slice(5)],
                }));
              } else {
                const idx = POSITIONS_JOUEUR.indexOf(position);
                setEtatJeu((prev) => ({
                  ...prev,
                  nbCartesAdversaires: {
                    ...prev.nbCartesAdversaires,
                    [position]:
                      prev.nbCartesAdversaires[position as "nord" | "est" | "ouest"] +
                      contexte.mains[idx].slice(5).length,
                  },
                }));
              }

              if (prisesTerminees.count >= nbJoueurs) {
                lancerPhase3Restante(contexte);
              }
            },
          });
        }, distribution.pauseAvantPrise);

        timeoutsControleurRef.current.push(timeoutPrise);
      };

      const lancerDistribApresSlide = () => {
        const cartesVisibles =
          estPreneurPremier && carteRetournee ? [carteRetournee] : [];

        animations.lancerDistribution(
          estPreneurPremier
            ? {
                ...mainsRecord,
                [positionPreneur]: carteRetournee
                  ? [carteRetournee, ...mainsRecord[positionPreneur]]
                  : mainsRecord[positionPreneur],
              }
            : mainsRecord,
          {
            cartesVisibles,
            onCarteArrivee: (cst) => {
              cartesTapisParJoueurRef.current[cst.position].push(cst);
            },
            onJoueurComplet: (position) => {
              if (estDemonte.current) return;
              lancerPhase2Restante(position);
            },
          },
        );
      };

      if (!estPreneurPremier && carteRetournee) {
        animations.glisserCarteRetournee(
          carteRetournee,
          0.5,
          0.35,
          positionPreneur,
          (carteSurTapis) => {
            cartesTapisParJoueurRef.current[positionPreneur].push(carteSurTapis);
            const timeoutSlide = setTimeout(() => {
              lancerDistribApresSlide();
            }, ANIMATIONS.distribution.pauseAvantPrise);
            timeoutsControleurRef.current.push(timeoutSlide);
          },
        );

        setEtatJeu((prev) => ({
          ...prev,
          carteRetournee: null,
        }));
      } else {
        setEtatJeu((prev) => ({
          ...prev,
          carteRetournee: null,
        }));
        lancerDistribApresSlide();
      }
    },
    [animations, lancerPhase3Restante],
  );

  // Mettre à jour la ref pour que prendre/annoncer puissent appeler cette fonction
  distribRestanteRef.current = lancerDistributionRestanteAnimee;

  return {
    etatJeu,
    // Animations
    cartesEnVol: animations.cartesEnVol,
    cartesSurTapis: animations.cartesSurTapis,
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
