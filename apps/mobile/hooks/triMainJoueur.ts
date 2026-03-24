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

const ORDRE_COULEURS_ALTERNEES: Couleur[] = ["pique", "coeur", "trefle", "carreau"];
const ORDRE_PREFERENCE: Couleur[] = ["pique", "coeur", "trefle", "carreau"];

function estCouleurNoire(couleur: Couleur): boolean {
  return couleur === "pique" || couleur === "trefle";
}

function comparerCouleurs(a: Couleur, b: Couleur): number {
  return ORDRE_PREFERENCE.indexOf(a) - ORDRE_PREFERENCE.indexOf(b);
}

function trierGroupe(groupe: Carte[], couleurAtout?: Couleur | null): Carte[] {
  return [...groupe].sort((a, b) => {
    const forceA =
      a.couleur === couleurAtout ? FORCE_ATOUT[a.rang] : FORCE_HORS_ATOUT[a.rang];
    const forceB =
      b.couleur === couleurAtout ? FORCE_ATOUT[b.rang] : FORCE_HORS_ATOUT[b.rang];

    return forceB - forceA;
  });
}

function choisirCouleurSuivante(
  couleursRestantes: Couleur[],
  groupes: Map<Couleur, Carte[]>,
  couleurPrecedente: Couleur,
): Couleur {
  const chercherOpposee = couleursRestantes.filter(
    (couleur) => estCouleurNoire(couleur) !== estCouleurNoire(couleurPrecedente),
  );
  const candidates = chercherOpposee.length > 0 ? chercherOpposee : couleursRestantes;

  return [...candidates].sort((a, b) => {
    const deltaTaille = (groupes.get(b)?.length ?? 0) - (groupes.get(a)?.length ?? 0);
    if (deltaTaille !== 0) {
      return deltaTaille;
    }

    return comparerCouleurs(a, b);
  })[0];
}

function ordonnerCouleursAvecPriorite(
  groupes: Map<Couleur, Carte[]>,
  couleurPrioritaire: Couleur,
): Couleur[] {
  const couleursDisponibles = [...groupes.entries()]
    .filter(([, cartes]) => cartes.length > 0)
    .map(([couleur]) => couleur);

  if (!couleursDisponibles.includes(couleurPrioritaire)) {
    return couleursDisponibles.sort(comparerCouleurs);
  }

  const resultat: Couleur[] = [couleurPrioritaire];
  const restantes = couleursDisponibles.filter(
    (couleur) => couleur !== couleurPrioritaire,
  );

  while (restantes.length > 0) {
    const suivante = choisirCouleurSuivante(
      restantes,
      groupes,
      resultat[resultat.length - 1],
    );
    resultat.push(suivante);
    restantes.splice(restantes.indexOf(suivante), 1);
  }

  return resultat;
}

export function trierMainJoueur(
  cartes: Carte[],
  options: OptionsTriMainJoueur = {},
): Carte[] {
  const { couleurPrioritaire, couleurAtout } = options;
  const groupes = new Map<Couleur, Carte[]>();

  for (const couleur of ORDRE_COULEURS_ALTERNEES) {
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
    : ORDRE_COULEURS_ALTERNEES.filter(
        (couleur) => (groupes.get(couleur)?.length ?? 0) > 0,
      );

  return ordreCouleurs.flatMap((couleur) => groupes.get(couleur) ?? []);
}
