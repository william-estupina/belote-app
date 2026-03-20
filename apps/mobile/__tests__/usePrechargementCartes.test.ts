import { act, renderHook } from "@testing-library/react-native";

import { usePrechargementCartes } from "../hooks/usePrechargementCartes";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
}

function creerDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

describe("usePrechargementCartes", () => {
  it("attend la fin du prechargement avant d'annoncer les cartes pretes", async () => {
    const deferred = creerDeferred<void>();
    const precharger = jest.fn(() => deferred.promise);

    const { result } = renderHook(() => usePrechargementCartes({ precharger }));

    expect(precharger).toHaveBeenCalledTimes(1);
    expect(result.current.cartesPretes).toBe(false);

    let attenteResolue = false;
    const attente = result.current.attendreCartesPretes().then(() => {
      attenteResolue = true;
    });

    expect(attenteResolue).toBe(false);

    await act(async () => {
      deferred.resolve();
      await attente;
    });

    expect(result.current.cartesPretes).toBe(true);
    expect(attenteResolue).toBe(true);
  });

  it("ne relance pas le prechargement quand plusieurs attentes arrivent", async () => {
    const precharger = jest.fn(async () => undefined);

    const { result } = renderHook(() => usePrechargementCartes({ precharger }));

    await act(async () => {
      await Promise.all([
        result.current.attendreCartesPretes(),
        result.current.attendreCartesPretes(),
      ]);
    });

    expect(precharger).toHaveBeenCalledTimes(1);
    expect(result.current.cartesPretes).toBe(true);
  });
});
