
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { GameState, Cell } from '../types';
import { axialToPixel, drawDicePips } from '../services/utils';

interface GameBoardProps {
    state: GameState;
    onCellClick: (id: number | null) => void;
    paratroopTargets?: Set<number>;
}

interface Point { x: number; y: number; }
interface ViewTransform {
    scale: number;
    x: number;
    y: number;
}

const GameBoard: React.FC<GameBoardProps> = ({ state, onCellClick, paratroopTargets }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredCellId, setHoveredCellId] = useState<number | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const animationFrameId = useRef<number | null>(null);
    const [diceSpritePos, setDiceSpritePos] = useState<Point | null>(null);

    const [viewTransform, setViewTransform] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
    const isInteracting = useRef(false);
    const hasDragged = useRef(false);
    const lastPanPoint = useRef<Point>({ x: 0, y: 0 });
    const pinchDist = useRef(0);
    const initialCenterDone = useRef(false);
    
    const HEX_SIZE = 28;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry && entry.contentRect) {
                const { width, height } = entry.contentRect;
                setCanvasSize(prevSize => {
                    if (prevSize.width !== width || prevSize.height !== height) {
                        return { width, height };
                    }
                    return prevSize;
                });
            }
        });

        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && canvasSize.width > 0 && canvasSize.height > 0) {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.round(canvasSize.width * dpr);
            canvas.height = Math.round(canvasSize.height * dpr);
            
            if (state.cells.length > 0 && !initialCenterDone.current) {
                const pts = state.cells.map(c => axialToPixel(c.q, c.r, HEX_SIZE));
                const xs = pts.map(p => p[0]);
                const ys = pts.map(p => p[1]);
                const minx = Math.min(...xs), maxx = Math.max(...xs);
                const miny = Math.min(...ys), maxy = Math.max(...ys);
                const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
                setViewTransform(prev => ({ ...prev, x: canvasSize.width / 2 - cx * prev.scale, y: canvasSize.height / 2 - cy * prev.scale }));
                initialCenterDone.current = true;
            }
        }
    }, [canvasSize, state.cells]);

    const drawHex = useCallback((ctx: CanvasRenderingContext2D, cell: Cell) => {
        const [x, y] = axialToPixel(cell.q, cell.r, HEX_SIZE);
        const owner = cell.owner;
        const isHovered = hoveredCellId === cell.id;
        const isSelected = state.selected === cell.id;
        
        const isHighlighting = state.animation?.progress === 'highlight';
        const isAttackSource = isHighlighting && state.animation?.fromId === cell.id;
        const isAttackTarget = isHighlighting && state.animation?.toId === cell.id;
        
        const isParatroopTarget = paratroopTargets && paratroopTargets.has(cell.id);

        ctx.save();
        ctx.translate(x, y);

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 180) * (60 * i - 30);
            const px = HEX_SIZE * Math.cos(angle);
            const py = HEX_SIZE * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        
        ctx.fillStyle = owner >= 0 ? state.players[owner].color : '#303a6a';
        ctx.fill();

        if (owner >= 0) {
            const player = state.players[owner];
            if (!player.largestRegionCells.has(cell.id)) {
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fill();
            }
        }
        
        ctx.lineWidth = (isSelected ? 3.2 : isHovered ? 2.4 : 1.2) / viewTransform.scale;
        ctx.strokeStyle = isSelected ? '#ffd23f' : isHovered ? '#a6b7ff' : '#0b0f2a';
        
        if (isAttackSource || isAttackTarget) {
            ctx.lineWidth = 4 / viewTransform.scale;
            ctx.strokeStyle = '#ff889d';
        }

        // Paratroop Target Highlight
        if (isParatroopTarget) {
            ctx.strokeStyle = '#f59e0b'; // Amber-500
            ctx.lineWidth = 3 / viewTransform.scale;
            
            // Draw crosshair indicator inside
            ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
            ctx.fill();
        }

        ctx.stroke();

        if (owner >= 0 && cell.dice > 0) {
            if (state.diceDisplay === 'digits') {
                ctx.font = `700 ${16 / viewTransform.scale}px ui-sans-serif, system-ui`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#0a0d20';
                ctx.fillText(String(cell.dice), 0, 0.5 / viewTransform.scale);
            } else {
                drawDicePips(ctx, cell.dice, HEX_SIZE, viewTransform.scale);
            }
        }
        
        if (isParatroopTarget) {
             // Draw small target icon
             ctx.beginPath();
             ctx.strokeStyle = '#f59e0b';
             ctx.lineWidth = 2 / viewTransform.scale;
             ctx.arc(0, 0, HEX_SIZE * 0.5, 0, Math.PI * 2);
             ctx.moveTo(0, -HEX_SIZE * 0.7);
             ctx.lineTo(0, HEX_SIZE * 0.7);
             ctx.moveTo(-HEX_SIZE * 0.7, 0);
             ctx.lineTo(HEX_SIZE * 0.7, 0);
             ctx.stroke();
        }
        
        ctx.restore();
    }, [hoveredCellId, state.players, state.selected, state.animation, viewTransform.scale, state.diceDisplay, paratroopTargets]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || canvasSize.width === 0) return;

        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.translate(viewTransform.x, viewTransform.y);
        ctx.scale(viewTransform.scale, viewTransform.scale);
        
        state.cells.forEach(cell => drawHex(ctx, cell));

        if (state.animation && state.animation.progress === 'traveling' && diceSpritePos) {
             const fromCell = state.cells[state.animation.fromId];
             ctx.fillStyle = state.players[fromCell.owner].color;
             ctx.beginPath(); 
             ctx.arc(diceSpritePos.x, diceSpritePos.y, 6 / viewTransform.scale, 0, Math.PI*2);
             ctx.fill();
        }

        if (state.selected !== null) {
            const from = state.cells[state.selected];
            const [fromX, fromY] = axialToPixel(from.q, from.r, HEX_SIZE);
            from.nei.forEach(nid => {
                const target = state.cells[nid];
                if (target.owner !== from.owner) {
                    const [tx, ty] = axialToPixel(target.q, target.r, HEX_SIZE);
                    ctx.save();
                    ctx.translate(fromX, fromY);
                    const dx = tx - fromX, dy = ty - fromY;
                    const ang = Math.atan2(dy,dx);
                    ctx.rotate(ang);
                    ctx.fillStyle = '#ffe47a88';
                    const rectWidth = HEX_SIZE * 0.6;
                    const rectHeight = 6 / viewTransform.scale;
                    ctx.fillRect(HEX_SIZE * 0.2, -rectHeight / 2, rectWidth, rectHeight);
                    ctx.restore();
                }
            });
        }
        
        ctx.restore();

    }, [state, hoveredCellId, canvasSize, drawHex, diceSpritePos, viewTransform]);

    useEffect(() => {
        if (state.animation?.progress !== 'traveling') {
            setDiceSpritePos(null);
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
            return;
        }

        let startTime: number | null = null;
        const fromCell = state.cells[state.animation.fromId];
        const toCell = state.cells[state.animation.toId];
        const [fromX, fromY] = axialToPixel(fromCell.q, fromCell.r, HEX_SIZE);
        const [toX, toY] = axialToPixel(toCell.q, toCell.r, HEX_SIZE);
        
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / state.animationSpeed, 1);
            setDiceSpritePos({ x: fromX + (toX - fromX) * progress, y: fromY + (toY - fromY) * progress });

            if (progress < 1) animationFrameId.current = requestAnimationFrame(animate);
        };
        animationFrameId.current = requestAnimationFrame(animate);
        return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
    }, [state.animation, state.animationSpeed, state.cells]);

    const getCoordsFromEvent = useCallback((e: MouseEvent | TouchEvent): Point[] => {
        const canvas = canvasRef.current;
        if (!canvas) return [];
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return Array.from(e.touches).map(touch => ({ x: touch.clientX - rect.left, y: touch.clientY - rect.top }));
        }
        return [{ x: e.clientX - rect.left, y: e.clientY - rect.top }];
    }, []);

    const pickCell = useCallback((screenPoint: Point): number | null => {
        const worldX = (screenPoint.x - viewTransform.x) / viewTransform.scale;
        const worldY = (screenPoint.y - viewTransform.y) / viewTransform.scale;
        
        let bestId: number | null = null;
        let bestDistSq = Infinity;

        for (const cell of state.cells) {
            const [px, py] = axialToPixel(cell.q, cell.r, HEX_SIZE);
            const distSq = (px - worldX)**2 + (py - worldY)**2;
            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                bestId = cell.id;
            }
        }
        
        if (bestDistSq > HEX_SIZE * HEX_SIZE) return null;
        return bestId;
    }, [state.cells, viewTransform]);
    
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
                const newX = midPoint.x - (midPoint.x - prev.x) * (newScale / prev.scale);
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

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full block bg-[radial-gradient(100%_140%_at_50%_10%,#11194a,#060914)] touch-none"
            onMouseDown={handleInteractionStart}
            onTouchStart={handleInteractionStart}
            onWheel={handleWheel}
            onMouseMove={(e) => { 
                if (!isInteracting.current) {
                    const point = getCoordsFromEvent(e.nativeEvent)[0];
                    if (point) setHoveredCellId(pickCell(point));
                }
            }}
            onMouseLeave={() => setHoveredCellId(null)}
            onClick={(e) => {
                if (!hasDragged.current) {
                    const point = getCoordsFromEvent(e.nativeEvent)[0];
                    if(point) onCellClick(pickCell(point));
                }
            }}
        />
    );
};

export default GameBoard;
