<script lang="ts">
    import { BlackjackGame } from "$lib/game/blackjack";
    import type { Card } from "$lib/api/deckAPI";
    import { GamePhase, PlayerAction } from "$lib/enums";

    let game = new BlackjackGame();

    let currentPhase = $state(game.currentPhase);
    let gameOutcome = $state<string | null>(null);

    let playerHand = $state<Card[]>([]);
    let dealerHand = $state<Card[]>([]);
    let playerBalance = $state(game.playerBalance);
    let playerBet = $state(100);
    let isGameOver = $state(false);

    // Derived totals.
    let playerHandValue = $derived(game.calculateHandValue(playerHand));
    let dealerHandValue = $derived(game.calculateHandValue(dealerHand));

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
        currentPhase = game.currentPhase;
        if (currentPhase === GamePhase.Outcome) {
            gameOutcome = game.checkGameOutcome();
        }
    }

    async function performAction(action: PlayerAction) {
        switch (action) {
            case PlayerAction.Hit:
                await game.hit();
                playerHand = game.playerHand;
                if (game.calculateHandValue(playerHand) > 21) {
                    currentPhase = GamePhase.Outcome;
                    gameOutcome = game.checkGameOutcome();
                    isGameOver = game.checkGameOver();
                }
                break;
            case PlayerAction.Stand:
                currentPhase = GamePhase.DealerTurn;
                await game.dealerPlay();
                dealerHand = game.dealerHand;
                currentPhase = GamePhase.Outcome;
                gameOutcome = game.checkGameOutcome();
                playerBalance = game.playerBalance;
                isGameOver = game.checkGameOver();
                break;
            case PlayerAction.DoubleDown:
                await game.doubleDown();
                playerHand = game.playerHand;
                playerBalance = game.playerBalance;
                currentPhase = GamePhase.DealerTurn;
                await game.dealerPlay();
                dealerHand = game.dealerHand;
                currentPhase = GamePhase.Outcome;
                gameOutcome = game.checkGameOutcome();
                playerBalance = game.playerBalance;
                break;
            case PlayerAction.Surrender:
                await game.surrender();
                playerBalance = game.playerBalance;
                gameOutcome = game.checkGameOutcome();
                currentPhase = GamePhase.Outcome;
                break;
            case PlayerAction.Split:
                await game.split();
                // For this example, show only the first split hand.
                if (game.splitHands.length > 0) {
                    playerHand = game.splitHands[0];
                }
                break;
        }
    }

    function newRound() {
        currentPhase = GamePhase.Betting;
        gameOutcome = null;
        playerHand = [];
        dealerHand = [];
    }

    function restartGame() {
        game.restartGame();
        playerBalance = game.playerBalance;
        isGameOver = false;
        currentPhase = GamePhase.Betting;
    }
</script>

<main>
    <h1>Blackjack Game</h1>
    <p>Balance: ${playerBalance}</p>

    {#if isGameOver}
        <h2>Game Over! You are out of money.</h2>
        <button onclick={restartGame}>Restart Game</button>
    {/if}

    {#if currentPhase === GamePhase.Betting && !isGameOver}
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

    {#if currentPhase !== GamePhase.Betting}
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
            {#if currentPhase === GamePhase.PlayerTurn}
                <button onclick={() => performAction(PlayerAction.Hit)}
                    >Hit</button
                >
                <button onclick={() => performAction(PlayerAction.Stand)}
                    >Stand</button
                >
                {#if playerHand.length === 2 && playerBalance >= playerBet}
                    <button
                        onclick={() => performAction(PlayerAction.DoubleDown)}
                        >Double Down</button
                    >
                    <button
                        onclick={() => performAction(PlayerAction.Surrender)}
                        >Surrender</button
                    >
                    {#if playerHand[0].value === playerHand[1].value}
                        <button
                            onclick={() => performAction(PlayerAction.Split)}
                            >Split</button
                        >
                    {/if}
                {/if}
            {/if}
        </section>

        <section>
            <h2>
                Dealer's Hand ({currentPhase === GamePhase.Outcome
                    ? dealerHandValue
                    : "?"})
            </h2>
            <div class="card-row">
                {#if currentPhase === GamePhase.Outcome}
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

    {#if currentPhase === GamePhase.Outcome && !isGameOver}
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
