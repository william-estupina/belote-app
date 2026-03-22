import type { ActionEnchere } from "@belote/shared-types";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { AvatarJoueur } from "../components/game/AvatarJoueur";

const ACTION_PRENDRE: ActionEnchere = {
  type: "PRENDRE",
  joueur: "nord",
};

describe("AvatarJoueur", () => {
  it("affiche le nom du joueur et une bulle d'enchere ancree a l'avatar", () => {
    render(
      <AvatarJoueur
        position="nord"
        largeurEcran={1000}
        hauteurEcran={700}
        estActif={false}
        actionEnchere={ACTION_PRENDRE}
        estPreneur={false}
        couleurAtout={null}
        phaseUI="encheres"
      />,
    );

    expect(screen.getByText("Nord")).toBeTruthy();
    expect(screen.getByText("Prend !")).toBeTruthy();
    expect(screen.getByTestId("avatar-joueur-nord")).toBeTruthy();
    expect(screen.getByTestId("avatar-bulle-nord")).toBeTruthy();
  });

  it("affiche l'indicateur preneur pendant le jeu", () => {
    render(
      <AvatarJoueur
        position="est"
        largeurEcran={1000}
        hauteurEcran={700}
        estActif={false}
        actionEnchere={null}
        estPreneur={true}
        couleurAtout="coeur"
        phaseUI="jeu"
      />,
    );

    expect(screen.getByText("Est")).toBeTruthy();
    expect(screen.getByText("♥ Prend")).toBeTruthy();
    expect(screen.getByTestId("avatar-bulle-est")).toBeTruthy();
  });

  it("n'affiche rien quand l'interface est inactive", () => {
    const { queryByText } = render(
      <AvatarJoueur
        position="sud"
        largeurEcran={1000}
        hauteurEcran={700}
        estActif={false}
        actionEnchere={null}
        estPreneur={false}
        couleurAtout={null}
        phaseUI="inactif"
      />,
    );

    expect(queryByText("Vous")).toBeNull();
  });

  it("positionne l'avatar est plus pres de ses cartes maintenant qu'elles prennent moins de place", () => {
    render(
      <AvatarJoueur
        position="est"
        largeurEcran={1000}
        hauteurEcran={700}
        estActif={false}
        actionEnchere={null}
        estPreneur={false}
        couleurAtout={null}
        phaseUI="jeu"
      />,
    );

    const styleAncrage = StyleSheet.flatten(
      screen.getByTestId("avatar-ancrage-est").props.style,
    );

    expect(styleAncrage.left).toBe(905);
    expect(styleAncrage.top).toBe(350);
  });

  it("positionne l'avatar ouest plus pres de ses cartes maintenant qu'elles prennent moins de place", () => {
    render(
      <AvatarJoueur
        position="ouest"
        largeurEcran={1000}
        hauteurEcran={700}
        estActif={false}
        actionEnchere={null}
        estPreneur={false}
        couleurAtout={null}
        phaseUI="jeu"
      />,
    );

    const styleAncrage = StyleSheet.flatten(
      screen.getByTestId("avatar-ancrage-ouest").props.style,
    );

    expect(styleAncrage.left).toBe(95);
    expect(styleAncrage.top).toBe(350);
  });

  it("positionne l'avatar nord decale sur le cote pour ne pas chevaucher les cartes", () => {
    render(
      <AvatarJoueur
        position="nord"
        largeurEcran={1000}
        hauteurEcran={700}
        estActif={false}
        actionEnchere={null}
        estPreneur={false}
        couleurAtout={null}
        phaseUI="jeu"
      />,
    );

    const styleAncrage = StyleSheet.flatten(
      screen.getByTestId("avatar-ancrage-nord").props.style,
    );

    expect(styleAncrage.left).toBe(620);
    expect(styleAncrage.top).toBeCloseTo(119, 4);
  });

  it("positionne l'avatar sud un peu plus haut pour degager le pseudo des cartes", () => {
    render(
      <AvatarJoueur
        position="sud"
        largeurEcran={1000}
        hauteurEcran={700}
        estActif={false}
        actionEnchere={null}
        estPreneur={false}
        couleurAtout={null}
        phaseUI="jeu"
      />,
    );

    const styleAncrage = StyleSheet.flatten(
      screen.getByTestId("avatar-ancrage-sud").props.style,
    );

    expect(styleAncrage.left).toBe(280);
    expect(styleAncrage.top).toBeCloseTo(497, 4);
  });
});
