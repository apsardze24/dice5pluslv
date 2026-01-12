
import type { GameState, Cell, Player, AiDifficulty } from '../types';

// Calculate win probability using basic probability approximation
function estimateWinProbability(attackerDice: number, defenderDice: number): number {
    if (attackerDice <= 1) return 0;
    const diff = attackerDice - defenderDice;
    if (diff === 0) return 0.45; // Tie goes to defender
    if (diff > 0) return 0.5 + (diff * 0.1); 
    return 0.5 + (diff * 0.12);
}

// Check if two cells are connected by the same owner (BFS)
function areCellsConnected(state: GameState, idA: number, idB: number, ownerId: number): boolean {
    if (idA === idB) return true;
    const player = state.players[ownerId];
    if (player.largestRegionCells.has(idA) && player.largestRegionCells.has(idB)) return true;

    const visited = new Set<number>();
    const stack = [idA];
    visited.add(idA);
    
    while(stack.length > 0) {
        const curr = stack.pop()!;
        if (curr === idB) return true;
        
        const cell = state.cells[curr];
        for (const nid of cell.nei) {
            const nCell = state.cells[nid];
            if (nCell.owner === ownerId && !visited.has(nid)) {
                visited.add(nid);
                stack.push(nid);
            }
        }
    }
    return false;
}

// Helper to determine if a move connects two previously disjoint parts of the player's empire
function isMoveConnecting(state: GameState, fromCell: Cell, toCell: Cell, player: Player): boolean {
    const myOtherNeighbors = toCell.nei.filter(nid => 
        state.cells[nid].owner === player.id && nid !== fromCell.id
    );
    if (myOtherNeighbors.length > 0) {
        // Just checking against the first one is usually enough for a heuristic
        // If FromCell is NOT connected to NeighborCell already, then capturing ToCell bridges them.
        const sampleNeighbor = myOtherNeighbors[0];
        if (!areCellsConnected(state, fromCell.id, sampleNeighbor, player.id)) {
            return true;
        }
    }
    return false;
}

// --- STANDARD SCORING (Used for Easy/Normal) ---
function scoreAttackStandard(state: GameState, fromCell: Cell, toCell: Cell, player: Player, difficulty: AiDifficulty): number {
    const attackerDice = fromCell.dice;
    const defenderDice = toCell.dice;
    
    const prob = estimateWinProbability(attackerDice, defenderDice);
    
    if (prob < 0.2) return -9999;
    
    // Normal/Easy are willing to take 50/50 fights often
    if (difficulty === 'easy' && prob < 0.4) return -100;
    if (difficulty === 'normal' && prob < 0.5) return -50;

    let score = prob * 100;

    // Connectivity Bonus
    if (isMoveConnecting(state, fromCell, toCell, player)) {
        score += 500; 
    }

    // Stack Usage
    if (attackerDice === 8) score += 50;
    
    // Cheap expansion
    if (defenderDice === 1) score += 30;

    return score;
}

