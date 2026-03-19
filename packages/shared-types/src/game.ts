// Types du jeu de Belote

export const COULEURS = ["pique", "coeur", "carreau", "trefle"] as const;
export type Couleur = (typeof COULEURS)[number];

export const RANGS = ["7", "8", "9", "10", "valet", "dame", "roi", "as"] as const;
export type Rang = (typeof RANGS)[number];

export interface Carte {
  couleur: Couleur;
  rang: Rang;
}

export const POSITIONS_JOUEUR = ["sud", "ouest", "nord", "est"] as const;
export type PositionJoueur = (typeof POSITIONS_JOUEUR)[number];

export type IdEquipe = "equipe1" | "equipe2";

export interface Equipe {
  id: IdEquipe;
  joueurs: [PositionJoueur, PositionJoueur];
  score: number;
}

export type PhaseJeu =
  | "inactif"
  | "distribution"
  | "encheres1"
  | "encheres2"
  | "distributionRestante"
  | "jeu"
  | "finPli"
  | "scoresManche"
  | "finPartie";

export type Difficulte = "facile" | "moyen" | "difficile";

export interface PliComplete {
  cartes: { joueur: PositionJoueur; carte: Carte }[];
  gagnant: PositionJoueur;
  points: number;
}

export type ActionEnchere =
  | { type: "PRENDRE"; joueur: PositionJoueur }
  | { type: "ANNONCER"; joueur: PositionJoueur; couleur: Couleur }
  | { type: "PASSER"; joueur: PositionJoueur };

export interface VueBotJeu {
  maMain: Carte[];
  maPosition: PositionJoueur;
  positionPartenaire: PositionJoueur;
  couleurAtout: Couleur | null;
  pliEnCours: { joueur: PositionJoueur; carte: Carte }[];
  couleurDemandee: Couleur | null;
  historiquePlis: PliComplete[];
  scoreMonEquipe: number;
  scoreAdversaire: number;
  phaseJeu: "encheres1" | "encheres2" | "jeu";
  carteRetournee: Carte | null;
  historiqueEncheres: ActionEnchere[];
  positionPreneur: PositionJoueur | null;
  positionDonneur: PositionJoueur;
}

export type ActionBot =
  | { type: "PRENDRE" }
  | { type: "ANNONCER"; couleur: Couleur }
  | { type: "PASSER" }
  | { type: "JOUER_CARTE"; carte: Carte };
