import { doitAfficherDernierPli } from "../hooks/visibiliteDernierPli";

describe("doitAfficherDernierPli", () => {
  it("reste visible pendant finPli si un pli existe deja", () => {
    expect(doitAfficherDernierPli("finPli", 1)).toBe(true);
  });

  it("reste visible en jeu si un pli existe deja", () => {
    expect(doitAfficherDernierPli("jeu", 1)).toBe(true);
  });

  it("reste masque s'il n'y a encore aucun pli", () => {
    expect(doitAfficherDernierPli("finPli", 0)).toBe(false);
  });
});
