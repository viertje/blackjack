import { Deck, type Card } from "../api/deckAPI";
import {
    GameOutcome,
    GamePhase,
    WinState,
    CardValue,
    PlayerAction,
} from "../enums";

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

    // Current game outcome
    gameOutcome: string | null = null;

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
     * Determines the winner between the player and the dealer.
     * Returns WinState.Player if the player wins, WinState.Dealer if the dealer wins, and WinState.Push if it's a tie.
     */
    determineWinner(playerHand: Card[], dealerHand: Card[]): WinState {
        const playerValue = this.calculateHandValue(playerHand);
        const dealerValue = this.calculateHandValue(dealerHand);

        if (playerValue > 21) return WinState.Dealer;
        if (dealerValue > 21) return WinState.Player;
        if (playerValue > dealerValue) return WinState.Player;
        if (dealerValue > playerValue) return WinState.Dealer;
        return WinState.Push;
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

        if (!this.deck || this.deck.remaining < this.reshuffleThreshold) {
            this.deck = await Deck.initialize(6);
        }

        const initialDraw = await this.deck.draw(4);
        this.playerHand = initialDraw.cards.slice(0, 2);
        this.dealerHand = initialDraw.cards.slice(2, 4);

        const playerHasBlackjack = this.isNaturalBlackjack(this.playerHand);
        const dealerHasBlackjack = this.isNaturalBlackjack(this.dealerHand);

        if (playerHasBlackjack || dealerHasBlackjack) {
            this.currentPhase = GamePhase.Outcome;

            if (playerHasBlackjack && dealerHasBlackjack) {
                this.playerBalance += this.playerBet; // Push, return bet
                this.gameOutcome = GameOutcome.Push;
                return GameOutcome.Push;
            }
            if (playerHasBlackjack) {
                this.playerBalance += Math.floor(this.playerBet * 2.5); // 3:2 Payout
                this.gameOutcome = GameOutcome.PlayerBlackjack;
                return GameOutcome.PlayerBlackjack;
            }
            if (dealerHasBlackjack) {
                this.gameOutcome = GameOutcome.DealerBlackjack;
                return GameOutcome.DealerBlackjack;
            }
        }

        this.currentPhase = GamePhase.PlayerTurn;
        this.gameOutcome = null;
        return null;
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
     * Calculates the total value of a hand, treating each Ace as 11 unless that causes
     * the hand to exceed 21—in which case, each Ace is reduced to 1 (11 - 10).
     */
    calculateHandValue(hand: Card[]) {
        let total = 0;
        let aces = 0;
        hand.forEach((card) => {
            if (card.value.toUpperCase() === "ACE") {
                aces++;
                total += CardValue.ACE; // using enum value (11)
            } else if (
                ["KING", "QUEEN", "JACK"].includes(card.value.toUpperCase())
            ) {
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
            hand.some((card) => card.value.toUpperCase() === "ACE")
        );
    }

    /**
     * Determines the outcome and updates the balance accordingly.
     */
    checkGameOutcome() {
        let outcome;

        switch (true) {
            case this.hasSurrendered:
                outcome = GameOutcome.PlayerSurrender;
                break;

            case this.isBust(this.playerHand):
                outcome = GameOutcome.PlayerBust;
                break;

            case this.isBust(this.dealerHand):
                this.playerBalance += this.playerBet * 2;
                outcome = GameOutcome.DealerBust;
                break;

            default:
                switch (
                    this.determineWinner(this.playerHand, this.dealerHand)
                ) {
                    case WinState.Player:
                        this.playerBalance += this.playerBet * 2;
                        outcome = GameOutcome.PlayerWins;
                        break;
                    case WinState.Dealer:
                        outcome = GameOutcome.DealerWins;
                        break;
                    case WinState.Push:
                        this.playerBalance += this.playerBet;
                        outcome = GameOutcome.Push;
                        break;
                }
        }

        this.gameOutcome = outcome;
        return outcome;
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

    /**
     * Get the current player hand
     */
    getPlayerHand(): Card[] {
        return this.playerHand;
    }

    /**
     * Get the current dealer hand
     */
    getDealerHand(): Card[] {
        return this.dealerHand;
    }

    /**
     * Get the current player balance
     */
    getPlayerBalance(): number {
        return this.playerBalance;
    }

    /**
     * Get the current player bet
     */
    getPlayerBet(): number {
        return this.playerBet;
    }

    /**
     * Get the current game phase
     */
    getCurrentPhase(): GamePhase {
        return this.currentPhase;
    }

    /**
     * Get the current game outcome
     */
    getGameOutcome(): string | null {
        return this.gameOutcome;
    }

    /**
     * Handle player actions (hit, stand, double down, etc.)
     */
    async handleAction(action: PlayerAction) {
        switch (action) {
            case PlayerAction.Hit:
                await this.hit();
                if (this.isBust(this.playerHand)) {
                    this.currentPhase = GamePhase.Outcome;
                    this.gameOutcome = this.checkGameOutcome();
                    this.checkGameOver();
                }
                break;

            case PlayerAction.Stand:
                this.currentPhase = GamePhase.DealerTurn;
                await this.dealerPlay();
                this.currentPhase = GamePhase.Outcome;
                this.gameOutcome = this.checkGameOutcome();
                this.checkGameOver();
                break;

            case PlayerAction.DoubleDown:
                await this.doubleDown();
                this.currentPhase = GamePhase.DealerTurn;
                await this.dealerPlay();
                this.currentPhase = GamePhase.Outcome;
                this.gameOutcome = this.checkGameOutcome();
                this.checkGameOver();
                break;

            case PlayerAction.Surrender:
                await this.surrender();
                this.gameOutcome = this.checkGameOutcome();
                this.currentPhase = GamePhase.Outcome;
                break;

            case PlayerAction.Split:
                await this.split();
                break;
        }
    }

    /**
     * Start a new round, resetting the game state
     */
    newRound() {
        this.currentPhase = GamePhase.Betting;
        this.gameOutcome = null;
        this.playerHand = [];
        this.dealerHand = [];
    }

    /**
     * Check if the player can perform a specific action
     */
    canPerformAction(action: PlayerAction): boolean {
        switch (action) {
            case PlayerAction.DoubleDown:
                return (
                    this.playerHand.length === 2 &&
                    this.playerBalance >= this.playerBet
                );
            case PlayerAction.Surrender:
                return this.playerHand.length === 2;
            case PlayerAction.Split:
                return (
                    this.playerHand.length === 2 &&
                    this.playerHand[0].value === this.playerHand[1].value
                );
            default:
                return true;
        }
    }
}
