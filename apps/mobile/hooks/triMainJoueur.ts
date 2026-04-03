import type { Carte, Couleur, Rang } from "@belote/shared-types";

interface OptionsTriMainJoueur {
  couleurPrioritaire?: Couleur | null;
  couleurAtout?: Couleur | null;
}

const FORCE_HORS_ATOUT: Record<Rang, number> = {
  as: 7,
  "10": 6,
  roi: 5,
  dame: 4,
  valet: 3,
  "9": 2,
  "8": 1,
  "7": 0,
};

const FORCE_ATOUT: Record<Rang, number> = {
  valet: 7,
  "9": 6,
  as: 5,
  "10": 4,
  roi: 3,
  dame: 2,
  "8": 1,
  "7": 0,
};

const ORDRE_COULEURS_BASE: Couleur[] = ["pique", "coeur", "carreau", "trefle"];
const ORDRE_PREFERENCE: Couleur[] = ["pique", "coeur", "carreau", "trefle"];

function estCouleurNoire(couleur: Couleur): boolean {
  return couleur === "pique" || couleur === "trefle";
}

function comparerCouleurs(a: Couleur, b: Couleur): number {
  return ORDRE_PREFERENCE.indexOf(a) - ORDRE_PREFERENCE.indexOf(b);
}

function obtenirForceCarte(carte: Carte, couleurAtout?: Couleur | null): number {
  return carte.couleur === couleurAtout
    ? FORCE_ATOUT[carte.rang]
    : FORCE_HORS_ATOUT[carte.rang];
}

function trierGroupe(groupe: Carte[], couleurAtout?: Couleur | null): Carte[] {
  return [...groupe].sort((a, b) => {
    const forceA = obtenirForceCarte(a, couleurAtout);
    const forceB = obtenirForceCarte(b, couleurAtout);

    return forceB - forceA;
  });
}

function ordonnerCouleursAvecPriorite(
  groupes: Map<Couleur, Carte[]>,
  couleurPrioritaire: Couleur,
): Couleur[] {
  const couleursDisponibles = ORDRE_COULEURS_BASE.filter(
    (couleur) => (groupes.get(couleur)?.length ?? 0) > 0,
  );

  if (!couleursDisponibles.includes(couleurPrioritaire)) {
    return couleursDisponibles;
  }

  const noires = (["pique", "trefle"] as Couleur[]).filter(
    (couleur) => couleur !== couleurPrioritaire && couleursDisponibles.includes(couleur),
  );
  const rouges = (["coeur", "carreau"] as Couleur[]).filter(
    (couleur) => couleur !== couleurPrioritaire && couleursDisponibles.includes(couleur),
  );

  const resultat: Couleur[] = [couleurPrioritaire];
  const commencerParNoir = noires.length >= rouges.length;
  let indexNoir = 0;
  let indexRouge = 0;

  while (indexNoir < noires.length || indexRouge < rouges.length) {
    if (commencerParNoir) {
      if (indexNoir < noires.length) {
        resultat.push(noires[indexNoir]);
        indexNoir += 1;
      }
      if (indexRouge < rouges.length) {
        resultat.push(rouges[indexRouge]);
        indexRouge += 1;
      }
      continue;
    }

    if (indexRouge < rouges.length) {
      resultat.push(rouges[indexRouge]);
      indexRouge += 1;
    }
    if (indexNoir < noires.length) {
      resultat.push(noires[indexNoir]);
      indexNoir += 1;
    }
  }

  return resultat;
}

export function trierMainJoueur(
  cartes: Carte[],
  options: OptionsTriMainJoueur = {},
): Carte[] {
  const { couleurPrioritaire, couleurAtout } = options;
  const groupes = new Map<Couleur, Carte[]>();

  for (const couleur of ORDRE_COULEURS_BASE) {
    groupes.set(couleur, []);
  }

  for (const carte of cartes) {
    groupes.get(carte.couleur)?.push(carte);
  }

  for (const [couleur, groupe] of groupes.entries()) {
    groupes.set(couleur, trierGroupe(groupe, couleurAtout));
  }

  const ordreCouleurs = couleurPrioritaire
    ? ordonnerCouleursAvecPriorite(groupes, couleurPrioritaire)
    : ORDRE_COULEURS_BASE.filter((couleur) => (groupes.get(couleur)?.length ?? 0) > 0);

  return ordreCouleurs.flatMap((couleur) => groupes.get(couleur) ?? []);
}
