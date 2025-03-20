/**
 * Enum mapping face card values to their numerical values for Blackjack.
 */
export enum CardValue {
    ACE = 11,
    JACK = 10,
    QUEEN = 10,
    KING = 10,
}

/**
 * Enum representing the possible outcomes of a Blackjack round.
 */
export enum GameOutcome {
    PlayerBust = "Player Bust",
    DealerBust = "Dealer Bust",
    PlayerWins = "Player Wins",
    DealerWins = "Dealer Wins",
    Push = "Push",
    PlayerBlackjack = "Player Blackjack",
    DealerBlackjack = "Dealer Blackjack",
    PlayerSurrender = "Player Surrender",
}

/**
 * Enum representing the different phases of a Blackjack round.
 */
export enum GamePhase {
    Betting = "betting",
    InitialDeal = "initial deal",
    PlayerTurn = "player turn",
    DealerTurn = "dealer turn",
    Outcome = "outcome",
}

/**
 * Enum representing the possible actions a player can take.
 */
export enum PlayerAction {
    Hit = "hit",
    Stand = "stand",
    DoubleDown = "double down",
    Split = "split",
    Surrender = "surrender",
}

/**
 * Enum representing the win state of a Blackjack round.
 */
export enum WinState {
    Player = "player",
    Dealer = "dealer",
    Push = "push",
}
