import fs from "fs";
import path from "path";
import sharp from "sharp";

// Grille 8x5 : lignes = couleurs (trefle, carreau, coeur, pique), colonnes = rangs.
// La derniere ligne reserve la premiere cellule au dos de carte.

const COULEURS_FICHIER = ["clubs", "diamonds", "hearts", "spades"] as const;
const RANGS_FICHIER = ["7", "8", "9", "10", "jack", "queen", "king", "ace"] as const;

const COLONNES = 8;
const LIGNES = 5;

const LARGEUR_CELLULE = 167;
const HAUTEUR_CELLULE = 243;
const RAYON_COIN = 12;
const MARGE_FACE = Math.round(LARGEUR_CELLULE * 0.03);

function creerSvgFondRecto(): Buffer {
  return Buffer.from(
    `
      <svg width="${LARGEUR_CELLULE}" height="${HAUTEUR_CELLULE}" viewBox="0 0 ${LARGEUR_CELLULE} ${HAUTEUR_CELLULE}" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="0.75"
          y="0.75"
          width="${LARGEUR_CELLULE - 1.5}"
          height="${HAUTEUR_CELLULE - 1.5}"
          rx="${RAYON_COIN}"
          ry="${RAYON_COIN}"
          fill="#f0e8d4"
          stroke="#b8a88a"
          stroke-width="1.5"
        />
      </svg>
    `,
  );
}

async function creerTuileRecto(cheminFichier: string): Promise<Buffer> {
  const imageRedimensionnee = await sharp(cheminFichier)
    .resize(LARGEUR_CELLULE - MARGE_FACE * 2, HAUTEUR_CELLULE - MARGE_FACE * 2, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: LARGEUR_CELLULE,
      height: HAUTEUR_CELLULE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: creerSvgFondRecto() },
      { input: imageRedimensionnee, left: MARGE_FACE, top: MARGE_FACE },
    ])
    .png()
    .toBuffer();
}

async function creerTuileDos(cheminDosCarte: string): Promise<Buffer> {
  return sharp(cheminDosCarte)
    .resize(LARGEUR_CELLULE, HAUTEUR_CELLULE, { fit: "fill" })
    .ensureAlpha()
    .png()
    .toBuffer();
}

async function generer() {
  const dossierCartes = path.resolve(__dirname, "../assets/cartes");
  const dossierSprites = path.resolve(__dirname, "../assets/sprites");
  const cheminDosCarte = path.resolve(__dirname, "../assets/dos-carte.png");

  if (!fs.existsSync(cheminDosCarte)) {
    throw new Error(`Fichier manquant: ${cheminDosCarte}`);
  }

  if (!fs.existsSync(dossierSprites)) {
    fs.mkdirSync(dossierSprites, { recursive: true });
  }

  const largeurTotale = COLONNES * LARGEUR_CELLULE;
  const hauteurTotale = LIGNES * HAUTEUR_CELLULE;

  const composites: sharp.OverlayOptions[] = [];

  for (let ligne = 0; ligne < 4; ligne += 1) {
    const couleurFichier = COULEURS_FICHIER[ligne];
    for (let col = 0; col < COLONNES; col += 1) {
      const rangFichier = RANGS_FICHIER[col];
      const nomFichier = `${rangFichier}_of_${couleurFichier}.png`;
      const cheminFichier = path.join(dossierCartes, nomFichier);

      if (!fs.existsSync(cheminFichier)) {
        throw new Error(`Fichier manquant: ${cheminFichier}`);
      }

      composites.push({
        input: await creerTuileRecto(cheminFichier),
        left: col * LARGEUR_CELLULE,
        top: ligne * HAUTEUR_CELLULE,
      });
    }
  }

  const dosBuffer = await creerTuileDos(cheminDosCarte);

  composites.push({
    input: dosBuffer,
    left: 0,
    top: 4 * HAUTEUR_CELLULE,
  });

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

  await sharp(dosBuffer).png().toFile(path.join(dossierSprites, "dos.png"));

  console.log(
    `Sprite sheet generee : ${largeurTotale}x${hauteurTotale}px (${COLONNES}x${LIGNES} cellules de ${LARGEUR_CELLULE}x${HAUTEUR_CELLULE})`,
  );
  console.log(`Dos de carte genere : ${LARGEUR_CELLULE}x${HAUTEUR_CELLULE}px`);
}

generer().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
