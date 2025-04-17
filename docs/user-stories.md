# Blackjack Projekt – User Stories

## Game Logik User Stories

### 1. Spiel starten

Als Spieler möchte ich ein neues Spiel starten, indem ich einen Einsatz platziere, damit ich Blackjack spielen kann.

**Akzeptanzkriterien:**

- **Given** ich befinde mich auf der Blackjack-Spielseite und die Spielphase ist "Betting".
- **When** ich einen gültigen Einsatz (durch 10 teilbar und nicht höher als mein Guthaben) eingebe und auf "Place Bet" klicke.
- **Then** wird mein Guthaben um den Einsatz reduziert, ich und der Dealer erhalten je zwei Karten, und die Spielphase wechselt zu "PlayerTurn" (außer es gibt ein natürliches Blackjack).

### 2. Erste Hand sehen

Als Spieler möchte ich nach der ersten Kartenvergabe meine Karten und die offene Karte des Dealers sehen, damit ich meine nächste Entscheidung treffen kann.

**Akzeptanzkriterien:**

- **Given** ein neues Spiel wurde gestartet und die erste Kartenvergabe ist abgeschlossen.
- **When** die Spielphase "PlayerTurn" aktiv ist.
- **Then** sehe ich beide meiner Karten mit dem Gesamtwert sowie eine aufgedeckte Karte des Dealers, während die andere verdeckt bleibt.

### 3. Spieler zieht Karte (Hit)

Als Spieler möchte ich „Hit“ auswählen können, um eine weitere Karte zu erhalten und meinen Handwert zu verbessern.

**Akzeptanzkriterien:**

- **Given** es ist mein Zug ("PlayerTurn") und mein Handwert ist unter 21.
- **When** ich auf die "Hit"-Schaltfläche klicke.
- **Then** wird meiner aktiven Hand eine weitere Karte hinzugefügt, der Handwert wird aktualisiert, und es bleibt mein Zug, solange der Wert nicht über 21 steigt.

### 4. Spieler überkauft sich (Bust)

Als Spieler möchte ich, dass meine Hand als „Bust“ gilt, wenn ihr Wert nach einem „Hit“ über 21 steigt, damit die Blackjack-Regeln eingehalten werden.

**Akzeptanzkriterien:**

- **Given** es ist mein Zug und ich wähle "Hit".
- **When** die neue Karte meinen Handwert über 21 steigen lässt.
- **Then** wird die Hand als "Player Bust" markiert, ich verliere den Einsatz, und das Spiel geht weiter (entweder zur nächsten Hand oder zum Dealer).

### 5. Spieler passt (Stand)

Als Spieler möchte ich mit „Stand“ meinen Zug beenden, damit der Dealer oder meine nächste Hand weitermachen kann.

**Akzeptanzkriterien:**

- **Given** es ist mein Zug ("PlayerTurn").
- **When** ich auf die "Stand"-Schaltfläche klicke.
- **Then** erhalte ich keine Karten mehr für diese Hand, und das Spiel geht weiter (zur nächsten Hand oder zum Dealer).

### 6. Dealer spielt nach Regeln

Als Spieler möchte ich, dass der Dealer nach festen Regeln spielt (zieht bis mindestens 17), damit das Ergebnis fair bestimmt wird.

**Akzeptanzkriterien:**

- **Given** ich habe alle meine Hände abgeschlossen.
- **When** die Spielphase auf "DealerTurn" wechselt.
- **Then** deckt der Dealer seine verdeckte Karte auf und zieht Karten, bis der Handwert mindestens 17 beträgt, dann bleibt er stehen.

### 7. Ergebnis bestimmen

Als Spieler möchte ich, dass das Spiel den Ausgang bestimmt (Sieg, Niederlage, Unentschieden), damit ich das Ergebnis kenne.

**Akzeptanzkriterien:**

