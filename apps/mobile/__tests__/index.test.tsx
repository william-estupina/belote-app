import { render, screen } from "@testing-library/react-native";

import { HomeScreen } from "../app/index";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe("EcranAccueil", () => {
  it("affiche le titre Belote", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Belote")).toBeTruthy();
  });

  it("affiche le sous-titre", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Jeu de cartes")).toBeTruthy();
  });

  it("affiche les boutons du menu", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Jouer")).toBeTruthy();
    expect(screen.getByText("Paramètres")).toBeTruthy();
    expect(screen.getByText("Règles")).toBeTruthy();
  });
});
