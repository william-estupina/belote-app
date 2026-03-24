import type { Carte } from "@belote/shared-types";

import { appliquerEtatVerrouillePendantFinPli } from "../hooks/etatFinPliVisuel";
import { ajouterCarteAuPliVisuel } from "../hooks/etatPliVisuel";
import { construireCartesGeleesDepuisPli } from "../hooks/useAnimations";
import type { EtatJeu } from "../hooks/useControleurJeu";

const CARTE_TEST: Carte = { couleur: "pique", rang: "as" };

function creerEtat(): EtatJeu {
  return {
    phaseUI: "jeu",
    mainJoueur: [],
    nbCartesAdversaires: { nord: 7, est: 7, ouest: 7 },
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
    joueurActif: "nord",
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
  };
}

describe("ajouterCarteAuPliVisuel", () => {
  it("ajoute immediatement la carte jouee au pli visible", () => {
    const suivant = ajouterCarteAuPliVisuel(creerEtat(), "est", CARTE_TEST);

    expect(suivant.pliEnCours).toEqual([{ joueur: "est", carte: CARTE_TEST }]);
  });

  it("n'ajoute pas deux fois la meme carte pour le meme joueur", () => {
    const avecCarte = ajouterCarteAuPliVisuel(creerEtat(), "est", CARTE_TEST);

    const suivant = ajouterCarteAuPliVisuel(avecCarte, "est", CARTE_TEST);

    expect(suivant.pliEnCours).toEqual([{ joueur: "est", carte: CARTE_TEST }]);
  });
});

describe("construireCartesGeleesDepuisPli", () => {
  it("construit des cartes gelees pour les cartes du pli absentes de cartesEnVol", () => {
    const pli = [{ joueur: "est" as const, carte: CARTE_TEST }];
    const cartesEnVol: Array<{ carte: Carte }> = [];

    const gelee = construireCartesGeleesDepuisPli(pli, cartesEnVol);

    expect(gelee).toHaveLength(1);
    expect(gelee[0]).toMatchObject({
      id: "pli-est-pique-as",
      carte: CARTE_TEST,
      segment: 0,
    });
  });

  it("ne cree pas de carte gelee si elle est deja en vol", () => {
    const pli = [{ joueur: "est" as const, carte: CARTE_TEST }];
    const cartesEnVol = [{ carte: CARTE_TEST }];

    const gelee = construireCartesGeleesDepuisPli(pli, cartesEnVol);

    expect(gelee).toHaveLength(0);
  });
});

describe("appliquerEtatVerrouillePendantFinPli", () => {
  it("bloque le tour humain pendant l'animation du pli gagne", () => {
    const precedent = {
      ...creerEtat(),
      phaseUI: "jeu" as const,
      pliEnCours: [{ joueur: "sud" as const, carte: CARTE_TEST }],
      estTourHumain: false,
      cartesJouables: [],
      plisEquipe1: 2,
      plisEquipe2: 1,
    };
    const nouvelEtat = {
      ...precedent,
      phaseUI: "jeu" as const,
      estTourHumain: true,
      cartesJouables: [CARTE_TEST],
      joueurActif: "sud" as const,
      plisEquipe1: 3,
    };

    const resultat = appliquerEtatVerrouillePendantFinPli(precedent, nouvelEtat);

    expect(resultat.phaseUI).toBe("finPli");
    expect(resultat.estTourHumain).toBe(false);
    expect(resultat.cartesJouables).toEqual([]);
    expect(resultat.pliEnCours).toEqual(precedent.pliEnCours);
    expect(resultat.plisEquipe1).toBe(2);
    expect(resultat.plisEquipe2).toBe(1);
  });

  it("affiche le pli complet mais garde la main humaine verrouillee quand un nouveau pli est detecte", () => {
    const precedent = {
      ...creerEtat(),
      phaseUI: "jeu" as const,
      estTourHumain: false,
      cartesJouables: [],
      plisEquipe1: 2,
      plisEquipe2: 1,
    };
    const nouvelEtat = {
      ...precedent,
      phaseUI: "jeu" as const,
      estTourHumain: true,
      cartesJouables: [CARTE_TEST],
      joueurActif: "sud" as const,
      plisEquipe1: 3,
    };
    const pliVisible = [
      { joueur: "ouest" as const, carte: { couleur: "coeur", rang: "10" } as Carte },
      { joueur: "sud" as const, carte: CARTE_TEST },
    ];

    const resultat = appliquerEtatVerrouillePendantFinPli(
      precedent,
      nouvelEtat,
      pliVisible,
    );

    expect(resultat.phaseUI).toBe("finPli");
    expect(resultat.estTourHumain).toBe(false);
    expect(resultat.cartesJouables).toEqual([]);
    expect(resultat.pliEnCours).toEqual(pliVisible);
    expect(resultat.plisEquipe1).toBe(2);
    expect(resultat.plisEquipe2).toBe(1);
  });
});
