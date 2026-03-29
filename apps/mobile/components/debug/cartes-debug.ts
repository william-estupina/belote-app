import type { Carte, Couleur, Rang } from "@belote/shared-types";

const COULEURS_DEBUG: Couleur[] = ["coeur", "carreau", "trefle", "pique"];
const RANGS_DEBUG: Rang[] = ["7", "8", "9", "10", "valet", "dame", "roi", "as"];

const LIBELLES_COULEUR: Record<Couleur, string> = {
  coeur: "coeur",
  carreau: "carreau",
  trefle: "trefle",
  pique: "pique",
};

const LIBELLES_RANG: Record<Rang, string> = {
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  valet: "Valet",
  dame: "Dame",
  roi: "Roi",
  as: "As",
};

export const OPTIONS_CARTES_DEBUG: Carte[] = COULEURS_DEBUG.flatMap((couleur) =>
  RANGS_DEBUG.map((rang) => ({ couleur, rang })),
);

export const CARTE_DEBUG_GAUCHE_PAR_DEFAUT: Carte = {
  couleur: "coeur",
  rang: "7",
};

export const CARTE_DEBUG_DROITE_PAR_DEFAUT: Carte = {
  couleur: "coeur",
  rang: "7",
};

export function formaterCarteDebug(carte: Carte): string {
  return `${LIBELLES_RANG[carte.rang]} de ${LIBELLES_COULEUR[carte.couleur]}`;
}

export function construireCleCarteDebug(carte: Carte): string {
  return `${carte.rang}-${carte.couleur}`;
}
