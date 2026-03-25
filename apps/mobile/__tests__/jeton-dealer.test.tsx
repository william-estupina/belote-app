import { render, screen } from "@testing-library/react-native";

import { JetonDealer } from "../components/game/JetonDealer";

jest.mock("react-native-reanimated", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  return {
    __esModule: true,
    default: { View },
    Easing: {
      ease: jest.fn(),
      inOut: jest.fn(() => jest.fn()),
    },
    useSharedValue: (valeur: number) => ({ value: valeur }),
    useAnimatedStyle: (calculStyle: () => unknown) => calculStyle(),
    withTiming: (valeur: number) => valeur,
  };
});

describe("JetonDealer", () => {
  it("affiche le texte D quand la phase est active", () => {
    render(<JetonDealer positionDonneur="sud" largeurEcran={1000} hauteurEcran={700} />);

    expect(screen.getByText("D")).toBeTruthy();
    expect(screen.getByTestId("jeton-dealer")).toBeTruthy();
  });

  it("se positionne sous l'avatar du donneur", () => {
    render(<JetonDealer positionDonneur="nord" largeurEcran={1000} hauteurEcran={700} />);

    expect(screen.getByTestId("jeton-dealer")).toBeTruthy();
    expect(screen.getByText("D")).toBeTruthy();
  });
});
