import type { Carte, Couleur, PositionJoueur } from "@belote/shared-types";
import { describe, expect, it } from "vitest";

import { getCartesJouables } from "../src/regles";

// Helpers
function carte(rang: Carte["rang"], couleur: Couleur): Carte {
  return { rang, couleur };
}

type EntreePli = { joueur: PositionJoueur; carte: Carte };

describe("getCartesJouables", () => {
  const atout: Couleur = "coeur";
  const partenaire: PositionJoueur = "nord";

  describe("premier joueur du pli", () => {
    it("toutes les cartes sont jouables quand on entame", () => {
      const main: Carte[] = [
        carte("as", "pique"),
        carte("roi", "coeur"),
        carte("7", "carreau"),
      ];
      const jouables = getCartesJouables(main, [], atout, partenaire);
      expect(jouables).toEqual(main);
    });
  });

  describe("obligation de fournir", () => {
    it("doit fournir à la couleur demandée si on en a", () => {
      const main: Carte[] = [
        carte("as", "pique"),
        carte("roi", "pique"),
        carte("7", "carreau"),
        carte("valet", "coeur"),
      ];
      const pliEnCours: EntreePli[] = [{ joueur: "est", carte: carte("dame", "pique") }];
      const jouables = getCartesJouables(main, pliEnCours, atout, partenaire);
      expect(jouables).toEqual([carte("as", "pique"), carte("roi", "pique")]);
    });

    it("peut jouer n'importe quelle carte de la couleur demandée (pas d'obligation de monter hors atout)", () => {
      const main: Carte[] = [
        carte("7", "pique"),
        carte("8", "pique"),
        carte("as", "pique"),
      ];
      const pliEnCours: EntreePli[] = [{ joueur: "est", carte: carte("10", "pique") }];
      const jouables = getCartesJouables(main, pliEnCours, atout, partenaire);
      // Toutes les piques sont jouables (pas d'obligation de monter hors atout)
      expect(jouables).toHaveLength(3);
    });
  });

  describe("obligation de couper", () => {
    it("doit couper si on n'a pas la couleur demandée et on a de l'atout", () => {
      const main: Carte[] = [
        carte("7", "coeur"),
        carte("9", "coeur"),
        carte("roi", "carreau"),
      ];
      const pliEnCours: EntreePli[] = [{ joueur: "est", carte: carte("as", "pique") }];
      const jouables = getCartesJouables(main, pliEnCours, atout, partenaire);
      // Seulement les atouts (coeur)
      expect(jouables).toEqual([carte("7", "coeur"), carte("9", "coeur")]);
    });

    it("pas obligé de couper si le partenaire est maître du pli", () => {
      const main: Carte[] = [
        carte("7", "coeur"),
        carte("roi", "carreau"),
        carte("dame", "trefle"),
      ];
      // Le partenaire (nord) a joué l'as de pique, il est maître
      const pliEnCours: EntreePli[] = [
        { joueur: "est", carte: carte("roi", "pique") },
        { joueur: "nord", carte: carte("as", "pique") },
      ];
      const jouables = getCartesJouables(main, pliEnCours, atout, partenaire);
      // Toute la main est jouable (partenaire maître)
      expect(jouables).toEqual(main);
    });
  });

  describe("obligation de monter à l'atout", () => {
    it("doit monter si on coupe et qu'un atout est déjà dans le pli", () => {
      const main: Carte[] = [
        carte("7", "coeur"),
        carte("valet", "coeur"),
        carte("roi", "carreau"),
      ];
      // Un adversaire a déjà coupé avec le 9 d'atout
      const pliEnCours: EntreePli[] = [
        { joueur: "est", carte: carte("as", "pique") },
        { joueur: "ouest", carte: carte("9", "coeur") }, // atout force 6
      ];
      const jouables = getCartesJouables(main, pliEnCours, atout, partenaire);
      // Seul le valet (force 7 > 6) peut monter
      expect(jouables).toEqual([carte("valet", "coeur")]);
    });

    it("peut pisser si on n'a pas d'atout supérieur", () => {
      const main: Carte[] = [
        carte("7", "coeur"),
        carte("8", "coeur"),
        carte("roi", "carreau"),
      ];
      // Le valet d'atout est dans le pli (force 7, imbattable presque)
      const pliEnCours: EntreePli[] = [
        { joueur: "est", carte: carte("as", "pique") },
        { joueur: "ouest", carte: carte("valet", "coeur") }, // force 7
      ];
      const jouables = getCartesJouables(main, pliEnCours, atout, partenaire);
      // On ne peut pas monter, on doit quand même jouer un atout (pisser)
      expect(jouables).toEqual([carte("7", "coeur"), carte("8", "coeur")]);
    });

    it("doit monter quand on fournit à l'atout", () => {
      const main: Carte[] = [
        carte("7", "coeur"),
        carte("9", "coeur"),
        carte("as", "coeur"),
        carte("roi", "pique"),
      ];
      // Quelqu'un entame à l'atout
      const pliEnCours: EntreePli[] = [
        { joueur: "est", carte: carte("8", "coeur") }, // force 1
      ];
      const jouables = getCartesJouables(main, pliEnCours, atout, partenaire);
      // Tous les atouts supérieurs au 8 : 9 (force 6) et as (force 5)
      expect(jouables).toEqual([carte("9", "coeur"), carte("as", "coeur")]);
    });

    it("peut pisser à l'atout si aucun atout supérieur", () => {
      const main: Carte[] = [
        carte("7", "coeur"),
        carte("8", "coeur"),
        carte("roi", "pique"),
      ];
      const pliEnCours: EntreePli[] = [
        { joueur: "est", carte: carte("valet", "coeur") }, // force 7
      ];
      const jouables = getCartesJouables(main, pliEnCours, atout, partenaire);
      // On doit fournir à l'atout mais on ne peut pas monter → pisser
      expect(jouables).toEqual([carte("7", "coeur"), carte("8", "coeur")]);
    });
  });

  describe("défausser", () => {
    it("peut jouer n'importe quoi si on n'a ni la couleur ni l'atout", () => {
      const main: Carte[] = [
        carte("7", "carreau"),
        carte("as", "trefle"),
        carte("roi", "carreau"),
      ];
      const pliEnCours: EntreePli[] = [{ joueur: "est", carte: carte("as", "pique") }];
      const jouables = getCartesJouables(main, pliEnCours, atout, partenaire);
      expect(jouables).toEqual(main);
    });
  });

  describe("cas complexes", () => {
    it("pas d'atout dans le pli → n'importe quel atout convient pour couper", () => {
      const main: Carte[] = [
        carte("7", "coeur"),
        carte("dame", "coeur"),
        carte("roi", "trefle"),
      ];
      const pliEnCours: EntreePli[] = [{ joueur: "est", carte: carte("as", "pique") }];
      const jouables = getCartesJouables(main, pliEnCours, atout, partenaire);
      // Les deux atouts sont jouables (pas besoin de monter, pas d'atout dans le pli)
      expect(jouables).toEqual([carte("7", "coeur"), carte("dame", "coeur")]);
    });

    it("partenaire maître via un atout → pas obligé de couper", () => {
      const main: Carte[] = [carte("7", "coeur"), carte("roi", "carreau")];
      // Le partenaire a coupé avec un atout et est maître
      const pliEnCours: EntreePli[] = [
        { joueur: "est", carte: carte("as", "pique") },
        { joueur: "nord", carte: carte("valet", "coeur") }, // partenaire, atout
      ];
      const jouables = getCartesJouables(main, pliEnCours, atout, partenaire);
      // Partenaire maître → toute la main
      expect(jouables).toEqual(main);
    });

    it("partenaire PAS maître car surmonté → doit couper et monter", () => {
      const main: Carte[] = [
        carte("valet", "coeur"),
        carte("7", "coeur"),
        carte("roi", "carreau"),
      ];
      // Le partenaire a coupé, mais l'adversaire a surmonté
      const pliEnCours: EntreePli[] = [
        { joueur: "est", carte: carte("as", "pique") },
        { joueur: "nord", carte: carte("8", "coeur") }, // partenaire
        { joueur: "ouest", carte: carte("9", "coeur") }, // adversaire surmonte (force 6)
      ];
      const jouables = getCartesJouables(main, pliEnCours, atout, partenaire);
      // Doit monter au-dessus du 9 (force 6) → seul le valet (force 7)
      expect(jouables).toEqual([carte("valet", "coeur")]);
    });
  });
});
