// src/lib/game/blackjack.ts
import { Deck, type Card } from "../api/deckAPI";
import { GameOutcome } from "./enums";

export class BlackjackGame {
    deck!: Deck;
    playerHand: Card[] = [];
    dealerHand: Card[] = [];
    // For 6 decks: 6 * 52 = 312. Reshuffle when remaining cards are less than 40% (≈125 cards).
    private readonly reshuffleThreshold = Math.round(312 * 0.4); // 125

    async startGame() {
        this.deck = await Deck.initialize(6);
        const initialDraw = await this.deck.draw(4);
        this.playerHand = initialDraw.cards.slice(0, 2);
        this.dealerHand = initialDraw.cards.slice(2, 4);
    }

    /**
     * Checks the deck and reshuffles if remaining cards are below threshold.
     */
    private async maybeReshuffle() {
        if (this.deck.remaining < this.reshuffleThreshold) {
            await this.deck.reshuffle(true);
        }
    }

    async hit() {
        // Check deck condition before drawing.
        await this.maybeReshuffle();
        const drawResult = await this.deck.draw(1);
        if (drawResult.cards.length) {
            this.playerHand.push(drawResult.cards[0]);
        }
    }

    async hitDealer() {
        // Check deck condition before drawing.
        await this.maybeReshuffle();
        const drawResult = await this.deck.draw(1);
        if (drawResult.cards.length) {
            this.dealerHand.push(drawResult.cards[0]);
        }
    }

    calculateHandValue(hand: Card[]) {
        let total = 0;
        let aces = 0;
        hand.forEach((card) => {
            if (card.value === "ACE") {
                aces++;
                total += 11;
            } else if (["KING", "QUEEN", "JACK"].includes(card.value)) {
                total += 10;
            } else {
                total += parseInt(card.value);
            }
        });
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        return total;
    }

    checkGameOutcome() {
        const playerValue = this.calculateHandValue(this.playerHand);
        const dealerValue = this.calculateHandValue(this.dealerHand);
        if (playerValue > 21) return GameOutcome.PlayerBust;
        if (dealerValue > 21) return GameOutcome.DealerBust;
        if (playerValue > dealerValue) return GameOutcome.PlayerWins;
        if (dealerValue > playerValue) return GameOutcome.DealerWins;
        // For push, you can decide based on additional game logic.
        return dealerValue >= 17 ? GameOutcome.Push : null;
    }
}
