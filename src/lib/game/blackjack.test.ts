import test from "node:test";
import { strict as assert } from "assert";
import { BlackjackGame } from "./blackjack";
import type { Card, Deck } from "../api/deckAPI";
import {
    GameOutcome,
    GamePhase,
    PlayerAction,
    WinState,
    CardValue,
} from "../enums";

/**
 * Helper to create a Card object.
 */
function createCard(value: string, suit: string): Card {
    return {
        code: value[0] + suit[0],
        image: "",
        images: { svg: "", png: "" },
        value,
        suit,
    };
}

/**
 * A FakeDeck that implements the minimal Deck interface.
 * It returns predetermined cards for drawing and reshuffling.
 */
class FakeDeck implements Deck {
    cards: Card[];
    remaining: number;
    public deckId: string = "fake";

    constructor(cards: Card[]) {
        // Clone the cards so our tests don't modify the original array.
        this.cards = [...cards];
        this.remaining = this.cards.length;
    }

    async drawCards(count: number = 1): Promise<Card[]> {
        const drawn = this.cards.splice(0, count);
        this.remaining = this.cards.length;
        return drawn;
    }

    async draw(count: number) {
        const drawn = this.cards.splice(0, count);
        this.remaining = this.cards.length;
        return {
            success: true,
            deck_id: "fake",
            cards: drawn,
            remaining: this.remaining,
        };
    }

    async reshuffle(_remainingOnly: boolean = true) {
        return {
            success: true,
            deck_id: "fake",
            shuffled: true,
            remaining: this.remaining,
        };
    }
}

/* ------------------------------
   Utility Function Tests
------------------------------ */

test("testIsNaturalBlackjackFunction", () => {
    const game = new BlackjackGame();
    const handBlackjack = [
        createCard("ACE", "Hearts"),
        createCard("KING", "Diamonds"),
    ];
    const handNotBlackjack = [
        createCard("ACE", "Hearts"),
        createCard("9", "Clubs"),
        createCard("2", "Spades"),
    ];
    assert.equal(
        game.isNaturalBlackjack(handBlackjack),
        true,
        "Hand should be a natural blackjack"
    );
    assert.equal(
        game.isNaturalBlackjack(handNotBlackjack),
        false,
        "Hand should not be a natural blackjack"
    );
});

test("testIsBustFunction", () => {
    const game = new BlackjackGame();
    const handBust = [
        createCard("10", "Hearts"),
        createCard("7", "Clubs"),
        createCard("5", "Diamonds"),
    ];
    const handNotBust = [createCard("10", "Hearts"), createCard("7", "Clubs")];
    assert.equal(game.isBust(handBust), true, "Hand should be bust");
    assert.equal(game.isBust(handNotBust), false, "Hand should not be bust");
});

test("testCalculateHandValue", () => {
    const game = new BlackjackGame();
    let value = game.calculateHandValue([
        createCard("ACE", "Hearts"),
        createCard("KING", "Diamonds"),
    ]);
    assert.equal(value, 21, "Ace + King should equal 21");
    value = game.calculateHandValue([
        createCard("ACE", "Hearts"),
        createCard("5", "Clubs"),
    ]);
    assert.equal(value, 16, "Ace + 5 should equal 16");
    value = game.calculateHandValue([
        createCard("ACE", "Hearts"),
        createCard("ACE", "Diamonds"),
        createCard("9", "Clubs"),
    ]);
    assert.equal(value, 21, "Ace + Ace + 9 should equal 21");
    value = game.calculateHandValue([
        createCard("ACE", "Hearts"),
        createCard("ACE", "Diamonds"),
        createCard("9", "Clubs"),
        createCard("3", "Spades"),
    ]);
    assert.equal(value, 14, "Ace + Ace + 9 + 3 should equal 14");
});

test("testHasSoft17", () => {
    const game = new BlackjackGame();
    const soft17Hand = [createCard("ACE", "Hearts"), createCard("6", "Clubs")];
    const notSoft17Hand = [
        createCard("10", "Hearts"),
        createCard("7", "Clubs"),
    ];
    assert.equal(
        game.hasSoft17(soft17Hand),
        true,
        "Hand with Ace and 6 should be soft 17"
    );
    assert.equal(
        game.hasSoft17(notSoft17Hand),
        false,
        "Hand without Ace should not be soft 17"
    );
});

/* ------------------------------
   Game Actions & Outcome Tests
------------------------------ */

