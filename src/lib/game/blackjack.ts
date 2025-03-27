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
    playerHands: Card[][] = [[]];  // Array of player hands (for splitting)
    activeHandIndex: number = 0;   // Index of the currently active hand
    dealerHand: Card[] = [];
    playerBets: number[] = [0];    // Bet amount for each hand
    playerBalance = 1000;
    gameOver = false;
    reshuffleThreshold = 312 * 0.4; // About 125 cards remaining
    splitHandsIndices: number[] = []; // Track which hands are results of splits

    // Track the current phase using our enum
    currentPhase: GamePhase = GamePhase.Betting;

    // Current game outcome for each hand
    gameOutcomes: (string | null)[] = [null];

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

        // Reset to a single hand at the start of each game
        this.playerHands = [[]];
        this.playerBets = [bet];
        this.activeHandIndex = 0;
        this.gameOutcomes = [null];
        this.splitHandsIndices = []; // Reset split hands tracking
        
        this.playerBalance -= bet;
        this.currentPhase = GamePhase.InitialDeal;

        if (!this.deck || this.deck.remaining < this.reshuffleThreshold) {
            this.deck = await Deck.initialize(6);
        }

        const initialDraw = await this.deck.draw(4);
        this.playerHands[0] = initialDraw.cards.slice(0, 2);
        this.dealerHand = initialDraw.cards.slice(2, 4);

        const playerHasBlackjack = this.isNaturalBlackjack(this.getActiveHand());
        const dealerHasBlackjack = this.isNaturalBlackjack(this.dealerHand);

        if (playerHasBlackjack || dealerHasBlackjack) {
            this.currentPhase = GamePhase.Outcome;

            if (playerHasBlackjack && dealerHasBlackjack) {
                this.playerBalance += this.playerBets[0]; // Push, return bet
                this.gameOutcomes[0] = GameOutcome.Push;
                return GameOutcome.Push;
            }
            if (playerHasBlackjack) {
                this.playerBalance += Math.floor(this.playerBets[0] * 2.5); // 3:2 Payout
                this.gameOutcomes[0] = GameOutcome.PlayerBlackjack;
                return GameOutcome.PlayerBlackjack;
            }
            if (dealerHasBlackjack) {
                this.gameOutcomes[0] = GameOutcome.DealerBlackjack;
                return GameOutcome.DealerBlackjack;
            }
        }

        this.currentPhase = GamePhase.PlayerTurn;
        this.gameOutcomes[0] = null;
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
    async hit(hand: Card[] = this.getActiveHand()) {
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
     * Dealer plays: reveals the hole card and draws until total >= 17.
     * Dealer stands on all 17s, including soft 17.
     */
    async dealerPlay() {
        this.currentPhase = GamePhase.DealerTurn;
        while (this.calculateHandValue(this.dealerHand) < 17) {
            await this.hitDealer();
        }
        this.currentPhase = GamePhase.Outcome;
        this.checkAllHandsOutcome();
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
     * Determines the outcome and updates the balance accordingly for a specific hand.
     */
    checkHandOutcome(handIndex: number): string {
        const hand = this.playerHands[handIndex];
        const bet = this.playerBets[handIndex];
        let outcome;

        switch (true) {
            case this.isBust(hand):
                outcome = GameOutcome.PlayerBust;
                break;

            case this.isBust(this.dealerHand):
                this.playerBalance += bet * 2;
                outcome = GameOutcome.DealerBust;
                break;

            default:
                switch (this.determineWinner(hand, this.dealerHand)) {
                    case WinState.Player:
                        this.playerBalance += bet * 2;
                        outcome = GameOutcome.PlayerWins;
                        break;
                    case WinState.Dealer:
                        outcome = GameOutcome.DealerWins;
                        break;
                    case WinState.Push:
                        this.playerBalance += bet;
                        outcome = GameOutcome.Push;
                        break;
                }
        }

        this.gameOutcomes[handIndex] = outcome;
        return outcome;
    }

    /**
     * Check outcomes for all hands
     */
    checkAllHandsOutcome() {
        for (let i = 0; i < this.playerHands.length; i++) {
            this.checkHandOutcome(i);
        }
        return this.gameOutcomes;
    }

    checkGameOver() {
        this.gameOver = this.playerBalance <= 0;
        return this.gameOver;
    }

    restartGame() {
        this.playerBalance = 1000;
        this.gameOver = false;
        this.currentPhase = GamePhase.Betting;
        this.playerHands = [[]];
        this.playerBets = [0];
        this.activeHandIndex = 0;
        this.gameOutcomes = [null];
        this.splitHandsIndices = []; // Reset split hands tracking
    }

    /**
     * Get the current active player hand
     */
    getActiveHand(): Card[] {
        return this.playerHands[this.activeHandIndex];
    }

    /**
     * Get all player hands
     */
    getPlayerHands(): Card[][] {
        return this.playerHands;
    }

    /**
     * Get active hand index
     */
    getActiveHandIndex(): number {
        return this.activeHandIndex;
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
     * Get the bet for the active hand
     */
    getActiveHandBet(): number {
        return this.playerBets[this.activeHandIndex];
    }

    /**
     * Get all player bets
     */
    getPlayerBets(): number[] {
        return this.playerBets;
    }

    /**
     * Get the current game phase
     */
    getCurrentPhase(): GamePhase {
        return this.currentPhase;
    }

    /**
     * Get the game outcome for the active hand
     */
    getActiveHandOutcome(): string | null {
        return this.gameOutcomes[this.activeHandIndex];
    }

    /**
     * Get all game outcomes
     */
    getAllOutcomes(): (string | null)[] {
        return this.gameOutcomes;
    }

    /**
     * Check if the active hand can be split
     */
    canSplit(): boolean {
        const hand = this.getActiveHand();
        
        // Can only split with exactly 2 cards of the same value
        if (hand.length !== 2) return false;
        
        // Cannot re-split (if this hand is already a result of a split)
        if (this.splitHandsIndices.includes(this.activeHandIndex)) return false;
        
        // Compare card values (face cards are all value 10)
        const value1 = this.getCardValue(hand[0]);
        const value2 = this.getCardValue(hand[1]);
        
        // Must have enough balance to match the bet
        return value1 === value2 && this.playerBalance >= this.getActiveHandBet();
    }
    
    /**
     * Get numerical value of a card for comparison
     */
    private getCardValue(card: Card): number {
        if (["KING", "QUEEN", "JACK"].includes(card.value.toUpperCase())) {
            return 10;
        } else if (card.value.toUpperCase() === "ACE") {
            return 11; // For splitting purposes, Aces are 11
        } else {
            return parseInt(card.value);
        }
    }
    
    /**
     * Split the active hand into two separate hands
     */
    async splitHand() {
        if (!this.canSplit()) {
            throw new Error("This hand cannot be split");
        }
        
        const activeHand = this.getActiveHand();
        const bet = this.getActiveHandBet();
        
        // Deduct the bet for the second hand
        this.playerBalance -= bet;
        
        // Create two new hands, each with one card from the original hand
        const hand1 = [activeHand[0]];
        const hand2 = [activeHand[1]];
        
        // Deal one additional card to each new hand
        await this.maybeReshuffle();
        const drawResult = await this.deck.draw(2);
        
        if (drawResult.cards.length === 2) {
            hand1.push(drawResult.cards[0]);
            hand2.push(drawResult.cards[1]);
        }
        
        // Replace the active hand with the first new hand
        this.playerHands[this.activeHandIndex] = hand1;
        
        // Mark both hands as results of a split to prevent re-splitting
        this.splitHandsIndices.push(this.activeHandIndex);
        this.splitHandsIndices.push(this.playerHands.length); // Index of the second hand (after push)
        
        // Add the second new hand and its bet
        this.playerHands.push(hand2);
        this.playerBets.push(bet);
        
        // Add a placeholder for the second hand's outcome
        this.gameOutcomes.push(null);
        
        // Stay on the first hand for now
        return this.playerHands;
    }
    
    /**
     * Move to the next hand if available
     */
    moveToNextHand(): boolean {
        if (this.activeHandIndex < this.playerHands.length - 1) {
            this.activeHandIndex++;
            return true;
        }
        return false;
    }

    /**
     * Handle player actions (hit, stand, split, etc.)
     */
    async handleAction(action: PlayerAction) {
        const activeHand = this.getActiveHand();
        
        switch (action) {
            case PlayerAction.Hit:
                await this.hit(activeHand);
                
                // If current hand busts, check if we need to move to next hand or end player turn
                if (this.isBust(activeHand)) {
                    // Mark this hand as bust in outcomes
                    this.gameOutcomes[this.activeHandIndex] = GameOutcome.PlayerBust;
                    
                    // If there are more hands to play, move to next hand
                    if (this.moveToNextHand()) {
                        // Continue player turn with next hand
                    } else {
                        // No more hands, dealer's turn
                        this.currentPhase = GamePhase.DealerTurn;
                        await this.dealerPlay();
                        this.checkGameOver();
                    }
                }
                break;

            case PlayerAction.Stand:
                // If there are more hands to play, move to next hand
                if (this.moveToNextHand()) {
                    // Continue player turn with next hand
                } else {
                    // No more hands, dealer's turn
                    this.currentPhase = GamePhase.DealerTurn;
                    await this.dealerPlay();
                    this.checkGameOver();
                }
                break;
                
            case PlayerAction.Split:
                if (!this.canSplit()) {
                    throw new Error("Cannot split this hand");
                }
                await this.splitHand();
                break;
        }
    }

    /**
     * Start a new round, resetting the game state
     */
    newRound() {
        this.currentPhase = GamePhase.Betting;
        this.playerHands = [[]];
        this.playerBets = [0];
        this.activeHandIndex = 0;
        this.gameOutcomes = [null];
        this.splitHandsIndices = []; // Reset split hands tracking
        this.dealerHand = [];
    }
}
