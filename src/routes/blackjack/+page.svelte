<script lang="ts">
    // Import game logic and types.
    import { BlackjackGame } from "$lib/game/blackjack";
    import type { Card } from "$lib/api/deckAPI";

    // (Assuming your reactive helpers $state and $derived exist in your setup.)
    let game = new BlackjackGame();

    // UI state variables.
    let gameStarted = $state(false);
    let playerTurnActive = $state(false);
    let revealDealerHole = $state(false); // Controls whether the dealer's hole card is shown.
    let gameOutcome = $state<string | null>(null);

    let playerHand = $state<Card[]>([]);
    let dealerHand = $state<Card[]>([]);
    let playerBalance = $state(game.playerBalance);
    let playerBet = $state(100);

    // Derived values for hand totals.
    let playerHandValue = $derived(game.calculateHandValue(playerHand));
    let dealerHandValue = $derived(game.calculateHandValue(dealerHand));

    // --- Betting Phase ---
    async function placeBet() {
        try {
            await game.startGame(playerBet);
        } catch (error) {
            console.error(error);
            return;
        }
        playerHand = game.playerHand;
        dealerHand = game.dealerHand;
        playerBalance = game.playerBalance;
        gameOutcome = null;
        gameStarted = true;
        playerTurnActive = true;
        revealDealerHole = false;
        // Immediately check for natural blackjack.
        if (
            game.calculateHandValue(playerHand) === 21 &&
            playerHand.length === 2
        ) {
            // Automatically resolve blackjack.
            gameOutcome = game.checkGameOutcome();
            playerTurnActive = false;
            revealDealerHole = true;
        }
    }

    // --- Player Turn ---
    async function hit() {
        await game.hit();
        playerHand = game.playerHand;
        if (game.calculateHandValue(playerHand) > 21) {
            // Player busts.
            playerTurnActive = false;
            revealDealerHole = true;
            gameOutcome = game.checkGameOutcome();
        }
    }

    async function stand() {
        playerTurnActive = false;
        revealDealerHole = true;
        // Dealer's turn starts automatically.
        await game.dealerPlay();
        dealerHand = game.dealerHand;
        gameOutcome = game.checkGameOutcome();
        playerBalance = game.playerBalance;
    }

    async function doubleDown() {
        await game.doubleDown();
        playerHand = game.playerHand;
        playerBalance = game.playerBalance;
        // After doubling down, player's turn ends.
        playerTurnActive = false;
        revealDealerHole = true;
        await game.dealerPlay();
        dealerHand = game.dealerHand;
        gameOutcome = game.checkGameOutcome();
        playerBalance = game.playerBalance;
    }

    async function surrender() {
        await game.surrender();
        playerBalance = game.playerBalance;
        gameOutcome = game.checkGameOutcome();
        playerTurnActive = false;
        revealDealerHole = true;
    }

    async function split() {
        await game.split();
        // For this example, we'll display only the first split hand.
        if (game.splitHands.length > 0) {
            playerHand = game.splitHands[0];
        }
    }

    // --- Restart Round ---
    function newRound() {
        // Reset UI state to begin a new betting phase.
        gameStarted = false;
        playerTurnActive = false;
        revealDealerHole = false;
        gameOutcome = null;
    }
</script>

<main>
    <h1>Blackjack Game</h1>
    <p>Balance: ${playerBalance}</p>

    <!-- Betting Phase -->
    {#if !gameStarted}
        <label>
            Bet (divisible by 10):
            <input
                type="number"
                bind:value={playerBet}
                min="10"
                step="10"
                max={playerBalance}
            />
        </label>
        <button onclick={placeBet} disabled={playerBet > playerBalance}
            >Place Bet</button
        >
    {/if}

    <!-- Game in Progress -->
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
            {#if playerTurnActive}
                <button onclick={hit}>Hit</button>
                <button onclick={stand}>Stand</button>
                {#if playerHand.length === 2 && playerBalance >= playerBet}
                    <button onclick={doubleDown}>Double Down</button>
                    <button onclick={surrender}>Surrender</button>
                    {#if playerHand[0].value === playerHand[1].value}
                        <button onclick={split}>Split</button>
                    {/if}
                {/if}
            {/if}
        </section>

        <section>
            <h2>Dealer's Hand ({revealDealerHole ? dealerHandValue : "?"})</h2>
            <div class="card-row">
                {#if revealDealerHole}
                    {#each dealerHand as card}
                        <img
                            src={card.image}
                            alt={`${card.value} of ${card.suit}`}
                            width="80"
                        />
                    {/each}
                {:else if dealerHand.length > 0}
                    <!-- Show upcard and hide the hole card -->
                    <img
                        src={dealerHand[0].image}
                        alt={`${dealerHand[0].value} of ${dealerHand[0].suit}`}
                        width="80"
                    />
                    {#if dealerHand.length > 1}
                        <img
                            src="https://deckofcardsapi.com/static/img/back.png"
                            alt="Hidden Card"
                            width="80"
                        />
                    {/if}
                {/if}
            </div>
        </section>
    {/if}

    <!-- Outcome and Next Round -->
    {#if gameOutcome}
        <section>
            <h2>Game Outcome: {gameOutcome}</h2>
            <button onclick={newRound}>New Round</button>
        </section>
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
    label {
        display: block;
        margin: 10px 0;
    }
    input {
        padding: 5px;
        font-size: 16px;
        width: 100px;
    }
    section {
        margin-top: 20px;
    }
    .card-row {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
    }
    img {
        border-radius: 5px;
        border: 1px solid #ccc;
    }
</style>
