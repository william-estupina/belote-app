import type { Carte } from "@belote/shared-types";

import { ajouterCarteAuPliVisuel } from "../hooks/etatPliVisuel";
import { construireCartesPoseesAuPliDepuisPli } from "../hooks/useAnimations";
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

  it("conserve la verite metier du pli quand la couche animation filtre une carte encore en vol", () => {
    const etatAvecCarte = ajouterCarteAuPliVisuel(creerEtat(), "est", CARTE_TEST);

    const cartesPoseesPendantLeVol = construireCartesPoseesAuPliDepuisPli(
      etatAvecCarte.pliEnCours,
      [{ joueur: "est", carte: CARTE_TEST }],
    );
    const cartesPoseesApresLeVol = construireCartesPoseesAuPliDepuisPli(
      etatAvecCarte.pliEnCours,
      [],
    );

    expect(etatAvecCarte.pliEnCours).toEqual([{ joueur: "est", carte: CARTE_TEST }]);
    expect(cartesPoseesPendantLeVol).toEqual([]);
    expect(cartesPoseesApresLeVol).toHaveLength(1);
    expect(cartesPoseesApresLeVol[0]).toMatchObject({
      joueur: "est",
      carte: CARTE_TEST,
      faceVisible: true,
    });
  });
});
