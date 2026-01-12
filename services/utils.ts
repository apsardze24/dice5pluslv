import type { RollResult } from '../types';

export function mulberry32(a: number) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

export function xmur3(str: string) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    }
    return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^ h >>> 16) >>> 0;
    }
}

export function randInt(rng: () => number, min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
}

export function axialToPixel(q: number, r: number, size: number): [number, number] {
    const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const y = size * (3 / 2 * r);
    return [x, y];
}

export function shuffle<T,>(arr: T[], rng: () => number): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function choice<T,>(arr: T[], rng: () => number): T {
    return arr[Math.floor(rng() * arr.length)];
}

export function rollDice(rng: () => number, n: number): RollResult {
    let sum = 0;
    const arr: number[] = [];
    for (let i = 0; i < n; i++) {
        const v = randInt(rng, 1, 6);
        arr.push(v);
        sum += v;
    }
    return { sum, arr };
}

export function drawDicePips(ctx: CanvasRenderingContext2D, dice: number, hexSize: number, scale: number) {
    if (dice <= 0) return;

    ctx.fillStyle = '#0a0d20';
    const pipRadius = Math.max(1, hexSize * 0.08 / scale);
    const yOffset = hexSize * 0.35;
    const xOffset = hexSize * 0.3;

    const pips: { [key: number]: [number, number][] } = {
        1: [ [0, 0] ],
        2: [ [-xOffset, -yOffset], [xOffset, yOffset] ],
        3: [ [-xOffset, -yOffset], [0, 0], [xOffset, yOffset] ],
        4: [ [-xOffset, -yOffset], [xOffset, -yOffset], [-xOffset, yOffset], [xOffset, yOffset] ],
        5: [ [-xOffset, -yOffset], [xOffset, -yOffset], [0, 0], [-xOffset, yOffset], [xOffset, yOffset] ],
        6: [ [-xOffset, -yOffset], [xOffset, -yOffset], [-xOffset, 0], [xOffset, 0], [-xOffset, yOffset], [xOffset, yOffset] ],
        7: [ [-xOffset, -yOffset], [xOffset, -yOffset], [-xOffset, 0], [xOffset, 0], [-xOffset, yOffset], [xOffset, yOffset], [0, yOffset / 2] ],
        8: [ [-xOffset, -yOffset], [xOffset, -yOffset], [-xOffset, 0], [xOffset, 0], [-xOffset, yOffset], [xOffset, yOffset], [0, -yOffset / 2], [0, yOffset / 2] ],
    };

    const positions = pips[dice];
    if (positions) {
        for (const [x, y] of positions) {
            ctx.beginPath();
            ctx.arc(x, y, pipRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
    const dq = q1 - q2;
    const dr = r1 - r2;
    return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}