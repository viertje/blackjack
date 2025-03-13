import { Deck, type Card } from "../api/deckAPI";
import { GameOutcome } from "./enums";

export class BlackjackGame {
    deck!: Deck;
    playerHand: Card[] = [];
    dealerHand: Card[] = [];
    playerBet = 0;
    playerBalance = 1000;
    gameOver = false;
    reshuffleThreshold = 312 * 0.4;

    hasDoubledDown = false;
    hasSurrendered = false;
    // For splitting (basic implementation)
    splitHands: Card[][] = [];
    activeSplitHandIndex = 0;

    async startGame(bet: number) {
        if (bet % 10 !== 0) throw new Error("Bet must be divisible by 10");
        if (bet > this.playerBalance) throw new Error("Insufficient balance");

        this.playerBet = bet;
        this.playerBalance -= bet;
        this.hasDoubledDown = false;
        this.hasSurrendered = false;
        this.splitHands = [];
        this.activeSplitHandIndex = 0;

        if (!this.deck || this.deck.remaining < this.reshuffleThreshold) {
            this.deck = await Deck.initialize(6);
        }

        const initialDraw = await this.deck.draw(4);
        this.playerHand = initialDraw.cards.slice(0, 2);
        this.dealerHand = initialDraw.cards.slice(2, 4);
    }

    private async maybeReshuffle() {
        if (this.deck.remaining < this.reshuffleThreshold) {
            await this.deck.reshuffle(true);
        }
    }

    async hit(hand: Card[] = this.playerHand) {
        await this.maybeReshuffle();
        const drawResult = await this.deck.draw(1);
        if (drawResult.cards.length) {
            hand.push(drawResult.cards[0]);
        }
    }

    async hitDealer() {
        await this.hit(this.dealerHand);
    }

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
        if (this.hasSurrendered) return GameOutcome.PlayerSurrender;

        const playerValue = this.calculateHandValue(this.playerHand);
        const dealerValue = this.calculateHandValue(this.dealerHand);

        if (playerValue === 21 && this.playerHand.length === 2) {
            this.playerBalance += Math.floor(this.playerBet * 2.5);
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

        this.playerBalance += this.playerBet;
        return GameOutcome.Push;
    }

    checkGameOver() {
        this.gameOver = this.playerBalance <= 0;
        return this.gameOver;
    }

    restartGame() {
        this.playerBalance = 1000;
        this.gameOver = false;
    }
}
