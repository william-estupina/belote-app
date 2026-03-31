import { render } from "@testing-library/react-native";
import type { ComponentProps } from "react";

import { ZonePli } from "../components/game/ZonePli";

describe("ZonePli", () => {
  it("ne rend plus les cartes du pli", () => {
    const props = {
      largeurEcran: 1200,
      hauteurEcran: 800,
      couleurAtout: null,
      afficherCadre: true,
    } as ComponentProps<typeof ZonePli>;

    const rendu = render(<ZonePli {...props} />);

    expect(rendu.toJSON()).not.toBeNull();
  });
});
