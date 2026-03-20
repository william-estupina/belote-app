import type { PliComplete } from "@belote/shared-types";
import { render, screen } from "@testing-library/react-native";

import { DernierPli } from "../components/game/DernierPli";

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

describe("DernierPli", () => {
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
});
