// Création du paquet de 32 cartes, mélange et distribution
import type { Carte } from "@belote/shared-types";
import { COULEURS, RANGS } from "@belote/shared-types";

export function creerPaquet(): Carte[] {
  const paquet: Carte[] = [];
  for (const couleur of COULEURS) {
    for (const rang of RANGS) {
      paquet.push({ couleur, rang });
    }
  }
  return paquet;
}

/** Mélange Fisher-Yates */
export function melanger(paquet: Carte[]): Carte[] {
  const melange = [...paquet];
  for (let i = melange.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [melange[i], melange[j]] = [melange[j], melange[i]];
  }
  return melange;
}

/**
 * Distribution initiale : 3 cartes puis 2 cartes à chaque joueur (= 5 par joueur).
 * Retourne les 4 mains + les 12 cartes restantes (dont la retourne).
 */
export function distribuerInitial(paquet: Carte[]): {
  mains: [Carte[], Carte[], Carte[], Carte[]];
  restantes: Carte[];
  carteRetournee: Carte;
} {
  const p = [...paquet];

  const mains: [Carte[], Carte[], Carte[], Carte[]] = [[], [], [], []];

  // Premier tour : 3 cartes chacun
  for (let j = 0; j < 4; j++) {
    mains[j].push(...p.splice(0, 3));
  }

  // Deuxième tour : 2 cartes chacun
  for (let j = 0; j < 4; j++) {
    mains[j].push(...p.splice(0, 2));
  }

  // La retourne est la première carte restante
  const carteRetournee = p[0];
  const restantes = p;

  return { mains, restantes, carteRetournee };
}

/**
 * Distribution des cartes restantes après les enchères.
 * Le preneur reçoit la retourne + 2 cartes, les autres reçoivent 3 cartes.
 */
export function distribuerRestantes(
  mains: [Carte[], Carte[], Carte[], Carte[]],
  restantes: Carte[],
  indexPreneur: number,
): [Carte[], Carte[], Carte[], Carte[]] {
  const resultat: [Carte[], Carte[], Carte[], Carte[]] = [
    [...mains[0]],
    [...mains[1]],
    [...mains[2]],
    [...mains[3]],
  ];
  const r = [...restantes];

  // La retourne (première carte des restantes) va au preneur
  const carteRetournee = r.shift()!;
  resultat[indexPreneur].push(carteRetournee);

  // Distribution des cartes restantes : 3 à chaque joueur sauf le preneur qui en reçoit 2
  for (let j = 0; j < 4; j++) {
    const nombre = j === indexPreneur ? 2 : 3;
    resultat[j].push(...r.splice(0, nombre));
  }

  return resultat;
}
