// Thème et constantes visuelles de l'application Belote

export const COULEURS = {
  // Fond principal (tapis de jeu)
  fondPrincipal: "#1a5c2a",
  fondFonce: "#0f3d1a",
  fondClair: "#2a7a3e",

  // Texte
  textePrincipal: "#ffffff",
  texteSecondaire: "#cccccc",
  texteDesactive: "#888888",

  // Boutons
  boutonPrimaire: "#d4a017",
  boutonPrimaireTexte: "#1a1a1a",
  boutonSecondaire: "#2a7a3e",
  boutonSecondaireTexte: "#ffffff",
  boutonDesactive: "#555555",

  // Accents
  accent: "#d4a017",
  danger: "#cc3333",
  succes: "#33aa55",

  // Cartes / surfaces
  surfaceCarte: "#f5f0e1",
  bordureCarte: "#c0b090",
  ombre: "rgba(0, 0, 0, 0.3)",
} as const;

export const TYPOGRAPHIE = {
  titreTaille: 48,
  sousTitreTaille: 24,
  corpsTaille: 16,
  petitTaille: 14,
  boutonTaille: 18,
  famillePrincipale: undefined, // Police système par défaut
  poidsNormal: "400" as const,
  poidsMoyen: "600" as const,
  poidsGras: "bold" as const,
} as const;

export const ESPACEMENTS = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BORDURES = {
  rayon: 12,
  rayonPetit: 8,
  rayonGrand: 20,
  largeur: 1,
} as const;
