import fs from "fs";
import path from "path";
import sharp from "sharp";

// Grille 8×5 : lignes = couleurs (trefle, carreau, coeur, pique), colonnes = rangs (7,8,9,10,V,D,R,As)
// Ligne 5 = dos (cellule 0 uniquement)

const COULEURS_FICHIER = ["clubs", "diamonds", "hearts", "spades"] as const;
const RANGS_FICHIER = ["7", "8", "9", "10", "jack", "queen", "king", "ace"] as const;

const COLONNES = 8;
const LIGNES = 5;

const LARGEUR_CELLULE = 167;
const HAUTEUR_CELLULE = 243;

const COULEUR_DOS = { r: 30, g: 60, b: 120, alpha: 255 };

async function generer() {
  const dossierCartes = path.resolve(__dirname, "../assets/cartes");
  const dossierSprites = path.resolve(__dirname, "../assets/sprites");

  if (!fs.existsSync(dossierSprites)) {
    fs.mkdirSync(dossierSprites, { recursive: true });
  }

  const largeurTotale = COLONNES * LARGEUR_CELLULE;
  const hauteurTotale = LIGNES * HAUTEUR_CELLULE;

  const composites: sharp.OverlayOptions[] = [];

  // Lignes 0-3 : faces des cartes
  for (let ligne = 0; ligne < 4; ligne++) {
    const couleurFichier = COULEURS_FICHIER[ligne];
    for (let col = 0; col < COLONNES; col++) {
      const rangFichier = RANGS_FICHIER[col];
      const nomFichier = `${rangFichier}_of_${couleurFichier}.png`;
      const cheminFichier = path.join(dossierCartes, nomFichier);

      if (!fs.existsSync(cheminFichier)) {
        throw new Error(`Fichier manquant: ${cheminFichier}`);
      }

      const imageRedimensionnee = await sharp(cheminFichier)
        .resize(LARGEUR_CELLULE, HAUTEUR_CELLULE, { fit: "fill" })
        .toBuffer();

      composites.push({
        input: imageRedimensionnee,
        left: col * LARGEUR_CELLULE,
        top: ligne * HAUTEUR_CELLULE,
      });
    }
  }

  // Dos de carte (rectangle bleu uni)
  const dosBuffer = await sharp({
    create: {
      width: LARGEUR_CELLULE,
      height: HAUTEUR_CELLULE,
      channels: 4,
      background: COULEUR_DOS,
    },
  })
    .png()
    .toBuffer();

  // Ligne 4, cellule 0 : dos dans le sprite sheet
  composites.push({
    input: dosBuffer,
    left: 0,
    top: 4 * HAUTEUR_CELLULE,
  });

  // Assembler le sprite sheet
  await sharp({
    create: {
      width: largeurTotale,
      height: hauteurTotale,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(path.join(dossierSprites, "sprite-sheet.png"));

  // Générer aussi le dos seul (pour usages hors Atlas)
  await sharp({
    create: {
      width: LARGEUR_CELLULE,
      height: HAUTEUR_CELLULE,
      channels: 4,
      background: COULEUR_DOS,
    },
  })
    .png()
    .toFile(path.join(dossierSprites, "dos.png"));

  console.log(
    `Sprite sheet générée : ${largeurTotale}×${hauteurTotale}px (${COLONNES}×${LIGNES} cellules de ${LARGEUR_CELLULE}×${HAUTEUR_CELLULE})`,
  );
  console.log(`Dos de carte généré : ${LARGEUR_CELLULE}×${HAUTEUR_CELLULE}px`);
}

generer().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
