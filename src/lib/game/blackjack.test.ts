import { strict as assert } from "node:assert";
import { BlackjackGame } from "./blackjack";
import type { Card, Deck } from "../api/deckAPI";
import { GameOutcome, GamePhase, PlayerAction, WinState } from "../enums";

// Helper to create a card manually
function createCard(value: string, suit: string): Card {
    return {
        code: value[0] + suit[0],
        image: "",
        images: { svg: "", png: "" },
        value,
        suit,
    };
}

// FakeDeck that simulates the Deck class for testing
class FakeDeck implements Deck {
    cards: Card[];
    remaining: number;

    constructor(cards: Card[]) {
        this.cards = [...cards];
        this.remaining = 999;
    }
    public deckId: string = "fake";

    public async drawCards(count: number = 1): Promise<Card[]> {
        const drawn = this.cards.splice(0, count);
        this.remaining = this.cards.length;
        return drawn;
    }

    async draw(count: number) {
        const drawn = this.cards.splice(0, count);
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

async function testNaturalBlackjack() {
    console.log("Running testNaturalBlackjack...");
    const cards = [
        createCard("ACE", "Spades"),
        createCard("KING", "Hearts"),
        createCard("5", "Clubs"),
        createCard("6", "Diamonds"),
    ];
    const game = new BlackjackGame();
    game.deck = new FakeDeck(cards);
    const outcome = await game.startGame(100);

    assert.equal(outcome, GameOutcome.PlayerBlackjack);
    assert.equal(game.getCurrentPhase(), GamePhase.Outcome);
    assert.equal(game.getPlayerBalance(), 1150);
    console.log("testNaturalBlackjack passed.");
}

async function testPlayerBust() {
    console.log("Running testPlayerBust...");
    const cards = [
        createCard("10", "Hearts"), // Player card 1
        createCard("7", "Clubs"), // Player card 2
        createCard("5", "Diamonds"), // Dealer card 1
        createCard("8", "Spades"), // Dealer card 2
        createCard("10", "Clubs"), // Hit card for player (busts: 10+7+10 = 27)
        createCard("4", "Clubs"), // Extra card for dealer to finish hitting (5+8+4 = 17)
    ];
    const game = new BlackjackGame();
    game.deck = new FakeDeck(cards);
    await game.startGame(100);
    await game.handleAction(PlayerAction.Hit);

    assert(game.isBust(game.getActiveHand()));
    assert.equal(game.getActiveHandOutcome(), GameOutcome.PlayerBust);
    console.log("testPlayerBust passed.");
}

async function testDealerBust() {
    console.log("Running testDealerBust...");
    const cards = [
        createCard("10", "Clubs"),
        createCard("7", "Diamonds"),
        createCard("9", "Spades"),
        createCard("7", "Clubs"),
        createCard("10", "Hearts"),
    ];
    const game = new BlackjackGame();
    game.deck = new FakeDeck(cards);
    await game.startGame(100);
    await game.handleAction(PlayerAction.Stand);

    assert.equal(game.getActiveHandOutcome(), GameOutcome.DealerBust);
    assert.equal(game.getPlayerBalance(), 1100);
    console.log("testDealerBust passed.");
}

async function testSplitHand() {
    console.log("Running testSplitHand...");
    const cards = [
        createCard("8", "Hearts"),
        createCard("8", "Spades"),
        createCard("5", "Clubs"),
        createCard("6", "Diamonds"),
        createCard("3", "Clubs"),
        createCard("4", "Hearts"),
    ];
    const game = new BlackjackGame();
    game.deck = new FakeDeck(cards);
    await game.startGame(100);

    assert(game.canSplit());
    await game.handleAction(PlayerAction.Split);

    const [hand1, hand2] = game.getPlayerHands();
    assert.equal(hand1.length, 2);
    assert.equal(hand2.length, 2);
    assert.equal(hand1[0].value, "8");
    assert.equal(hand2[0].value, "8");
    assert.equal(hand1[1].value, "3");
    assert.equal(hand2[1].value, "4");
    assert.equal(game.getPlayerBalance(), 800);
    console.log("testSplitHand passed.");
}

async function testDetermineWinner() {
    console.log("Running testDetermineWinner...");
    const game = new BlackjackGame();

    let win = game.determineWinner(
        [createCard("10", "Hearts"), createCard("7", "Clubs")],
        [createCard("10", "Diamonds"), createCard("6", "Spades")]
    );
    assert.equal(win, WinState.Player);

    win = game.determineWinner(
        [createCard("10", "Hearts"), createCard("6", "Clubs")],
        [createCard("10", "Diamonds"), createCard("7", "Spades")]
    );
    assert.equal(win, WinState.Dealer);

    win = game.determineWinner(
        [createCard("10", "Hearts"), createCard("7", "Clubs")],
        [createCard("10", "Diamonds"), createCard("7", "Spades")]
    );
    assert.equal(win, WinState.Push);
    console.log("testDetermineWinner passed.");
}

async function runTests() {
    try {
        await testNaturalBlackjack();
        await testPlayerBust();
        await testDealerBust();
        await testSplitHand();
        await testDetermineWinner();
        console.log("✅ All tests passed.");
    } catch (err) {
        console.error("❌ Test failed:", err);
        process.exit(1);
    }
}

runTests();