test("testDetermineWinner", async () => {
    const game = new BlackjackGame();

    let win = game.determineWinner(
        [createCard("10", "Hearts"), createCard("7", "Clubs")],
        [createCard("10", "Diamonds"), createCard("6", "Spades")]
    );
    assert.equal(win, WinState.Player, "Player should win (17 vs 16)");

    win = game.determineWinner(
        [createCard("10", "Hearts"), createCard("6", "Clubs")],
        [createCard("10", "Diamonds"), createCard("7", "Spades")]
    );
    assert.equal(win, WinState.Dealer, "Dealer should win (16 vs 17)");

    win = game.determineWinner(
        [createCard("10", "Hearts"), createCard("7", "Clubs")],
        [createCard("10", "Diamonds"), createCard("7", "Spades")]
    );
    assert.equal(win, WinState.Push, "Should be a push (equal totals)");
});

test("testStartGame", async () => {
    const cards = [
        createCard("10", "Hearts"), // Player card1
        createCard("7", "Clubs"), // Player card2
        createCard("5", "Diamonds"), // Dealer card1
        createCard("8", "Spades"), // Dealer card2
    ];
    const game = new BlackjackGame();
    game.deck = new FakeDeck(cards);
    const outcome = await game.startGame(100);
    // Check that initial hands are dealt.
    assert.equal(
        game.getPlayerHands()[0].length,
        2,
        "Player should have 2 cards after startGame"
    );
    assert.equal(
        game.getDealerHand().length,
        2,
        "Dealer should have 2 cards after startGame"
    );
    if (
        !game.isNaturalBlackjack(game.getActiveHand()) &&
        !game.isNaturalBlackjack(game.getDealerHand())
    ) {
        assert.equal(
            outcome,
            null,
            "Outcome should be null if no natural blackjack"
        );
        assert.equal(
            game.getCurrentPhase(),
            GamePhase.PlayerTurn,
            "Phase should be PlayerTurn if no natural blackjack"
        );
    }
});

test("testHit", async () => {
    const cards = [
        createCard("10", "Hearts"),
        createCard("7", "Clubs"),
        createCard("5", "Diamonds"),
        createCard("8", "Spades"),
        createCard("2", "Clubs"), // extra card for hit
    ];
    const game = new BlackjackGame();
    game.deck = new FakeDeck(cards);
    await game.startGame(100);
    const initialLength = game.getActiveHand().length;
    await game.hit();
    assert.equal(
        game.getActiveHand().length,
        initialLength + 1,
        "Hit should add one card to active hand"
    );
});

test("testHitDealer", async () => {
    const cards = [
        createCard("10", "Hearts"),
        createCard("7", "Clubs"),
        createCard("5", "Diamonds"),
        createCard("8", "Spades"),
        createCard("3", "Clubs"), // extra card for dealer hit
    ];
    const game = new BlackjackGame();
    game.deck = new FakeDeck(cards);
    await game.startGame(100);
    const initialDealerLength = game.getDealerHand().length;
    await game.hitDealer();
    assert.equal(
        game.getDealerHand().length,
        initialDealerLength + 1,
        "Dealer hit should add one card"
    );
});

test("testDealerPlay", async () => {
    // Dealer should hit until total >= 17.
    const cards = [
        createCard("10", "Hearts"), // Player card1
        createCard("7", "Clubs"), // Player card2 (total 17)
        createCard("5", "Diamonds"), // Dealer card1 (5)
        createCard("8", "Spades"), // Dealer card2 (8; total = 13)
        createCard("4", "Clubs"), // Dealer hit card to reach 17
    ];
    const game = new BlackjackGame();
    game.deck = new FakeDeck(cards);
    await game.startGame(100);
    await game.dealerPlay();
    assert(
        game.calculateHandValue(game.getDealerHand()) >= 17,
        "Dealer should have a total of at least 17"
    );
    assert.equal(
        game.getCurrentPhase(),
        GamePhase.Outcome,
        "Phase should be Outcome after dealerPlay"
    );
});

test("testCheckHandOutcome_PlayerBust", () => {
    const game = new BlackjackGame();
    game.playerHands = [
        [
            createCard("10", "Hearts"),
            createCard("7", "Clubs"),
            createCard("5", "Diamonds"),
        ],
    ];
    game.dealerHand = [createCard("9", "Spades"), createCard("7", "Clubs")];
    game.playerBets = [100];
    const outcome = game.checkHandOutcome(0);
    assert.equal(
        outcome,
        GameOutcome.PlayerBust,
        "Outcome should be PlayerBust when player busts"
    );
});

