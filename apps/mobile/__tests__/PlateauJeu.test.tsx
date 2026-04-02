import type { Carte } from "@belote/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import PlateauJeu from "../components/game/PlateauJeu";

function creerProgressionsFactices(taille: number): Array<{ value: number }> {
  return Array.from({ length: taille }, () => ({ value: 0 }));
}

const mockProgressionsAdv = creerProgressionsFactices(24);
const mockProgressionsSud = creerProgressionsFactices(8);

const etatJeuMock = {
  phaseUI: "revelationCarte" as const,
  mainJoueur: [] as Carte[],
  nbCartesAdversaires: { nord: 0, est: 0, ouest: 0 },
  pliEnCours: [],
  couleurAtout: null,
  carteRetournee: { couleur: "coeur", rang: "as" } as Carte,
  scoreEquipe1: 0,
  scoreEquipe2: 0,
  pointsEquipe1: 0,
  pointsEquipe2: 0,
  scoreMancheEquipe1: 0,
  scoreMancheEquipe2: 0,
  resumeFinManche: null,
  cartesJouables: [],
  estTourHumain: false,
  joueurActif: "sud" as const,
  phaseEncheres: null,
  indexPreneur: null,
  scoreObjectif: 1000,
  historiquePlis: [],
  historiqueEncheres: [],
  plisEquipe1: 0,
  plisEquipe2: 0,
  annonceBelote: null,
  cartesRestantesPaquet: 12,
  indexDonneur: 0,
  nbCartesAnticipeesJoueur: 0,
  triMainDiffere: false,
  dernierPliVisible: null,
  precedentDernierPliVisible: null,
  transitionDernierPliActive: false,
  dureeTransitionDernierPliMs: 0,
  cleTransitionDernierPli: 0,
  afficherActionsEnchereRedistribution: false,
};

let mockControleur = {
  etatJeu: etatJeuMock,
  cartesEnVol: [],
  surAnimationTerminee: jest.fn(),
  atlas: {
    image: {},
    largeurCellule: 1,
    hauteurCellule: 1,
    rectSource: jest.fn(() => ({ x: 0, y: 0, width: 1, height: 1 })),
    rectDos: jest.fn(() => ({ x: 0, y: 0, width: 1, height: 1 })),
  },
  cartesAtlasAdversaires: [],
  progressionsAdv: mockProgressionsAdv,
  donneesWorkletAdv: { value: [] },
  nbCartesActivesAdv: { value: 0 },
  cartesAtlasSud: [],
  progressionsSud: mockProgressionsSud,
  donneesWorkletSud: { value: [] },
  nbCartesActivesSud: { value: 0 },
  distributionEnCours: false,
  jouerCarte: jest.fn(),
  prendre: jest.fn(),
  annoncer: jest.fn(),
  passer: jest.fn(),
  continuerApresScore: jest.fn(),
  recommencer: jest.fn(),
  onRevelationTerminee: jest.fn(),
};

jest.mock("../hooks/useControleurJeu", () => ({
  useControleurJeu: () => mockControleur,
}));

jest.mock("../components/game/AvatarJoueur", () => ({
  AvatarJoueur: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="avatar-joueur" />;
  },
}));

jest.mock("../components/game/BulleBelote", () => ({
  BulleBelote: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="bulle-belote" />;
  },
}));

jest.mock("../components/game/CarteRevelation", () => ({
  CarteRevelation: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="carte-revelation" />;
  },
}));

jest.mock("../components/game/CoucheAnimation", () => ({
  CoucheAnimation: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="couche-animation" />;
  },
}));

jest.mock("../components/game/DernierPli", () => ({
  DernierPli: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="dernier-pli" />;
  },
}));

jest.mock("../components/game/DialogueFinManche", () => ({
  DialogueFinManche: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="dialogue-fin-manche" />;
  },
}));

jest.mock("../components/game/DialogueFinPartie", () => ({
  DialogueFinPartie: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="dialogue-fin-partie" />;
  },
}));

jest.mock("../components/game/JetonDealer", () => ({
  JetonDealer: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="jeton-dealer" />;
  },
}));

jest.mock("../components/game/MainJoueur", () => ({
  MainJoueur: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="main-joueur" />;
  },
}));

jest.mock("../components/game/PanneauEncheres", () => ({
  PanneauEncheres: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="panneau-encheres" />;
  },
}));

jest.mock("../components/game/PilePlis", () => ({
  PilePlis: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="pile-plis" />;
  },
}));

jest.mock("../components/game/ReserveCentrale", () => ({
  ReserveCentrale: ({
    carteRetournee,
    opaciteCarteRetournee,
  }: {
    carteRetournee: Carte | null;
    opaciteCarteRetournee?: number;
  }) => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return (
      <View
        testID="reserve-centrale"
        accessibilityLabel={JSON.stringify({
          carteRetournee,
          opaciteCarteRetournee,
        })}
      />
    );
  },
}));

jest.mock("../components/game/TableauScores", () => ({
  TableauScores: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="tableau-scores" />;
  },
}));

jest.mock("../components/game/ZonePli", () => ({
  ZonePli: () => {
    const React = require("react") as typeof import("react");
    const { View } = require("react-native") as typeof import("react-native");

    return <View testID="zone-pli" />;
  },
}));

describe("PlateauJeu", () => {
  beforeEach(() => {
    mockControleur = {
      ...mockControleur,
      etatJeu: { ...etatJeuMock },
    };
  });

  it("monte deja la carte retournee dans la reserve pendant la revelation pour eviter le clignotement", () => {
    const { UNSAFE_getAllByType } = render(<PlateauJeu />);
    const { View } = require("react-native") as typeof import("react-native");

    fireEvent(UNSAFE_getAllByType(View)[0], "layout", {
      nativeEvent: { layout: { width: 1280, height: 720 } },
    });

    const reserve = screen.getByTestId("reserve-centrale");
    const props = JSON.parse(String(reserve.props.accessibilityLabel)) as {
      carteRetournee: Carte | null;
      opaciteCarteRetournee?: number;
    };

    expect(props.carteRetournee).toEqual({ couleur: "coeur", rang: "as" });
    expect(props.opaciteCarteRetournee).toBe(0);
  });
});
