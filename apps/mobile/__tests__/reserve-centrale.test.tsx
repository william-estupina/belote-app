import { render } from "@testing-library/react-native";

import { ReserveCentrale } from "../components/game/ReserveCentrale";

describe("ReserveCentrale", () => {
  it("ne rend rien (le rendu est delegue au canvas unifie)", () => {
    const { toJSON } = render(
      <ReserveCentrale
        afficherPaquet={true}
        cartesPaquetVisibles={32}
        carteRetournee={{ couleur: "coeur", rang: "as" }}
        largeurEcran={1000}
        hauteurEcran={700}
      />,
    );

    expect(toJSON()).toBeNull();
  });
});
