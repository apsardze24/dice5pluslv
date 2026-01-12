
import React, { useState, useEffect, useCallback } from 'react';
import SettingsScreen from './components/SettingsScreen';
import GameScreen from './components/GameScreen';
import MapEditorScreen from './components/MapEditorScreen';
import RulesScreen from './components/RulesScreen';
import SeoLanding from './components/SeoLanding';
import type { GameSettings, CustomMap, GameState } from './types';
import { clearGameState } from './services/storage';

type LangCode = 'en' | 'ru' | 'es' | 'fr' | 'de';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<'settings' | 'game' | 'editor' | 'rules'>('settings');
    const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
    const [gameSessionExists, setGameSessionExists] = useState<boolean>(false);
    const [gameStateForStats, setGameStateForStats] = useState<GameState | null>(null);
    const [restartKey, setRestartKey] = useState(0);
    const [currentLang, setCurrentLang] = useState<LangCode>('ru');

    useEffect(() => {
        // Safe check for URL path to set initial language
        try {
            const path = window.location.pathname.replace('/', '');
            if (['ru', 'es', 'fr', 'de', 'en'].includes(path)) {
                setCurrentLang(path as LangCode);
            }
        } catch (e) {
            console.error("Error parsing URL for language:", e);
        }
    }, []);

    const handleLangChange = (lang: LangCode) => {
        setCurrentLang(lang);
        // Cosmetic update for SEO consistency, try/catch just in case history API is restricted
        try {
            window.history.pushState({}, '', `/${lang}`);
        } catch (e) {
            console.warn("History API not available");
        }
    };

    useEffect(() => {
        const applySafeArea = () => {
            // Use visualViewport if available for better keyboard/UI handling on mobile
            const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
            
            const safeAreaValue = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom');
            document.documentElement.style.setProperty('--applied-safe-area-bottom', safeAreaValue || '0px');
        };
        
        applySafeArea();
        // Debounce resize events to prevent crash loops
        let timeoutId: any;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(applySafeArea, 100);
        };
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', applySafeArea);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', applySafeArea);
            clearTimeout(timeoutId);
        };
    }, []);

     useEffect(() => {
        const sessionExists = sessionStorage.getItem('gameInProgress') === 'true';
        setGameSessionExists(sessionExists);
        const savedSettings = localStorage.getItem('diceWarsSettings');
        if (savedSettings) {
            try {
                setGameSettings(JSON.parse(savedSettings));
            } catch (e) {
                console.error("Failed to parse saved settings:", e);
                // Fallback to null (defaults will apply in SettingsScreen)
            }
        }
    }, []);

    const enterFullscreen = useCallback(() => {
        // Only attempt fullscreen on specific user interactions in GameScreen, not automatically on mount
        // to avoid browser blocks and confusing UX on mobile.
    }, []);

    const handleStartOrReturn = useCallback((settings: GameSettings, isReturn: boolean) => {
        const settingsToSave = { ...settings };
        if (settingsToSave.customMap) {
            delete settingsToSave.customMap;
        }
        localStorage.setItem('diceWarsSettings', JSON.stringify(settingsToSave));

        if (!isReturn) {
            clearGameState(); 
            const newSettingsWithSeed: GameSettings = {
                ...settings,
                seed: `${Date.now()}-${Math.floor(Math.random() * 1e9)}`
            };
            setGameSettings(newSettingsWithSeed);
            setRestartKey(prev => prev + 1);
        } else {
            setGameSettings(prevSettings => ({
                ...(prevSettings || settings), 
                ...settings
            }));
        }
        
        setCurrentView('game');
        setGameStateForStats(null);
    }, []);

    const handleRequestNewGame = useCallback(() => {
        clearGameState();
        setGameSessionExists(false);
        setCurrentView('settings');
    }, []);
    
    const handleRestartGame = useCallback(() => {
        clearGameState();
        setRestartKey(prev => prev + 1);
    }, []);

    const handleReturnToSettings = useCallback((state: GameState) => {
        setGameSessionExists(true);
        setGameStateForStats(state);
        setCurrentView('settings');
    }, []);

    const handleStartEditor = useCallback(() => {
        setCurrentView('editor');
    }, []);

    const handleReturnToSettingsFromEditor = useCallback(() => {
        setCurrentView('settings');
    }, []);
    
    const handleViewRules = useCallback(() => {
        setCurrentView('rules');
    }, []);

    const handleReturnToSettingsFromRules = useCallback(() => {
        setCurrentView('settings');
    }, []);

    const handleStartGameFromEditor = useCallback((map: CustomMap) => {
        const currentSettingsJSON = localStorage.getItem('diceWarsSettings');
        const currentSettings = currentSettingsJSON ? JSON.parse(currentSettingsJSON) : {};
        
        const newGameSettings: GameSettings = {
            playersCount: map.playerCount,
            humanCount: map.playerTypes.filter(t => t === 'human').length,
            cellCount: map.cells.length,
            animationSpeedSetting: currentSettings.animationSpeedSetting !== undefined ? currentSettings.animationSpeedSetting : 0.9,
            territoryCompactness: 0.5,
            waterLevel: currentSettings.waterLevel || 0,
            corruption: currentSettings.corruption || false,
            sound: currentSettings.sound !== undefined ? currentSettings.sound : true,
            aiDifficulty: map.aiDifficulty,
            diceDisplay: currentSettings.diceDisplay || 'digits',
            customMap: map,
            gameMode: 'classic',
            notificationDuration: currentSettings.notificationDuration !== undefined ? currentSettings.notificationDuration : 3,
            showDiceResults: currentSettings.showDiceResults !== undefined ? currentSettings.showDiceResults : true,
            diceResultDuration: currentSettings.diceResultDuration !== undefined ? currentSettings.diceResultDuration : 1.5,
        };
        handleStartOrReturn(newGameSettings, false);
    }, [handleStartOrReturn]);
    

    if (currentView === 'game' && gameSettings) {
        return <GameScreen key={restartKey} settings={gameSettings} onNewGame={handleRequestNewGame} onReturnToSettings={handleReturnToSettings} onRestartGame={handleRestartGame} />;
    } else if (currentView === 'editor') {
        return <MapEditorScreen onStartGame={handleStartGameFromEditor} onReturnToSettings={handleReturnToSettingsFromEditor} />;
    } else if (currentView === 'rules') {
        return <RulesScreen onBack={handleReturnToSettingsFromRules} />;
    } else {
        const initialSettingsRaw = localStorage.getItem('diceWarsSettings');
        let initialSettings = undefined;
        if (initialSettingsRaw) {
            try {
                initialSettings = JSON.parse(initialSettingsRaw);
            } catch (e) {
                console.error("Failed to parse initial settings for prop:", e);
            }
        }

        const sessionStillExists = sessionStorage.getItem('gameInProgress') === 'true';
        // Use h-[100dvh] for dynamic viewport height on mobile browsers
        return (
            <div className="w-full h-[100dvh] bg-[#070a17] overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto w-full overscroll-contain">
                    <SettingsScreen 
                        onStartGame={handleStartOrReturn}
                        onStartEditor={handleStartEditor}
                        onViewRules={handleViewRules}
                        initialSettings={initialSettings}
                        isGameInProgress={sessionStillExists}
                        gameStateForStats={gameStateForStats}
                        currentLang={currentLang}
                        onLangChange={handleLangChange}
                    />
                    <SeoLanding lang={currentLang} onLangChange={handleLangChange} />
                </div>
            </div>
        );
    }
};

export default App;
