// Thème et constantes visuelles de l'application Belote

export const COULEURS = {
  // Fond principal (tapis de jeu)
  fondPrincipal: "#0b2e12",
  fondFonce: "#061a09",
  fondClair: "#124520",

  // Texte
  textePrincipal: "#ffffff",
  texteSecondaire: "#cccccc",
  texteDesactive: "#888888",

  // Boutons (dégradé chaud)
  boutonPrimaire: "#e8b730",
  boutonPrimaireTexte: "#1a1a1a",
  boutonSecondaire: "#1e6e34",
  boutonSecondaireTexte: "#ffffff",
  boutonDesactive: "#555555",

  // Accents
  accent: "#d4a017",
  danger: "#cc3333",
  succes: "#33aa55",

  // Cartes / surfaces
  surfaceCarte: "#f0e8d4",
  bordureCarte: "#b8a88a",
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
