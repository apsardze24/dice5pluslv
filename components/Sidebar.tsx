
import React from 'react';
import type { SidebarProps } from '../types';

interface ExtendedSidebarProps extends SidebarProps {
    isParatrooping?: boolean;
    onToggleParatroop?: () => void;
}

const Sidebar: React.FC<ExtendedSidebarProps> = ({ 
    state, 
    onEndTurn, 
    onReturnToSettings, 
    onNewGame, 
    onRestartGame, 
    isFullscreen, 
    onToggleFullscreen,
    isParatrooping,
    onToggleParatroop
}) => {
    
    const cardStyles = "bg-[#0e1433d1] border border-[#1a2353] rounded-2xl p-2 lg:p-4 shadow-xl flex flex-col gap-3";
    const buttonStyles = "cursor-pointer transition-transform duration-150 ease-in-out hover:-translate-y-0.5 py-2 px-3 rounded-xl w-full font-semibold focus:outline-none focus:ring-2 text-xs";
    const iconButtonStyles = "flex-shrink-0 w-14 h-14 flex items-center justify-center bg-gradient-to-b from-gray-700 to-gray-900 border border-gray-600 rounded-xl text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-transform duration-150 ease-in-out active:scale-95";

    const activePlayer = state.players[state.active];
    const isHumanTurn = activePlayer && activePlayer.human;
    const reserveCount = activePlayer ? activePlayer.reserve : 0;
    const paratroopDrops = Math.floor(reserveCount / 8);
    const showParatroop = isHumanTurn && paratroopDrops > 0 && !state.isAnimating;

    return (
        <aside className={`bg-gradient-to-b from-[#131a33] to-[#0f1530] flex-shrink-0
            lg:w-80 lg:h-full
            w-full h-auto`}
        >
            {/* FULL/DESKTOP SIDEBAR (lg and up) */}
            <div className="hidden lg:flex flex-col w-full h-full p-3.5 gap-4 overflow-y-auto border-r border-[#1c2450]">
                <div className="flex flex-col items-stretch gap-2">
                    <div className="text-left">
                         <h1 className="text-2xl font-bold tracking-wide">🎲 Dice Wars</h1>
                         <div className="text-[#9fb0ff]">Strategy Game</div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button onClick={onReturnToSettings} className={`${buttonStyles} flex items-center justify-center gap-2 flex-1 bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-500`}>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                           <span>Settings</span>
                        </button>
                        <div className="flex flex-row gap-2">
                            <button onClick={onNewGame} className={`${buttonStyles} flex items-center justify-center gap-2 flex-1 bg-gradient-to-b from-indigo-600 to-indigo-800 border border-indigo-500`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                <span>New Game</span>
                            </button>
                            <button onClick={onRestartGame} className={`${buttonStyles} flex items-center justify-center gap-2 flex-1 bg-gradient-to-b from-orange-600 to-orange-800 border border-orange-500`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                <span>Restart</span>
                            </button>
                        </div>
                        <button onClick={onToggleFullscreen} className={`${buttonStyles} flex items-center justify-center gap-2 flex-1 bg-gradient-to-b from-gray-600 to-gray-800 border border-gray-500`}>
                            {isFullscreen 
                                ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9V4.5M15 9h4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25" /></svg>
                                : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                            }
                            <span>{isFullscreen ? 'Exit FS' : 'Fullscreen'}</span>
                        </button>
                    </div>
                </div>

                <div className={`${cardStyles} w-full`}>
                    <div className="flex justify-between items-center text-sm">
                        <div>Current Turn:</div>
                        <div className="bg-[#0b1236] border border-[#25306b] rounded-full px-3 py-1 text-xs">Turn {Math.floor(state.turn)}</div>
                    </div>
                    <div className="flex flex-col items-start gap-2 text-sm w-full">
                        {state.players.filter(p => p.alive && !p.isBarbarian).map(p => (
                            <div key={p.id} className="flex items-center gap-2 w-full">
                                <div 
                                    className={`w-6 h-6 rounded-full border-2 border-black/30 transition-all duration-200 shrink-0 ${state.active === p.id ? 'border-white scale-125' : ''}`}
                                    style={{ backgroundColor: p.color }}
                                    title={p.name}
                                ></div>
                                <span className="font-bold flex-1 truncate">{p.name}</span>
                                <div className="text-xs flex items-center gap-1.5 text-right">
                                    <span title="Largest United Region / Total Cells">
                                        🏰 {p.largestRegionSize}<span className="text-[0.8em] opacity-60">/{p.cells.size}</span>
                                    </span>
                                    <span title="Total Dice">🎲{p.totalDice}</span>
                                    {p.reserve > 0 && <span title="Reserve Dice">📦{p.reserve}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`${cardStyles} w-full`}>
                     <h2 className="font-bold text-sm">Overall Luck (Avg Roll)</h2>
                     <div className="flex flex-col gap-1 text-xs font-mono">
                        {state.players.filter(p => p.alive && !p.isBarbarian).map(p => {
                            const myAvg = p.myRollsCount > 0 ? (p.myRollsSum / p.myRollsCount) : 0;
                            const vsAvg = p.opponentRollsCount > 0 ? (p.opponentRollsSum / p.opponentRollsCount) : 0;
                            const myRollsStr = myAvg > 0 ? myAvg.toFixed(2) : 'N/A';
                            const vsRollsStr = vsAvg > 0 ? vsAvg.toFixed(2) : 'N/A';
                            let luckRatioStr = 'N/A';
                            if (myAvg > 0 && vsAvg > 0) {
                                luckRatioStr = (myAvg / vsAvg).toFixed(2);
                            }
                            return (
                                <div key={p.id} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                                    <span className="flex-1 truncate">{p.name.split(' ')[0]}</span>
                                    <span title="Your average roll">My: {myRollsStr}</span>
                                    <span title="Opponent's average roll against you">Vs: {vsRollsStr}</span>
                                    <span title="Luck Ratio (My / Vs). >1 is lucky.">K: {luckRatioStr}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className={`${cardStyles} flex-grow min-h-0`}>
                    <h2 className="font-bold text-sm">Logs</h2>
                    <div className="bg-[#0b1133] border border-[#1b2659] rounded-lg p-2.5 text-xs font-mono whitespace-pre-wrap overflow-y-auto flex-grow h-20">
                        {state.logs.slice(0, 50).join('\n')}
                    </div>
                </div>

                <div className="mt-auto w-full shrink-0 flex flex-row gap-2">
                     {onToggleParatroop && showParatroop && (
                         <button 
                            onClick={onToggleParatroop} 
                            className={`flex-shrink-0 w-14 h-auto rounded-xl font-bold flex flex-col items-center justify-center transition-all 
                                ${isParatrooping 
                                    ? 'bg-yellow-600 border-yellow-500 ring-2 ring-yellow-400 animate-pulse' 
                                    : 'bg-gradient-to-b from-purple-600 to-purple-800 border border-purple-500 hover:-translate-y-0.5'
                                }`}
                            title={`Paratroop (${paratroopDrops})`}
                         >
                            <span className="text-xl">🪂</span>
                            <span className="text-xs">{paratroopDrops}</span>
                         </button>
                     )}
                     <button onClick={onEndTurn} disabled={state.isAnimating || !state.players[state.active]?.human} className={`${buttonStyles} flex-grow bg-gradient-to-b from-green-600 to-green-800 border border-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        <span>End Turn</span>
                     </button>
                </div>
            </div>

            {/* UNIFIED MOBILE BOTTOM BAR (default, hidden on lg and up) */}
            <div className="flex lg:hidden flex-col w-full p-2 gap-2 border-t border-[#1c2450] justify-end" style={{ paddingBottom: `calc(1.75rem + var(--applied-safe-area-bottom, 0px))` }}>
                <div className="flex flex-row flex-wrap justify-evenly items-center gap-x-4 gap-y-1 h-auto">
                    {state.players.filter(p => p.alive && !p.isBarbarian).map(p => (
                        <div 
                            key={p.id} 
                            className={`font-bold transition-all duration-200 ${state.active === p.id ? 'text-4xl scale-110' : 'text-3xl'}`}
                            style={{ 
                                color: p.color, 
                                textShadow: '0 0 5px black',
                            }}
                            title={p.name}
                        >
                            {p.largestRegionSize}<span className="text-[0.6em] opacity-60">/{p.cells.size}</span>
                        </div>
                    ))}
                </div>
                <div className="flex flex-row items-stretch justify-center gap-3 h-14">
                    <button onClick={onReturnToSettings} className={iconButtonStyles} title="Settings">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </button>
                    
                    {onToggleParatroop && showParatroop && (
                        <button 
                            onClick={onToggleParatroop} 
                            className={`flex-shrink-0 w-14 h-14 rounded-xl font-bold flex flex-col items-center justify-center transition-all active:scale-95 border
                                ${isParatrooping 
                                    ? 'bg-yellow-600 border-yellow-500 animate-pulse' 
                                    : 'bg-gradient-to-b from-purple-600 to-purple-800 border-purple-500'
                                }`}
                        >
                            <span className="text-xl">🪂</span>
                            <span className="text-xs">{paratroopDrops}</span>
                        </button>
                    )}

                    <button onClick={onEndTurn} disabled={state.isAnimating || !state.players[state.active]?.human} className="flex-grow bg-gradient-to-b from-green-600 to-green-800 border border-green-500 rounded-xl text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-150 ease-in-out active:scale-95">
                        End Turn
                    </button>

                    <button onClick={onToggleFullscreen} className={iconButtonStyles} title="Fullscreen">
                        {isFullscreen 
                            ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9V4.5M15 9h4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25" /></svg>
                            : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                        }
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
