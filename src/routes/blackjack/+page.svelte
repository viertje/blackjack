<!-- src/routes/blackjack/+page.svelte -->
<script lang="ts">
    import { BlackjackGame } from "$lib/game/blackjack";
    import type { Card } from "$lib/api/deckAPI";

    let game = new BlackjackGame();

    let gameStarted = $state(false);
    let playerTurnEnded = $state(false);
    let dealerTurnStarted = $state(false);
    let dealerTurnEnded = $state(false);

    let playerHand = $state<Card[]>([]);
    let dealerHand = $state<Card[]>([]);

    let gameOutcome = $state<string | null>(null);

    let playerHandValue = $derived(game.calculateHandValue(playerHand));
    let dealerHandValue = $derived(game.calculateHandValue(dealerHand));

    /**
     * Starts a new game by initializing the deck and dealing initial hands.
     */
    async function startGame() {
        await game.startGame();
        playerHand = game.playerHand;
        dealerHand = game.dealerHand;
        gameOutcome = null;
        gameStarted = true;
        playerTurnEnded = false;
        dealerTurnStarted = false;
        dealerTurnEnded = false;
    }

    /**
     * Player takes an additional card.
     */
    async function hit() {
        await game.hit();
        playerHand = game.playerHand;
        checkOutcome();
    }

    /**
     * Player stands and the dealer's turn is initiated.
     */
    function stand() {
        playerTurnEnded = true;
        dealerTurnStarted = true;
    }

    /**
     * Dealer draws one card.
     */
    async function dealerDraw() {
        await game.hitDealer();
        dealerHand = game.dealerHand;
        checkOutcome();
        if (game.calculateHandValue(dealerHand) >= 17) {
            dealerTurnEnded = true;
        }
    }

    /**
     * Checks the game outcome after each action.
     */
    function checkOutcome() {
        const outcome = game.checkGameOutcome();
        if (outcome !== null) {
            gameOutcome = outcome;
            // Keep gameStarted true so that cards remain displayed
        }
    }
</script>

<main>
    <h1>Blackjack Game</h1>

    {#if !gameStarted}
        <button onclick={startGame}>New Game</button>
    {/if}

    {#if gameStarted}
        <section>
            <h2>Player's Hand ({playerHandValue})</h2>
            <div class="card-row">
                {#each playerHand as card}
                    <img
                        src={card.image}
                        alt={`${card.value} of ${card.suit}`}
                        width="80"
                    />
                {/each}
            </div>
            {#if !playerTurnEnded}
                <button onclick={hit}>Hit</button>
                <button onclick={stand}>Stand</button>
            {/if}
        </section>

        <section>
            <h2>Dealer's Hand ({dealerHandValue})</h2>
            <div class="card-row">
                {#each dealerHand as card}
                    <img
                        src={card.image}
                        alt={`${card.value} of ${card.suit}`}
                        width="80"
                    />
                {/each}
            </div>
            {#if dealerTurnStarted && !dealerTurnEnded}
                <button onclick={dealerDraw}>Draw for Dealer</button>
            {/if}
        </section>

        {#if gameOutcome}
            <section>
                <h2>Game Outcome: {gameOutcome}</h2>
                <button onclick={startGame}>New Game</button>
            </section>
        {/if}
    {/if}
</main>

<style>
    main {
        font-family: Arial, sans-serif;
        padding: 20px;
    }
    h1,
    h2 {
        color: #333;
    }
    button {
        margin: 5px;
        padding: 10px 20px;
        font-size: 16px;
        cursor: pointer;
    }
    section {
        margin-top: 20px;
    }
    .card-row {
        display: flex;
        gap: 10px;
    }
    img {
        border-radius: 5px;
        border: 1px solid #ccc;
    }
</style>
