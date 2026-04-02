import type { Carte } from "@belote/shared-types";

import { synchroniserOrdreVisibleMain } from "../hooks/extraireEtatUI";

const CARTE_AS_PIQUE: Carte = { couleur: "pique", rang: "as" };
const CARTE_ROI_COEUR: Carte = { couleur: "coeur", rang: "roi" };
const CARTE_DAME_TREFLE: Carte = { couleur: "trefle", rang: "dame" };

describe("synchroniserOrdreVisibleMain", () => {
  it("conserve la meme reference quand la main visible est deja synchronisee", () => {
    const mainVisible = [CARTE_AS_PIQUE, CARTE_ROI_COEUR, CARTE_DAME_TREFLE];
    const mainSynchronisee = synchroniserOrdreVisibleMain(mainVisible, [
      CARTE_AS_PIQUE,
      CARTE_ROI_COEUR,
      CARTE_DAME_TREFLE,
    ]);

    expect(mainSynchronisee).toBe(mainVisible);
  });

  it("reconstruit la main quand le contexte retire une carte", () => {
    const mainVisible = [CARTE_AS_PIQUE, CARTE_ROI_COEUR, CARTE_DAME_TREFLE];
    const mainSynchronisee = synchroniserOrdreVisibleMain(mainVisible, [
      CARTE_AS_PIQUE,
      CARTE_DAME_TREFLE,
    ]);

    expect(mainSynchronisee).toEqual([CARTE_AS_PIQUE, CARTE_DAME_TREFLE]);
    expect(mainSynchronisee).not.toBe(mainVisible);
  });
});
