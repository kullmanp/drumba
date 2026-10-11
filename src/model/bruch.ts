/**
 * Exakte Bruchrechnung. Positionen und Notenwerte im kanonischen Modell sind
 * immer Brüche, nie Fliesskommazahlen — ein 6/8- oder 5/8-Takt darf nicht
 * driften. Erst die Geometrie rechnet mit Zahlen (siehe `alsZahl`).
 */
export interface Bruch {
  readonly zähler: number;
  readonly nenner: number;
}

const grössterGemeinsamerTeiler = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
};

/** Erzeugt einen gekürzten Bruch mit positivem Nenner. */
export const bruch = (zähler: number, nenner: number): Bruch => {
  if (!Number.isInteger(zähler) || !Number.isInteger(nenner)) {
    throw new RangeError(`Bruch braucht ganze Zahlen, bekam ${zähler}/${nenner}`);
  }
  if (nenner === 0) throw new RangeError("Bruch mit Nenner 0 ist undefiniert");
  if (zähler === 0) return { zähler: 0, nenner: 1 };

  const vorzeichen = nenner < 0 ? -1 : 1;
  const teiler = grössterGemeinsamerTeiler(zähler, nenner);
  return {
    zähler: (vorzeichen * zähler) / teiler,
    nenner: (vorzeichen * nenner) / teiler,
  };
};

export const NULL: Bruch = bruch(0, 1);

export const addiere = (a: Bruch, b: Bruch): Bruch =>
  bruch(a.zähler * b.nenner + b.zähler * a.nenner, a.nenner * b.nenner);

export const dividiere = (a: Bruch, b: Bruch): Bruch =>
  bruch(a.zähler * b.nenner, a.nenner * b.zähler);

/** -1, 0 oder 1 — die Ordnung auf Brüchen. */
export const vergleiche = (a: Bruch, b: Bruch): -1 | 0 | 1 => {
  const links = a.zähler * b.nenner;
  const rechts = b.zähler * a.nenner;
  if (links < rechts) return -1;
  if (links > rechts) return 1;
  return 0;
};

/** Nur für die Geometrie: der Dezimalwert. Nie zurück ins Modell schreiben. */
export const alsZahl = (b: Bruch): number => b.zähler / b.nenner;
