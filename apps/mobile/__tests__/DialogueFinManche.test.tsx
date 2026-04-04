import { act, render, screen } from "@testing-library/react-native";
import { Animated, StyleSheet } from "react-native";

import { DialogueFinManche } from "../components/game/DialogueFinManche";
import { ANIMATIONS_DIALOGUE_FIN_MANCHE } from "../constants/animations-visuelles";

const ANIMATION_VERDICT_MS = ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiVerdict;
const DELAI_BOUTON_MS =
  ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiSectionTotal +
  ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiComptage +
  ANIMATIONS_DIALOGUE_FIN_MANCHE.dureeComptage +
  ANIMATIONS_DIALOGUE_FIN_MANCHE.delaiBoutonApresComptage;
const DUREE_BOUCLE_VERDICT_ATTENDUE_MS = 750;
const DUREE_RETOUR_BOUCLE_VERDICT_ATTENDUE_MS = 2625;

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

const RESUME_DEFAITE_NORMALE = {
  verdict: "contrat-rempli" as const,
  messageVerdict: "Contrat rempli !" as const,
  equipePreneur: "equipe2" as const,
  equipeGagnanteManche: "equipe2" as const,
  estContratRempli: true,
  estChute: false,
  estCapot: false,
  equipeCapot: null,
  scoreAvantEquipe1: 110,
  scoreAvantEquipe2: 90,
  scoreMancheEquipe1: 72,
  scoreMancheEquipe2: 90,
  scoreApresEquipe1: 182,
  scoreApresEquipe2: 180,
};

describe("DialogueFinManche", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("enchaine automatiquement titre, cadran, details puis score total", () => {
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
    expect(screen.queryByTestId("cadran-fin-manche")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(screen.queryByText("Contrat rempli !")).toBeNull();
    expect(screen.queryByText("Vous +92")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByTestId("cadran-fin-manche")).toBeTruthy();
    expect(screen.getByText("Contrat rempli !")).toBeTruthy();
    expect(screen.queryByText("Vous +92")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.queryByText("Vous +92")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByText("Vous +92")).toBeTruthy();
    expect(screen.getByText("Adversaires +64")).toBeTruthy();
    expect(screen.queryByText("Score total")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.queryByText("Score total")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByText("Score total")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(DELAI_BOUTON_MS);
    });

    expect(screen.getByText("Continuer")).toBeTruthy();
  });

  it("affiche le capot dans le cadran sans bloc separe", () => {
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
      jest.advanceTimersByTime(1700);
    });

    expect(screen.getByTestId("cadran-fin-manche")).toBeTruthy();
    expect(screen.getByText("Capot")).toBeTruthy();
    expect(screen.queryByTestId("animation-capot")).toBeNull();
    expect(screen.queryByText("Vous prenez tous les plis")).toBeNull();
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

  it("affiche 'Defaite' dans le cadran pour une manche perdue sans chute", () => {
    render(
      <DialogueFinManche
        resumeFinManche={RESUME_DEFAITE_NORMALE}
        onContinuer={jest.fn()}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("cadran-fin-manche")).toBeTruthy();
    expect(screen.getByText("Défaite")).toBeTruthy();
    expect(screen.queryByText("Contrat rempli !")).toBeNull();
    expect(screen.queryByText("Defaite")).toBeNull();
  });

  it("affiche 'Vous êtes dedans' avec accents dans le cadran", () => {
    render(
      <DialogueFinManche
        resumeFinManche={{
          ...RESUME_DEFAITE_NORMALE,
          verdict: "dedans-nous",
          messageVerdict: "Vous êtes dedans",
          estContratRempli: false,
          estChute: true,
          scoreMancheEquipe1: 0,
          scoreMancheEquipe2: 162,
          scoreApresEquipe1: 110,
          scoreApresEquipe2: 252,
        }}
        onContinuer={jest.fn()}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText("Vous êtes dedans")).toBeTruthy();
    expect(screen.queryByText("Vous etes dedans")).toBeNull();
  });

  it("n'affiche plus les sous-textes de demo dans le cadran", () => {
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
      jest.advanceTimersByTime(500);
    });

    expect(screen.getByText("Capot")).toBeTruthy();
    expect(screen.queryByText("celebration maximale")).toBeNull();
    expect(screen.queryByText("glacial et tranchant")).toBeNull();
    expect(screen.queryByText("plus froid, plus sec")).toBeNull();
    expect(screen.queryByText("petit yahou")).toBeNull();
    expect(screen.queryByText("glace legere")).toBeNull();
    expect(screen.queryByText("chaleur legere")).toBeNull();
  });

  it("relance en boucle les animations du cadran puis les arrete au demontage", () => {
    const demarrerBoucle = jest.fn();
    const arreterBoucle = jest.fn();

    jest.spyOn(Animated, "loop").mockReturnValue({
      start: demarrerBoucle,
      stop: arreterBoucle,
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation);

    const { unmount } = render(
      <DialogueFinManche
        resumeFinManche={RESUME_CONTRAT_REMPLI}
        onContinuer={jest.fn()}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(ANIMATION_VERDICT_MS);
    });

    expect(Animated.loop).toHaveBeenCalledTimes(1);
    expect(demarrerBoucle).toHaveBeenCalledTimes(1);

    unmount();

    expect(arreterBoucle).toHaveBeenCalledTimes(1);
  });

  it("ralentit uniformement la boucle du cadran", () => {
    const espionTiming = jest.spyOn(Animated, "timing");

    render(
      <DialogueFinManche
        resumeFinManche={RESUME_CONTRAT_REMPLI}
        onContinuer={jest.fn()}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(ANIMATION_VERDICT_MS);
    });

    const durees = espionTiming.mock.calls.map(
      ([, configuration]) => configuration.duration,
    );

    expect(durees).toContain(DUREE_BOUCLE_VERDICT_ATTENDUE_MS);
    expect(durees).toContain(DUREE_RETOUR_BOUCLE_VERDICT_ATTENDUE_MS);
  });

  it("n'affiche plus les traits lumineux du cadran", () => {
    const { toJSON } = render(
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
      jest.advanceTimersByTime(ANIMATION_VERDICT_MS);
    });

    const rendu = JSON.stringify(toJSON());

    expect(rendu).not.toContain('"top":10,"left":18');
    expect(rendu).not.toContain('"top":12,"right":22');
    expect(rendu).not.toContain('"bottom":14,"left":44');
    expect(rendu).not.toContain('"bottom":18,"right":46');
  });
});
