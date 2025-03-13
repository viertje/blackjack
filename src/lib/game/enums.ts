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
    PlayerBust = "player bust",
    DealerBust = "dealer bust",
    PlayerWins = "player wins",
    DealerWins = "dealer wins",
    Push = "push",
    Blackjack = "blackjack",
    PlayerSurrender = "player surrender",
}