// --- HARD MODE LOGIC (The Accumulator) ---
function getHardModeMove(state: GameState, player: Player): { fromId: number; toId: number } | null {
    // 1. Calculate Economy
    // How many dice will we get at end of turn?
    const income = player.largestRegionSize;
    const currentReserve = player.reserve;
    const totalIncoming = income + currentReserve;

    // How much space do we have in our MAIN region?
    // We only care about the main region because that's where the income comes from.
    // Filling isolated islands doesn't protect the reserve cap.
    let emptySpaceInMainRegion = 0;
    for (const cid of player.largestRegionCells) {
        const cell = state.cells[cid];
        emptySpaceInMainRegion += (8 - cell.dice);
    }

    // Overflow = Dice we will LOSE if we don't expand or spend dice.
    // If Overflow <= 0, we are safe. We can just sit and accumulate 8s.
    const overflow = totalIncoming - emptySpaceInMainRegion;

    // 2. Identify Move Candidates
    const moves: { fromId: number; toId: number; score: number }[] = [];

    for (const cid of player.cells) {
        const fromCell = state.cells[cid];
        if (fromCell.dice < 2) continue;

        const isMainRegion = player.largestRegionCells.has(cid);

        for (const nid of fromCell.nei) {
            const toCell = state.cells[nid];
            if (toCell.owner === player.id) continue;
            
            // Check alliances
            if (player.alliances.has(toCell.owner)) {
                // Only attack ally if it connects regions (Vital)
                if (!isMoveConnecting(state, fromCell, toCell, player)) continue;
            }

            const prob = estimateWinProbability(fromCell.dice, toCell.dice);
            let score = 0;

            const connects = isMoveConnecting(state, fromCell, toCell, player);

            // LOGIC A: WE HAVE SPACE (Overflow <= 0)
            // Strategy: HOARD. Do not attack unless it is extremely strategic.
            if (overflow <= 0) {
                if (connects) {
                    // Connecting disjoint regions is always priority #1
                    // It increases our reserve cap and secures territory.
                    // But we still want reasonable odds.
                    if (prob > 0.4) score = 5000;
                } else {
                    // Otherwise, DO NOT ATTACK.
                    // Let the dice fill up to 8s.
                    continue; 
                }
            } 
            // LOGIC B: WE ARE OVERFLOWING (Overflow > 0)
            // Strategy: SPEND. We must attack to create space or use the 8s before they waste income.
            else {
                // Priority 1: Connects regions (always good)
                if (connects && prob > 0.4) {
                    score = 2000;
                }
                // Priority 2: Expand Main Region using Full Stacks
                else if (isMainRegion) {
                    // Only attack from main region to expand the "container" size
                    
                    // We prefer attacking with 8s because that opens up 7 slots for new dice.
                    if (fromCell.dice === 8) {
                        score = 1000 * prob; // High probability 8-attacks are best
                        
                        // Prefer attacking weak neighbors to preserve the 8-stack's power (it moves 7 dice in)
                        if (toCell.dice <= 2) score += 200;
                        
                        // Avoid attacking very strong neighbors unless necessary
                        if (toCell.dice >= 6) score -= 100;

                    } else if (fromCell.dice >= 6) {
                        // If we don't have 8s, 6s and 7s are okay if we are desperate
                         score = 500 * prob;
                    } else {
                        // Attacking with small stacks (2,3,4) is wasteful in Hard mode. 
                        // Better to let them sit and grow, even if we burn some overflow.
                        // UNLESS the overflow is massive.
                        if (overflow > 10) score = 100 * prob;
                        else continue;
                    }
                } 
                // Priority 3: Isolated islands
                else {
                    // Attacking from an island doesn't help our Main Region cap. 
                    // It's usually a waste unless it connects to main.
                    // Skip.
                    continue;
                }
            }
            
            if (score > 0) {
                moves.push({ fromId: cid, toId: nid, score });
            }
        }
    }

    moves.sort((a, b) => b.score - a.score);

    if (moves.length > 0) {
        // Execution
        return { fromId: moves[0].fromId, toId: moves[0].toId };
    }

    return null;
}

export async function aiTakeTurn(state: GameState): Promise<{ fromId: number; toId: number } | { surrenderTo: number } | null> {
    const player = state.players[state.active];
    if (!player.alive || player.human) return null;

    // --- BARBARIAN ---
    if (player.isBarbarian) {
        // Simple greedy
        let best: { fromId: number; toId: number; score: number } | null = null;
        for (const cid of player.cells) {
            const f = state.cells[cid];
            if(f.dice < 2) continue;
            for (const nid of f.nei) {
                const t = state.cells[nid];
                if (state.players[t.owner]?.isBarbarian) continue;
                const score = f.dice - t.dice;
                if (!best || score > best.score) best = { fromId: cid, toId: nid, score };
            }
        }
        if (best && best.score >= 0) return { fromId: best.fromId, toId: best.toId };
        return null;
    }

    // --- HARD MODE ---
    if (state.aiDifficulty === 'hard') {
        const move = getHardModeMove(state, player);
        if (move) return move;
        
        // Surrender check if hopeless
        if (state.turn > 20) {
            const active = state.players.filter(p=>p.alive && !p.isBarbarian);
            if (active.length > 2) {
                const leader = active.sort((a,b) => b.cells.size - a.cells.size)[0];
                if (leader.id !== player.id && player.cells.size < leader.cells.size * 0.15) {
                    return { surrenderTo: leader.id };
                }
            }
        }
        return null;
    }

    // --- NORMAL / EASY ---
    const moves: { fromId: number; toId: number; score: number }[] = [];
    for (const cid of player.cells) {
        const f = state.cells[cid];
        if (f.dice < 2) continue;
        for (const nid of f.nei) {
            const t = state.cells[nid];
            if (t.owner === player.id) continue;
            
            const score = scoreAttackStandard(state, f, t, player, state.aiDifficulty);
            if (score > 0) moves.push({ fromId: cid, toId: nid, score });
        }
    }
    moves.sort((a,b) => b.score - a.score);
    
    if (moves.length > 0) {
        // Easy mode is much more random/prone to mistakes
        if (state.aiDifficulty === 'easy' && moves.length > 3) {
             // Pick random top 3 to simulate mistakes
             const pick = moves[Math.floor(Math.random() * 3)];
             return { fromId: pick.fromId, toId: pick.toId };
        }
        return { fromId: moves[0].fromId, toId: moves[0].toId };
    }

    return null;
}
