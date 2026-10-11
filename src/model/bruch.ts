/**
 * Exakte Bruchrechnung. Positionen und Notenwerte im kanonischen Modell sind
 * immer Brueche, nie Fliesskommazahlen — ein 6/8- oder 5/8-Takt darf nicht
 * driften. Erst die Geometrie rechnet mit Zahlen (siehe `alsZahl`).
 */
export interface Bruch {
  readonly zaehler: number;
  readonly nenner: number;
}

const groessterGemeinsamerTeiler = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
};

/** Erzeugt einen gekuerzten Bruch mit positivem Nenner. */
export const bruch = (zaehler: number, nenner: number): Bruch => {
  if (!Number.isInteger(zaehler) || !Number.isInteger(nenner)) {
    throw new RangeError(`Bruch braucht ganze Zahlen, bekam ${zaehler}/${nenner}`);
  }
  if (nenner === 0) throw new RangeError("Bruch mit Nenner 0 ist undefiniert");
  if (zaehler === 0) return { zaehler: 0, nenner: 1 };

  const vorzeichen = nenner < 0 ? -1 : 1;
  const teiler = groessterGemeinsamerTeiler(zaehler, nenner);
  return {
    zaehler: (vorzeichen * zaehler) / teiler,
    nenner: (vorzeichen * nenner) / teiler,
  };
};

export const NULL: Bruch = bruch(0, 1);

export const addiere = (a: Bruch, b: Bruch): Bruch =>
  bruch(a.zaehler * b.nenner + b.zaehler * a.nenner, a.nenner * b.nenner);

export const dividiere = (a: Bruch, b: Bruch): Bruch =>
  bruch(a.zaehler * b.nenner, a.nenner * b.zaehler);

/** -1, 0 oder 1 — die Ordnung auf Bruechen. */
export const vergleiche = (a: Bruch, b: Bruch): -1 | 0 | 1 => {
  const links = a.zaehler * b.nenner;
  const rechts = b.zaehler * a.nenner;
  if (links < rechts) return -1;
  if (links > rechts) return 1;
  return 0;
};

/** Nur fuer die Geometrie: der Dezimalwert. Nie zurueck ins Modell schreiben. */
export const alsZahl = (b: Bruch): number => b.zaehler / b.nenner;
