import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { JetonDealer } from "../components/game/JetonDealer";

jest.mock("@shopify/react-native-skia", () => {
  const React = require("react") as typeof import("react");
  const { View } = require("react-native") as typeof import("react-native");

  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);
  const Noop = () => null;

  return {
    Canvas: Passthrough,
    Circle: Noop,
    Group: Passthrough,
    Path: Noop,
    RadialGradient: Noop,
    Blur: Noop,
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      Path: {
        Make: () => ({
          addArc: jest.fn(),
          close: jest.fn(),
          moveTo: jest.fn(),
          lineTo: jest.fn(),
          toSVGString: jest.fn(() => ""),
        }),
      },
    },
  };
});

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

  it("reste au-dessus de la couche d'animation du plateau", () => {
    render(
      <JetonDealer positionDonneur="ouest" largeurEcran={1000} hauteurEcran={700} />,
    );

    const style = StyleSheet.flatten(screen.getByTestId("jeton-dealer").props.style);

    expect(style.zIndex).toBeGreaterThan(50);
  });
});
