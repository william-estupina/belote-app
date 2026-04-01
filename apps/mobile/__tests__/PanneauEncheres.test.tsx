import { fireEvent, render, screen } from "@testing-library/react-native";

import { PanneauEncheres } from "../components/game/PanneauEncheres";

describe("PanneauEncheres", () => {
  it("expose des testID stables pour prendre ou passer au premier tour", () => {
    const onPrendre = jest.fn();
    const onPasser = jest.fn();

    render(
      <PanneauEncheres
        phaseEncheres="encheres1"
        carteRetournee={{ couleur: "coeur", rang: "as" }}
        onPrendre={onPrendre}
        onAnnoncer={jest.fn()}
        onPasser={onPasser}
      />,
    );

    fireEvent.press(screen.getByTestId("enchere-prendre"));
    fireEvent.press(screen.getByTestId("enchere-passer"));

    expect(screen.getByTestId("panneau-encheres")).toBeTruthy();
    expect(onPrendre).toHaveBeenCalledTimes(1);
    expect(onPasser).toHaveBeenCalledTimes(1);
  });

  it("expose des testID stables pour annoncer une couleur au second tour", () => {
    const onAnnoncer = jest.fn();

    render(
      <PanneauEncheres
        phaseEncheres="encheres2"
        carteRetournee={{ couleur: "coeur", rang: "as" }}
        onPrendre={jest.fn()}
        onAnnoncer={onAnnoncer}
        onPasser={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("annonce-pique"));

    expect(screen.getByTestId("annonce-carreau")).toBeTruthy();
    expect(screen.queryByTestId("annonce-coeur")).toBeNull();
    expect(onAnnoncer).toHaveBeenCalledWith("pique");
  });
});
