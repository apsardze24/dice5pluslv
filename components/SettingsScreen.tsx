
import React, { useState, ChangeEvent, useRef } from 'react';
import type { GameSettings, CustomMap, SettingsScreenProps } from '../types';
import { PLAYER_COLORS } from '../constants';

const APP_VERSION = "v2.23";

interface SettingsScreenExtendedProps extends SettingsScreenProps {
    currentLang: 'en' | 'ru' | 'es' | 'fr' | 'de';
    onLangChange: (lang: 'en' | 'ru' | 'es' | 'fr' | 'de') => void;
}

const TRANSLATIONS = {
    en: {
        gameMode: "Game Mode",
        modes: { classic: "Classic", conquest: "Conquest" },
        players: "Players",
        humans: "Humans",
        humanOptions: { "1": "1 Human", "2": "2 Humans", "0": "All AI" },
        aiDifficulty: "AI Difficulty",
        difficulties: { easy: "Easy", normal: "Normal", hard: "Hard" },
        mapSize: "Map Size",
        territoryLayout: "Territory Layout",
        layoutLabels: ["Scattered", "Compact"],
        waterLevel: "Water Level",
        waterLabels: ["Pangaea", "Archipelago"],
        animSpeed: "Animation Speed",
        speedLabels: ["Slow", "Fast"],
        sounds: "Sounds",
        newGame: "New Game",
        returnGame: "Return to Game",
        exit: "Exit",
        allianceA: "Alliance A",
        allianceB: "Alliance B",
        customMaps: "Custom Maps",
        createMap: "Create Map",
        loadMap: "Load Map",
        advancedSettings: "Advanced Settings",
        diceDisplay: "Dice Display",
        corruption: "Corruption",
        corruptionHint: "(50% dice loss)",
        showBattleResults: "Show Battle Results",
        resultDuration: "Result Duration",
        notifDuration: "Event Notification Duration",
        notifLabels: ["Off", "10 sec"],
        howToPlay: "How to Play",
        objective: "Objective",
        objectiveText: "Conquer all territories on the map to win!",
        attacking: "Attacking",
        attackingText: "Select one of your territories (2+ dice) and click an adjacent enemy territory to attack.",
        reinforcements: "Reinforcements",
        reinforcementsText: "At the end of your turn, you get bonus dice equal to your largest connected territory.",
        viewRules: "View Detailed Rules",
        logsTitle: "Current Game Stats",
        viewLogs: "📜 View Game Logs",
        hideLogs: "Hide Logs",
        subtitle: "A Strategy Dice Game",
        developedBy: "Developed by"
    },
    ru: {
        gameMode: "Режим игры",
        modes: { classic: "Классика", conquest: "Завоевание" },
        players: "Игроки",
        humans: "Люди",
        humanOptions: { "1": "1 Игрок", "2": "2 Игрока", "0": "Только ИИ" },
        aiDifficulty: "Сложность ИИ",
        difficulties: { easy: "Легко", normal: "Нормально", hard: "Сложно" },
        mapSize: "Размер карты",
        territoryLayout: "Кучность территорий",
        layoutLabels: ["Разброс", "Компактно"],
        waterLevel: "Уровень воды",
        waterLabels: ["Пангея", "Архипелаг"],
        animSpeed: "Скорость анимации",
        speedLabels: ["Медленно", "Быстро"],
        sounds: "Звуки",
        newGame: "Новая Игра",
        returnGame: "Вернуться в игру",
        exit: "Выход",
        allianceA: "Альянс А",
        allianceB: "Альянс Б",
        customMaps: "Свои карты",
        createMap: "Создать",
        loadMap: "Загрузить",
        advancedSettings: "Расширенные настройки",
        diceDisplay: "Вид кубиков",
        corruption: "Коррупция",
        corruptionHint: "(50% потеря кубиков)",
        showBattleResults: "Итоги битвы",
        resultDuration: "Длительность итога",
        notifDuration: "Длительность уведомлений",
        notifLabels: ["Выкл", "10 сек"],
        howToPlay: "Как играть",
        objective: "Цель",
        objectiveText: "Захватите все территории на карте, чтобы победить!",
        attacking: "Атака",
        attackingText: "Выберите свою территорию (2+ кубика) и нажмите на соседнюю вражескую территорию.",
        reinforcements: "Подкрепление",
        reinforcementsText: "В конце хода вы получаете кубики, равные размеру вашей самой большой территории.",
        viewRules: "Подробные правила",
        logsTitle: "Статистика игры",
        viewLogs: "📜 Лог игры",
        hideLogs: "Скрыть лог",
        subtitle: "Стратегическая игра в кости",
        developedBy: "Разработка:"
    },
    es: {
        gameMode: "Modo de Juego",
        modes: { classic: "Clásico", conquest: "Conquista" },
        players: "Jugadores",
        humans: "Humanos",
        humanOptions: { "1": "1 Humano", "2": "2 Humanos", "0": "Solo IA" },
        aiDifficulty: "Dificultad IA",
        difficulties: { easy: "Fácil", normal: "Normal", hard: "Difícil" },
        mapSize: "Tamaño del Mapa",
        territoryLayout: "Disposición",
        layoutLabels: ["Disperso", "Compacto"],
        waterLevel: "Nivel del Agua",
        waterLabels: ["Pangea", "Archipiélago"],
        animSpeed: "Velocidad Animación",
        speedLabels: ["Lento", "Rápido"],
        sounds: "Sonidos",
        newGame: "Nuevo Juego",
        returnGame: "Volver al Juego",
        exit: "Salir",
        allianceA: "Alianza A",
        allianceB: "Alianza B",
        customMaps: "Mapas Personalizados",
        createMap: "Crear Mapa",
        loadMap: "Cargar Mapa",
        advancedSettings: "Ajustes Avanzados",
        diceDisplay: "Mostrar Dados",
        corruption: "Corrupción",
        corruptionHint: "(pérdida 50%)",
        showBattleResults: "Resultados de Batalla",
        resultDuration: "Duración Resultado",
        notifDuration: "Duración Notificación",
        notifLabels: ["Off", "10 seg"],
        howToPlay: "Cómo Jugar",
        objective: "Objetivo",
        objectiveText: "¡Conquista todos los territorios para ganar!",
        attacking: "Atacar",
        attackingText: "Selecciona tu territorio (2+ dados) y haz clic en un enemigo adyacente.",
        reinforcements: "Refuerzos",
        reinforcementsText: "Al final del turno, recibes dados iguales a tu territorio conectado más grande.",
        viewRules: "Ver Reglas",
        logsTitle: "Estadísticas",
        viewLogs: "📜 Ver Registros",
        hideLogs: "Ocultar",
        subtitle: "Juego de Estrategia",
        developedBy: "Desarrollado por"
    },
    fr: {
        gameMode: "Mode de Jeu",
        modes: { classic: "Classique", conquest: "Conquête" },
        players: "Joueurs",
        humans: "Humains",
        humanOptions: { "1": "1 Humain", "2": "2 Humains", "0": "Tout IA" },
        aiDifficulty: "Difficulté IA",
        difficulties: { easy: "Facile", normal: "Normal", hard: "Difficile" },
        mapSize: "Taille Carte",
        territoryLayout: "Disposition",
        layoutLabels: ["Dispersé", "Compact"],
        waterLevel: "Niveau d'eau",
        waterLabels: ["Pangée", "Archipel"],
        animSpeed: "Vitesse Animation",
        speedLabels: ["Lent", "Rapide"],
        sounds: "Sons",
        newGame: "Nouvelle Partie",
        returnGame: "Retour au Jeu",
        exit: "Quitter",
        allianceA: "Alliance A",
        allianceB: "Alliance B",
        customMaps: "Cartes Perso",
        createMap: "Créer",
        loadMap: "Charger",
        advancedSettings: "Paramètres Avancés",
        diceDisplay: "Affichage Dés",
        corruption: "Corruption",
        corruptionHint: "(perte 50%)",
        showBattleResults: "Résultats Combat",
        resultDuration: "Durée Résultat",
        notifDuration: "Durée Notification",
        notifLabels: ["Off", "10 sec"],
        howToPlay: "Comment Jouer",
        objective: "Objectif",
        objectiveText: "Conquérez tous les territoires pour gagner !",
        attacking: "Attaquer",
        attackingText: "Sélectionnez votre territoire (2+ dés) et cliquez sur un ennemi adjacent.",
        reinforcements: "Renforts",
        reinforcementsText: "À la fin du tour, recevez des dés égaux à votre plus grand territoire.",
        viewRules: "Voir Règles",
        logsTitle: "Stats actuelles",
        viewLogs: "📜 Voir les logs",
        hideLogs: "Cacher",
        subtitle: "Jeu de stratégie",
        developedBy: "Développé par"
    },
    de: {
        gameMode: "Spielmodus",
        modes: { classic: "Klassisch", conquest: "Eroberung" },
        players: "Spieler",
        humans: "Menschen",
        humanOptions: { "1": "1 Mensch", "2": "2 Menschen", "0": "Nur KI" },
        aiDifficulty: "KI Schwierigkeit",
        difficulties: { easy: "Einfach", normal: "Normal", hard: "Schwer" },
        mapSize: "Kartengröße",
        territoryLayout: "Territorium",
        layoutLabels: ["Verstreut", "Kompakt"],
        waterLevel: "Wasserstand",
        waterLabels: ["Pangäa", "Archipel"],
        animSpeed: "Geschwindigkeit",
        speedLabels: ["Langsam", "Schnell"],
        sounds: "Geräusche",
        newGame: "Neues Spiel",
        returnGame: "Zurück zum Spiel",
        exit: "Verlassen",
        allianceA: "Allianz A",
        allianceB: "Allianz B",
        customMaps: "Eigene Karten",
        createMap: "Erstellen",
        loadMap: "Laden",
        advancedSettings: "Erweiterte Einstellungen",
        diceDisplay: "Würfelanzeige",
        corruption: "Korruption",
        corruptionHint: "(50% Verlust)",
        showBattleResults: "Kampfergebnisse",
        resultDuration: "Anzeigedauer",
        notifDuration: "Benachrichtigungsdauer",
        notifLabels: ["Aus", "10 sek"],
        howToPlay: "Spielanleitung",
        objective: "Ziel",
        objectiveText: "Erobere alle Gebiete auf der Karte, um zu gewinnen!",
        attacking: "Angreifen",
        attackingText: "Wähle dein Gebiet (2+ Würfel) und klicke auf einen benachbarten Feind.",
        reinforcements: "Verstärkung",
        reinforcementsText: "Am Ende des Zuges erhältst du Würfel entsprechend deinem größten Gebiet.",
        viewRules: "Regeln ansehen",
        logsTitle: "Spielstatistiken",
        viewLogs: "📜 Protokolle",
        hideLogs: "Verbergen",
        subtitle: "Ein Würfel-Strategiespiel",
        developedBy: "Entwickelt von"
    }
};

