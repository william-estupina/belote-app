import { fireEvent, render, screen } from "@testing-library/react-native";

import { EcranParametres } from "../app/parametres";
import { useAppStore } from "../stores/app-store";

describe("EcranParametres", () => {
  beforeEach(() => {
    useAppStore.getState().reinitialiserPreferences();
  });

  it("affiche les sections de paramètres", () => {
    render(<EcranParametres />);
    expect(screen.getByText("Difficulté des bots")).toBeTruthy();
    expect(screen.getByText("Son")).toBeTruthy();
    expect(screen.getByText("Score objectif")).toBeTruthy();
  });

  it("affiche les 3 niveaux de difficulté", () => {
    render(<EcranParametres />);
    expect(screen.getByText("Facile")).toBeTruthy();
    expect(screen.getByText("Moyen")).toBeTruthy();
    expect(screen.getByText("Difficile")).toBeTruthy();
  });

  it("permet de changer la difficulté", () => {
    render(<EcranParametres />);
    fireEvent.press(screen.getByTestId("difficulte-difficile"));
    expect(useAppStore.getState().preferences.difficulte).toBe("difficile");
  });

  it("permet de changer le score objectif", () => {
    render(<EcranParametres />);
    fireEvent.press(screen.getByTestId("score-1500"));
    expect(useAppStore.getState().preferences.scoreObjectif).toBe(1500);
  });
});
