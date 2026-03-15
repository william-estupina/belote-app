import type { Carte, Couleur, PositionJoueur } from "@belote/shared-types";
import { POSITIONS_JOUEUR } from "@belote/shared-types";
import { describe, expect, it } from "vitest";
import { createActor } from "xstate";

import { machineBelote } from "../src/machine";
import { getCartesJouables } from "../src/regles";

// --- Helpers ---

function creerActeur() {
  return createActor(machineBelote);
}

function getPositionPartenaire(position: PositionJoueur): PositionJoueur {
  const index = POSITIONS_JOUEUR.indexOf(position);
  return POSITIONS_JOUEUR[(index + 2) % 4];
}

/** Joue une carte valide pour le joueur actif */
function jouerCarteValide(acteur: ReturnType<typeof creerActeur>): Carte {
  const ctx = acteur.getSnapshot().context;
  const indexJoueur = ctx.indexJoueurActif;
  const main = ctx.mains[indexJoueur];
  const position = POSITIONS_JOUEUR[indexJoueur];
  const posPartenaire = getPositionPartenaire(position);

  const jouables = getCartesJouables(
    main,
    ctx.pliEnCours,
    ctx.couleurAtout!,
    posPartenaire,
  );

  const carte = jouables[0];
  acteur.send({ type: "JOUER_CARTE", carte });
  return carte;
}

/** Joue un pli complet (4 cartes) */
function jouerPliComplet(acteur: ReturnType<typeof creerActeur>): void {
  for (let i = 0; i < 4; i++) {
    jouerCarteValide(acteur);
  }
}

/** Joue une manche complète (8 plis) */
function jouerMancheComplete(acteur: ReturnType<typeof creerActeur>): void {
  for (let p = 0; p < 8; p++) {
    jouerPliComplet(acteur);
  }
}

