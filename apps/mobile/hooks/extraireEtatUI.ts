import type { ContextePartie, EvenementPartie } from "@belote/game-logic";
import { getCartesJouables } from "@belote/game-logic";
import type { ActionBot, Carte, PositionJoueur } from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";

import { construireResumeFinManche } from "./resume-fin-manche";
import type { EtatJeu, PhaseUI } from "./useControleurJeu";

const INDEX_HUMAIN = 0;

function getPositionPartenaire(position: PositionJoueur): PositionJoueur {
  const index = POSITIONS_JOUEUR.indexOf(position);
  return POSITIONS_JOUEUR[(index + 2) % 4];
}

/** Extrait l'état UI depuis le contexte XState — fonction pure, sans dépendance hook */
export function extraireEtatUI(
  contexte: ContextePartie,
  etatMachine: string,
): Partial<EtatJeu> {
  const position = POSITIONS_JOUEUR[contexte.indexJoueurActif];
  const estHumain = contexte.indexJoueurActif === INDEX_HUMAIN;

  let cartesJouables: Carte[] = [];
  if (estHumain && etatMachine === "jeu" && contexte.couleurAtout) {
    cartesJouables = getCartesJouables(
      contexte.mains[INDEX_HUMAIN],
      contexte.pliEnCours,
      contexte.couleurAtout,
      getPositionPartenaire("sud"),
    );
  }

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
    mainJoueur: contexte.mains[INDEX_HUMAIN],
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
}

/** Construit la vue passée au moteur de décision du bot — fonction pure */
export function construireVueBot(
  contexte: ContextePartie,
  indexBot: number,
  phaseJeu: "encheres1" | "encheres2" | "jeu",
) {
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
}

/** Convertit une action bot en événement XState — fonction pure */
export function actionBotVersEvenement(action: ActionBot): EvenementPartie {
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
}

/** Synchronise l'ordre visible de la main avec le contexte machine — fonction pure */
export function synchroniserOrdreVisibleMain(
  mainVisible: ReadonlyArray<Carte>,
  mainContexte: ReadonlyArray<Carte>,
): Carte[] {
  const cartesRestantes = [...mainContexte];
  const mainSynchronisee: Carte[] = [];

  for (const carteVisible of mainVisible) {
    const indexCarte = cartesRestantes.findIndex(
      (carte) =>
        carte.couleur === carteVisible.couleur && carte.rang === carteVisible.rang,
    );
    if (indexCarte === -1) continue;

    mainSynchronisee.push(cartesRestantes[indexCarte]);
    cartesRestantes.splice(indexCarte, 1);
  }

  const mainFinale = [...mainSynchronisee, ...cartesRestantes];
  const aMemeLongueur = mainFinale.length === mainVisible.length;
  const estDejaSynchronisee =
    aMemeLongueur &&
    mainFinale.every((carte, index) => {
      const carteVisible = mainVisible[index];
      return (
        carteVisible !== undefined &&
        carteVisible.couleur === carte.couleur &&
        carteVisible.rang === carte.rang
      );
    });

  if (estDejaSynchronisee) {
    return mainVisible as Carte[];
  }

  return mainFinale;
}
