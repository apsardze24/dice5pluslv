
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

function getNeighbors(state: GameState, cell: Cell): number[] {
    return cell.nei;
}

// Determine if a cell is an "interior" cell (surrounded by friends)
function isInteriorCell(state: GameState, cell: Cell): boolean {
    return cell.nei.every(nid => state.cells[nid].owner === cell.owner);
}

/**
 * SCORING FUNCTION
 * 
 * Used for Easy and Normal difficulty (Old logic).
 * Also used as a fallback for Hard mode when it DECIDES to attack.
 */
function scoreAttackGeneral(state: GameState, fromCell: Cell, toCell: Cell, player: Player, difficulty: AiDifficulty): number {
    const attackerDice = fromCell.dice;
    const defenderDice = toCell.dice;
    const defenderId = toCell.owner;
    
    const prob = estimateWinProbability(attackerDice, defenderDice);
    
    // Safety Gates
    if (prob < 0.2) return -9999;
    if (difficulty !== 'easy' && prob < 0.55 && attackerDice < 5) return -100;

    // Base Score: Win Probability
    let score = prob * 100;

    // 1. CONNECTIVITY (Critical)
    const myOtherNeighbors = toCell.nei.filter(nid => 
        state.cells[nid].owner === player.id && nid !== fromCell.id
    );

    let connectsDisjoint = false;
    if (myOtherNeighbors.length > 0) {
        const sampleNeighbor = myOtherNeighbors[0];
        if (!areCellsConnected(state, fromCell.id, sampleNeighbor, player.id)) {
            connectsDisjoint = true;
        }
    }

    if (connectsDisjoint) {
        score += 1000; 
    } else if (myOtherNeighbors.length > 0) {
        score += 50; 
    }

    // 2. THREAT ANALYSIS
    // If we are 'normal' or 'hard', check if we expose ourselves
    if (difficulty !== 'easy') {
        let maxEnemyNeighborDice = 0;
        toCell.nei.forEach(nid => {
            const nCell = state.cells[nid];
            if (nCell.owner !== player.id && nCell.owner !== defenderId) {
                 if (nCell.dice > maxEnemyNeighborDice) maxEnemyNeighborDice = nCell.dice;
            }
            if (nCell.owner === defenderId && nid !== toCell.id) {
                 if (nCell.dice > maxEnemyNeighborDice) maxEnemyNeighborDice = nCell.dice;
            }
        });

        const expectedDiceLeft = Math.max(1, attackerDice - defenderDice);
        if (maxEnemyNeighborDice > expectedDiceLeft + 1) {
            // If we aren't moving a full stack, be scared
            if (attackerDice < 8) {
                score -= 300; 
            }
        }
    }

    // 3. ECONOMY
    if (defenderDice === 1) score += 150; // Cheap land
    
    // 4. STACK USAGE
    if (attackerDice === 8) {
        score += 200; 
        if (isInteriorCell(state, fromCell)) score += 200; 
    }

    // 5. ALLIANCES
    if (player.alliances.has(defenderId)) {
        if (!connectsDisjoint) return -5000;
        score -= 200;
    }

    return score;
}

/**
 * HARD MODE STRATEGY CALCULATOR
 * 
 * "The Grandmaster Logic"
 * 1. Calculates Reinforcement vs Capacity.
 * 2. If we have room for dice, DO NOT ATTACK (hoard).
 * 3. Only attack to connect regions or if overflowing.
 * 4. Strictly prioritize main region.
 */
function getHardModeMove(state: GameState, player: Player): { fromId: number; toId: number } | null {
    // 1. Math Calculation: Do we NEED to attack?
    const mainRegionCells = Array.from(player.largestRegionCells);
    const income = player.largestRegionSize; // Reinforcements we will get
    const reserve = player.reserve;
    const totalIncoming = income + reserve;

    let emptySpaceInMainRegion = 0;
    for (const cid of mainRegionCells) {
        const cell = state.cells[cid];
        emptySpaceInMainRegion += (8 - cell.dice);
    }

    // "Overflow" is how many dice we will burn if we do nothing.
    // If Overflow <= 0, we have enough room to store everything. Sit tight and fortify.
    const overflow = totalIncoming - emptySpaceInMainRegion;

    // 2. Filter Valid Moves
    const possibleMoves: { fromId: number; toId: number; score: number }[] = [];
    
    for (const cid of player.cells) {
        const fromCell = state.cells[cid];
        if (fromCell.dice < 2) continue;

        const isMainRegion = player.largestRegionCells.has(cid);

        // HARD MODE RULE: Never attack from small, isolated islands unless it connects to main.
        // It wastes dice on territories that will likely be lost.
        // We only check non-main-region moves if they connect disjoint parts.
        
        for (const nid of fromCell.nei) {
            const toCell = state.cells[nid];
            if (toCell.owner === player.id) continue;
            
            // Alliance check
            if (player.alliances.has(toCell.owner)) {
                // Only betray if CRITICAL connection
                const connects = isMoveConnecting(state, fromCell, toCell, player);
                if (!connects) continue;
            }

            // --- SCORING FOR HARD MODE ---
            let score = 0;
            const prob = estimateWinProbability(fromCell.dice, toCell.dice);
            
            // Strict Safety: Don't take risks.
            if (prob < 0.7 && fromCell.dice < 8) continue; 
            if (prob < 0.4) continue; // Never take bad odds even with 8

            const connectsDisjoint = isMoveConnecting(state, fromCell, toCell, player);

            // LOGIC BRANCH A: We have room for dice (Overflow <= 0)
            if (overflow <= 0) {
                // Only attack if:
                // 1. It connects disjoint regions (Strategic Gold)
                // 2. It is an 8 vs 1 or 8 vs 2 (Free real estate, low risk, maintains 8-stack)
                // 3. We are killing a huge neighbor threat (Strategic Sacrifice - rare)
                
                if (connectsDisjoint) {
                    score = 10000;
                } else if (isMainRegion && fromCell.dice === 8 && toCell.dice <= 2) {
                    // "Safe expansion": only expand if we are full strength and target is weak.
                    // But even then, do we want to? The user says "Hold all 8s".
                    // Let's only do it if the target is REALLY juicy or we are bored.
                    // Actually, user says: "Hold 8s... only attack if overflow".
                    // So we reduce this score.
                    score = 50; 
                } else {
                    // Do nothing. Sit and hoard.
                    continue; 
                }
            } 
            // LOGIC BRANCH B: We are overflowing (Overflow > 0)
            else {
                // We MUST attack to spend 'overflow' dice, otherwise they burn.
                // Prioritize attacks from Main Region to expand it.
                if (!isMainRegion && !connectsDisjoint) {
                    score = -500; // Don't waste dice on islands, let them burn if needed, focus on Main.
                } else {
                    score = scoreAttackGeneral(state, fromCell, toCell, player, 'hard');
                    
                    // Modifiers for Hard Aggression
                    // We prefer to use 8-stacks to attack to open up a slot for the 8 new dice coming in.
                    if (fromCell.dice === 8) score += 300;
                    
                    // We prefer targets that minimize loss (weak targets) to keep our total dice count high.
                    if (toCell.dice <= 2) score += 100;
                }
            }

            if (score > 0) {
                possibleMoves.push({ fromId: cid, toId: nid, score });
            }
        }
    }

    possibleMoves.sort((a, b) => b.score - a.score);

    if (possibleMoves.length > 0) {
        return { fromId: possibleMoves[0].fromId, toId: possibleMoves[0].toId };
    }
    return null;
}

