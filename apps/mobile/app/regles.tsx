import { ScrollView, StyleSheet, Text, View } from "react-native";

import { COULEURS, ESPACEMENTS, TYPOGRAPHIE } from "../constants/theme";

const SECTIONS_REGLES = [
  {
    titre: "Le jeu",
    contenu:
      "La Belote se joue à 4 joueurs répartis en 2 équipes de 2. Les partenaires sont face à face. On utilise un jeu de 32 cartes (du 7 à l'As dans les 4 couleurs). Le jeu se déroule dans le sens inverse des aiguilles d'une montre.",
  },
  {
    titre: "Distribution",
    contenu:
      "Le donneur distribue 5 cartes à chaque joueur (3 puis 2, ou 2 puis 3). Une carte est retournée au centre : c'est la carte proposée pour l'atout. Si un joueur prend, le donneur distribue les 3 cartes restantes à chacun (2 au preneur qui récupère aussi la carte retournée).",
  },
  {
    titre: "Les enchères",
    contenu:
      "Le joueur à droite du donneur parle en premier. Au premier tour, chaque joueur peut prendre (accepter la couleur retournée comme atout) ou passer. Si personne ne prend, un second tour permet de choisir une autre couleur comme atout. Si personne ne prend au second tour, les cartes sont redistribuées.",
  },
  {
    titre: "Ordre des cartes",
    contenu:
      "À l'atout : Valet (20pts), 9 (14pts), As (11pts), 10 (10pts), Roi (4pts), Dame (3pts), 8 (0pts), 7 (0pts).\n\nHors atout : As (11pts), 10 (10pts), Roi (4pts), Dame (3pts), Valet (2pts), 9 (0pts), 8 (0pts), 7 (0pts).",
  },
  {
    titre: "Le jeu de la carte",
    contenu:
      "Le joueur à droite du donneur entame le premier pli. Le jeu se déroule dans le sens inverse des aiguilles d'une montre. On doit fournir la couleur demandée. Si on ne peut pas fournir et qu'un adversaire est maître, on doit couper (jouer atout). Si le partenaire est maître, on peut défausser. Si on coupe, on doit monter sur un atout déjà joué si possible.",
  },
  {
    titre: "Le décompte",
    contenu:
      "Chaque pli remporté rapporte les points des cartes qu'il contient. Le dernier pli vaut 10 points bonus (Dix de der). Total des points dans une manche : 162.\n\nL'équipe qui a pris doit atteindre au moins 82 points, sinon elle « chute » et l'adversaire marque 162 points.",
  },
  {
    titre: "Belote et Rebelote",
    contenu:
      "Le joueur qui possède le Roi et la Dame d'atout annonce « Belote » en jouant la première, et « Rebelote » en jouant la seconde. Cela rapporte 20 points bonus à son équipe.",
  },
  {
    titre: "Fin de partie",
    contenu:
      "Les manches se succèdent jusqu'à ce qu'une équipe atteigne le score objectif (par défaut 1000 points). L'équipe qui atteint ce score en premier gagne la partie.",
  },
];

export default function EcranRegles() {
  return (
    <ScrollView style={styles.conteneur} contentContainerStyle={styles.contenu}>
      {SECTIONS_REGLES.map((section) => (
        <View key={section.titre} style={styles.section}>
          <Text style={styles.titreSectionTexte}>{section.titre}</Text>
          <Text style={styles.paragraphe}>{section.contenu}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
export { EcranRegles };

const styles = StyleSheet.create({
  conteneur: {
    flex: 1,
    backgroundColor: COULEURS.fondPrincipal,
  },
  contenu: {
    padding: ESPACEMENTS.lg,
    paddingBottom: ESPACEMENTS.xxl,
  },
  section: {
    marginBottom: ESPACEMENTS.lg,
  },
  titreSectionTexte: {
    fontSize: TYPOGRAPHIE.sousTitreTaille,
    fontWeight: TYPOGRAPHIE.poidsMoyen,
    color: COULEURS.accent,
    marginBottom: ESPACEMENTS.sm,
  },
  paragraphe: {
    fontSize: TYPOGRAPHIE.corpsTaille,
    color: COULEURS.textePrincipal,
    lineHeight: 24,
  },
});
