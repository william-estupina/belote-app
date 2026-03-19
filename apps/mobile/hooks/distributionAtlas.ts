import type { Couleur, Rang } from "@belote/shared-types";

export interface PointNormalise {
  x: number;
  y: number;
}

export interface RectSource {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SPRITE_COLONNES = 8;
export const SPRITE_LIGNES = 5;

const ORDRE_COULEURS: Couleur[] = ["trefle", "carreau", "coeur", "pique"];
const ORDRE_RANGS: Rang[] = ["7", "8", "9", "10", "valet", "dame", "roi", "as"];

export function calculerRectoSource(
  largeurCellule: number,
  hauteurCellule: number,
  couleur: Couleur,
  rang: Rang,
): RectSource {
  const colonne = ORDRE_RANGS.indexOf(rang);
  const ligne = ORDRE_COULEURS.indexOf(couleur);

  if (colonne < 0 || ligne < 0) {
    throw new Error(`Carte atlas inconnue: ${couleur}-${rang}`);
  }

  return {
    x: colonne * largeurCellule,
    y: ligne * hauteurCellule,
    width: largeurCellule,
    height: hauteurCellule,
  };
}

export function calculerVersoSource(
  largeurCellule: number,
  hauteurCellule: number,
): RectSource {
  return {
    x: 0,
    y: (SPRITE_LIGNES - 1) * hauteurCellule,
    width: largeurCellule,
    height: hauteurCellule,
  };
}

export function calculerPointArc(
  depart: PointNormalise,
  arrivee: PointNormalise,
  decalagePerpendiculaire: number,
): PointNormalise {
  const dx = arrivee.x - depart.x;
  const dy = arrivee.y - depart.y;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return { ...depart };
  }

  const centreX = (depart.x + arrivee.x) / 2;
  const centreY = (depart.y + arrivee.y) / 2;
  const normeX = dx / distance;
  const normeY = dy / distance;
  const perpendicularX = normeY;
  const perpendicularY = -normeX;
  const amplitude = distance * decalagePerpendiculaire;

  return {
    x: centreX + perpendicularX * amplitude,
    y: centreY + perpendicularY * amplitude,
  };
}

export function interpolerBezierQuadratique(
  depart: PointNormalise,
  controle: PointNormalise,
  arrivee: PointNormalise,
  t: number,
): PointNormalise {
  const inverse = 1 - t;

  return {
    x:
      inverse * inverse * depart.x +
      2 * inverse * t * controle.x +
      t * t * arrivee.x,
    y:
      inverse * inverse * depart.y +
      2 * inverse * t * controle.y +
      t * t * arrivee.y,
  };
}
