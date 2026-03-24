import type { PliComplete } from "@belote/shared-types";
import { act, render, screen } from "@testing-library/react-native";

import {
  calculerCiblesTransitionDernierPli,
  calculerEtatInitialTransitionDernierPli,
  calculerTrajectoireMarqueurGagnant,
  DernierPli,
} from "../components/game/DernierPli";

const DERNIER_PLI: PliComplete = {
  cartes: [
    { joueur: "nord", carte: { rang: "as", couleur: "pique" } },
    { joueur: "ouest", carte: { rang: "9", couleur: "carreau" } },
    { joueur: "est", carte: { rang: "valet", couleur: "coeur" } },
    { joueur: "sud", carte: { rang: "roi", couleur: "trefle" } },
  ],
  gagnant: "est",
  points: 24,
};

const NOUVEAU_DERNIER_PLI: PliComplete = {
  cartes: [
    { joueur: "nord", carte: { rang: "dame", couleur: "trefle" } },
    { joueur: "ouest", carte: { rang: "10", couleur: "coeur" } },
    { joueur: "est", carte: { rang: "9", couleur: "pique" } },
    { joueur: "sud", carte: { rang: "as", couleur: "carreau" } },
  ],
  gagnant: "sud",
  points: 18,
};

describe("DernierPli", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("affiche un rendu compact avec valeurs courtes et symboles de couleur", () => {
    render(<DernierPli dernierPli={DERNIER_PLI} />);

    expect(screen.getByText("Dernier pli")).toBeTruthy();
    expect(screen.getByText("24 pts")).toBeTruthy();
    expect(screen.getByText("A \u2660")).toBeTruthy();
    expect(screen.getByText("9 \u2666")).toBeTruthy();
    expect(screen.getByText("V \u2665")).toBeTruthy();
    expect(screen.getByText("R \u2663")).toBeTruthy();
  });

  it("met en avant la carte gagnante avec un anneau lumineux et un ruban premiere place", () => {
    render(<DernierPli dernierPli={DERNIER_PLI} />);

    expect(screen.getByTestId("anneau-gagnant-est")).toBeTruthy();
    expect(screen.getByTestId("ruban-gagnant-est")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByTestId("jeton-dernier-pli-est").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ overflow: "visible" })]),
    );
  });

  it("supprime le motif de fond des jetons tout en gardant le rouge plus contraste", () => {
    render(<DernierPli dernierPli={DERNIER_PLI} />);

    expect(screen.queryByTestId("motif-dernier-pli-nord")).toBeNull();
    expect(screen.queryByTestId("motif-dernier-pli-ouest")).toBeNull();
    expect(screen.queryByTestId("motif-dernier-pli-est")).toBeNull();
    expect(screen.queryByTestId("motif-dernier-pli-sud")).toBeNull();
    expect(screen.getByTestId("texte-dernier-pli-ouest").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#b63a3a" })]),
    );
    expect(screen.getByTestId("texte-dernier-pli-est").props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#b63a3a" })]),
    );
  });

  it("ne propose plus d'agrandissement ni d'action detail", () => {
    render(<DernierPli dernierPli={DERNIER_PLI} />);

    expect(screen.queryByText("Appuyer pour agrandir")).toBeNull();
    expect(screen.queryByText("Appuyer pour fermer")).toBeNull();
    expect(screen.queryByLabelText("Voir le dernier pli en d\u00E9tail")).toBeNull();
  });

  it("conserve temporairement l'ancien dernier pli pendant la transition vers le nouveau", () => {
    const { rerender } = render(<DernierPli dernierPli={DERNIER_PLI} />);

    rerender(
      <DernierPli
        dernierPli={NOUVEAU_DERNIER_PLI}
        precedentDernierPli={DERNIER_PLI}
        transitionDernierPliActive
        dureeTransitionDernierPliMs={450}
        cleTransitionDernierPli={1}
      />,
    );

    expect(screen.getByText("24 pts")).toBeTruthy();
    expect(screen.getByText("18 pts")).toBeTruthy();
    expect(screen.getByTestId("couche-dernier-pli-sortante")).toBeTruthy();
    expect(screen.getByTestId("couche-dernier-pli-entrante")).toBeTruthy();

    act(() => {
      jest.runAllTimers();
    });

    rerender(<DernierPli dernierPli={NOUVEAU_DERNIER_PLI} />);

    expect(screen.queryByText("24 pts")).toBeNull();
    expect(screen.getByText("18 pts")).toBeTruthy();
    expect(screen.queryByTestId("couche-dernier-pli-sortante")).toBeNull();
  });

  it("garde l'ancien pli comme base stable pendant la transition", () => {
    render(
      <DernierPli
        dernierPli={NOUVEAU_DERNIER_PLI}
        precedentDernierPli={DERNIER_PLI}
        transitionDernierPliActive
        dureeTransitionDernierPliMs={450}
        cleTransitionDernierPli={2}
      />,
    );

    expect(screen.getByTestId("texte-dernier-pli-nord").props.children).toBe("A \u2660");
    expect(screen.getByTestId("entrant-texte-dernier-pli-nord")).toBeTruthy();
  });

  it("prepare une couche entrante deja masquee au debut d'une transition", () => {
    expect(
      calculerEtatInitialTransitionDernierPli({
        precedentDernierPli: DERNIER_PLI,
        transitionDernierPliActive: true,
      }),
    ).toEqual({
      opaciteEntrante: 0,
      translationEntrante: 4,
      opaciteSortante: 1,
      translationSortante: 0,
    });
  });

  it("laisse le rendu stable hors transition", () => {
    expect(
      calculerEtatInitialTransitionDernierPli({
        precedentDernierPli: null,
        transitionDernierPliActive: false,
      }),
    ).toEqual({
      opaciteEntrante: 1,
      translationEntrante: 0,
      opaciteSortante: 1,
      translationSortante: 0,
    });
  });

  it("termine la transition sur une vraie disparition de la couche sortante", () => {
    expect(calculerCiblesTransitionDernierPli()).toEqual({
      opaciteEntrante: 1,
      translationEntrante: 0,
      opaciteSortante: 0,
      translationSortante: -2,
    });
  });

  it("anime un marqueur gagnant unique entre l ancien et le nouveau vainqueur", () => {
    expect(
      calculerTrajectoireMarqueurGagnant({
        dernierPli: NOUVEAU_DERNIER_PLI,
        precedentDernierPli: DERNIER_PLI,
        transitionDernierPliActive: true,
      }),
    ).toMatchObject({
      depart: expect.objectContaining({
        top: expect.any(Number),
        left: expect.any(Number),
      }),
      arrivee: expect.objectContaining({
        top: expect.any(Number),
        left: expect.any(Number),
      }),
    });

    render(
      <DernierPli
        dernierPli={NOUVEAU_DERNIER_PLI}
        precedentDernierPli={DERNIER_PLI}
        transitionDernierPliActive
        dureeTransitionDernierPliMs={450}
        cleTransitionDernierPli={3}
      />,
    );

    expect(screen.getByTestId("marqueur-gagnant-transition")).toBeTruthy();
    expect(screen.queryByTestId("anneau-gagnant-est")).toBeNull();
    expect(screen.queryByTestId("entrant-anneau-gagnant-sud")).toBeNull();
  });
});
