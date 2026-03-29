import type { PhaseUI } from "../hooks/useControleurJeu";
import { doitAfficherUIEncheres } from "../hooks/visibiliteEncheres";

describe("visibiliteEncheres", () => {
  it("masque les elements d'encheres pendant la distribution restante", () => {
    expect(doitAfficherUIEncheres("encheres", true)).toBe(false);
  });

  it.each<PhaseUI>([
    "inactif",
    "distribution",
    "redistribution",
    "revelationCarte",
    "jeu",
    "finPli",
    "scoresManche",
    "finPartie",
  ])("n'affiche jamais les encheres en phase %s", (phaseUI) => {
    expect(doitAfficherUIEncheres(phaseUI, false)).toBe(false);
  });

  it("affiche les elements d'encheres une fois la distribution terminee", () => {
    expect(doitAfficherUIEncheres("encheres", false)).toBe(true);
  });
});