test("testCheckHandOutcome_DealerBust", () => {
    const game = new BlackjackGame();
    // Simulate starting conditions: a bet of 100 is placed so the balance decreases from 1000 to 900.
    game.playerBalance = 900;
    game.playerBets = [100];
    game.playerHands = [[createCard("10", "Hearts"), createCard("7", "Clubs")]]; // Player total = 17
    game.dealerHand = [
        createCard("10", "Diamonds"),
        createCard("7", "Spades"),
        createCard("5", "Clubs"),
    ]; // Dealer total = 22 (bust)
    const outcome = game.checkHandOutcome(0);
    assert.equal(
        outcome,
        GameOutcome.DealerBust,
        "Outcome should be DealerBust when dealer busts"
    );
    assert.equal(
        game.getPlayerBalance(),
        1100,
        "Player balance should update to 1100 (900 + 200 payout) on dealer bust"
    );
});

test("testCheckHandOutcome_PlayerWins", () => {
    const game = new BlackjackGame();
    game.playerBalance = 900; // simulate bet already deducted
    game.playerBets = [100];
    game.playerHands = [[createCard("10", "Hearts"), createCard("8", "Clubs")]]; // 18
    game.dealerHand = [createCard("10", "Diamonds"), createCard("7", "Spades")]; // 17
    const outcome = game.checkHandOutcome(0);
    assert.equal(
        outcome,
        GameOutcome.PlayerWins,
        "Outcome should be PlayerWins when player wins"
    );
    assert.equal(
        game.getPlayerBalance(),
        1100,
        "Player balance should update to 1100 (900 + 200) on player win"
    );
});

test("testCheckHandOutcome_DealerWins", () => {
    const game = new BlackjackGame();
    game.playerBalance = 900; // simulate bet already deducted
    game.playerBets = [100];
    game.playerHands = [[createCard("10", "Hearts"), createCard("7", "Clubs")]]; // 17
    game.dealerHand = [createCard("10", "Diamonds"), createCard("8", "Spades")]; // 18
    const outcome = game.checkHandOutcome(0);
    assert.equal(
        outcome,
        GameOutcome.DealerWins,
        "Outcome should be DealerWins when dealer wins"
    );
    assert.equal(
        game.getPlayerBalance(),
        900,
        "Player balance should stay at 900 (bet lost) on dealer win"
    );
});

test("testCheckHandOutcome_Push", () => {
    const game = new BlackjackGame();
    game.playerBalance = 900; // simulate bet already deducted
    game.playerBets = [100];
    game.playerHands = [[createCard("10", "Hearts"), createCard("7", "Clubs")]]; // 17
    game.dealerHand = [createCard("10", "Diamonds"), createCard("7", "Spades")]; // 17
    const outcome = game.checkHandOutcome(0);
    assert.equal(outcome, GameOutcome.Push, "Outcome should be Push on tie");
    assert.equal(
        game.getPlayerBalance(),
        1000,
        "Player balance should update to 1000 (900 + 100) on push"
    );
});

test("testCheckAllHandsOutcome", () => {
    const game = new BlackjackGame();
    game.playerHands = [
        [createCard("10", "Hearts"), createCard("7", "Clubs")],
        [createCard("10", "Diamonds"), createCard("7", "Spades")],
    ];
    game.dealerHand = [
        createCard("10", "Clubs"),
        createCard("7", "Diamonds"),
        createCard("5", "Hearts"),
    ]; // Dealer busts
    game.playerBets = [100, 100];
    const outcomes = game.checkAllHandsOutcome();
    outcomes.forEach((outcome) => {
        assert.equal(
            outcome,
            GameOutcome.DealerBust,
            "Each hand should be DealerBust if dealer busts"
        );
    });
});

test("testCheckGameOver", () => {
    const game = new BlackjackGame();
    game.playerBalance = 0;
    assert.equal(
        game.checkGameOver(),
        true,
        "Game should be over when balance is 0"
    );
});

test("testRestartGame", () => {
    const game = new BlackjackGame();
    game.playerBalance = 500;
    game.gameOver = true;
    game.playerHands = [[createCard("10", "Hearts")]];
    game.dealerHand = [createCard("5", "Diamonds")];
    game.currentPhase = GamePhase.Outcome;
    game.restartGame();
    assert.equal(game.getPlayerBalance(), 1000, "Balance should reset to 1000");
    assert.equal(game.gameOver, false, "gameOver should be false");
    assert.equal(
        game.getCurrentPhase(),
        GamePhase.Betting,
        "Phase should be Betting after restart"
    );
    assert.equal(
        game.getPlayerHands().length,
        1,
        "There should be one player hand after restart"
    );
    assert.equal(
        game.getPlayerBets()[0],
        0,
        "Bet should reset to 0 after restart"
    );
});

