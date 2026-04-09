// Réserve centrale (paquet + carte retournée).
// Le rendu des cartes est délégué au canvas Skia unifié.
// Ce composant est conservé uniquement pour le layout/positionnement.
import type { Carte } from "@belote/shared-types";

interface PropsReserveCentrale {
  afficherPaquet: boolean;
  cartesPaquetVisibles: number;
  carteRetournee: Carte | null;
  opaciteCarteRetournee?: number;
  largeurEcran: number;
  hauteurEcran: number;
}

/**
 * La réserve centrale n'a plus de rendu propre — les cartes sont dans le canvas unifié.
 * Le composant est gardé uniquement pour calculer les positions (utilisées par CarteRevelation).
 */
export function ReserveCentrale(_props: PropsReserveCentrale) {
  // Le rendu est entièrement géré par le canvas unifié via mettreAJourReserve
  return null;
}
