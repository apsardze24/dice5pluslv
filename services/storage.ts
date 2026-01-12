import type { GameState } from '../types';
import { mulberry32, xmur3 } from './utils';

const SAVE_KEY = 'diceWarsSaveState';

const replacer = (key: string, value: any) => {
    if (value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()),
        };
    }
    if (value instanceof Set) {
        return {
            dataType: 'Set',
            value: Array.from(value.values()),
        };
    }
    if (key === 'rng') {
        return undefined;
    }
    return value;
};

const reviver = (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
        if (value.dataType === 'Set') {
            return new Set(value.value);
        }
    }
    return value;
};

export const saveGameState = (state: GameState) => {
    try {
        const stateString = JSON.stringify(state, replacer);
        sessionStorage.setItem(SAVE_KEY, stateString);
        sessionStorage.setItem('gameInProgress', 'true');
    } catch (error) {
        console.error("Failed to save game state:", error);
    }
};

export const loadGameState = (): GameState | null => {
    try {
        const savedStateString = sessionStorage.getItem(SAVE_KEY);
        if (!savedStateString) {
            return null;
        }
        const savedState = JSON.parse(savedStateString, reviver) as GameState;

        if (savedState.seed) {
            savedState.rng = mulberry32(xmur3(savedState.seed)());
        } else {
            console.error("Saved state is missing a seed to re-hydrate RNG.");
            return null;
        }
        
        return savedState;

    } catch (error) {
        console.error("Failed to load or parse game state:", error);
        clearGameState();
        return null;
    }
};

export const clearGameState = () => {
    sessionStorage.removeItem(SAVE_KEY);
    sessionStorage.removeItem('gameInProgress');
};
