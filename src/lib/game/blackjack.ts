import { Deck, type Card } from "../api/deckAPI";
import { GameOutcome } from "./enums";

export class BlackjackGame {
    // Deck and hands
    deck!: Deck;
    playerHand: Card[] = [];
    dealerHand: Card[] = [];
    // Money management
    playerBet = 0;
    playerBalance = 1000;
    // Reshuffle threshold for 6 decks (312 cards)
    reshuffleThreshold = 312 * 0.4; // ~125 cards
    // Option flags
    hasDoubledDown = false;
    hasSurrendered = false;
    // For splitting (basic implementation)
    splitHands: Card[][] = [];
    activeSplitHandIndex = 0;

    /**
     * Starts a new round using the given bet.
     * Deducts the bet from the balance and deals initial cards.
     */
    async startGame(bet: number) {
        if (bet % 10 !== 0) throw new Error("Bet must be divisible by 10");
        if (bet > this.playerBalance) throw new Error("Insufficient balance");

        this.playerBet = bet;
        this.playerBalance -= bet;
        this.hasDoubledDown = false;
        this.hasSurrendered = false;
        this.splitHands = [];
        this.activeSplitHandIndex = 0;

        // Initialize deck if needed (or if remaining cards are low)
        if (!this.deck || this.deck.remaining < this.reshuffleThreshold) {
            this.deck = await Deck.initialize(6);
        }

        const initialDraw = await this.deck.draw(4);
        this.playerHand = initialDraw.cards.slice(0, 2);
        this.dealerHand = initialDraw.cards.slice(2, 4);
    }

    // Reshuffle if cards remaining fall below threshold.
    private async maybeReshuffle() {
        if (this.deck.remaining < this.reshuffleThreshold) {
            await this.deck.reshuffle(true);
        }
    }

    /**
     * Draws one card and adds it to the specified hand.
     */
    async hit(hand: Card[] = this.playerHand) {
        await this.maybeReshuffle();
        const drawResult = await this.deck.draw(1);
        if (drawResult.cards.length) {
            hand.push(drawResult.cards[0]);
        }
    }

    /**
     * Convenience method for adding a card to the dealer's hand.
     */
    async hitDealer() {
        await this.hit(this.dealerHand);
    }

    /**
     * Double down on an initial two-card hand.
     * Deducts an additional bet, doubles the wager, and deals one final card.
     */
    async doubleDown() {
        if (
            this.playerHand.length === 2 &&
            !this.hasDoubledDown &&
            this.playerBalance >= this.playerBet
        ) {
            this.playerBalance -= this.playerBet;
            this.playerBet *= 2;
            this.hasDoubledDown = true;
            await this.hit();
        }
    }

    /**
     * Surrender the hand, returning half the bet.
     */
    async surrender() {
        if (this.playerHand.length === 2 && !this.hasSurrendered) {
            this.hasSurrendered = true;
            this.playerBalance += Math.floor(this.playerBet / 2);
        }
    }

    /**
     * Splits the hand if the initial two cards are identical.
     * (Basic implementation: creates two hands and deals one card to each.)
     */
    async split() {
        if (
            this.playerHand.length === 2 &&
            this.playerHand[0].value === this.playerHand[1].value
        ) {
            this.splitHands = [[this.playerHand[0]], [this.playerHand[1]]];
            await this.hit(this.splitHands[0]);
            await this.hit(this.splitHands[1]);
        }
    }

    /**
     * Dealer plays automatically: reveals hole card and draws until total >= 17.
     * Dealer stands on all 17s, including soft 17.
     */
    async dealerPlay() {
        while (this.calculateHandValue(this.dealerHand) < 17) {
            await this.hitDealer();
        }
    }

    /**
     * Calculates the total value of a hand.
     */
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

    /**
     * Checks the game outcome and adjusts the balance accordingly.
     */
    checkGameOutcome() {
        if (this.hasSurrendered) {
            return GameOutcome.PlayerSurrender;
        }

        const playerValue = this.calculateHandValue(this.playerHand);
        const dealerValue = this.calculateHandValue(this.dealerHand);

        // Natural blackjack check (2-card 21)
        if (playerValue === 21 && this.playerHand.length === 2) {
            this.playerBalance += Math.floor(this.playerBet * 2.5); // pays 3:2
            return GameOutcome.Blackjack;
        }
        if (playerValue > 21) return GameOutcome.PlayerBust;
        if (dealerValue > 21) {
            this.playerBalance += this.playerBet * 2;
            return GameOutcome.DealerBust;
        }
        if (playerValue > dealerValue) {
            this.playerBalance += this.playerBet * 2;
            return GameOutcome.PlayerWins;
        }
        if (dealerValue > playerValue) return GameOutcome.DealerWins;
        // Push: bet is returned.
        this.playerBalance += this.playerBet;
        return GameOutcome.Push;
    }
}