// Helper to check connectivity without calculating score
function isMoveConnecting(state: GameState, fromCell: Cell, toCell: Cell, player: Player): boolean {
    const myOtherNeighbors = toCell.nei.filter(nid => 
        state.cells[nid].owner === player.id && nid !== fromCell.id
    );
    if (myOtherNeighbors.length > 0) {
        const sampleNeighbor = myOtherNeighbors[0];
        if (!areCellsConnected(state, fromCell.id, sampleNeighbor, player.id)) {
            return true;
        }
    }
    return false;
}


export async function aiTakeTurn(state: GameState): Promise<{ fromId: number; toId: number } | { surrenderTo: number } | null> {
    const player = state.players[state.active];
    if (!player.alive || player.human) return null;

    // --- BARBARIAN LOGIC ---
    if (player.isBarbarian) {
        let bestAttack: { fromId: number; toId: number; score: number } | null = null;
        for (const cid of player.cells) {
            const from = state.cells[cid];
            if (from.dice < 2) continue;
            for (const nid of from.nei) {
                const to = state.cells[nid];
                const toOwner = state.players[to.owner];
                if (toOwner && !toOwner.isBarbarian) {
                    const score = from.dice - to.dice;
                    if (!bestAttack || score > bestAttack.score) {
                        bestAttack = { fromId: cid, toId: nid, score };
                    }
                }
            }
        }
        if (bestAttack && bestAttack.score >= 0) {
            return { fromId: bestAttack.fromId, toId: bestAttack.toId };
        }
        return null;
    }

    // --- HARD DIFFICULTY (Grandmaster) ---
    if (state.aiDifficulty === 'hard') {
        const move = getHardModeMove(state, player);
        
        // Surrender Logic for Hard Mode
        // If we are tiny and useless, just give up to speed up game.
        if (!move && state.turn > 15) {
             const activeCivs = state.players.filter(p => p.alive && !p.isBarbarian);
             if (activeCivs.length > 2) {
                 const leader = activeCivs.sort((a, b) => b.cells.size - a.cells.size)[0];
                 if (leader.id !== player.id && (player.cells.size / leader.cells.size) < 0.15) {
                     return { surrenderTo: leader.id };
                 }
             }
        }
        return move;
    }

    // --- EASY / NORMAL DIFFICULTY (Standard Heuristic) ---
    // This is the old "Hard" logic, now downgraded to standard.
    
    const possibleMoves: { fromId: number; toId: number; score: number }[] = [];
    
    for (const cid of player.cells) {
        const fromCell = state.cells[cid];
        if (fromCell.dice < 2) continue;

        for (const nid of fromCell.nei) {
            const toCell = state.cells[nid];
            if (toCell.owner !== player.id) {
                const score = scoreAttackGeneral(state, fromCell, toCell, player, state.aiDifficulty);
                if (score > 0) {
                    possibleMoves.push({ fromId: cid, toId: nid, score });
                }
            }
        }
    }

    possibleMoves.sort((a, b) => b.score - a.score);

    if (possibleMoves.length > 0) {
        const bestMove = possibleMoves[0];
        
        // Thresholds for Normal/Easy
        const hasFullStacks = [...player.cells].some(cid => state.cells[cid].dice === 8);
        // Normal mode is more aggressive than Hard, it doesn't do the math as strictly.
        // Easy mode just attacks if it thinks it can win.
        let threshold = 50;
        if (state.aiDifficulty === 'easy') threshold = 20;

        if (bestMove.score > threshold) {
             return { fromId: bestMove.fromId, toId: bestMove.toId };
        }
    }

    return null; // End Turn
}