test("testGetters", async () => {
    const cards = [
        createCard("10", "Hearts"),
        createCard("7", "Clubs"),
        createCard("5", "Diamonds"),
        createCard("8", "Spades"),
        createCard("10", "Clubs"), // extra card
    ];
    const game = new BlackjackGame();
    game.deck = new FakeDeck(cards);
    await game.startGame(100);
    assert.equal(
        game.getActiveHand().length,
        2,
        "Active hand should have 2 cards after startGame"
    );
    assert.equal(
        game.getPlayerHands().length,
        1,
        "There should be 1 player hand"
    );
    assert.equal(game.getActiveHandIndex(), 0, "Active hand index should be 0");
    assert.equal(
        game.getDealerHand().length,
        2,
        "Dealer hand should have 2 cards"
    );
    assert.equal(
        game.getPlayerBalance(),
        900,
        "Player balance should be 900 after bet"
    );
    assert.equal(game.getActiveHandBet(), 100, "Active hand bet should be 100");
    assert.deepEqual(
        game.getPlayerBets(),
        [100],
        "Player bets should be [100]"
    );
    assert.equal(
        game.getCurrentPhase(),
        GamePhase.PlayerTurn,
        "Phase should be PlayerTurn"
    );
    assert.equal(
        game.getActiveHandOutcome(),
        null,
        "Active hand outcome should be null"
    );
    assert.deepEqual(
        game.getAllOutcomes(),
        [null],
        "All outcomes should be [null]"
    );
});

test("testCanSplit", () => {
    const game = new BlackjackGame();
    game.playerHands = [[createCard("8", "Hearts"), createCard("8", "Clubs")]];
    game.playerBets = [100];
    game.playerBalance = 900; // enough to match bet
    assert.equal(game.canSplit(), true, "Hand should be splittable");
    game.playerHands = [[createCard("8", "Hearts"), createCard("9", "Clubs")]];
    assert.equal(
        game.canSplit(),
        false,
        "Hand should not be splittable with different values"
    );
});

test("testMoveToNextHand", () => {
    const game = new BlackjackGame();
    game.playerHands = [
        [createCard("10", "Hearts"), createCard("7", "Clubs")],
        [createCard("10", "Diamonds"), createCard("7", "Spades")],
    ];
    game.activeHandIndex = 0;
    assert.equal(game.moveToNextHand(), true, "Should move to next hand");
    assert.equal(game.getActiveHandIndex(), 1, "Active hand index should be 1");
    assert.equal(
        game.moveToNextHand(),
        false,
        "Should not move past the last hand"
    );
});

test("testHandleAction", async () => {
    // Test Hit action
    {
        const cards = [
            createCard("10", "Hearts"),
            createCard("7", "Clubs"),
            createCard("5", "Diamonds"),
            createCard("8", "Spades"),
            createCard("2", "Clubs"), // card for hit
        ];
        const game = new BlackjackGame();
        game.deck = new FakeDeck(cards);
        await game.startGame(100);
        const initialLength = game.getActiveHand().length;
        await game.handleAction(PlayerAction.Hit);
        assert.equal(
            game.getActiveHand().length,
            initialLength + 1,
            "Hit should add one card to active hand"
        );
    }
    // Test Stand action (should trigger dealerPlay)
    {
        const cards = [
            createCard("10", "Hearts"),
            createCard("7", "Clubs"), // Player 17
            createCard("5", "Diamonds"),
            createCard("8", "Spades"), // Dealer 13
            createCard("4", "Clubs"), // Dealer hit to reach 17
        ];
        const game = new BlackjackGame();
        game.deck = new FakeDeck(cards);
        await game.startGame(100);
        await game.handleAction(PlayerAction.Stand);
        assert.equal(
            game.getCurrentPhase(),
            GamePhase.Outcome,
            "After Stand, phase should be Outcome"
        );
    }
});

test("testNewRound", async () => {
    const game = new BlackjackGame();
    // Simulate an ongoing game state.
    game.playerHands = [
        [createCard("10", "Hearts")],
        [createCard("7", "Clubs")],
    ];
    game.playerBets = [100, 100];
    game.dealerHand = [createCard("5", "Diamonds")];
    game.currentPhase = GamePhase.Outcome;
    game.newRound();
    assert.equal(
        game.getCurrentPhase(),
        GamePhase.Betting,
        "After newRound, phase should be Betting"
    );
    assert.equal(
        game.getPlayerHands().length,
        1,
        "After newRound, there should be 1 player hand"
    );
    assert.equal(
        game.getPlayerBets()[0],
        0,
        "After newRound, bet should be reset to 0"
    );
    assert.equal(
        game.getDealerHand().length,
        0,
        "After newRound, dealer hand should be empty"
    );
});
