#!/bin/sh
# Schneidet einen Ausschnitt aus einem Original (PDF) oder einem Screenshot (PNG) und
# verkleinert ihn, damit ein Agent ihn billig lesen kann. Ein ganzes Blatt in voller
# Aufloesung kostet ein Vielfaches eines Ausschnitts.
#
#   scripts/ausschnitt.sh <quelle.pdf|.png> <ziel.png|.jpg>                     Uebersicht
#   scripts/ausschnitt.sh <quelle.pdf|.png> <ziel.png|.jpg> <y> <x> <h> <w> [max]
#
# Ohne Koordinaten entsteht eine Uebersicht des ganzen Blatts; die Koordinaten fuer den
# Ausschnitt liest man daraus ab und rechnet sie mit dem ausgegebenen Faktor auf das volle
# Blatt hoch. Koordinaten gelten in Pixeln des vollen Blatts (ein PDF wird mit 2400 px an
# der langen Seite gerendert, nur die erste Seite). `max` begrenzt die lange Seite des
# Ergebnisses (Vorgabe 1000), ein kleiner Ausschnitt wird bis dahin vergroessert. Ein Ziel
# auf .jpg wird als JPEG geschrieben, um ein Mehrfaches kleiner als PNG.
set -eu

if [ $# -ne 2 ] && [ $# -ne 6 ] && [ $# -ne 7 ]; then
  sed -n '6,7p' "$0" >&2
  exit 2
fi

quelle=$1
ziel=$2

case $quelle in
  *.pdf | *.PDF)
    # Ein gerendertes PDF wird zwischengespeichert: jeder weitere Ausschnitt ist billig.
    cache=${TMPDIR:-/tmp}/drumba-ausschnitt
    mkdir -p "$cache"
    blatt=$cache/$(basename "$quelle").png
    if [ ! -f "$blatt" ] || [ "$quelle" -nt "$blatt" ]; then
      qlmanage -t -s 2400 -o "$cache" "$quelle" >/dev/null 2>&1
    fi
    ;;
  *) blatt=$quelle ;;
esac

case $ziel in
  *.jpg | *.jpeg) format=jpeg ;;
  *) format=png ;;
esac
sips -s format "$format" "$blatt" --out "$ziel" >/dev/null
breite=$(sips -g pixelWidth "$blatt" | awk '/pixelWidth/ { print $2 }')
hoehe=$(sips -g pixelHeight "$blatt" | awk '/pixelHeight/ { print $2 }')

if [ $# -eq 2 ]; then
  # Die Uebersicht dient nur zum Finden der Koordinaten; Details zeigt erst der Ausschnitt.
  sips -Z 700 "$ziel" >/dev/null
  lang=$((breite > hoehe ? breite : hoehe))
  echo "$ziel: Uebersicht von ${breite}x${hoehe}, Faktor $(echo "scale=2; $lang / 700" | bc) zum vollen Blatt"
  exit 0
fi

y=$3 x=$4 h=$5 w=$6 max=${7:-1000}
sips -c "$h" "$w" --cropOffset "$y" "$x" "$ziel" >/dev/null
sips -Z "$max" "$ziel" >/dev/null
echo "$ziel: ${w}x${h} ab x=$x y=$y aus ${breite}x${hoehe}, lange Seite $max"
