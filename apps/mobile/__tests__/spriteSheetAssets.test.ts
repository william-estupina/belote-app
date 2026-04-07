import path from "path";
import sharp from "sharp";

const CHEMIN_SPRITE_SHEET = path.resolve(__dirname, "../assets/sprites/sprite-sheet.png");
const CHEMIN_DOS_CARTE = path.resolve(__dirname, "../assets/dos-carte.png");
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

async function lirePixelDosSource(
  x: number,
  y: number,
): Promise<[number, number, number, number]> {
  const { data } = await sharp(CHEMIN_DOS_CARTE)
    .resize(LARGEUR_CELLULE, HAUTEUR_CELLULE, { fit: "fill" })
    .ensureAlpha()
    .extract({ left: x, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return [data[0], data[1], data[2], data[3]];
}

describe("spriteSheet atlas", () => {
  it("donne un fond de carte opaque aux rectos visibles", async () => {
    const [rouge, vert, bleu, alpha] = await lirePixel(20, 120);

    expect(alpha).toBeGreaterThan(240);
    expect(rouge).toBeGreaterThan(200);
    expect(vert).toBeGreaterThan(200);
    expect(bleu).toBeGreaterThan(180);
  });

  it("integre dos-carte.png dans la cellule atlas du dos", async () => {
    const points = [
      { x: Math.floor(LARGEUR_CELLULE / 2), y: Math.floor(HAUTEUR_CELLULE / 2) },
      { x: Math.round(LARGEUR_CELLULE * 0.12), y: Math.round(HAUTEUR_CELLULE * 0.5) },
    ];

    for (const point of points) {
      await expect(lirePixel(point.x, 4 * HAUTEUR_CELLULE + point.y)).resolves.toEqual(
        await lirePixelDosSource(point.x, point.y),
      );
    }
  });
});
