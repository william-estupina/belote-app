import path from "path";
import sharp from "sharp";

const CHEMIN_SPRITE_SHEET = path.resolve(__dirname, "../assets/sprites/sprite-sheet.png");
const LARGEUR_CELLULE = 167;
const HAUTEUR_CELLULE = 243;

async function lirePixel(
  x: number,
  y: number,
): Promise<[number, number, number, number]> {
  const { data } = await sharp(CHEMIN_SPRITE_SHEET)
    .extract({ left: x, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return [data[0], data[1], data[2], data[3]];
}

async function mesurerBoiteSymboleRouge(
  colonne: number,
  ligne: number,
): Promise<{ largeur: number; hauteur: number }> {
  const { data, info } = await sharp(CHEMIN_SPRITE_SHEET)
    .extract({
      left: colonne * LARGEUR_CELLULE + 4,
      top: ligne * HAUTEUR_CELLULE + 23,
      width: 34,
      height: 46,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * 4;
      const rouge = data[index];
      const vert = data[index + 1];
      const bleu = data[index + 2];
      const alpha = data[index + 3];

      const appartientAuSymbole =
        alpha > 150 && rouge > 120 && rouge - vert > 35 && rouge - bleu > 35;

      if (!appartientAuSymbole) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX === -1 || maxY === -1) {
    throw new Error("Symbole rouge introuvable dans la zone inspectee");
  }

  return {
    largeur: maxX - minX + 1,
    hauteur: maxY - minY + 1,
  };
}

describe("spriteSheet atlas", () => {
  it("donne un fond de carte opaque aux rectos visibles", async () => {
    const [rouge, vert, bleu, alpha] = await lirePixel(20, 120);

    expect(alpha).toBeGreaterThan(240);
    expect(rouge).toBeGreaterThan(200);
    expect(vert).toBeGreaterThan(200);
    expect(bleu).toBeGreaterThan(180);
  });

  it("utilise un dos rouge et dore au lieu d'un aplat bleu", async () => {
    const [rouge, vert, bleu, alpha] = await lirePixel(
      Math.floor(LARGEUR_CELLULE / 2),
      4 * HAUTEUR_CELLULE + Math.floor(HAUTEUR_CELLULE / 2),
    );

    expect(alpha).toBeGreaterThan(240);
    expect(rouge).toBeGreaterThan(bleu);
    expect(rouge).toBeGreaterThan(vert);
  });

  it("garde une taille de symbole de couleur coherente entre chiffres et tetes", async () => {
    const symboleSept = await mesurerBoiteSymboleRouge(0, 2);
    const symboleValet = await mesurerBoiteSymboleRouge(4, 2);
    const symboleDame = await mesurerBoiteSymboleRouge(5, 2);
    const symboleRoi = await mesurerBoiteSymboleRouge(6, 2);

    expect(Math.abs(symboleSept.hauteur - symboleValet.hauteur)).toBeLessThanOrEqual(4);
    expect(Math.abs(symboleSept.hauteur - symboleDame.hauteur)).toBeLessThanOrEqual(4);
    expect(Math.abs(symboleSept.hauteur - symboleRoi.hauteur)).toBeLessThanOrEqual(4);
  });
});
