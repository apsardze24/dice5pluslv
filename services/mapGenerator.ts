

import { HEX_DIRS } from '../constants';
import type { Cell, Player, GameSettings } from '../types';
import { choice, shuffle, randInt, hexDistance } from './utils';

function findConnectedComponents(cells: Cell[]): Set<number>[] {
    const components: Set<number>[] = [];
    const visited = new Set<number>();
    const cellMap = new Map(cells.map(c => [c.id, c]));

    for (const cell of cells) {
        if (!visited.has(cell.id)) {
            const component = new Set<number>();
            const queue = [cell.id];
            visited.add(cell.id);
            component.add(cell.id);

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                const currentCell = cellMap.get(currentId)!;
                
                for (const neighborId of currentCell.nei) {
                    if (cellMap.has(neighborId) && !visited.has(neighborId)) {
                        visited.add(neighborId);
                        component.add(neighborId);
                        queue.push(neighborId);
                    }
                }
            }
            components.push(component);
        }
    }
    return components;
}

// FIX: Added playersCount parameter to correctly calculate minimum island size.
function addWaterToMap(cells: Cell[], waterLevel: number, rng: () => number, playersCount: number): Cell[] {
    if (waterLevel <= 0) {
        return cells;
    }

    const cellCount = cells.length;
    const cellsToRemoveCount = Math.floor(cellCount * waterLevel * 0.4);
    if (cellsToRemoveCount === 0) {
        return cells;
    }

    const idsToRemove = new Set<number>();
    let removedCount = 0;
    const cellMap = new Map(cells.map(c => [c.id, c]));
    let attempts = 0;
    while (removedCount < cellsToRemoveCount && attempts < cellCount) {
        attempts++;
        const startCell = choice(cells, rng);
        if (idsToRemove.has(startCell.id)) continue;

        const maxLakeSize = Math.ceil(waterLevel * 20);
        const lakeSize = randInt(rng, 1, maxLakeSize);
        const lakeCells: Cell[] = [];
        const queue: Cell[] = [startCell];
        const visitedInLake = new Set<number>([startCell.id]);

        while (lakeCells.length < lakeSize && queue.length > 0) {
            const current = queue.shift()!;
            lakeCells.push(current);
            const shuffledNeighbors = shuffle([...current.nei], rng);
            for (const neighborId of shuffledNeighbors) {
                if (lakeCells.length >= lakeSize) break;
                if (!visitedInLake.has(neighborId) && !idsToRemove.has(neighborId)) {
                    const neighborCell = cellMap.get(neighborId);
                    if (neighborCell) {
                       visitedInLake.add(neighborId);
                       queue.push(neighborCell);
                    }
                }
            }
        }
        
        lakeCells.forEach(c => {
            if (!idsToRemove.has(c.id)) {
                idsToRemove.add(c.id);
                removedCount++;
            }
        });
    }

    let currentCells = cells.filter(c => !idsToRemove.has(c.id));
    const islands = findConnectedComponents(currentCells);

    if (islands.length === 0) {
        return cells; // Not enough land left, abort water generation
    }
    
    // Instead of keeping all islands above a certain size, find the single largest one.
    // This ensures the map is always one contiguous landmass.
    let largestIsland = islands[0];
    for (let i = 1; i < islands.length; i++) {
        if (islands[i].size > largestIsland.size) {
            largestIsland = islands[i];
        }
    }
    const validCellIds = largestIsland;


    if (validCellIds.size < cellCount / 4) { // Heuristic: if we removed too much, abort
        return cells;
    }

    const allRemovedIds = new Set<number>();
    cells.forEach(c => {
        if (!validCellIds.has(c.id)) {
            allRemovedIds.add(c.id);
        }
    });

    const finalCells: Cell[] = [];
    const oldIdToNewIdMap = new Map<number, number>();
    
    cells.forEach(c => {
        if (!allRemovedIds.has(c.id)) {
            const newId = finalCells.length;
            oldIdToNewIdMap.set(c.id, newId);
            finalCells.push({ ...c, id: newId });
        }
    });
    
    finalCells.forEach(c => {
        c.nei = c.nei
            .map(oldNid => oldIdToNewIdMap.get(oldNid))
            .filter((newNid): newNid is number => newNid !== undefined);
    });

    return finalCells;
}

