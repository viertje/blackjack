<script lang="ts">
    import { BlackjackGame } from "$lib/game/blackjack";
    import type { Card } from "$lib/api/deckAPI";
    import { GamePhase, PlayerAction } from "$lib/enums";
    import { fade } from "svelte/transition";

    let game = new BlackjackGame();

    // Use reactive state with the game object as source
    let currentPhase = $state(game.getCurrentPhase());
    let gameOutcomes = $state<(string | null)[]>(game.getAllOutcomes());
    let playerHands = $state<Card[][]>(game.getPlayerHands());
    let activeHandIndex = $state(game.getActiveHandIndex());
    let dealerHand = $state<Card[]>(game.getDealerHand());
    let playerBalance = $state(game.getPlayerBalance());
    let playerBets = $state<number[]>(game.getPlayerBets());
    let playerBet = $state(100);
    let isGameOver = $state(game.gameOver);

    // Derived values
    let dealerHandValue = $derived(game.calculateHandValue(dealerHand));
    let canSplit = $derived(
        currentPhase === GamePhase.PlayerTurn &&
            game.canSplit() &&
            playerHands.length === 1
    );

    async function placeBet() {
        try {
            await game.startGame(playerBet);
            // Update all reactive state after the game state changes
            updateGameState();
        } catch (error) {
            console.error(error);
        }
    }

    async function performAction(action: PlayerAction) {
        await game.handleAction(action);
        updateGameState();
    }

    function newRound() {
        game.newRound();
        updateGameState();
    }

    function restartGame() {
        game.restartGame();
        updateGameState();
    }

    // Helper function to update all reactive state
    function updateGameState() {
        playerHands = game.getPlayerHands();
        activeHandIndex = game.getActiveHandIndex();
        dealerHand = game.getDealerHand();
        playerBalance = game.getPlayerBalance();
        playerBets = game.getPlayerBets();
        currentPhase = game.getCurrentPhase();
        gameOutcomes = game.getAllOutcomes();
        isGameOver = game.gameOver;
    }
</script>

<main class="bg-[#127a2c] text-white rounded-md p-4">
    <div class="flex justify-evenly gap-4 mb-4">
        <div class="flex justitfy-center items-center gap-4">
            <img class="h-16 place-self-center" src="/symbols.png" alt="" />
            <p class="m-4 text-center bg-[#0a601f] rounded-md shadow-2xl p-4">
                ${playerBalance}
            </p>
        </div>
        
        <h1
            class="text-3xl place-content-center text-center bg-[#0a601f] rounded-md shadow-2xl p-4"
        >
            Blackjack Game
        </h1>
        <div class="flex justitfy-center items-center gap-4">

            <p class="m-4 text-center bg-[#0a601f] rounded-md shadow-2xl p-4">
                {currentPhase}
            </p>
            <img class="h-16 place-self-center" src="/symbols.png" alt="" />

        </div>
    </div>

    <div class="bg-[#06561a] w-full rounded-md h-[60vh] p-4 shadow-2xl flex justify-evenly items-center gap-12">
        {#if currentPhase === GamePhase.Betting && !isGameOver}
            <div
                in:fade={{ delay: 1000 }}
                class="flex justify-center items-center gap-4 w-full h-full"
            >
                <label class="bg-amber-700 p-2 rounded-md">
                    Bet:
                    <input
                        type="number"
                        bind:value={playerBet}
                        min="10"
                        step="10"
                        max={playerBalance}
                    />
                </label>
                <button
                    class="rounded-full bg-blue-950 p-4 hover:scale-105 transition-transform duration-300 hover:bg-blue-900 hover:shadow-2xl"
                    onclick={placeBet}
                    disabled={playerBet > playerBalance}>Place Bet</button
                >
            </div>
        {/if}

        {#if currentPhase !== GamePhase.Betting}
            <div class="flex flex-col justify-start items-center">
                <h2 in:fade={{ delay: 1000 }} class="text-2xl border-white border-2 p-4 rounded-md m-4">
                    Dealer's Hand ({currentPhase === GamePhase.Outcome
                        ? dealerHandValue
                        : "?"})
                </h2>
                <div in:fade={{ delay: 1000 }} class="flex justify-center items-center gap-4">
                    {#if currentPhase === GamePhase.Outcome}
                        {#each dealerHand as card}
                            <img
                                in:fade={{ delay: 1000 }}
                                src={card.image}
                                alt={`${card.value} of ${card.suit}`}
                                width="80"
                            />
                        {/each}
                    {:else if dealerHand.length > 0}
                        <!-- Show upcard and hide the hole card -->
                        <img
                            in:fade={{ delay: 1000 }}
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
            </div>
            <!-- Player hands section -->
            <div in:fade={{ delay: 1000 }} class="flex flex-col justify-start items-center">
                {#each playerHands as hand, index}
                    <div class="flex flex-col justify-start items-center">
                        <h3 class="text-2xl border-white border-2 p-4 rounded-md m-4">
                            Hand {index + 1} ({game.calculateHandValue(hand)})
                        </h3>
                        <div class="flex gap-2 mb-2">
                            {#each hand as card}
                                <img
                                    src={card.image}
                                    alt={`${card.value} of ${card.suit}`}
                                    width="80"
                                />
                            {/each}
                        </div>

                        {#if currentPhase === GamePhase.Outcome}
                            <div class="bg-amber-800 p-2 rounded-md">
                                {gameOutcomes[index] || "Pending"}
                            </div>
                        {/if}
                    </div>
                {/each}

                {#if currentPhase === GamePhase.PlayerTurn}
                    <div in:fade={{ delay: 1000 }} class="flex gap-4 justify-center items-center">
                        <button
                            class="rounded-full bg-blue-950 p-4"
                            onclick={() => performAction(PlayerAction.Hit)}
                            >Hit</button
                        >
                        <button
                            class="rounded-full bg-blue-950 p-4"
                            onclick={() => performAction(PlayerAction.Stand)}
                            >Stand</button
                        >
                        {#if canSplit}
                            <button
                                class="rounded-full bg-blue-950 p-4"
                                onclick={() => performAction(PlayerAction.Split)}
                                >Split</button
                            >
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}


    </div>
    {#if currentPhase === GamePhase.Outcome && !isGameOver}
    <div
        in:fade={{ delay: 2000 }}
        class="flex gap-4 justify-center items-center"
    >
        <button class="bg-amber-700 p-2 rounded-md" onclick={newRound}
            >New Round</button
        >
    </div>
{/if}

{#if isGameOver}
    <div class="flex gap-4 justify-center items-center">
        <h2 in:fade={{ delay: 1000 }}>
            Game Over! You are out of money.
        </h2>
        <button
            class="bg-amber-700 p-2 rounded-md"
            in:fade={{ delay: 1000 }}
            onclick={restartGame}>Restart Game</button
        >
    </div>
{/if}
</main>
