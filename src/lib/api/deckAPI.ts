const API_BASE = "https://deckofcardsapi.com/api/deck";

export interface DeckInitResponse {
    success: boolean;
    deck_id: string;
    shuffled: boolean;
    remaining: number;
}

export interface CardImage {
    svg: string;
    png: string;
}

export interface Card {
    code: string;
    image: string;
    images: CardImage;
    value: string;
    suit: string;
}

export interface DrawCardResponse {
    success: boolean;
    deck_id: string;
    cards: Card[];
    remaining: number;
}

export class Deck {
    public deckId: string;
    public remaining: number;

    private constructor(deckId: string, remaining: number) {
        this.deckId = deckId;
        this.remaining = remaining;
    }

    /**
     * Initializes a new deck with the given deck count.
     */
    public static async initialize(deckCount: number = 1) {
        const response = await fetch(
            `${API_BASE}/new/shuffle/?deck_count=${deckCount}`
        );
        const data: DeckInitResponse = await response.json();
        if (!data.success) {
            throw new Error("Failed to initialize deck");
        }
        return new Deck(data.deck_id, data.remaining);
    }

    /**
     * Draws one or more cards from the deck.
     */
    public async draw(count: number = 1) {
        const response = await fetch(
            `${API_BASE}/${this.deckId}/draw/?count=${count}`
        );
        const data: DrawCardResponse = await response.json();
        if (!data.success) {
            throw new Error("Failed to draw card(s)");
        }
        this.remaining = data.remaining;
        return data;
    }

    /**
     * Reshuffles the deck.
     */
    public async reshuffle(remainingOnly: boolean = true) {
        const url = remainingOnly
            ? `${API_BASE}/${this.deckId}/shuffle/?remaining=true`
            : `${API_BASE}/${this.deckId}/shuffle/`;
        const response = await fetch(url);
        const data: DeckInitResponse = await response.json();
        if (!data.success) {
            throw new Error("Failed to reshuffle deck");
        }
        this.remaining = data.remaining;
        return data;
    }
}
