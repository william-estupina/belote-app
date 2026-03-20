export interface OptionsSourceAssetAtlas {
  os: string;
  source: unknown;
}

/**
 * Normalise une source d'asset pour Skia.
 * Sur web, Metro/Expo peut exposer soit `default`, soit `uri`.
 */
export function resoudreSourceAssetAtlas({
  os,
  source,
}: OptionsSourceAssetAtlas): string | number {
  if (os !== "web") {
    if (typeof source === "number" || typeof source === "string") {
      return source;
    }

    throw new Error("Source d'asset native invalide pour l'atlas");
  }

  if (typeof source === "string" || typeof source === "number") {
    return source;
  }

  if (source && typeof source === "object") {
    const sourceModule = source as {
      default?: unknown;
      uri?: unknown;
    };

    if (typeof sourceModule.default === "string") {
      return sourceModule.default;
    }

    if (typeof sourceModule.uri === "string") {
      return sourceModule.uri;
    }
  }

  throw new Error("Format de source d'asset web non supporte pour l'atlas");
}
