
import React, { useState, useEffect, useCallback, useReducer, useRef, useMemo } from 'react';
import type { GameSettings, GameState, Player, AiDifficulty, GameScreenProps } from '../types';
import Sidebar from './Sidebar';
import GameBoard from './GameBoard';
import { PLAYER_COLORS, HEX_DIRS } from '../constants';
import * as mapGenerator from '../services/mapGenerator';
import * as utils from '../services/utils';
import * as sound from '../services/sound';
import { aiTakeTurn } from '../services/ai';
import { saveGameState, loadGameState } from '../services/storage';


const updatePlayerTotals = (state: GameState): void => {
    state.players.forEach(p => {
        if (p.alive) {
            p.totalDice = [...p.cells].reduce((sum, cid) => sum + state.cells[cid].dice, 0) + p.reserve;
        } else {
            p.totalDice = 0;
        }
    });
};

const MAX_ANIMATION_DURATION = 250; // ms for the slowest setting

const createInitialState = (settings: GameSettings): GameState => {
    // Seed for map generation. Preserved on restart to ensure the same map layout.
    const mapSeed = settings.seed || `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    const mapRng = utils.mulberry32(utils.xmur3(mapSeed)());
    
    const animationDuration = settings.animationSpeedSetting >= 1 ? 0 : MAX_ANIMATION_DURATION * (1 - settings.animationSpeedSetting);
    const personalities: ('aggressive' | 'normal' | 'kind')[] = ['aggressive', 'normal', 'kind'];
    
    let players: Player[];
    let cells: GameState['cells'];
    let logs: string[];
    let activePlayer: number;
    let aiDifficulty: AiDifficulty;

    const createPlayer = (i: number, isHuman: boolean): Player => ({
        id: i,
        human: isHuman,
        name: isHuman ? `Player ${i + 1}` : `AI ${i + 1}`,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        cells: new Set(),
        reserve: 0,
        alive: true,
        personality: utils.choice(personalities, mapRng),
        grudges: new Map(),
        largestRegionSize: 0,
        largestRegionCells: new Set(),
        alliances: new Set(),
        betrayals: new Map(),
        isBarbarian: false,
        totalDice: 0,
        myRollsCount: 0,
        myRollsSum: 0,
        opponentRollsCount: 0,
        opponentRollsSum: 0,
        turnDiceRolled: 0,
        turnSumOfRolls: 0,
    });


    if (settings.customMap) {
        const map = settings.customMap;
        players = Array.from({ length: map.playerCount }, (_, i) => createPlayer(i, map.playerTypes[i] === 'human'));

        cells = map.cells.map((c, i) => ({
            id: i,
            q: c.q,
            r: c.r,
            owner: c.owner,
            dice: c.dice,
            nei: [],
        }));
        
        const cellMap = new Map(cells.map(c => [`${c.q},${c.r}`, c.id]));
        for (const cell of cells) {
            for (const [dq, dr] of HEX_DIRS) {
                const neighborKey = `${cell.q + dq},${cell.r + dr}`;
                if (cellMap.has(neighborKey)) {
                    cell.nei.push(cellMap.get(neighborKey)!);
                }
            }
        }
        
        players.forEach(p => p.cells.clear());
        for (const c of cells) {
            if (c.owner >= 0 && c.owner < players.length) {
                players[c.owner].cells.add(c.id);
            }
        }
        
        logs = [`Game started on map: ${map.mapName}`];
        aiDifficulty = map.aiDifficulty;
        activePlayer = map.firstTurn === 'random'
            ? utils.randInt(mapRng, 0, map.playerCount - 1)
            : map.firstTurn;

    } else {
        players = Array.from({ length: settings.playersCount }, (_, i) => createPlayer(i, i < settings.humanCount));
        
        const generated = mapGenerator.generateMapLayout(settings, mapRng);
        cells = generated.cells;
        const actualCellCount = cells.length;


        if (settings.gameMode === 'conquest') {
            const barbarianPlayer: Player = {
                ...createPlayer(settings.playersCount, false),
                name: 'Barbarians',
                color: '#808080',
                personality: 'aggressive',
                isBarbarian: true,
            };
            players.push(barbarianPlayer);
            mapGenerator.generateConquestMap(cells, players, mapRng);
            logs = ["Conquest has begun!"];
        } else { // Classic mode
            mapGenerator.assignOwners(cells, players, mapRng, settings.territoryCompactness);
            mapGenerator.distributeStartingDice(cells, players, mapRng);
            logs = ["New game has started!"];
        }
        
        aiDifficulty = settings.aiDifficulty;
        activePlayer = utils.randInt(mapRng, 0, settings.playersCount - 1);

        // Turn Order Bonus Logic
        if (settings.gameMode !== 'conquest') {
            let baseBonus = 1;
            if (actualCellCount >= 300) {
                baseBonus = 4;
            } else if (actualCellCount >= 200) {
                baseBonus = 3;
            } else if (actualCellCount >= 100) {
                baseBonus = 2;
            }

            const bonusLogs: string[] = [];
            const playerCount = players.filter(p => !p.isBarbarian).length;
            for (let i = 1; i < playerCount; i++) {
                const bonusDice = i * baseBonus;
                if (bonusDice === 0) continue;
                
                const playerIndex = (activePlayer + i) % playerCount;
                const player = players[playerIndex];
                
                bonusLogs.push(`🎁 ${player.name} gets +${bonusDice} bonus dice.`);
                
                let diceToPlace = bonusDice;
                let safe = 0;
                // Limit the loop to avoid infinite loops on very small territories.
                while (diceToPlace > 0 && safe < 500) {
                    safe++;
                    const targetCells = [...player.cells].filter(cid => cells[cid].dice < 8);
                    if (targetCells.length === 0) break;
                    const targetId = utils.choice(targetCells, mapRng);
                    cells[targetId].dice++;
                    diceToPlace--;
                }
                // If any dice couldn't be placed, add them to the reserve.
                if (diceToPlace > 0) player.reserve += diceToPlace;
            }

            if (bonusLogs.length > 0) {
                logs.unshift(...bonusLogs.reverse());
                logs.unshift(`Turn order bonus awarded! (Base: ${baseBonus})`);
            }
        }
    }
    
    


    const alliances = { A: new Set<number>(), B: new Set<number>() };
    if (settings.alliances) {
        const playerAlliancesMap: { [key: number]: ('A' | 'B')[] } = settings.alliances;
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const p1Alliances = playerAlliancesMap[i] || [];
                const p2Alliances = playerAlliancesMap[j] || [];
                if (p1Alliances.some(a => p2Alliances.includes(a))) {
                    players[i].alliances.add(j);
                    players[j].alliances.add(i);
                }
            }
        }
         for (const playerIdStr in playerAlliancesMap) {
            const playerId = Number(playerIdStr);
            const playerAlliancesList = playerAlliancesMap[playerId];
            if (playerAlliancesList.includes('A')) alliances.A.add(playerId);
            if (playerAlliancesList.includes('B')) alliances.B.add(playerId);
        }
        logs.unshift("Alliances have been forged!");
    }

    const cellByQR = new Map(cells.map(c => [`${c.q},${c.r}`, c.id]));
    
    // Seed for gameplay (dice rolls). A new one is generated on every start/restart.
    const gameplaySeed = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    const gameplayRng = utils.mulberry32(utils.xmur3(gameplaySeed)());

    const initialState: GameState = {
        cells,
        cellByQR,
        players,
        turn: 1,
        active: activePlayer,
        selected: null,
        phase: "play",
        logs,
        animationSpeed: animationDuration,
        isAnimating: false,
        corruptionEnabled: settings.corruption,
        seed: gameplaySeed, // This is the gameplay seed for saving/loading
        rng: gameplayRng, // This is the gameplay RNG
        animation: null,
        aiDifficulty,
        diceDisplay: settings.diceDisplay,
        gameMode: settings.gameMode,
        alliances,
        notification: null,
        notificationDuration: settings.notificationDuration,
        showDiceResults: settings.showDiceResults ?? true,
        diceResultDuration: settings.diceResultDuration ?? 1.5,
    };

    updateAllPlayersLargestRegions(initialState);
    updatePlayerTotals(initialState);
    sound.setEnabled(settings.sound);
    sessionStorage.setItem('gameInProgress', 'true');
    
    return initialState;
};

function initializeGameState(settings: GameSettings): GameState {
    const savedGame = loadGameState();
    const animationDuration = settings.animationSpeedSetting >= 1 ? 0 : MAX_ANIMATION_DURATION * (1 - settings.animationSpeedSetting);

    if (savedGame && !settings.customMap) { // Don't load saved game if a custom map is selected
        savedGame.animationSpeed = animationDuration;
        sound.setEnabled(settings.sound);
        savedGame.corruptionEnabled = settings.corruption;
        savedGame.aiDifficulty = settings.aiDifficulty;
        savedGame.diceDisplay = settings.diceDisplay;
        savedGame.gameMode = savedGame.gameMode || 'classic';
        savedGame.alliances = savedGame.alliances || { A: new Set(), B: new Set() };
        savedGame.notification = null;
        savedGame.notificationDuration = settings.notificationDuration;
        savedGame.showDiceResults = settings.showDiceResults ?? true;
        savedGame.diceResultDuration = settings.diceResultDuration ?? 1.5;

        // Ensure new stats exist on loaded games
        savedGame.players.forEach(p => {
            p.totalDice = p.totalDice ?? 0;
            p.myRollsCount = p.myRollsCount ?? 0;
            p.myRollsSum = p.myRollsSum ?? 0;
            p.opponentRollsCount = p.opponentRollsCount ?? 0;
            p.opponentRollsSum = p.opponentRollsSum ?? 0;
            p.betrayals = p.betrayals ?? new Map();
            p.turnDiceRolled = p.turnDiceRolled ?? 0;
            p.turnSumOfRolls = p.turnSumOfRolls ?? 0;
        });
        updatePlayerTotals(savedGame);
        return savedGame;
    }
    
    return createInitialState(settings);
}


function gameReducer(state: GameState, action: any): GameState {
    switch (action.type) {
        case 'SET_STATE':
            return action.payload;
        case 'SET_ANIMATION':
            return { ...state, animation: action.payload };
        default:
            return state;
    }
}

const findLargestRegion = (player: Player, cells: GameState['cells']): { size: number; cells: Set<number> } => {
    const allPlayerCells = [...player.cells];
    const visited = new Set<number>();
    let regions: { size: number; cells: Set<number> }[] = [];

    const getNeighbors = (cellId: number) => cells[cellId].nei.filter(nId => cells[nId].owner === player.id);

    for (const startCellId of allPlayerCells) {
        if (visited.has(startCellId)) continue;
        const currentCells = new Set<number>();
        const stack = [startCellId];
        visited.add(startCellId);

        while (stack.length > 0) {
            const v = stack.pop()!;
            currentCells.add(v);
            for (const neighborId of getNeighbors(v)) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    stack.push(neighborId);
                }
            }
        }
        regions.push({ size: currentCells.size, cells: currentCells });
    }

    if (regions.length === 0) return { size: 0, cells: new Set() };
    
    const maxSize = Math.max(...regions.map(r => r.size));
    const candidates = regions.filter(r => r.size === maxSize);

    if (candidates.length <= 1) {
        return candidates[0] || { size: 0, cells: new Set() };
    }

    const candidatesWithDice = candidates.map(region => {
        const totalDice = [...region.cells].reduce((sum, cellId) => sum + cells[cellId].dice, 0);
        return { ...region, totalDice };
    });

    candidatesWithDice.sort((a, b) => b.totalDice - a.totalDice);
    const { totalDice, ...bestRegion } = candidatesWithDice[0];
    return bestRegion;
};


const updateAllPlayersLargestRegions = (state: GameState): void => {
    state.players.forEach(p => {
        if (p.alive) {
            const regionData = findLargestRegion(p, state.cells);
            p.largestRegionSize = regionData.size;
            p.largestRegionCells = regionData.cells;
            
            // IMPORTANT RULE: Reserve is strictly capped by the size of the largest region.
            // If the region was cut (size reduced), the reserve MUST burn immediately.
            if (p.reserve > p.largestRegionSize) {
                p.reserve = p.largestRegionSize;
            }
        } else {
            p.largestRegionSize = 0;
            p.largestRegionCells.clear();
            p.reserve = 0;
        }
    });
};

const cloneGameStateForMutation = (state: GameState): GameState => {
    const players = state.players.map(p => ({
        ...p,
        cells: new Set(p.cells),
        largestRegionCells: new Set(p.largestRegionCells),
        grudges: new Map(p.grudges),
        alliances: new Set(p.alliances),
        betrayals: new Map(p.betrayals),
    }));

    const cells = state.cells.map(c => ({
        ...c,
        nei: [...c.nei],
    }));

    return {
        ...state,
        players,
        cells,
        cellByQR: new Map(state.cellByQR),
        logs: [...state.logs],
        alliances: {
            A: new Set(state.alliances.A),
            B: new Set(state.alliances.B),
        },
    };
};

interface BattleResult {
    attackerName: string;
    attackerRoll: number;
    attackerColor: string;
    defenderName: string;
    defenderRoll: number;
    defenderColor: string;
    win: boolean;
}

const GameScreen: React.FC<GameScreenProps> = ({ settings, onNewGame, onReturnToSettings, onRestartGame }) => {
    const [state, dispatch] = useReducer(gameReducer, settings, initializeGameState);
    const [victoryMessage, setVictoryMessage] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showLosingPrompt, setShowLosingPrompt] = useState(false);
    const losingPromptShown = useRef(false);
    const [isParatrooping, setIsParatrooping] = useState(false);
    
    // New state for battle result overlay
    const [battleOverlay, setBattleOverlay] = useState<BattleResult | null>(null);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    useEffect(() => {
        if (state.phase === 'victory') {
            const aliveCivilizations = state.players.filter(p => p.alive && !p.isBarbarian);
            if (aliveCivilizations.length === 1) {
                setVictoryMessage(`Victory: ${aliveCivilizations[0].name}!`);
            } else {
                setVictoryMessage('Draw! All civilizations have been defeated.');
            }
        } else {
            setVictoryMessage(null);
        }
    }, [state.phase, state.players]);

    useEffect(() => {
        if (state.notification && state.notificationDuration > 0) {
            const timer = setTimeout(() => {
                dispatch({ type: 'SET_STATE', payload: { ...state, notification: null } });
            }, state.notificationDuration * 1000);
            return () => clearTimeout(timer);
        }
    }, [state.notification, state.notificationDuration, state]);
    
    // Clean up battle overlay after set duration
    useEffect(() => {
        if (battleOverlay && state.diceResultDuration > 0) {
            const timer = setTimeout(() => {
                setBattleOverlay(null);
            }, state.diceResultDuration * 1000);
            return () => clearTimeout(timer);
        }
    }, [battleOverlay, state.diceResultDuration]);

    
    const getParatroopTargets = useCallback(() => {
        const player = state.players[state.active];
        if (!player || player.reserve < 8) return new Set<number>();
        
        const validTargets = new Set<number>();
        const mainRegion = player.largestRegionCells;
        
        // Optimize by only checking enemy cells
        state.cells.forEach(cell => {
            if (cell.owner !== player.id) {
                // Check distance to any cell in main region
                let minDistance = Infinity;
                for (const regionCellId of mainRegion) {
                    const rCell = state.cells[regionCellId];
                    const d = utils.hexDistance(cell.q, cell.r, rCell.q, rCell.r);
                    if (d < minDistance) minDistance = d;
                    if (minDistance <= 4) break; // Optimization
                }
                
                if (minDistance <= 4) {
                    validTargets.add(cell.id);
                }
            }
        });
        return validTargets;
    }, [state]);

    const paratroopTargets = useMemo(() => isParatrooping ? getParatroopTargets() : new Set<number>(), [isParatrooping, getParatroopTargets]);

    const handleParatroopToggle = () => {
        setIsParatrooping(!isParatrooping);
        dispatch({ type: 'SET_STATE', payload: {...state, selected: null} }); // Deselect
    };

    const resolveParatroopAttack = useCallback((targetId: number) => {
        const newState = cloneGameStateForMutation(state);
        const attackerPlayer = newState.players[newState.active];
        const toCell = newState.cells[targetId];
        const defenderId = toCell.owner;
        const defenderPlayer = newState.players[defenderId];
        
        // Deduct cost
        attackerPlayer.reserve -= 8;
        
        // Attack Strength is 7 (1 burned for drop)
        const attackDice = 7;
        
        const att = utils.rollDice(newState.rng, attackDice);
        const def = utils.rollDice(newState.rng, toCell.dice);
        
        // Update Stats
        attackerPlayer.turnDiceRolled += att.arr.length;
        attackerPlayer.turnSumOfRolls += att.sum;
        attackerPlayer.myRollsCount += att.arr.length;
        attackerPlayer.myRollsSum += att.sum;
        attackerPlayer.opponentRollsCount += def.arr.length;
        attackerPlayer.opponentRollsSum += def.sum;

        if (defenderPlayer) {
             defenderPlayer.myRollsCount += def.arr.length;
             defenderPlayer.myRollsSum += def.sum;
             defenderPlayer.opponentRollsCount += att.arr.length;
             defenderPlayer.opponentRollsSum += att.sum;
        }

        const win = att.sum > def.sum;
        
        if (newState.showDiceResults) {
            setBattleOverlay({
                attackerName: attackerPlayer.name,
                attackerRoll: att.sum,
                attackerColor: attackerPlayer.color,
                defenderName: defenderPlayer ? defenderPlayer.name : 'Neutral',
                defenderRoll: def.sum,
                defenderColor: defenderPlayer ? defenderPlayer.color : '#666',
                win: win
            });
        }

        if (win) {
             sound.play('win');
             const prevOwnerId = toCell.owner;
             if (prevOwnerId >= 0 && prevOwnerId < newState.players.length) {
                newState.players[prevOwnerId].cells.delete(targetId);
             }
             toCell.owner = attackerPlayer.id;
             // Standard rules: attacker dice - 1 move in.
             toCell.dice = attackDice - 1; 
             attackerPlayer.cells.add(targetId);
             newState.logs.unshift(`🪂 ${attackerPlayer.name} paratrooped onto ${targetId}! Victory!`);
        } else {
             sound.play('lose');
             newState.logs.unshift(`🪂 ${attackerPlayer.name} paratroop failed on ${targetId}.`);
        }

        updateAllPlayersLargestRegions(newState);
        updatePlayerTotals(newState);
        
        // Check Victory
        const aliveCivilizations = newState.players.filter((p: Player) => p.alive && !p.isBarbarian);
        if (aliveCivilizations.length <= 1) {
            newState.phase = 'victory';
             if (aliveCivilizations.length === 1) {
                newState.logs.unshift(`🏆 ${aliveCivilizations[0].name} has won the war!`);
            } else {
                newState.logs.unshift(`🏳️ All civilizations have been defeated.`);
            }
        }

        setIsParatrooping(false);
        dispatch({ type: 'SET_STATE', payload: newState });

    }, [state]);


    const initiateAttack = useCallback((fromId: number, toId: number) => {
        if (state.isAnimating) return;
        const fromCell = state.cells[fromId];
        const toCell = state.cells[toId];

        if (!fromCell || !toCell || fromCell.owner === toCell.owner || fromCell.dice < 2) return;
        
        dispatch({
            type: 'SET_STATE',
            payload: {
                ...state,
                isAnimating: true,
                selected: null,
                animation: { fromId, toId, progress: 'highlight' }
            }
        });
    }, [state]);

    const resolveAttack = useCallback((fromId: number, toId: number) => {
        const newState = cloneGameStateForMutation(state);
        
        const fromCell = newState.cells[fromId];
        const toCell = newState.cells[toId];
        const attackerId = fromCell.owner;
        const defenderId = toCell.owner;
        const attackerPlayer = newState.players[attackerId];
        const defenderPlayer = newState.players[defenderId];

        // Betrayal Mechanic: If attacker and defender are allies, this is a betrayal.
        if (attackerPlayer.alliances.has(defenderId)) {
            // Set (or reset) the betrayal flag. Victim gets 2 turns to retaliate.
            defenderPlayer.betrayals.set(attackerId, 2);
            const message = `🔥 ${attackerPlayer.name} betrayed ally ${defenderPlayer.name}!`;
            newState.logs.unshift(message);
            if (newState.notificationDuration > 0) {
                newState.notification = { message, key: Date.now() };
            }
        }

        // Grudge Mechanic: Defender remembers the attack.
        if (defenderPlayer) {
            const currentGrudge = defenderPlayer.grudges.get(attackerId) || 0;
            defenderPlayer.grudges.set(attackerId, currentGrudge + 1);
        }

        const att = utils.rollDice(newState.rng, fromCell.dice);
        const def = utils.rollDice(newState.rng, toCell.dice);
        
        // Update Luck Stats
        attackerPlayer.myRollsCount += att.arr.length;
        attackerPlayer.myRollsSum += att.sum;
        attackerPlayer.opponentRollsCount += def.arr.length;
        attackerPlayer.opponentRollsSum += def.sum;
        
        attackerPlayer.turnDiceRolled += att.arr.length;
        attackerPlayer.turnSumOfRolls += att.sum;

        if (defenderPlayer) {
            defenderPlayer.myRollsCount += def.arr.length;
            defenderPlayer.myRollsSum += def.sum;
            defenderPlayer.opponentRollsCount += att.arr.length;
            defenderPlayer.opponentRollsSum += att.sum;
        }

        const win = att.sum > def.sum;
        let resultText = "";
        
        // TRIGGER BATTLE OVERLAY: Only if setting is on AND (Attacker is Human OR Defender is Human)
        if (newState.showDiceResults && (attackerPlayer.human || defenderPlayer?.human)) {
            setBattleOverlay({
                attackerName: attackerPlayer.name,
                attackerRoll: att.sum,
                attackerColor: attackerPlayer.color,
                defenderName: defenderPlayer ? defenderPlayer.name : 'Neutral',
                defenderRoll: def.sum,
                defenderColor: defenderPlayer ? defenderPlayer.color : '#666',
                win: win
            });
        }

        if (win) {
            sound.play('win');
            const prevOwnerId = toCell.owner;
            newState.cells[toId].owner = fromCell.owner;
            newState.cells[toId].dice = fromCell.dice - 1;
            newState.cells[fromId].dice = 1;
            
            if (prevOwnerId >= 0 && prevOwnerId < newState.players.length) {
                const prevOwnerPlayer = newState.players[prevOwnerId];
                prevOwnerPlayer.cells.delete(toId);
            }
            attackerPlayer.cells.add(toId);
            resultText = `Attack successful.`;
        } else {
            sound.play('lose');
            newState.cells[fromId].dice = 1;
            resultText = att.sum === def.sum ? `Draw - defender wins.` : `Attack failed.`;
        }
        
        const avgAtt = `(${(att.sum / att.arr.length).toFixed(2)})`;
        const avgDef = `(${(def.sum / def.arr.length).toFixed(2)})`;
        newState.logs.unshift(`🎲 ${attackerPlayer.name}: ${fromId}→${toId} | ${att.sum} ${avgAtt} vs ${def.sum} ${avgDef}. ${resultText}`);
        
        // This will update the map state AND clamp reserves if the map was cut
        updateAllPlayersLargestRegions(newState);
        updatePlayerTotals(newState);

        newState.players.forEach((p: Player) => {
            p.alive = p.cells.size > 0;
        });
        
        const aliveCivilizations = newState.players.filter((p: Player) => p.alive && !p.isBarbarian);
        
        if (aliveCivilizations.length <= 1) {
            newState.phase = 'victory';
            if (aliveCivilizations.length === 1) {
                newState.logs.unshift(`🏆 ${aliveCivilizations[0].name} has won the war!`);
            } else {
                newState.logs.unshift(`🏳️ All civilizations have been defeated.`);
            }
        }
        
        newState.isAnimating = false;
        newState.animation = null;
        dispatch({ type: 'SET_STATE', payload: newState });

    }, [state]);

    const endTurn = useCallback(() => {
        if (state.phase !== 'play' || state.isAnimating) return;
        setIsParatrooping(false); // Reset mode on turn end
        
        const newState = cloneGameStateForMutation(state);
        const player = newState.players[newState.active];
        
        // Decrement betrayal timers at the end of the victim's turn.
        if (player.betrayals.size > 0) {
            const newBetrayals = new Map<number, number>();
            for (const [traitorId, turnsLeft] of player.betrayals.entries()) {
                if (turnsLeft > 1) {
                    newBetrayals.set(traitorId, turnsLeft - 1);
                } else {
                    const message = `🕊️ ${player.name} has forgiven ${newState.players[traitorId].name}.`;
                    newState.logs.unshift(message);
                    if (newState.notificationDuration > 0) {
                        newState.notification = { message, key: Date.now() };
                    }
                }
            }
            player.betrayals = newBetrayals;
        }

        // Log turn luck before resetting
        if (player.turnDiceRolled > 0) {
            const turnAvg = (player.turnSumOfRolls / player.turnDiceRolled).toFixed(2);
            newState.logs.unshift(`📜 ${player.name}'s turn avg roll: ${turnAvg}`);
        }
        player.turnDiceRolled = 0;
        player.turnSumOfRolls = 0;

        const currentReinforcements = player.isBarbarian ? Math.floor(player.cells.size / 8) : player.largestRegionSize;
        let toPlace = currentReinforcements + player.reserve;

        if (currentReinforcements > 0 || player.reserve > 0) {
            newState.logs.unshift(`➕ Reinforcements for ${player.name}: +${currentReinforcements} (territory) +${player.reserve} (reserve) = ${toPlace} total.`);
        }
        player.reserve = 0; // Clear reserve before placing (it gets refilled with remainder)

        let safe = 0;
        while (toPlace > 0 && safe < 5000) {
            safe++;
            const maxDice = player.isBarbarian ? 3 : 8;
            const targetCells = [...player.cells].filter((cid: number) => newState.cells[cid].dice < maxDice);
            if (targetCells.length === 0) break;
            const targetId = utils.choice(targetCells, newState.rng);

            if (newState.corruptionEnabled && !player.largestRegionCells.has(targetId) && !player.isBarbarian) {
                if (newState.rng() < 0.5) {
                    toPlace--;
                    newState.logs.unshift(`-1 die for ${player.name} lost to corruption!`);
                    continue;
                }
            }
            newState.cells[targetId].dice++;
            toPlace--;
        }

        if (toPlace > 0) {
            // Reserve logic: any remaining dice go to reserve.
            player.reserve = toPlace;
            // Immediate Cap Logic: The reserve cannot exceed the largest region size.
            if (player.reserve > player.largestRegionSize) {
                const burned = player.reserve - player.largestRegionSize;
                player.reserve = player.largestRegionSize;
                newState.logs.unshift(`🔥 ${player.name} had too many reserves! ${burned} dice burned.`);
            } else {
                newState.logs.unshift(`📦 ${player.name} stored ${toPlace} dice in reserve.`);
            }
        }
        
        updateAllPlayersLargestRegions(newState);
        updatePlayerTotals(newState);

        let nextPlayerId = newState.active;
        let loopGuard = 0;
        do {
            nextPlayerId = (nextPlayerId + 1) % newState.players.length;
            loopGuard++;
        } while (!newState.players[nextPlayerId].alive && loopGuard < newState.players.length * 2);
        
        if(newState.players[nextPlayerId].alive) {
            newState.active = nextPlayerId;
        }

        if (loopGuard >= newState.players.length * 2) {
             console.error("Infinite loop detected in endTurn");
        }

        const alivePlayerCount = newState.players.filter(p => p.alive).length;
        if (alivePlayerCount > 0) {
            newState.turn += 1 / alivePlayerCount;
        }
        
        newState.selected = null;
        
        dispatch({ type: 'SET_STATE', payload: newState });
        sound.play('turn');
    }, [state]);

    const resolveSurrender = useCallback((currentState: GameState, fromId: number, toId?: number): GameState => {
        const newState = cloneGameStateForMutation(currentState);
        const surrenderingPlayer = newState.players[fromId];

        if (!surrenderingPlayer || !surrenderingPlayer.alive) {
            return newState;
        }

        sound.play('lose');
        
        // TARGETED SURRENDER LOGIC (e.g., AI giving up to specific player)
        // Rule: All territories go to 'toId', dice become Recipient's Average.
        if (toId !== undefined && toId >= 0 && newState.players[toId]?.alive) {
            const recipient = newState.players[toId];
            const message = `🏳️ ${surrenderingPlayer.name} surrenders to ${recipient.name}!`;
            newState.logs.unshift(message);

            if (newState.notificationDuration > 0) {
                newState.notification = { message, key: Date.now() };
            }

            // Calculate average dice of recipient
            const recipientDiceSum = [...recipient.cells].reduce((sum, cid) => sum + newState.cells[cid].dice, 0);
            const avgDice = Math.max(1, Math.round(recipientDiceSum / Math.max(1, recipient.cells.size)));

            surrenderingPlayer.cells.forEach(cellId => {
                const cell = newState.cells[cellId];
                cell.owner = toId;
                // Update dice to match recipient's average strength
                cell.dice = avgDice; 
                recipient.cells.add(cellId);
            });

        } else {
            // NEIGHBOR DISTRIBUTION LOGIC (Fallback or default surrender)
            // Rule: Distribute to neighbors based on dominance. Dice count is PRESERVED.
            const message = `🏳️ ${surrenderingPlayer.name} has surrendered! Territories (and dice) are distributed to neighbors.`;
            newState.logs.unshift(message);

            if (newState.notificationDuration > 0) {
                newState.notification = { message, key: Date.now() };
            }

            // Calculate the strongest player once as a fallback for islands
            const strongest = newState.players
                .filter(p => p.alive && !p.isBarbarian && p.id !== fromId)
                .sort((a, b) => b.cells.size - a.cells.size)[0];

            // Distribute cells logic
            surrenderingPlayer.cells.forEach(cellId => {
                const cell = newState.cells[cellId];
                
                // Find neighbor players and count their presence (how many neighbors does each player own?)
                const neighborCounts = new Map<number, number>();
                let maxCount = 0;
                
                cell.nei.forEach(nid => {
                    const neighborCell = newState.cells[nid];
                    const nOwnerId = neighborCell.owner;
                    
                    if (nOwnerId !== -1 && nOwnerId !== fromId && newState.players[nOwnerId].alive) {
                        const count = (neighborCounts.get(nOwnerId) || 0) + 1;
                        neighborCounts.set(nOwnerId, count);
                        if (count > maxCount) {
                            maxCount = count;
                        }
                    }
                });

                let bestOwnerId = -1;

                if (neighborCounts.size > 0) {
                    // Find players with max neighbors
                    const candidates: number[] = [];
                    for (const [pid, count] of neighborCounts.entries()) {
                        if (count === maxCount) {
                            candidates.push(pid);
                        }
                    }
                    // Pick one of the top surrounders (randomly if tied)
                    bestOwnerId = candidates[Math.floor(newState.rng() * candidates.length)];
                } else {
                    // No neighbors? Assign to strongest player in game (fallback for islands)
                    if (strongest) {
                        bestOwnerId = strongest.id;
                    }
                }

                if (bestOwnerId !== -1) {
                    cell.owner = bestOwnerId;
                    // Dice remain exactly as they were.
                    newState.players[bestOwnerId].cells.add(cellId);
                } else {
                    // Fallback: Barbarian/Neutral if literally no one else exists
                    cell.owner = -1; 
                    cell.dice = 1;
                }
            });
        }

        surrenderingPlayer.cells.clear();
        surrenderingPlayer.alive = false;

        updateAllPlayersLargestRegions(newState);
        updatePlayerTotals(newState);
        
        const aliveCivilizations = newState.players.filter(p => p.alive && !p.isBarbarian);
        if (aliveCivilizations.length <= 1) {
            newState.phase = 'victory';
            if (aliveCivilizations.length === 1) {
                newState.logs.unshift(`🏆 ${aliveCivilizations[0].name} has won the war!`);
            } else {
                newState.logs.unshift(`🏳️ All civilizations have been defeated.`);
            }
        } else {
            if (newState.active === fromId) {
                let nextPlayerId = newState.active;
                let loopGuard = 0;
                do {
                    nextPlayerId = (nextPlayerId + 1) % newState.players.length;
                    loopGuard++;
                } while (!newState.players[nextPlayerId].alive && loopGuard < newState.players.length * 2);
                
                if(newState.players[nextPlayerId].alive) {
                    newState.active = nextPlayerId;
                }
            }
        }
        return newState;
    }, []);

    useEffect(() => {
        if (!state.animation) return;
        
        if (state.animationSpeed <= 0) {
            resolveAttack(state.animation.fromId, state.animation.toId);
            return;
        }

        if (state.animation.progress === 'highlight') {
            const timer = setTimeout(() => {
                sound.play('attack');
                dispatch({ type: 'SET_ANIMATION', payload: { ...state.animation, progress: 'traveling' } });
            }, 40); // Shorter highlight for faster overall feel
            return () => clearTimeout(timer);
        }

        if (state.animation.progress === 'traveling') {
            const timer = setTimeout(() => {
                resolveAttack(state.animation!.fromId, state.animation!.toId);
            }, state.animationSpeed);
            return () => clearTimeout(timer);
        }
    }, [state.animation, resolveAttack, state.animationSpeed]);


    const handleCellClick = useCallback((id: number | null) => {
        if (state.phase !== 'play' || state.isAnimating || id === null || showLosingPrompt) return;
        
        const player = state.players[state.active];
        if (!player.human) return;
        
        // PARATROOP LOGIC
        if (isParatrooping) {
            if (paratroopTargets.has(id)) {
                resolveParatroopAttack(id);
            } else {
                // Click invalid target -> Cancel
                setIsParatrooping(false);
            }
            return;
        }
        
        // STANDARD ATTACK LOGIC
        const cell = state.cells[id];

        if (state.selected === null) {
            if (cell.owner === state.active && cell.dice >= 2) {
                dispatch({ type: 'SET_STATE', payload: {...state, selected: id } });
            }
        } else {
            const fromCell = state.cells[state.selected];
            if (cell.owner === state.active) {
                dispatch({ type: 'SET_STATE', payload: {...state, selected: cell.dice >= 2 ? id : null } });
            } else if (fromCell.nei.includes(id)) {
                initiateAttack(state.selected, id);
            } else {
                dispatch({ type: 'SET_STATE', payload: {...state, selected: null } });
            }
        }
    }, [state, initiateAttack, showLosingPrompt, isParatrooping, paratroopTargets, resolveParatroopAttack]);
    
    useEffect(() => {
        const player = state.players[state.active];
        if (state.phase !== 'play' || state.isAnimating) return;

        if (player && !player.human) {
            const runAI = async () => {
                const move = await aiTakeTurn(state);
                if (move) {
                    if ('surrenderTo' in move) {
                        const target = move.surrenderTo === -1 ? undefined : move.surrenderTo;
                        const finalState = resolveSurrender(state, state.active, target);
                        dispatch({ type: 'SET_STATE', payload: finalState });
                    } else if ('fromId' in move) {
                         initiateAttack(move.fromId, move.toId);
                    }
                } else {
                    endTurn();
                }
            };
            const delay = state.animationSpeed > 0 ? 50 + state.animationSpeed : 50;
            setTimeout(runAI, delay);
        } else if (player && player.human && !losingPromptShown.current) {
             const alivePlayers = state.players.filter(p => p.alive && !p.isBarbarian);
             if (alivePlayers.length > 1) {
                const strongestPlayer = [...alivePlayers].sort((a, b) => b.cells.size - a.cells.size)[0];
                const isConquestEarlyGame = state.gameMode === 'conquest' && Math.floor(state.turn) < 5;

                if (!isConquestEarlyGame && strongestPlayer.id !== player.id && player.cells.size > 0) {
                    const playerStrength = player.cells.size;
                    const strongestStrength = strongestPlayer.cells.size;
                    const totalDicePlayer = [...player.cells].reduce((sum, cid) => sum + state.cells[cid].dice, 0);
                    const totalDiceStrongest = [...strongestPlayer.cells].reduce((sum, cid) => sum + state.cells[cid].dice, 0);

                    // Suggest surrender if significantly weaker in both territory and dice count
                    if (strongestStrength > 0 && totalDiceStrongest > 0 &&
                        (playerStrength / strongestStrength) < 0.2 &&
                        (totalDicePlayer / totalDiceStrongest) < 0.2
                    ) {
                        setShowLosingPrompt(true);
                        losingPromptShown.current = true;
                    }
                }
             }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.active, state.turn, state.isAnimating]);

    const handleReturnToSettingsClick = () => {
        saveGameState(state);
        onReturnToSettings(state);
    };

    const handleExit = () => window.location.href = 'https://Apsardze24.lv';
    
    const blinkingPlayerIds = useMemo(() => {
        const ids = new Set<number>();
        const activePlayer = state.players[state.active];
        if (state.phase !== 'play' || !activePlayer) return ids;
        
        const activePlayerId = activePlayer.id;

        // Add players who have betrayed the active player
        for (const traitorId of activePlayer.betrayals.keys()) {
            ids.add(traitorId);
            ids.add(activePlayerId); // If someone betrayed us, the relationship is broken, so both blink
        }

        // Check for players whom the active player has betrayed
        for (const player of state.players) {
            if (player.betrayals.has(activePlayerId)) {
                ids.add(player.id);
                ids.add(activePlayerId); // If we betrayed someone, the relationship is broken, so both blink
            }
        }
        
        return ids;
    }, [state.players, state.active, state.phase]);

    return (
        <div className="h-screen w-screen flex flex-col-reverse lg:flex-row bg-[#070a17]">
            {state.notification && (
                 <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#131a33] border border-[#1c2450] p-8 rounded-2xl text-center shadow-lg max-w-sm">
                        <p className="text-gray-200 mb-6 text-lg">{state.notification.message}</p>
                        <button 
                            onClick={() => dispatch({ type: 'SET_STATE', payload: {...state, notification: null} })} 
                            className="w-full bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-500 text-white font-bold py-3 px-6 rounded-lg"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
            
            {battleOverlay && (
                <div className="absolute top-16 left-0 right-0 flex justify-center z-40 pointer-events-none">
                    <div className="bg-black/80 backdrop-blur-md border border-white/20 px-6 py-2 rounded-full shadow-2xl flex items-center gap-4 animate-bounce-short">
                        <span className="font-bold text-lg" style={{ color: battleOverlay.attackerColor }}>{battleOverlay.attackerRoll}</span>
                        <span className="text-gray-400 text-xs font-mono">VS</span>
                        <span className="font-bold text-lg" style={{ color: battleOverlay.defenderColor }}>{battleOverlay.defenderRoll}</span>
                    </div>
                </div>
            )}
            
            {victoryMessage && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#131a33] border border-[#1c2450] p-8 rounded-2xl text-center shadow-lg">
                        <h2 className="text-3xl font-bold mb-4">{victoryMessage}</h2>
                        <div className="flex flex-col sm:flex-row gap-4 mt-6">
                            <button onClick={onRestartGame} className="bg-gradient-to-b from-green-600 to-green-800 border border-green-500 text-white font-bold py-2 px-6 rounded-lg">
                                Play Again
                            </button>
                            <button onClick={onNewGame} className="bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-500 text-white font-bold py-2 px-6 rounded-lg">
                                New Game
                            </button>
                             <button onClick={handleExit} className="bg-gradient-to-b from-gray-600 to-gray-800 border border-gray-500 text-white font-bold py-2 px-6 rounded-lg">
                                Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showLosingPrompt && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#131a33] border border-[#1c2450] p-8 rounded-2xl text-center shadow-lg max-w-sm">
                        <h2 className="text-2xl font-bold mb-2">The War is Not in Your Favor</h2>
                        <p className="text-gray-300 mb-6">Your chances of victory are slim. How do you wish to proceed?</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => { setShowLosingPrompt(false); onRestartGame(); }} className="w-full bg-gradient-to-b from-green-600 to-green-800 border border-green-500 text-white font-bold py-3 px-6 rounded-lg">Restart This Map</button>
                            <button onClick={() => { setShowLosingPrompt(false); onNewGame(); }} className="w-full bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-500 text-white font-bold py-3 px-6 rounded-lg">Start a New Game</button>
                            <button onClick={() => setShowLosingPrompt(false)} className="w-full bg-gradient-to-b from-gray-600 to-gray-800 border border-gray-500 text-white font-bold py-3 px-6 rounded-lg">Continue Fighting</button>
                        </div>
                    </div>
                </div>
            )}
            <Sidebar
                state={state}
                onEndTurn={endTurn}
                onReturnToSettings={handleReturnToSettingsClick}
                onNewGame={onNewGame}
                onRestartGame={onRestartGame}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
                isParatrooping={isParatrooping}
                onToggleParatroop={handleParatroopToggle}
            />
            <main className="relative min-w-0 flex-grow h-full w-full">
                {(state.alliances.A.size > 0 || state.alliances.B.size > 0) && (
                    <div className="absolute top-0 left-0 right-0 z-20 flex flex-row items-center justify-center gap-x-3 p-1 bg-black/50 backdrop-blur-sm">
                        {state.alliances.A.size > 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-300">A:</span>
                                <div className="flex items-center gap-1">
                                    {Array.from(state.alliances.A).map(playerId => (
                                        state.players[playerId]?.alive && <div key={`a-${playerId}`} className={`w-4 h-4 rounded-full border border-white/40 ${blinkingPlayerIds.has(playerId) ? 'blinking' : ''}`} style={{ backgroundColor: state.players[playerId].color }} title={state.players[playerId].name} />
                                    ))}
                                </div>
                            </div>
                        )}
                        {state.alliances.A.size > 0 && state.alliances.B.size > 0 && (
                            <div className="h-4 w-px bg-gray-600"></div>
                        )}
                        {state.alliances.B.size > 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-gray-300">B:</span>
                                 <div className="flex items-center gap-1">
                                    {Array.from(state.alliances.B).map(playerId => (
                                        state.players[playerId]?.alive && <div key={`b-${playerId}`} className={`w-4 h-4 rounded-full border border-white/40 ${blinkingPlayerIds.has(playerId) ? 'blinking' : ''}`} style={{ backgroundColor: state.players[playerId].color }} title={state.players[playerId].name} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {isParatrooping && (
                    <div className="absolute top-16 lg:top-4 left-1/2 transform -translate-x-1/2 z-30 bg-yellow-900/90 border border-yellow-500 text-yellow-100 px-4 py-2 rounded-full shadow-xl animate-pulse font-bold text-sm pointer-events-none">
                        SELECT TARGET TO PARATROOP
                    </div>
                )}

                <GameBoard
                    state={state}
                    onCellClick={handleCellClick}
                    paratroopTargets={paratroopTargets}
                />
            </main>
        </div>
    );
};

export default GameScreen;