- **Given** der Dealer hat seinen Zug beendet.
- **When** die Spielphase auf "Outcome" wechselt.
- **Then** vergleicht das Spiel meinen Handwert mit dem des Dealers, zeigt das Ergebnis an (z. B. "Player Wins", "Push") und aktualisiert mein Guthaben entsprechend.

### 8. Auszahlung bei natürlichem Blackjack

Als Spieler möchte ich bei einem natürlichen Blackjack (Ass + 10er-Karte) eine Auszahlung von 3:2 erhalten, damit ich für ein starkes Blatt belohnt werde.

**Akzeptanzkriterien:**

- **Given** die erste Kartenvergabe erfolgt.
- **When** meine ersten beiden Karten einen Wert von 21 ergeben und der Dealer kein natürliches Blackjack hat.
- **Then** endet die Runde sofort, das Ergebnis lautet "Player Blackjack", und mein Guthaben wird um das 2,5-fache meines Einsatzes erhöht (Einsatz + 1,5-fache Auszahlung).

### 9. Hand aufteilen (Split)

Als Spieler möchte ich meine Hand aufteilen können, wenn meine ersten beiden Karten den gleichen Wert haben, damit ich zwei separate Hände spielen kann.

**Akzeptanzkriterien:**

- **Given** es ist mein Zug ("PlayerTurn"), meine aktive Hand hat genau zwei Karten mit gleichem Wert, wurde noch nicht gesplittet, und ich habe genügend Guthaben.
- **When** ich auf die "Split"-Schaltfläche klicke.
- **Then** wird meine ursprüngliche Hand in zwei getrennte Hände aufgeteilt, ein zweiter Einsatz wird platziert, jede Hand erhält eine zusätzliche Karte, und ich spiele beide Hände nacheinander.

### 10. Spielende bei Guthaben 0

Als Spieler möchte ich, dass das Spiel endet, wenn mein Guthaben 0 erreicht, damit ich weiß, dass ich nicht weiterspielen kann.

**Akzeptanzkriterien:**

- **Given** ich spiele das Spiel.
- **When** mein Guthaben nach einem verlorenen Einsatz auf 0 oder weniger fällt.
- **Then** wird eine "Game Over"-Meldung angezeigt, Spielaktionen werden deaktiviert, und ein "Restart Game"-Button erscheint.

### 11. Neue Runde starten

Als Spieler möchte ich nach Rundenende eine neue Runde starten können, damit ich weiterspielen kann.

**Akzeptanzkriterien:**

- **Given** eine Runde ist beendet und die Spielphase ist "Outcome".
- **When** ich auf die Schaltfläche "New Round" klicke.
- **Then** werden Hände und Ergebnisse zurückgesetzt, die Spielphase wechselt zu "Betting", und ich kann einen neuen Einsatz platzieren.

### 12. Spiel neustarten

Als Spieler möchte ich das gesamte Spiel neustarten können, wenn es vorbei ist, damit ich mit neuem Guthaben erneut spielen kann.

**Akzeptanzkriterien:**

- **Given** das Spiel ist vorbei (Guthaben = 0).
- **When** ich auf den "Restart Game"-Button klicke.
- **Then** wird mein Guthaben auf den Startwert (z. B. 1000) zurückgesetzt, die Spielphase wechselt zu "Betting", und der gesamte Spielstatus wird zurückgesetzt.

### 13. Ass-Wert-Berechnung

Als Spieler möchte ich, dass Asse entweder als 11 oder 1 zählen – je nachdem, was besser ist –, damit die Standardregeln für Asse eingehalten werden.

**Akzeptanzkriterien:**

- **Given** ich habe ein oder mehrere Asse in meiner Hand.
- **When** das Spiel meinen Handwert berechnet.
- **Then** zählt jedes Ass zunächst als 11, aber wenn der Gesamtwert 21 übersteigt, wird der Wert von Assen nacheinander auf 1 reduziert, bis der Handwert 21 oder weniger beträgt.
