import type { Carte } from "@belote/shared-types";
import {
  Atlas,
  Canvas,
  Group,
  rect,
  Shadow,
  useRSXformBuffer,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

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
