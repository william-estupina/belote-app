import type { Difficulte } from "@belote/shared-types";
import { create } from "zustand";

export interface PreferencesUtilisateur {
  difficulte: Difficulte;
  sonActive: boolean;
  scoreObjectif: number;
}

interface AppStore {
  preferences: PreferencesUtilisateur;
  setDifficulte: (difficulte: Difficulte) => void;
  setSonActive: (active: boolean) => void;
  setScoreObjectif: (score: number) => void;
  reinitialiserPreferences: () => void;
}

const PREFERENCES_PAR_DEFAUT: PreferencesUtilisateur = {
  difficulte: "difficile",
  sonActive: true,
  scoreObjectif: 1000,
};

export const useAppStore = create<AppStore>((set) => ({
  preferences: { ...PREFERENCES_PAR_DEFAUT },

  setDifficulte: (difficulte) =>
    set((etat) => ({
      preferences: { ...etat.preferences, difficulte },
    })),

  setSonActive: (active) =>
    set((etat) => ({
      preferences: { ...etat.preferences, sonActive: active },
    })),

  setScoreObjectif: (score) =>
    set((etat) => ({
      preferences: { ...etat.preferences, scoreObjectif: score },
    })),

  reinitialiserPreferences: () => set({ preferences: { ...PREFERENCES_PAR_DEFAUT } }),
}));