describe("machine belote", () => {
  describe("état initial", () => {
    it("commence dans l'état inactif", () => {
      const acteur = creerActeur();
      acteur.start();
      expect(acteur.getSnapshot().value).toBe("inactif");
      acteur.stop();
    });
  });

  describe("démarrage", () => {
    it("passe à encheres1 après DEMARRER", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      // distribution → encheres1 (auto-transition)
      expect(acteur.getSnapshot().value).toBe("encheres1");
      acteur.stop();
    });

    it("distribue 5 cartes à chaque joueur", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      const ctx = acteur.getSnapshot().context;
      for (const main of ctx.mains) {
        expect(main).toHaveLength(5);
      }
      acteur.stop();
    });

    it("il y a une carte retournée", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      const ctx = acteur.getSnapshot().context;
      expect(ctx.carteRetournee).not.toBeNull();
      acteur.stop();
    });

    it("le score objectif est configurable", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER", scoreObjectif: 501 });
      expect(acteur.getSnapshot().context.scoreObjectif).toBe(501);
      acteur.stop();
    });

    it("le joueur actif est à droite du donneur", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      const ctx = acteur.getSnapshot().context;
      expect(ctx.indexJoueurActif).toBe((ctx.indexDonneur + 3) % 4);
      acteur.stop();
    });
  });

  describe("enchères tour 1", () => {
    it("passer fait avancer au joueur suivant", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      const indexAvant = acteur.getSnapshot().context.indexJoueurActif;
      acteur.send({ type: "PASSER" });
      expect(acteur.getSnapshot().context.indexJoueurActif).toBe((indexAvant + 3) % 4);
      expect(acteur.getSnapshot().value).toBe("encheres1");
      acteur.stop();
    });

    it("prendre fixe l'atout à la couleur de la retourne", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      const couleurRetourne = acteur.getSnapshot().context.carteRetournee!.couleur;
      acteur.send({ type: "PRENDRE" });
      // distributionRestante → jeu (auto)
      expect(acteur.getSnapshot().context.couleurAtout).toBe(couleurRetourne);
      acteur.stop();
    });

    it("prendre mène au jeu avec 8 cartes par joueur", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      acteur.send({ type: "PRENDRE" });
      expect(acteur.getSnapshot().value).toBe("jeu");
      const ctx = acteur.getSnapshot().context;
      for (const main of ctx.mains) {
        expect(main).toHaveLength(8);
      }
      acteur.stop();
    });

    it("4 passes mènent au tour 2 des enchères", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      acteur.send({ type: "PASSER" });
      acteur.send({ type: "PASSER" });
      acteur.send({ type: "PASSER" });
      acteur.send({ type: "PASSER" });
      expect(acteur.getSnapshot().value).toBe("encheres2");
      acteur.stop();
    });
  });

  describe("enchères tour 2", () => {
    function allerAuTour2(acteur: ReturnType<typeof creerActeur>): void {
      acteur.send({ type: "DEMARRER" });
      for (let i = 0; i < 4; i++) acteur.send({ type: "PASSER" });
    }

    it("annoncer une couleur différente de la retourne est valide", () => {
      const acteur = creerActeur();
      acteur.start();
      allerAuTour2(acteur);
      const couleurRetourne = acteur.getSnapshot().context.carteRetournee!.couleur;
      const autresCouleurs: Couleur[] = (
        ["pique", "coeur", "carreau", "trefle"] as Couleur[]
      ).filter((c) => c !== couleurRetourne);

      acteur.send({ type: "ANNONCER", couleur: autresCouleurs[0] });
      expect(acteur.getSnapshot().value).toBe("jeu");
      expect(acteur.getSnapshot().context.couleurAtout).toBe(autresCouleurs[0]);
      acteur.stop();
    });

    it("annoncer la couleur de la retourne est refusé", () => {
      const acteur = creerActeur();
      acteur.start();
      allerAuTour2(acteur);
      const couleurRetourne = acteur.getSnapshot().context.carteRetournee!.couleur;

      acteur.send({ type: "ANNONCER", couleur: couleurRetourne });
      // Reste en encheres2
      expect(acteur.getSnapshot().value).toBe("encheres2");
      acteur.stop();
    });

    it("4 passes au tour 2 redistribuent les cartes", () => {
      const acteur = creerActeur();
      acteur.start();
      allerAuTour2(acteur);
      for (let i = 0; i < 4; i++) acteur.send({ type: "PASSER" });
      // redistribution → distribution → encheres1
      expect(acteur.getSnapshot().value).toBe("encheres1");
      expect(acteur.getSnapshot().context.nombreRedistributions).toBe(1);
      acteur.stop();
    });
  });

  describe("phase de jeu", () => {
    function demarrerJeu(acteur: ReturnType<typeof creerActeur>): void {
      acteur.send({ type: "DEMARRER" });
      acteur.send({ type: "PRENDRE" });
    }

    it("jouer une carte valide l'enlève de la main", () => {
      const acteur = creerActeur();
      acteur.start();
      demarrerJeu(acteur);

      const indexJoueur = acteur.getSnapshot().context.indexJoueurActif;
      const tailleAvant = acteur.getSnapshot().context.mains[indexJoueur].length;
      jouerCarteValide(acteur);
      expect(acteur.getSnapshot().context.mains[indexJoueur]).toHaveLength(
        tailleAvant - 1,
      );
      acteur.stop();
    });

    it("jouer une carte invalide est refusé", () => {
      const acteur = creerActeur();
      acteur.start();
      demarrerJeu(acteur);

      const carteInvalide: Carte = { couleur: "pique", rang: "7" };
      const ctx = acteur.getSnapshot().context;
      const main = ctx.mains[ctx.indexJoueurActif];
      // Si par hasard la carte invalide est dans la main et est jouable, on saute ce test
      const aLaCarte = main.some(
        (c) => c.couleur === carteInvalide.couleur && c.rang === carteInvalide.rang,
      );
      if (!aLaCarte) {
        const pliAvant = ctx.pliEnCours.length;
        acteur.send({ type: "JOUER_CARTE", carte: carteInvalide });
        expect(acteur.getSnapshot().context.pliEnCours.length).toBe(pliAvant);
      }
      acteur.stop();
    });

    it("un pli complet mène à finPli puis retourne en jeu", () => {
      const acteur = creerActeur();
      acteur.start();
      demarrerJeu(acteur);

      jouerPliComplet(acteur);
      // Après 4 cartes → finPli (auto) → jeu (auto si pas fini)
      expect(acteur.getSnapshot().value).toBe("jeu");
      expect(acteur.getSnapshot().context.historiquePlis).toHaveLength(1);
      acteur.stop();
    });

    it("après un pli, le gagnant entame le suivant", () => {
      const acteur = creerActeur();
      acteur.start();
      demarrerJeu(acteur);

      jouerPliComplet(acteur);
      const dernierPli = acteur.getSnapshot().context.historiquePlis[0];
      const indexGagnant = POSITIONS_JOUEUR.indexOf(dernierPli.gagnant);
      expect(acteur.getSnapshot().context.indexJoueurActif).toBe(indexGagnant);
      acteur.stop();
    });
  });

  describe("manche complète", () => {
    it("8 plis mènent à scoresManche", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      acteur.send({ type: "PRENDRE" });

      jouerMancheComplete(acteur);
      expect(acteur.getSnapshot().value).toBe("scoresManche");
      acteur.stop();
    });

    it("le total des points des plis est 152", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      acteur.send({ type: "PRENDRE" });

      jouerMancheComplete(acteur);
      const ctx = acteur.getSnapshot().context;
      expect(ctx.pointsEquipe1 + ctx.pointsEquipe2).toBe(152);
      acteur.stop();
    });

    it("le total des plis est 8", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      acteur.send({ type: "PRENDRE" });

      jouerMancheComplete(acteur);
      const ctx = acteur.getSnapshot().context;
      expect(ctx.plisEquipe1 + ctx.plisEquipe2).toBe(8);
      acteur.stop();
    });

    it("CONTINUER après les scores lance une nouvelle manche", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      acteur.send({ type: "PRENDRE" });

      jouerMancheComplete(acteur);
      expect(acteur.getSnapshot().value).toBe("scoresManche");

      acteur.send({ type: "CONTINUER" });
      // Devrait être en encheres1 (nouvelle distribution)
      expect(acteur.getSnapshot().value).toBe("encheres1");
      acteur.stop();
    });

    it("le donneur tourne après chaque manche", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      const donneurInitial = acteur.getSnapshot().context.indexDonneur;

      acteur.send({ type: "PRENDRE" });
      jouerMancheComplete(acteur);
      acteur.send({ type: "CONTINUER" });

      expect(acteur.getSnapshot().context.indexDonneur).toBe((donneurInitial + 3) % 4);
      acteur.stop();
    });

    it("les scores s'accumulent entre les manches", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER" });
      acteur.send({ type: "PRENDRE" });
      jouerMancheComplete(acteur);

      const scoresApres1 = {
        equipe1: acteur.getSnapshot().context.scoreEquipe1,
        equipe2: acteur.getSnapshot().context.scoreEquipe2,
      };
      expect(scoresApres1.equipe1 + scoresApres1.equipe2).toBeGreaterThan(0);

      acteur.send({ type: "CONTINUER" });
      acteur.send({ type: "PRENDRE" });
      jouerMancheComplete(acteur);

      const scoresApres2 = {
        equipe1: acteur.getSnapshot().context.scoreEquipe1,
        equipe2: acteur.getSnapshot().context.scoreEquipe2,
      };
      expect(scoresApres2.equipe1 + scoresApres2.equipe2).toBeGreaterThan(
        scoresApres1.equipe1 + scoresApres1.equipe2,
      );
      acteur.stop();
    });
  });

  describe("fin de partie", () => {
    it("la partie se termine quand une équipe atteint le score objectif", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER", scoreObjectif: 501 });

      // Jouer des manches jusqu'à ce que la partie se termine
      let manches = 0;
      const maxManches = 50; // sécurité
      while (manches < maxManches) {
        const snapshot = acteur.getSnapshot();
        if (snapshot.value === "encheres1") {
          acteur.send({ type: "PRENDRE" });
        }

        jouerMancheComplete(acteur);
        manches++;

        const ctx = acteur.getSnapshot().context;
        if (ctx.scoreEquipe1 >= 501 || ctx.scoreEquipe2 >= 501) {
          acteur.send({ type: "CONTINUER" });
          expect(acteur.getSnapshot().value).toBe("finPartie");
          break;
        }

        acteur.send({ type: "CONTINUER" });
      }

      expect(manches).toBeLessThan(maxManches);
      acteur.stop();
    });

    it("RECOMMENCER remet la machine à l'état inactif", () => {
      const acteur = creerActeur();
      acteur.start();
      acteur.send({ type: "DEMARRER", scoreObjectif: 501 });

      // Jouer jusqu'à la fin
      let manches = 0;
      while (manches < 50) {
        if (acteur.getSnapshot().value === "encheres1") {
          acteur.send({ type: "PRENDRE" });
        }
        jouerMancheComplete(acteur);
        manches++;

        const ctx = acteur.getSnapshot().context;
        if (ctx.scoreEquipe1 >= 501 || ctx.scoreEquipe2 >= 501) {
          acteur.send({ type: "CONTINUER" });
          break;
        }
        acteur.send({ type: "CONTINUER" });
      }

      if (acteur.getSnapshot().value === "finPartie") {
        acteur.send({ type: "RECOMMENCER" });
        expect(acteur.getSnapshot().value).toBe("inactif");
        expect(acteur.getSnapshot().context.scoreEquipe1).toBe(0);
        expect(acteur.getSnapshot().context.scoreEquipe2).toBe(0);
      }
      acteur.stop();
    });
  });
});
