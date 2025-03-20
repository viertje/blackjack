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

<main class="bg-[#127a2c] text-white rounded-md p-4">
    
    <div class="grid grid-cols-3 gap-4 mb-4">
        <div>
            <img src="/symbols.png" alt="">
        </div>
        <h1 class="text-5xl place-content-center text-center bg-[#0a601f] rounded-md shadow-2xl p-4">Blackjack Game</h1>
        <div class="text-center flex justify-end gap-8 items-center">
            <p class="m-4 text-center bg-[#0a601f] rounded-md shadow-2xl p-4">${playerBalance}</p>
            <p class="m-4 text-center bg-[#0a601f] rounded-md shadow-2xl p-4">{currentPhase}</p>
        </div>
    </div>
    
    <div class="bg-[#06561a] w-full rounded-md h-[50vh] p-4 shadow-2xl flex-col justify-start items-center">

    {#if isGameOver}
        <h2>Game Over! You are out of money.</h2>
        <button onclick={restartGame}>Restart Game</button>
    {/if}

    {#if currentPhase === GamePhase.Betting && !isGameOver}
        <div class="flex justify-center items-center gap-4 w-full h-full">
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
            <button class="rounded-full bg-blue-950 p-4" onclick={placeBet} disabled={playerBet > playerBalance}
                >Place Bet</button
            >
        </div>
   
    {/if}

    {#if currentPhase !== GamePhase.Betting}
    <div class="flex justify-center items-center gap-4 w-full h-full">

        <section>
            <div class="flex gap-4 justify-center items-center">
            <h2 class="text-2xl border-white border-2 p-4 rounded-md m-4">Player's Hand ({playerHandValue})</h2>
            <h2 class="text-2xl border-white border-2 p-4 rounded-md m-4">
                Dealer's Hand ({currentPhase === GamePhase.Outcome
                    ? dealerHandValue
                    : "?"})
            </h2>
        </div>
            <div class="flex gap-2">
                {#each playerHand as card}
                    <img
                        src={card.image}
                        alt={`${card.value} of ${card.suit}`}
                        width="80"
                    />
                {/each}
            </div>
            {#if currentPhase === GamePhase.PlayerTurn}
            <div class="flex gap-4 justify-center items-center">
                
            
                <button onclick={() => performAction(PlayerAction.Hit)}
                    >Hit</button
                >
                <button onclick={() => performAction(PlayerAction.Stand)}
                    >Stand</button
                >
                {#if playerHand.length === 2 && playerBalance >= playerBet}
                    <button
                        class="rounded-full bg-blue-950 p-4"
                        onclick={() => performAction(PlayerAction.DoubleDown)}
                        >Double Down</button
                    >
                    <button
                        class="rounded-full bg-blue-950 p-4"
                        onclick={() => performAction(PlayerAction.Surrender)}
                        >Surrender</button
                    >
                    {#if playerHand[0].value === playerHand[1].value}
                        <button
                            class="rounded-full bg-blue-950 p-4"
                            onclick={() => performAction(PlayerAction.Split)}
                            >Split</button
                        >
                    {/if}
                {/if}
            </div>

            {/if}
        </section>

        <section>
      
            <div class="flex gap-2">
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
    </div>
    {/if}

    {#if currentPhase === GamePhase.Outcome && !isGameOver}
        <section>
            <h2>Game Outcome: {gameOutcome}</h2>
            <button onclick={newRound}>New Round</button>
        </section>
    {/if}
</div>

</main>
