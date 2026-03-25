import { act, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { DialogueFinManche } from "../components/game/DialogueFinManche";

const RESUME_CONTRAT_REMPLI = {
  verdict: "contrat-rempli" as const,
  messageVerdict: "Contrat rempli !" as const,
  equipePreneur: "equipe1" as const,
  equipeGagnanteManche: "equipe1" as const,
  estContratRempli: true,
  estChute: false,
  estCapot: false,
  equipeCapot: null,
  scoreAvantEquipe1: 90,
  scoreAvantEquipe2: 10,
  scoreMancheEquipe1: 92,
  scoreMancheEquipe2: 64,
  scoreApresEquipe1: 182,
  scoreApresEquipe2: 74,
};

describe("DialogueFinManche", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("enchaine automatiquement titre, verdict, details puis score total", () => {
    render(
      <DialogueFinManche
        resumeFinManche={RESUME_CONTRAT_REMPLI}
        onContinuer={jest.fn()}
      />,
    );

    expect(screen.getByText("Fin de manche")).toBeTruthy();
    expect(screen.queryByText("Contrat rempli !")).toBeNull();
    expect(screen.queryByText("Vous +92")).toBeNull();
    expect(screen.queryByText("Score total")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.getByText("Contrat rempli !")).toBeTruthy();
    expect(screen.queryByText("Vous +92")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText("Vous +92")).toBeTruthy();
    expect(screen.getByText("Adversaires +64")).toBeTruthy();
    expect(screen.queryByText("Score total")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(700);
    });

    expect(screen.getByText("Score total")).toBeTruthy();

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.getByText("Continuer")).toBeTruthy();
  });

  it("affiche un indicateur de capot quand une equipe capote", () => {
    render(
      <DialogueFinManche
        resumeFinManche={{
          ...RESUME_CONTRAT_REMPLI,
          estCapot: true,
          equipeCapot: "equipe1",
          scoreMancheEquipe1: 252,
          scoreMancheEquipe2: 0,
          scoreApresEquipe1: 342,
          scoreApresEquipe2: 10,
        }}
        onContinuer={jest.fn()}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(1400);
    });

    expect(screen.getByTestId("animation-capot")).toBeTruthy();
    expect(screen.getByText("Capot")).toBeTruthy();
  });

  it("garde un panneau de hauteur fixe des l'ouverture", () => {
    render(
      <DialogueFinManche
        resumeFinManche={RESUME_CONTRAT_REMPLI}
        onContinuer={jest.fn()}
      />,
    );

    const stylePanneau = StyleSheet.flatten(
      screen.getByTestId("dialogue-fin-manche-panneau").props.style,
    );

    expect(stylePanneau.minHeight).toBe(320);
  });
});