const SettingsScreen: React.FC<SettingsScreenExtendedProps> = ({ 
    onStartGame, 
    onStartEditor, 
    onViewRules,
    initialSettings, 
    isGameInProgress, 
    gameStateForStats,
    currentLang,
    onLangChange
}) => {
    // Define robust defaults
    const defaultSettings: GameSettings = {
        playersCount: 4,
        humanCount: 1,
        cellCount: 60,
        animationSpeedSetting: 0.9,
        territoryCompactness: 0.5,
        waterLevel: 0.2,
        corruption: false,
        sound: true,
        aiDifficulty: 'hard',
        diceDisplay: 'digits',
        gameMode: 'classic',
        notificationDuration: 3,
        showDiceResults: true,
        diceResultDuration: 1.5,
    };

    // Merge initial settings with defaults to ensure all fields are present
    const [settings, setSettings] = useState<GameSettings>(() => ({
        ...defaultSettings,
        ...(initialSettings || {})
    }));
    
    const [alliances, setAlliances] = useState<{ A: Set<number>, B: Set<number> }>(() => {
        const initialPlayerAlliances = initialSettings?.alliances || {};
        const allianceA = new Set<number>();
        const allianceB = new Set<number>();
        for (const playerIdStr in initialPlayerAlliances) {
            const playerId = Number(playerIdStr);
            const playerAlliances = initialPlayerAlliances[playerId];
            if (playerAlliances.includes('A')) {
                allianceA.add(playerId);
            }
            if (playerAlliances.includes('B')) {
                allianceB.add(playerId);
            }
        }
        return { A: allianceA, B: allianceB };
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showLogsModal, setShowLogsModal] = useState(false);

    // Get current translations
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['en'];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setSettings(s => ({ ...s, [id]: checked }));
        } else {
            // Explicitly handle numeric fields that might come from selects or text inputs
            const isNumeric = type === 'number' || type === 'range' || ['playersCount', 'humanCount', 'cellCount'].includes(id);
            const newValue = isNumeric ? (value === '' ? 0 : parseFloat(value)) : value;
            
            const newSettings = { ...settings, [id]: newValue };
            
            if (id === 'playersCount') {
                setAlliances({ A: new Set(), B: new Set() });
            }

            setSettings(newSettings as GameSettings);
        }
    };
    
    const handleSubmit = (e: React.FormEvent, isReturn: boolean) => {
        e.preventDefault();
        
        const finalPlayerAlliances: { [key: number]: ('A' | 'B')[] } = {};
        // Ensure playersCount is a valid number
        const count = settings.playersCount || 4;
        
        for (let i = 0; i < count; i++) {
            const playerAlliances: ('A' | 'B')[] = [];
            if (alliances.A.has(i)) playerAlliances.push('A');
            if (alliances.B.has(i)) playerAlliances.push('B');
            if (playerAlliances.length > 0) {
                finalPlayerAlliances[i] = playerAlliances;
            }
        }

        const finalSettings: GameSettings = {
            ...settings,
            playersCount: count,
            showDiceResults: settings.showDiceResults ?? true,
            diceResultDuration: settings.diceResultDuration ?? 1.5,
            alliances: finalPlayerAlliances
        };
        
        onStartGame(finalSettings, isReturn);
    };
    
    const handleExit = () => {
        const url = `https://Apsardze24.lv`;
        window.location.href = url;
    };
    
    const handleLoadCustomMapFromFile = (map: CustomMap) => {
        const newGameSettings: GameSettings = {
            ...settings,
            gameMode: 'classic',
            playersCount: map.playerCount,
            humanCount: map.playerTypes.filter(t => t === 'human').length,
            cellCount: map.cells.length,
            aiDifficulty: map.aiDifficulty,
            customMap: map,
        };
        onStartGame(newGameSettings, false);
    };
    
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const map = JSON.parse(e.target?.result as string) as CustomMap;
                 if (!map.mapName || !map.playerCount || !Array.isArray(map.cells) || !map.playerTypes || !map.aiDifficulty || map.firstTurn === undefined) {
                    throw new Error("Invalid or incomplete map format.");
                }
                handleLoadCustomMapFromFile(map);
            } catch (err) {
                 alert(`Error loading map: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
        };
        reader.readAsText(file);
        if (event.target) event.target.value = '';
    };

    const handleToggleAlliance = (alliance: 'A' | 'B', playerIndex: number) => {
        setAlliances(prev => {
            const newAllianceSet = new Set(prev[alliance]);
            if (newAllianceSet.has(playerIndex)) {
                newAllianceSet.delete(playerIndex);
            } else {
                newAllianceSet.add(playerIndex);
            }
            return { ...prev, [alliance]: newAllianceSet };
        });
    };

    const inputStyles = "bg-[#0f1640] text-white border border-[#223075] rounded-xl px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
    const labelStyles = "text-xs text-[#a8b2ff] block mb-1";
    const buttonStyles = "cursor-pointer transition-transform duration-150 ease-in-out hover:-translate-y-0.5 mt-2.5 text-base py-3 px-4 rounded-xl w-full font-semibold";
    
    const AllianceRow = ({ label, alliance, allianceKey }: { label: string, alliance: Set<number>, allianceKey: 'A' | 'B' }) => (
        <div className="flex items-center gap-2">
            <span className="font-semibold text-base w-24">{label}</span>
            <div className="flex-1 flex items-center justify-start gap-2 bg-[#0b1133] p-1.5 rounded-lg">
                {Array.from({ length: settings.playersCount || 4 }).map((_, i) => (
                    <div
                        key={i}
                        onClick={() => handleToggleAlliance(allianceKey, i)}
                        className={`w-7 h-7 rounded-full cursor-pointer transition-all duration-200 border-2 border-transparent ${alliance.has(i) ? 'opacity-100 scale-110 shadow-lg' : 'opacity-25 hover:opacity-50'}`}
                        style={{ backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
                        title={`Player ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );

    return (
        <div className="h-full w-full flex flex-col" style={{ paddingBottom: 'var(--applied-safe-area-bottom, 16px)' }}>
            
            <div className="w-full max-w-md mx-auto p-4 overflow-y-auto">
                <h1 className="text-4xl font-bold text-center mb-1 tracking-wide">🎲 Dice Wars</h1>
                <div className="text-center text-[#9fb0ff] mb-2">{t.subtitle}</div>
                <div className="text-center text-xs text-gray-400 mb-5 px-1">
                    <span>{t.developedBy} </span>
                    <a href="https://Apsardze24.lv" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline font-semibold">Apsardze24.lv</a>
                    <span className="ml-2">Version: {APP_VERSION}</span>
                </div>

                <div className="bg-[#0e1433d1] border border-[#1a2353] rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
                    <form className="flex flex-col gap-4" onSubmit={(e) => handleSubmit(e, false)}>
                        <div>
                            <label htmlFor="gameMode" className={labelStyles}>{t.gameMode}</label>
                            <select id="gameMode" value={settings.gameMode} onChange={handleChange} className={inputStyles}>
                                <option value="classic">{t.modes.classic}</option>
                                <option value="conquest">{t.modes.conquest}</option>
                            </select>
                        </div>
                         <div className="flex gap-4">
                            <div className="flex-1">
                                <label htmlFor="playersCount" className={labelStyles}>{t.players} (2-8)</label>
                                <select id="playersCount" value={settings.playersCount} onChange={handleChange} className={inputStyles}>
                                    {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                 <label htmlFor="humanCount" className={labelStyles}>{t.humans}</label>
                                <select id="humanCount" value={settings.humanCount} onChange={handleChange} className={inputStyles}>
                                    <option value="1">{t.humanOptions["1"]}</option>
                                    <option value="2">{t.humanOptions["2"]}</option>
                                    <option value="0">{t.humanOptions["0"]}</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="aiDifficulty" className={labelStyles}>{t.aiDifficulty}</label>
                            <select id="aiDifficulty" value={settings.aiDifficulty} onChange={handleChange} className={inputStyles}>
                                <option value="easy">{t.difficulties.easy}</option>
                                <option value="normal">{t.difficulties.normal}</option>
                                <option value="hard">{t.difficulties.hard}</option>
                            </select>
                        </div>
                        
                        <div>
                            <label htmlFor="cellCount" className={labelStyles}>{t.mapSize} ({settings.cellCount})</label>
                            <input type="range" id="cellCount" min="10" max="400" value={settings.cellCount} onChange={handleChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                            <div className="flex justify-between text-xs text-[#9fb0ff] px-1">
                                <span>10</span><span>400</span>
                            </div>
                        </div>
                    
                        <div>
                            <label htmlFor={'territoryCompactness'} className={labelStyles}>{t.territoryLayout}</label>
                            <input type="range" id={'territoryCompactness'} min={0.0} max={1.0} step={0.1} value={settings['territoryCompactness']} onChange={handleChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                            <div className="flex justify-between text-xs text-[#9fb0ff] px-1">
                                <span>{t.layoutLabels[0]}</span><span>{t.layoutLabels[1]}</span>
                            </div>
                        </div>

                        <div>
                            <label htmlFor={'waterLevel'} className={labelStyles}>{t.waterLevel}</label>
                            <input type="range" id={'waterLevel'} min={0.0} max={1.0} step={0.1} value={settings.waterLevel} onChange={handleChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                            <div className="flex justify-between text-xs text-[#9fb0ff] px-1">
                                <span>{t.waterLabels[0]}</span><span>{t.waterLabels[1]}</span>
                            </div>
                        </div>
                        
                        <div>
                            <label htmlFor="animationSpeedSetting" className={labelStyles}>{t.animSpeed}</label>
                            <input type="range" id="animationSpeedSetting" min={0} max={1} step={0.1} value={settings.animationSpeedSetting} onChange={handleChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                            <div className="flex justify-between text-xs text-[#9fb0ff] px-1">
                                <span>{t.speedLabels[0]}</span><span>{t.speedLabels[1]}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <label htmlFor="sound" className="text-xs text-[#a8b2ff]">{t.sounds}</label>
                            <input type="checkbox" id="sound" checked={settings.sound} onChange={handleChange} className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-800 focus:ring-2" />
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 mt-2">
                            <button type="button" onClick={(e) => handleSubmit(e, false)} className={`${buttonStyles} bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-500`}>
                                {t.newGame}
                            </button>
                             {isGameInProgress && (
                                <button type="button" onClick={(e) => handleSubmit(e, true)} className={`${buttonStyles} bg-gradient-to-b from-green-600 to-green-800 border border-green-500`}>
                                    {t.returnGame}
                                </button>
                             )}
                            <button type="button" onClick={handleExit} className={`${buttonStyles} bg-gradient-to-b from-gray-600 to-gray-800 border border-gray-500`}>
                                {t.exit}
                            </button>
                        </div>
                    </form>
                </div>

                {/* LANGUAGE SELECTOR */}
                <div className="flex justify-center my-4">
                    <div className="bg-[#0b1133] p-1.5 rounded-xl border border-[#1b2659] flex gap-1 shadow-lg">
                        {[
                            { code: 'en', label: 'EN' },
                            { code: 'ru', label: 'RU' },
                            { code: 'es', label: 'ES' },
                            { code: 'fr', label: 'FR' },
                            { code: 'de', label: 'DE' }
                        ].map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => onLangChange(lang.code as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                                    currentLang === lang.code 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-gray-400 hover:text-white hover:bg-[#1a2353]'
                                }`}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-[#0e1433d1] border border-[#1a2353] rounded-2xl p-4 shadow-2xl flex flex-col gap-2">
                    <AllianceRow label={t.allianceA} alliance={alliances.A} allianceKey="A" />
                    <AllianceRow label={t.allianceB} alliance={alliances.B} allianceKey="B" />
                </div>

                <div className="bg-[#0e1433d1] border border-[#1a2353] rounded-2xl p-4 mt-4 shadow-2xl flex flex-col gap-3">
                    <h2 className="font-bold text-lg mb-2">{t.customMaps}</h2>
                     <div className="flex flex-col sm:flex-row gap-3">
                       <button onClick={onStartEditor} className={`${buttonStyles} mt-0 text-sm py-2 flex-1 bg-gradient-to-b from-indigo-600 to-indigo-800 border border-indigo-500`}>{t.createMap}</button>
                       <button onClick={() => fileInputRef.current?.click()} className={`${buttonStyles} mt-0 text-sm py-2 flex-1 bg-gradient-to-b from-purple-600 to-purple-800 border border-purple-500`}>{t.loadMap}</button>
                       <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json"/>
                    </div>
                </div>

                {isGameInProgress && gameStateForStats && (
                    <div className="bg-[#0e1433d1] border border-[#1a2353] rounded-2xl p-4 mt-4 shadow-2xl flex flex-col gap-3">
                        <h2 className="font-bold text-lg mb-2">{t.logsTitle}</h2>
                        <div className="flex flex-col gap-2 text-sm w-full">
                            {gameStateForStats.players.filter(p => p.alive && !p.isBarbarian).map(p => (
                                <div key={p.id} className="flex items-center gap-2 w-full">
                                    <div 
                                        className="w-5 h-5 rounded-full border-2 border-black/30 shrink-0"
                                        style={{ backgroundColor: p.color }}
                                        title={p.name}
                                    ></div>
                                    <span className="font-bold flex-1 truncate">{p.name}</span>
                                    <div className="text-xs flex items-center gap-2 text-right font-mono">
                                        <span title="Total Territories">🏰{p.cells.size}</span>
                                        <span title="Total Dice">🎲{p.totalDice}</span>
                                        {p.reserve > 0 && <span title="Reserve Dice">📦{p.reserve}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {gameStateForStats.logs && gameStateForStats.logs.length > 0 && (
                            <div className="mt-2">
                                <button 
                                    onClick={() => setShowLogsModal(!showLogsModal)} 
                                    className="w-full text-xs py-2 bg-[#0b1133] border border-[#1b2659] rounded-lg text-[#9fb0ff] hover:bg-[#151d45]"
                                >
                                    {showLogsModal ? t.hideLogs : t.viewLogs}
                                </button>
                                {showLogsModal && (
                                    <div className="mt-2 bg-[#0b1133] border border-[#1b2659] rounded-lg p-2.5 text-xs font-mono whitespace-pre-wrap overflow-y-auto max-h-60 animate-in fade-in slide-in-from-top-2">
                                        {gameStateForStats.logs.join('\n')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                 <div className="bg-[#0e1433d1] border border-[#1a2353] rounded-2xl p-4 mt-4 shadow-2xl flex flex-col gap-3">
                    <h2 className="font-bold text-lg mb-2">{t.advancedSettings}</h2>
                    <div className="flex items-center justify-between">
                        <label htmlFor="diceDisplay" className="text-sm text-gray-300">{t.diceDisplay}</label>
                        <select id="diceDisplay" value={settings.diceDisplay} onChange={handleChange} className="bg-[#0f1640] text-white border border-[#223075] rounded-xl px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-32">
                            <option value="pips">Pips</option>
                            <option value="digits">Digits</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-between">
                         <label htmlFor="corruption" className="text-sm text-gray-300">{t.corruption} <span className="text-xs text-[#9fb0ff] italic">{t.corruptionHint}</span></label>
                        <input type="checkbox" id="corruption" checked={settings.corruption} onChange={handleChange} className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-800 focus:ring-2" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                         <label htmlFor="showDiceResults" className="text-sm text-gray-300">{t.showBattleResults}</label>
                        <input type="checkbox" id="showDiceResults" checked={settings.showDiceResults ?? true} onChange={handleChange} className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 ring-offset-gray-800 focus:ring-2" />
                    </div>
                    
                    {(settings.showDiceResults ?? true) && (
                         <div className="flex flex-col gap-2">
                            <label htmlFor="diceResultDuration" className={labelStyles}>{t.resultDuration} ({settings.diceResultDuration ?? 1.5}s)</label>
                            <input type="range" id="diceResultDuration" min="0.5" max="5.0" step="0.5" value={settings.diceResultDuration ?? 1.5} onChange={handleChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label htmlFor="notificationDuration" className={labelStyles}>{t.notifDuration} ({settings.notificationDuration}s)</label>
                        <input type="range" id="notificationDuration" min="0" max="10" step="1" value={settings.notificationDuration} onChange={handleChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-xs text-[#9fb0ff] px-1">
                            <span>{t.notifLabels[0]}</span><span>{t.notifLabels[1]}</span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-[#0e1433d1] border border-[#1a2353] rounded-2xl p-4 mt-4 shadow-2xl flex flex-col gap-3">
                    <div>
                        <h2 className="font-bold text-lg mb-2">{t.howToPlay}</h2>
                        <div className="text-sm text-[#c9d3ff] opacity-90 space-y-2">
                            <p><strong className="text-white">{t.objective}:</strong> {t.objectiveText}</p>
                            <p><strong className="text-white">{t.attacking}:</strong> {t.attackingText}</p>
                            <p><strong className="text-white">{t.reinforcements}:</strong> {t.reinforcementsText}</p>
                        </div>
                         <button onClick={onViewRules} className={`${buttonStyles} mt-4 text-sm py-2 bg-gradient-to-b from-indigo-600 to-indigo-800 border border-indigo-500`}>
                            {t.viewRules}
                        </button>
                    </div>
                </div>
                <div className="h-4"></div>
            </div>
        </div>
    );
};

export default SettingsScreen;
