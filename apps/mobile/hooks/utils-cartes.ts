import type { Carte, Couleur } from "@belote/shared-types";

const COULEURS_FACTICES: Couleur[] = ["pique", "coeur", "carreau", "trefle"];
const RANGS_FACTICES: Carte["rang"][] = [
  "7",
  "8",
  "9",
  "10",
  "valet",
  "dame",
  "roi",
  "as",
];

export function estMemeCarte(a: Carte, b: Carte): boolean {
  return a.couleur === b.couleur && a.rang === b.rang;
}

export function creerCarteFactice(index: number): Carte {
  return {
    couleur: COULEURS_FACTICES[Math.floor(index / RANGS_FACTICES.length) % 4],
    rang: RANGS_FACTICES[index % RANGS_FACTICES.length],
  };
}
