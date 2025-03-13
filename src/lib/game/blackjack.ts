import { Deck, type Card } from "../api/deckAPI";
import { GameOutcome, GamePhase } from "../enums";

export class BlackjackGame {
    deck!: Deck;
    playerHand: Card[] = [];
    dealerHand: Card[] = [];
    playerBet = 0;
    playerBalance = 1000;
    gameOver = false;
    reshuffleThreshold = 312 * 0.4; // About 125 cards remaining

    hasDoubledDown = false;
    hasSurrendered = false;
    // For splitting (basic implementation)
    splitHands: Card[][] = [];
    activeSplitHandIndex = 0;

    // Track the current phase using our enum
    currentPhase: GamePhase = GamePhase.Betting;

    /**
     * Checks if a hand is a natural blackjack.
     */
    isNaturalBlackjack(hand: Card[]) {
        return this.calculateHandValue(hand) === 21 && hand.length === 2;
    }

    /**
     * Checks if a hand is bust (value over 21).
     */
    isBust(hand: Card[]) {
        return this.calculateHandValue(hand) > 21;
    }

    /**
     * Checks if the player wins.
     */
    playerWins(playerHand: Card[], dealerHand: Card[]) {
        const playerValue = this.calculateHandValue(playerHand);
        const dealerValue = this.calculateHandValue(dealerHand);
        return (
            playerValue <= 21 && (dealerValue > 21 || playerValue > dealerValue)
        );
    }

    /**
     * Checks if the dealer wins.
     */
    dealerWins(playerHand: Card[], dealerHand: Card[]) {
        const playerValue = this.calculateHandValue(playerHand);
        const dealerValue = this.calculateHandValue(dealerHand);
        return dealerValue <= 21 && dealerValue > playerValue;
    }

    /**
     * Checks if the game is a push (tie).
     */
    isPush(playerHand: Card[], dealerHand: Card[]) {
        return (
            this.calculateHandValue(playerHand) ===
            this.calculateHandValue(dealerHand)
        );
    }

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
        this.currentPhase = GamePhase.InitialDeal;

        // Initialize deck if needed.
        if (!this.deck || this.deck.remaining < this.reshuffleThreshold) {
            this.deck = await Deck.initialize(6);
        }

        const initialDraw = await this.deck.draw(4);
        this.playerHand = initialDraw.cards.slice(0, 2);
        this.dealerHand = initialDraw.cards.slice(2, 4);

        // Check for natural blackjack.
        if (this.isNaturalBlackjack(this.playerHand)) {
            this.currentPhase = GamePhase.Outcome;
        } else {
            this.currentPhase = GamePhase.PlayerTurn;
        }
    }

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
     * Doubles down on an initial two-card hand.
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
            this.currentPhase = GamePhase.DealerTurn;
        }
    }

    /**
     * Surrenders the hand, returning half the bet.
     */
    async surrender() {
        if (this.playerHand.length === 2 && !this.hasSurrendered) {
            this.hasSurrendered = true;
            this.playerBalance += Math.floor(this.playerBet / 2);
            this.currentPhase = GamePhase.Outcome;
        }
    }

    /**
     * Splits the hand if the first two cards are identical.
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
            // For simplicity, after splitting we'll use the first hand.
            this.playerHand = this.splitHands[0];
        }
    }

    /**
     * Dealer plays: reveals the hole card and draws until total >= 17.
     * Dealer stands on all 17s, including soft 17.
     */
    async dealerPlay() {
        this.currentPhase = GamePhase.DealerTurn;
        while (this.calculateHandValue(this.dealerHand) < 17) {
            await this.hitDealer();
        }
        this.currentPhase = GamePhase.Outcome;
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

    hasSoft17(hand: Card[]) {
        return (
            this.calculateHandValue(hand) === 17 &&
            hand.some((card) => card.value === "ACE")
        );
    }

    /**
     * Determines the outcome and updates the balance accordingly.
     */
    checkGameOutcome() {
        if (this.hasSurrendered) return GameOutcome.PlayerSurrender;

        if (this.isNaturalBlackjack(this.playerHand)) {
            this.playerBalance += Math.floor(this.playerBet * 2.5);
            return GameOutcome.Blackjack;
        }
        if (this.isBust(this.playerHand)) return GameOutcome.PlayerBust;
        if (this.isBust(this.dealerHand)) {
            this.playerBalance += this.playerBet * 2;
            return GameOutcome.DealerBust;
        }
        if (this.playerWins(this.playerHand, this.dealerHand)) {
            this.playerBalance += this.playerBet * 2;
            return GameOutcome.PlayerWins;
        }
        if (this.dealerWins(this.playerHand, this.dealerHand))
            return GameOutcome.DealerWins;

        this.playerBalance += this.playerBet; // Push
        return GameOutcome.Push;
    }

    checkGameOver() {
        this.gameOver = this.playerBalance <= 0;
        return this.gameOver;
    }

    restartGame() {
        this.playerBalance = 1000;
        this.gameOver = false;
        this.currentPhase = GamePhase.Betting;
    }
}