function generateRandomLayout(n: number, rng: () => number, waterLevel: number, playersCount: number) {
    // To compensate for cells removed by water, we generate a larger map upfront.
    // The factor is a heuristic. At max water level (1.0), we'll generate 2.5x the cells,
    // which gives the island-finding and water-removal logic more material to work with,
    // resulting in a final map size that is much closer to the target 'n'.
    const initialCellCount = Math.ceil(n * (1 + waterLevel * 1.5));

    const cellsMap = new Map<string, boolean>();
    const frontier = new Set<string>(["0,0"]);
    const keyToCoords = (key: string) => key.split(",").map(Number);
    const coordsToKey = (q: number, r: number) => `${q},${r}`;

    while (cellsMap.size < initialCellCount && frontier.size > 0) {
        let bestCellKey: string | null = null;
        let bestScore = -1;

        const shuffledFrontier = shuffle([...frontier], rng);

        for (const key of shuffledFrontier) {
            const [q, r] = keyToCoords(key);
            let score = 0;
            for (const [dq, dr] of HEX_DIRS) {
                if (cellsMap.has(coordsToKey(q + dq, r + dr))) {
                    score++;
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestCellKey = key;
            }
            if (score >= 2) {
                break;
            }
        }
        
        const keyToAdd = bestCellKey || shuffledFrontier[0];
        frontier.delete(keyToAdd);
        cellsMap.set(keyToAdd, true);

        const [q, r] = keyToCoords(keyToAdd);
        for (const [dq, dr] of HEX_DIRS) {
            const nq = q + dq;
            const nr = r + dr;
            const nkey = coordsToKey(nq, nr);
            if (!cellsMap.has(nkey)) {
                frontier.add(nkey);
            }
        }
    }

    const arr: Cell[] = [];
    const idx = new Map<string, number>();
    let id = 0;
    for (const key of cellsMap.keys()) {
        const [q, r] = key.split(",").map(Number);
        const c: Cell = { id: id++, q, r, owner: -1, dice: 0, nei: [] };
        arr.push(c);
        idx.set(key, c.id);
    }

    for (const c of arr) {
        for (const [dq, dr] of HEX_DIRS) {
            const key = `${c.q + dq},${c.r + dr}`;
            if (idx.has(key)) {
                c.nei.push(idx.get(key)!);
            }
        }
    }

    if (waterLevel > 0) {
        // FIX: Pass playersCount to addWaterToMap.
        const cellsWithWater = addWaterToMap(arr, waterLevel, rng, playersCount);
        return { cells: cellsWithWater };
    }

    return { cells: arr };
}

export function generateMapLayout(settings: GameSettings, rng: () => number): { cells: Cell[] } {
    return generateRandomLayout(settings.cellCount, rng, settings.waterLevel, settings.playersCount);
}


export function assignOwners(cells: Cell[], players: Player[], rng: () => number, compactness: number) {
    let unownedCells = cells.map(c => c.id);
    shuffle(unownedCells, rng);

    for (let i = 0; i < players.length; i++) {
        if (unownedCells.length === 0) break;
        const cellId = unownedCells.pop()!;
        cells[cellId].owner = i;
    }

    let currentPlayer = 0;
    while (unownedCells.length > 0) {
        let foundCell = false;
        
        if (rng() < compactness) {
            const playerCells = cells.filter(c => c.owner === currentPlayer).map(c => c.id);
            shuffle(playerCells, rng);
            let frontier: number[] = [];
            for (const cid of playerCells) {
                frontier.push(...cells[cid].nei.filter(nid => cells[nid].owner === -1));
            }
            if (frontier.length > 0) {
                const targetId = choice(frontier, rng);
                cells[targetId].owner = currentPlayer;
                const index = unownedCells.indexOf(targetId);
                if (index > -1) unownedCells.splice(index, 1);
                foundCell = true;
            }
        }

        if (!foundCell) {
            const randomCellId = unownedCells.pop();
            if (randomCellId !== undefined) {
                cells[randomCellId].owner = currentPlayer;
            }
        }
        currentPlayer = (currentPlayer + 1) % players.length;
    }
    
    players.forEach(p => p.cells.clear());
    for (const c of cells) {
        if (c.owner >= 0) {
            players[c.owner].cells.add(c.id);
        }
    }
}


export function distributeStartingDice(cells: Cell[], players: Player[], rng: () => number) {
    for (const c of cells) {
        c.dice = (c.owner >= 0) ? 1 : 0;
    }

    for (const p of players) {
        const owned = [...p.cells];
        if(owned.length === 0) continue;
        
        let pool = owned.length;
        
        for (let safe = 0; pool > 0 && safe < 5000; safe++) {
            const cid = choice(owned, rng);
            const cell = cells[cid];
            if (cell.dice < 8) {
                cell.dice++;
                pool--;
            }
        }
    }
}

export function generateConquestMap(cells: Cell[], players: Player[], rng: () => number) {
    const civilizationPlayers = players.filter(p => !p.isBarbarian);
    const barbarianPlayer = players.find(p => p.isBarbarian);
    const barbarianId = barbarianPlayer ? barbarianPlayer.id : -1;

    // 1. Find distant starting positions for civilizations
    const starts: Cell[] = [];
    if (cells.length > 0) {
        let potentialStarts = [...cells];
        shuffle(potentialStarts, rng);

        if (potentialStarts.length > 0) {
            starts.push(potentialStarts.pop()!);
        }

        for (let i = 1; i < civilizationPlayers.length; i++) {
            if (potentialStarts.length === 0) break;
            let bestCell: Cell | null = null;
            let maxMinDist = -1;

            // To speed up, check only a subset of potential starts
            const candidatesToCheck = potentialStarts.length > 100 ? shuffle([...potentialStarts], rng).slice(0, 100) : potentialStarts;

            for (const candidate of candidatesToCheck) {
                let minDist = Infinity;
                for (const start of starts) {
                    const d = hexDistance(candidate.q, candidate.r, start.q, start.r);
                    if (d < minDist) minDist = d;
                }
                if (minDist > maxMinDist) {
                    maxMinDist = minDist;
                    bestCell = candidate;
                }
            }
            if (bestCell) {
                starts.push(bestCell);
                potentialStarts = potentialStarts.filter(c => c.id !== bestCell!.id);
            }
        }
    }

    // 2. Assign barbarian ownership and dice to all cells first
    for (const cell of cells) {
        cell.owner = barbarianId;
        cell.dice = randInt(rng, 1, 3);
    }
    
    // 3. Assign civilization starting positions
    starts.forEach((cell, i) => {
        if (i < civilizationPlayers.length) {
            const player = civilizationPlayers[i];
            cells[cell.id].owner = player.id;
            cells[cell.id].dice = 8;
        }
    });

    // 4. Update all player cell sets
    players.forEach(p => p.cells.clear());
    for (const c of cells) {
        if (c.owner >= 0 && c.owner < players.length) {
            players[c.owner].cells.add(c.id);
        }
    }
}