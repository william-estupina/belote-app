import type { IdEquipe } from "@belote/shared-types";

export type VerdictFinManche = "contrat-rempli" | "dedans-nous" | "dedans-eux";

export interface EntreeResumeFinManche {
  indexPreneur: number;
  scoreEquipe1: number;
  scoreEquipe2: number;
  scoreMancheEquipe1: number;
  scoreMancheEquipe2: number;
}

export interface ResumeFinManche {
  verdict: VerdictFinManche;
  messageVerdict: "Contrat rempli !" | "Vous êtes dedans" | "Ils sont dedans";
  equipePreneur: IdEquipe;
  equipeGagnanteManche: IdEquipe | null;
  estContratRempli: boolean;
  estChute: boolean;
  estCapot: boolean;
  equipeCapot: IdEquipe | null;
  scoreAvantEquipe1: number;
  scoreAvantEquipe2: number;
  scoreMancheEquipe1: number;
  scoreMancheEquipe2: number;
  scoreApresEquipe1: number;
  scoreApresEquipe2: number;
}

function getEquipeDepuisIndexJoueur(indexJoueur: number): IdEquipe {
  return indexJoueur % 2 === 0 ? "equipe1" : "equipe2";
}

function getEquipeGagnante(scoreEquipe1: number, scoreEquipe2: number): IdEquipe | null {
  if (scoreEquipe1 > scoreEquipe2) return "equipe1";
  if (scoreEquipe2 > scoreEquipe1) return "equipe2";
  return null;
}

export function construireResumeFinManche(
  entree: EntreeResumeFinManche,
): ResumeFinManche {
  const equipePreneur = getEquipeDepuisIndexJoueur(entree.indexPreneur);
  const scorePreneur =
    equipePreneur === "equipe1" ? entree.scoreMancheEquipe1 : entree.scoreMancheEquipe2;
  const scoreDefenseur =
    equipePreneur === "equipe1" ? entree.scoreMancheEquipe2 : entree.scoreMancheEquipe1;
  const equipeGagnanteManche = getEquipeGagnante(
    entree.scoreMancheEquipe1,
    entree.scoreMancheEquipe2,
  );
  const estChute = scoreDefenseur >= 162 && scorePreneur <= 20;
  const estCapot = entree.scoreMancheEquipe1 >= 252 || entree.scoreMancheEquipe2 >= 252;
  const equipeCapot = estCapot ? equipeGagnanteManche : null;
  const verdict: VerdictFinManche = estChute
    ? equipePreneur === "equipe1"
      ? "dedans-nous"
      : "dedans-eux"
    : "contrat-rempli";
  const messageVerdict =
    verdict === "contrat-rempli"
      ? "Contrat rempli !"
      : verdict === "dedans-nous"
        ? "Vous êtes dedans"
        : "Ils sont dedans";

  return {
    verdict,
    messageVerdict,
    equipePreneur,
    equipeGagnanteManche,
    estContratRempli: !estChute,
    estChute,
    estCapot,
    equipeCapot,
    scoreAvantEquipe1: entree.scoreEquipe1 - entree.scoreMancheEquipe1,
    scoreAvantEquipe2: entree.scoreEquipe2 - entree.scoreMancheEquipe2,
    scoreMancheEquipe1: entree.scoreMancheEquipe1,
    scoreMancheEquipe2: entree.scoreMancheEquipe2,
    scoreApresEquipe1: entree.scoreEquipe1,
    scoreApresEquipe2: entree.scoreEquipe2,
  };
}
