import { render, screen } from "@testing-library/react-native";

import { EcranRegles } from "../app/regles";

describe("EcranRegles", () => {
  it("affiche les sections des règles", () => {
    render(<EcranRegles />);
    expect(screen.getByText("Le jeu")).toBeTruthy();
    expect(screen.getByText("Distribution")).toBeTruthy();
    expect(screen.getByText("Les enchères")).toBeTruthy();
    expect(screen.getByText("Ordre des cartes")).toBeTruthy();
    expect(screen.getByText("Le jeu de la carte")).toBeTruthy();
    expect(screen.getByText("Le décompte")).toBeTruthy();
    expect(screen.getByText("Belote et Rebelote")).toBeTruthy();
    expect(screen.getByText("Fin de partie")).toBeTruthy();
  });

  it("affiche le contenu de la section Le jeu", () => {
    render(<EcranRegles />);
    expect(screen.getByText(/La Belote se joue à 4 joueurs/)).toBeTruthy();
  });
});
