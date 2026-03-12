// Fonction principale du bot — dispatche vers les stratégies selon la phase et la difficulté
import type { ActionBot, Difficulte, VueBotJeu } from "@belote/shared-types";

import { deciderEncheres } from "./strategie-encheres";
import { deciderJeu } from "./strategie-jeu";

/**
 * Point d'entrée principal du bot.
 * Reçoit la vue du jeu (ce qu'un vrai joueur verrait) et le niveau de difficulté.
 * Retourne l'action à effectuer.
 */
export function deciderBot(vue: VueBotJeu, difficulte: Difficulte): ActionBot {
  if (vue.phaseJeu === "encheres1" || vue.phaseJeu === "encheres2") {
    return deciderEncheres(vue, difficulte);
  }

  // Phase de jeu
  return deciderJeu(vue, difficulte);
}
