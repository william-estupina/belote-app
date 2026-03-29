import type { Carte } from "@belote/shared-types";
import {
  Atlas,
  Canvas,
  Group,
  rect,
  Shadow,
  useRSXformBuffer,
} from "@shopify/react-native-skia";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COULEURS, ESPACEMENTS, TYPOGRAPHIE } from "../../constants/theme";
import type { AtlasCartes } from "../../hooks/useAtlasCartes";
import { CarteFaceAtlas } from "../game/Carte";

interface PropsComparaisonRenduCarte {
  atlas: AtlasCartes;
  carteGauche: Carte;
  carteDroite: Carte;
  largeurCarte: number;
  hauteurCarte: number;
}

interface PropsCarteAtlasDebug {
  atlas: AtlasCartes;
  carte: Carte;
  largeurCarte: number;
  hauteurCarte: number;
}

function CarteAtlasDebug({
  atlas,
  carte,
  largeurCarte,
  hauteurCarte,
}: PropsCarteAtlasDebug) {
  const { image, largeurCellule, hauteurCellule } = atlas;
  const sprite = atlas.rectSource(carte.couleur, carte.rang);
  const sprites = useMemo(
    () => [rect(sprite.x, sprite.y, sprite.width, sprite.height)],
    [sprite.height, sprite.width, sprite.x, sprite.y],
  );
  const echelle =
    largeurCellule > 0 && hauteurCellule > 0
      ? Math.min(largeurCarte / largeurCellule, hauteurCarte / hauteurCellule)
      : 1;
  const transformations = useRSXformBuffer(1, (valeur) => {
    "worklet";
    valeur.set(echelle, 0, 0, 0);
  });

  if (!image || largeurCellule === 0 || hauteurCellule === 0) {
    return (
      <View
        testID="debug-carte-atlas"
        style={[
          styles.carteFallback,
          {
            width: largeurCarte,
            height: hauteurCarte,
          },
        ]}
      >
        <Text style={styles.texteFallback}>Chargement atlas...</Text>
      </View>
    );
  }

  return (
    <View
      testID="debug-carte-atlas"
      style={[
        styles.carteAtlas,
        {
          width: largeurCarte,
          height: hauteurCarte,
        },
      ]}
    >
      <Canvas style={{ width: largeurCarte, height: hauteurCarte }} pointerEvents="none">
        <Group>
          <Shadow dx={1} dy={2} blur={4} color="rgba(0, 0, 0, 0.35)" />
          <Atlas image={image} sprites={sprites} transforms={transformations} />
        </Group>
      </Canvas>
    </View>
  );
}

export function ComparaisonRenduCarte({
  atlas,
  carteGauche,
  carteDroite,
  largeurCarte,
  hauteurCarte,
}: PropsComparaisonRenduCarte) {
  const [renduSuperpose, setRenduSuperpose] = useState<"gauche" | "droite">("gauche");
  const afficherGauche = renduSuperpose === "gauche";

  return (
    <View style={styles.conteneur}>
      <Text style={styles.titre}>Comparaison des rendus</Text>
      <Text style={styles.sousTitre}>
        Meme carte, meme taille, deux pipelines differents.
      </Text>

      <View style={styles.rangee}>
        <View style={styles.colonne}>
          <Text style={styles.libelle}>Main joueur (CarteFaceAtlas)</Text>
          <CarteFaceAtlas
            atlas={atlas}
            carte={carteGauche}
            largeur={largeurCarte}
            hauteur={hauteurCarte}
          />
        </View>

        <View style={styles.colonne}>
          <Text style={styles.libelle}>Atlas distribution (Skia Canvas)</Text>
          <CarteAtlasDebug
            atlas={atlas}
            carte={carteDroite}
            largeurCarte={largeurCarte}
            hauteurCarte={hauteurCarte}
          />
        </View>

        <View style={styles.colonne}>
          <Text style={styles.libelle}>Superposition</Text>
          <Text style={styles.etatSuperposition}>
            {`Rendu affiche : ${renduSuperpose}`}
          </Text>
          <Pressable
            testID="superposition-bascule"
            onPress={() =>
              setRenduSuperpose((valeur) => (valeur === "gauche" ? "droite" : "gauche"))
            }
            style={({ pressed }) => [
              styles.boutonBascule,
              pressed ? styles.boutonBasculePresse : null,
            ]}
          >
            <Text style={styles.texteBoutonBascule}>
              {afficherGauche ? "Afficher le rendu droite" : "Afficher le rendu gauche"}
            </Text>
          </Pressable>

          <View
            style={[
              styles.canevasSuperposition,
              { width: largeurCarte, height: hauteurCarte },
            ]}
          >
            <View
              testID="superposition-carte-gauche"
              style={[
                styles.carteSuperposee,
                afficherGauche ? styles.carteVisible : styles.carteMasquee,
              ]}
              pointerEvents="none"
            >
              <CarteFaceAtlas
                atlas={atlas}
                carte={carteGauche}
                largeur={largeurCarte}
                hauteur={hauteurCarte}
              />
            </View>

            <View
              testID="superposition-carte-droite"
              style={[
                styles.carteSuperposee,
                afficherGauche ? styles.carteMasquee : styles.carteVisible,
              ]}
              pointerEvents="none"
            >
              <CarteAtlasDebug
                atlas={atlas}
                carte={carteDroite}
                largeurCarte={largeurCarte}
                hauteurCarte={hauteurCarte}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: {
    width: "100%",
    gap: ESPACEMENTS.lg,
  },
  titre: {
    fontSize: 28,
    fontWeight: TYPOGRAPHIE.poidsGras,
    color: COULEURS.textePrincipal,
    textAlign: "center",
  },
  sousTitre: {
    fontSize: TYPOGRAPHIE.corpsTaille,
    color: COULEURS.texteSecondaire,
    textAlign: "center",
  },
  rangee: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: ESPACEMENTS.xl,
  },
  colonne: {
    alignItems: "center",
    gap: ESPACEMENTS.md,
    padding: ESPACEMENTS.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  libelle: {
    maxWidth: 240,
    textAlign: "center",
    fontSize: TYPOGRAPHIE.corpsTaille,
    fontWeight: TYPOGRAPHIE.poidsMoyen,
    color: COULEURS.textePrincipal,
  },
  etatSuperposition: {
    color: COULEURS.texteSecondaire,
    fontSize: TYPOGRAPHIE.petitTaille,
    textAlign: "center",
  },
  boutonBascule: {
    borderRadius: 12,
    paddingHorizontal: ESPACEMENTS.md,
    paddingVertical: ESPACEMENTS.sm,
    backgroundColor: COULEURS.boutonPrimaire,
  },
  boutonBasculePresse: {
    opacity: 0.88,
  },
  texteBoutonBascule: {
    color: COULEURS.boutonPrimaireTexte,
    fontSize: TYPOGRAPHIE.petitTaille,
    fontWeight: TYPOGRAPHIE.poidsMoyen,
    textAlign: "center",
  },
  canevasSuperposition: {
    position: "relative",
  },
  carteSuperposee: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  carteVisible: {
    opacity: 1,
  },
  carteMasquee: {
    opacity: 0,
  },
  carteAtlas: {
    overflow: "hidden",
  },
  carteFallback: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: COULEURS.fondClair,
  },
  texteFallback: {
    color: COULEURS.texteSecondaire,
    fontSize: TYPOGRAPHIE.petitTaille,
  },
});
