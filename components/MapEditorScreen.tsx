




import React, { useState, useRef, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import type { CustomMap, CustomMapCell, AiDifficulty } from '../types';
import { PLAYER_COLORS } from '../constants';
import { axialToPixel } from '../services/utils';
import { PRE_GENERATED_SHAPES } from '../services/aiMapGenerator';


interface MapEditorProps {
    onStartGame: (map: CustomMap) => void;
    onReturnToSettings: () => void;
}

interface Point { x: number; y: number; }

const HEX_SIZE = 28;
const EDITOR_RADIUS = 15;

const generateBaseGrid = (radius: number): CustomMapCell[] => {
    const cells: CustomMapCell[] = [];
    for (let q = -radius; q <= radius; q++) {
        const r1 = Math.max(-radius, -q - radius);
        const r2 = Math.min(radius, -q + radius);
        for (let r = r1; r <= r2; r++) {
            cells.push({ q, r, owner: -1, dice: 1 });
        }
    }
    return cells;
};


const MapEditorScreen: React.FC<MapEditorProps> = ({ onStartGame, onReturnToSettings }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const initialCenterDone = useRef(false);
    
    const [mapName, setMapName] = useState("My Custom Map");
    const [playerCount, setPlayerCount] = useState(4);
    const [playerTypes, setPlayerTypes] = useState<('human' | 'ai')[]>(() => ['human', ...Array(7).fill('ai')]);
    const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('hard');
    const [firstTurn, setFirstTurn] = useState<number | 'random'>('random');

    const [cells, setCells] = useState<CustomMapCell[]>(() => generateBaseGrid(EDITOR_RADIUS));
    const cellMap = useMemo(() => new Map(cells.map(c => [`${c.q},${c.r}`, c])), [cells]);

    const [activeTool, setActiveTool] = useState<{ type: 'player'; index: number } | { type: 'eraser' }>({ type: 'player', index: 0 });
    const [activeDice, setActiveDice] = useState(1);
    
    const [viewTransform, setViewTransform] = useState({ scale: 1, x: 0, y: 0 });
    const isInteracting = useRef(false);
    const hasDragged = useRef(false);
    const lastPanPoint = useRef<Point>({ x: 0, y: 0 });
    const pinchDist = useRef(0);
    

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const observer = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setCanvasSize({ width, height });
        });
        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && canvasSize.width > 0 && canvasSize.height > 0) {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvasSize.width * dpr;
            canvas.height = canvasSize.height * dpr;

            if (!initialCenterDone.current) {
                const activeCells = cells.filter(c => c.owner !== -1);
                const cellsToCenter = activeCells.length > 0 ? activeCells : cells.filter(c => Math.abs(c.q) <= 5 && Math.abs(c.r) <= 5 && Math.abs(c.q + c.r) <= 5);

                if (cellsToCenter.length > 0) {
                    const pts = cellsToCenter.map(c => axialToPixel(c.q, c.r, HEX_SIZE));
                    const xs = pts.map(p => p[0]);
                    const ys = pts.map(p => p[1]);
                    const minx = Math.min(...xs), maxx = Math.max(...xs);
                    const miny = Math.min(...ys), maxy = Math.max(...ys);
                    
                    const mapContentWidth = maxx - minx + HEX_SIZE * 4;
                    const mapContentHeight = maxy - miny + HEX_SIZE * 4;
                    const cx = (minx + maxx) / 2;
                    const cy = (miny + maxy) / 2;

                    const scale = Math.min(canvasSize.width / mapContentWidth, canvasSize.height / mapContentHeight, 1) * 0.9;
                    
                    setViewTransform({
                        scale,
                        x: canvasSize.width / 2 - cx * scale,
                        y: canvasSize.height / 2 - cy * scale
                    });
                    initialCenterDone.current = true;
                }
            }
        }
    }, [canvasSize, cells]);


    const getCoordsFromEvent = useCallback((e: MouseEvent | TouchEvent): Point[] => {
        const canvas = canvasRef.current;
        if (!canvas) return [];
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return Array.from(e.touches).map(touch => ({ x: touch.clientX - rect.left, y: touch.clientY - rect.top }));
        }
        return [{ x: e.clientX - rect.left, y: e.clientY - rect.top }];
    }, []);

    const pickCellKey = useCallback((screenPoint: Point): string | null => {
        const worldX = (screenPoint.x - viewTransform.x) / viewTransform.scale;
        const worldY = (screenPoint.y - viewTransform.y) / viewTransform.scale;
        
        const q_frac = (Math.sqrt(3)/3 * worldX - 1/3 * worldY) / HEX_SIZE;
        const r_frac = (2/3 * worldY) / HEX_SIZE;
        const s_frac = -q_frac - r_frac;

        let q = Math.round(q_frac);
        let r = Math.round(r_frac);
        let s = Math.round(s_frac);

        const q_diff = Math.abs(q - q_frac);
        const r_diff = Math.abs(r - r_frac);
        const s_diff = Math.abs(s - s_frac);

        if (q_diff > r_diff && q_diff > s_diff) {
            q = -r - s;
        } else if (r_diff > s_diff) {
            r = -q - s;
        }
        
        const key = `${q},${r}`;
        return cellMap.has(key) ? key : null;
    }, [viewTransform, cellMap]);


    const handlePaint = useCallback((point: Point) => {
        const cellKey = pickCellKey(point);
        if (!cellKey) return;

        setCells(prevCells => {
            const newCells = [...prevCells];
            const cellIndex = newCells.findIndex(c => c.q === cellMap.get(cellKey)!.q && c.r === cellMap.get(cellKey)!.r);
            if (cellIndex === -1) return prevCells;
            
            const cellToPaint = { ...newCells[cellIndex] };
            let changed = false;

            if (activeTool.type === 'player') {
                if (cellToPaint.owner !== activeTool.index || cellToPaint.dice !== activeDice) {
                    cellToPaint.owner = activeTool.index;
                    cellToPaint.dice = activeDice;
                    changed = true;
                }
            } else { // Eraser
                if (cellToPaint.owner !== -1) {
                    cellToPaint.owner = -1;
                    cellToPaint.dice = 1;
                    changed = true;
                }
            }

            if (changed) {
                newCells[cellIndex] = cellToPaint;
                return newCells;
            }
            return prevCells;
        });
    }, [pickCellKey, activeTool, activeDice, cellMap]);
    

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.translate(viewTransform.x, viewTransform.y);
        ctx.scale(viewTransform.scale, viewTransform.scale);

        cells.forEach(cell => {
            const [x, y] = axialToPixel(cell.q, cell.r, HEX_SIZE);
            ctx.save();
            ctx.translate(x,y);
            
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 180) * (60 * i - 30);
                ctx.lineTo(HEX_SIZE * Math.cos(angle), HEX_SIZE * Math.sin(angle));
            }
            ctx.closePath();
            
            ctx.fillStyle = cell.owner >= 0 ? PLAYER_COLORS[cell.owner] : '#303a6a';
            ctx.fill();
            ctx.strokeStyle = '#0b0f2a';
            ctx.lineWidth = 1 / viewTransform.scale;
            ctx.stroke();

            if (cell.owner >= 0) {
                ctx.font = `700 ${16 / viewTransform.scale}px ui-sans-serif, system-ui`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(String(cell.dice), 0, 0.5 / viewTransform.scale);
            }
            ctx.restore();
        });

        ctx.restore();
    }, [cells, viewTransform, canvasSize]);

    const stats = useMemo(() => {
        const s = Array(playerCount).fill(null).map(() => ({ cells: 0, dice: 0 }));
        cells.forEach(c => {
            if (c.owner >= 0 && c.owner < playerCount) {
                s[c.owner].cells++;
                s[c.owner].dice += c.dice;
            }
        });
        return s;
    }, [cells, playerCount]);

    const createMapObject = (): CustomMap | null => {
        if (!mapName.trim()) {
            alert("Please enter a map name before proceeding.");
            return null;
        }
        const activeCells = cells.filter(c => c.owner !== -1);
        if (activeCells.length === 0) {
            alert("The map is empty! Please draw some territories.");
            return null;
        }
        return {
            mapName: mapName.trim(),
            playerCount,
            cells: activeCells.map(({ q, r, owner, dice }) => ({ q, r, owner, dice })),
            playerTypes: playerTypes.slice(0, playerCount),
            aiDifficulty,
            firstTurn,
        };
    };

    const loadMapData = (map: CustomMap) => {
        if (!map.mapName || !map.playerCount || !Array.isArray(map.cells) || !map.playerTypes || !map.aiDifficulty || map.firstTurn === undefined) {
            throw new Error("Invalid or incomplete map format.");
        }
        
        const newGrid = generateBaseGrid(EDITOR_RADIUS);
        const loadedCellMap = new Map(map.cells.map(c => [`${c.q},${c.r}`, c]));
        
        newGrid.forEach(gridCell => {
            const key = `${gridCell.q},${gridCell.r}`;
            if (loadedCellMap.has(key)) {
                const loadedCell = loadedCellMap.get(key)!;
                gridCell.owner = loadedCell.owner;
                gridCell.dice = loadedCell.dice;
            }
        });

        setMapName(map.mapName);
        setPlayerCount(map.playerCount);
        setAiDifficulty(map.aiDifficulty);
        setFirstTurn(map.firstTurn);
        setPlayerTypes(currentTypes => {
            const newTypes = [...currentTypes];
            map.playerTypes.forEach((t, i) => newTypes[i] = t);
            return newTypes;
        });
        setCells(newGrid);
        initialCenterDone.current = false;
    };


    const handleSaveToFile = () => {
        const mapData = createMapObject();
        if (!mapData) return;

        const content = JSON.stringify(mapData, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mapData.mapName.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const map = JSON.parse(e.target?.result as string) as CustomMap;
                loadMapData(map);
            } catch (err) {
                alert(`Error loading map: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
        };
        reader.readAsText(file);
        if (event.target) {
            event.target.value = '';
        }
    };
    
    const handlePlay = () => {
        const mapData = createMapObject();
        if (mapData) onStartGame(mapData);
    };

    const handleLoadAIShape = () => {
        if (PRE_GENERATED_SHAPES.length === 0) return;
        const shape = PRE_GENERATED_SHAPES[Math.floor(Math.random() * PRE_GENERATED_SHAPES.length)];

        const newGrid = generateBaseGrid(EDITOR_RADIUS);
        const shapeCoordKeys = new Set(shape.coords.map(c => `${c.q},${c.r}`));

        newGrid.forEach(gridCell => {
            const key = `${gridCell.q},${gridCell.r}`;
            if (shapeCoordKeys.has(key)) {
                // Assign to player 0 by default so it's visible and editable
                gridCell.owner = 0;
                gridCell.dice = 1;
            } else {
                gridCell.owner = -1;
                gridCell.dice = 1;
            }
        });

        setCells(newGrid);
        setMapName(shape.name);
        initialCenterDone.current = false; // Recenter the view on the new shape
    };

    const handleInteractionEnd = useCallback(() => {
        isInteracting.current = false;
        pinchDist.current = 0;
    }, []);

    const handleInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isInteracting.current) return;
        e.preventDefault();
        const points = getCoordsFromEvent(e);
        
        if (points.length === 1) { // Pan
            const dx = points[0].x - lastPanPoint.current.x;
            const dy = points[0].y - lastPanPoint.current.y;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                hasDragged.current = true;
            }
            setViewTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            lastPanPoint.current = points[0];
        } else if (points.length >= 2) { // Zoom
            hasDragged.current = true;
            const newDist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            if (pinchDist.current === 0) {
                pinchDist.current = newDist;
                return;
            }
            const scaleFactor = newDist / pinchDist.current;
            pinchDist.current = newDist;
            
            const midPoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
            
            setViewTransform(prev => {
                const newScale = Math.max(0.2, Math.min(3, prev.scale * scaleFactor));
                if (Math.abs(newScale - prev.scale) < 0.001) return prev;
                // Fix: Corrected reference from 'point' to 'midPoint' for pinch-zoom calculations.
                const newX = midPoint.x - (midPoint.x - prev.x) * (newScale / prev.scale);
                // Fix: Corrected reference from 'point' to 'midPoint' for pinch-zoom calculations.
                const newY = midPoint.y - (midPoint.y - prev.y) * (newScale / prev.scale);
                return { scale: newScale, x: newX, y: newY };
            });
        }
    }, [getCoordsFromEvent]);
    
    const handleInteractionStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const points = getCoordsFromEvent(e.nativeEvent);
        if(points.length === 0) return;
        isInteracting.current = true;
        hasDragged.current = false;
        lastPanPoint.current = points[0];
        if (points.length >= 2) {
            pinchDist.current = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        }
    }, [getCoordsFromEvent]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        const point = getCoordsFromEvent(e.nativeEvent)[0];
        const scaleFactor = 1 - e.deltaY * 0.001;
        setViewTransform(prev => {
            const newScale = Math.max(0.2, Math.min(3, prev.scale * scaleFactor));
            const newX = point.x - (point.x - prev.x) * (newScale / prev.scale);
            const newY = point.y - (point.y - prev.y) * (newScale / prev.scale);
            return { scale: newScale, x: newX, y: newY };
        });
    }, [getCoordsFromEvent]);
    
    useEffect(() => {
        const moveHandler = (e: MouseEvent | TouchEvent) => {
            if (isInteracting.current) handleInteractionMove(e);
        };
        const endHandler = () => {
            if (isInteracting.current) handleInteractionEnd();
        };
        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', endHandler);
        window.addEventListener('touchmove', moveHandler, { passive: false });
        window.addEventListener('touchend', endHandler);
        
        return () => {
            window.removeEventListener('mousemove', moveHandler);
            window.removeEventListener('mouseup', endHandler);
            window.removeEventListener('touchmove', moveHandler);
            window.removeEventListener('touchend', endHandler);
        };
    }, [handleInteractionMove, handleInteractionEnd]);
    
    const togglePlayerType = (index: number) => {
        setPlayerTypes(types => {
            const newTypes = [...types];
            newTypes[index] = newTypes[index] === 'human' ? 'ai' : 'human';
            return newTypes;
        });
    };

    const buttonClass = "px-3 py-1.5 text-sm font-semibold rounded-lg transition-transform duration-150 hover:-translate-y-0.5";

    return (
        <div className="h-screen w-screen flex flex-col bg-[#070a17]">
            <header className="flex-shrink-0 bg-[#0e1433] border-b border-[#1a2353] p-2 flex items-center justify-between z-10 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                     <h2 className="text-lg font-bold">Map Editor</h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handlePlay} className={`${buttonClass} bg-green-600 hover:bg-green-700`}>Play</button>
                    <button onClick={handleSaveToFile} className={`${buttonClass} bg-purple-600 hover:bg-purple-700`}>Save File</button>
                    <button onClick={() => fileInputRef.current?.click()} className={`${buttonClass} bg-indigo-600 hover:bg-indigo-700`}>Load File</button>
                    <button onClick={handleLoadAIShape} className={`${buttonClass} bg-teal-600 hover:bg-teal-700`}>Load Pre-made Shape</button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                    <button onClick={onReturnToSettings} className={`${buttonClass} bg-gray-600 hover:bg-gray-700`}>Back</button>
                </div>
            </header>

            <div className="flex flex-grow min-h-0">
                <aside className="w-36 md:w-64 bg-[#0e1433] border-r border-[#1a2353] p-3 flex flex-col gap-3 overflow-y-auto">
                    <div>
                        <h3 className="text-sm font-bold text-[#a8b2ff] mb-2">TOOLS</h3>
                         <div className="flex flex-col gap-2">
                            <div className='flex items-center gap-2'>
                                <label className="text-xs text-gray-300">Dice:</label>
                                <select value={activeDice} onChange={e => setActiveDice(parseInt(e.target.value))} className="bg-[#0f1640] text-white border border-[#223075] rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-full">
                                    {[1,2,3,4,5,6,7,8].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                         </div>
                    </div>
                    <div>
                         <h3 className="text-sm font-bold text-[#a8b2ff] mb-2">GAME RULES</h3>
                         <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-300 w-20">Players</label>
                                <select value={playerCount} onChange={e => setPlayerCount(parseInt(e.target.value, 10))} className="bg-[#0f1640] text-white border border-[#223075] rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-full">
                                    {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                             <div className="flex items-center gap-2">
                                 <label className="text-xs text-gray-300 w-20">AI Difficulty</label>
                                  <select value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value as AiDifficulty)} className="bg-[#0f1640] text-white border border-[#223075] rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-full">
                                    <option value="easy">Easy</option>
                                    <option value="normal">Normal</option>
                                    <option value="hard">Hard</option>
                                </select>
                             </div>
                             <div className="flex items-center gap-2">
                                 <label className="text-xs text-gray-300 w-20">First Turn</label>
                                  <select value={firstTurn} onChange={e => setFirstTurn(e.target.value === 'random' ? 'random' : parseInt(e.target.value))} className="bg-[#0f1640] text-white border border-[#223075] rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-full">
                                    <option value="random">Random</option>
                                    {Array.from({length: playerCount}).map((_, i) => (
                                        <option key={i} value={i}>Player {i+1}</option>
                                    ))}
                                </select>
                             </div>
                             <div className="flex items-center gap-2">
                                 <label htmlFor="mapNameInput" className="text-xs text-gray-300 w-20">Map Name</label>
                                 <input id="mapNameInput" type="text" value={mapName} onChange={e => setMapName(e.target.value)} placeholder="Enter Name" className="bg-[#0f1640] text-white border border-[#223075] rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-full"/>
                             </div>
                         </div>
                    </div>
                     <div>
                        <h3 className="text-sm font-bold text-[#a8b2ff] my-2">PLAYERS</h3>
                        <div className="space-y-2">
                            {PLAYER_COLORS.slice(0, playerCount).map((color, i) => (
                                <div key={i} className="flex items-center gap-2">
                                <button onClick={() => setActiveTool({ type: 'player', index: i })} className={`h-10 w-10 rounded-lg border-4 transition-all shrink-0 ${activeTool.type === 'player' && activeTool.index === i ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }}/>
                                <button onClick={() => togglePlayerType(i)} className="text-xs text-center font-semibold bg-gray-700 rounded-md px-2 py-1 w-16">{playerTypes[i] === 'human' ? 'Human' : 'AI'}</button>
                                <div className="text-xs font-mono text-white text-right flex-grow">
                                   <div>{stats[i].cells} C</div>
                                   <div>{stats[i].dice} D</div>
                                </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2">
                            <button onClick={() => setActiveTool({ type: 'eraser' })} className={`w-full py-2 text-sm rounded-lg border-2 ${activeTool.type === 'eraser' ? 'bg-red-500 border-red-300' : 'bg-gray-700 border-gray-500'}`}>
                                Eraser
                            </button>
                        </div>
                    </div>
                </aside>
                <main className="relative flex-grow h-full w-full">
                    <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full block touch-none" 
                        onMouseDown={handleInteractionStart}
                        onTouchStart={handleInteractionStart}
                        onWheel={handleWheel}
                        onClick={(e) => {
                            if (!hasDragged.current) {
                                const point = getCoordsFromEvent(e.nativeEvent)[0];
                                if(point) handlePaint(point);
                            }
                        }}
                         onMouseMove={(e) => {
                            if (isInteracting.current && hasDragged.current) {
                                const point = getCoordsFromEvent(e.nativeEvent)[0];
                                if(point) handlePaint(point);
                            }
                        }}
                    />
                </main>
            </div>
        </div>
    );
};

export default MapEditorScreen;