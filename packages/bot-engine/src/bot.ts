// Fonction principale du bot
import type { ActionBot, Difficulte, VueBotJeu } from "@belote/shared-types";

export function deciderBot(vue: VueBotJeu, difficulte: Difficulte): ActionBot {
  // Placeholder — sera implémenté à l'étape 4
  if (vue.phaseJeu === "encheres1" || vue.phaseJeu === "encheres2") {
    return { type: "PASSER" };
  }

  // Joue la première carte jouable
  if (vue.maMain.length > 0) {
    return { type: "JOUER_CARTE", carte: vue.maMain[0] };
  }

  return { type: "PASSER" };
}
