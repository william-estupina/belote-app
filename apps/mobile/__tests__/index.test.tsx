import { render, screen } from "@testing-library/react-native";

import { HomeScreen } from "../app/index";

describe("HomeScreen", () => {
  it("affiche le titre Belote", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Belote")).toBeTruthy();
  });

  it("affiche le sous-titre", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Jeu de cartes")).toBeTruthy();
  });
});
