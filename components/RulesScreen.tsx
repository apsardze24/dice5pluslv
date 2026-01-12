import React, { useState, useCallback } from 'react';
import { GAME_RULES } from '../services/rules';

interface RulesScreenProps {
    onBack: () => void;
}

const RulesScreen: React.FC<RulesScreenProps> = ({ onBack }) => {
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(GAME_RULES).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        }).catch(err => {
            console.error('Failed to copy rules: ', err);
            alert('Failed to copy rules to clipboard.');
        });
    }, []);
    
    const handleAskGemini = useCallback(() => {
        const promptText = `Based on the following rules for the game "Dice Wars", please answer my questions. Rules:\n\n${GAME_RULES}`;
        const url = `https://gemini.google.com/app?prompt=${encodeURIComponent(promptText)}`;
        window.open(url, '_blank');
    }, []);

    const handleAskChatGPT = useCallback(() => {
        window.open('https://chat.openai.com', '_blank');
    }, []);
    
    const handleAskGroq = useCallback(() => {
        window.open('https://groq.com/', '_blank');
    }, []);

    const buttonClass = "flex-1 cursor-pointer transition-transform duration-150 ease-in-out hover:-translate-y-0.5 text-base py-3 px-4 rounded-xl font-semibold";
    const wideButtonClass = "cursor-pointer transition-transform duration-150 ease-in-out hover:-translate-y-0.5 text-base py-3 px-4 rounded-xl font-semibold";

    return (
        <div className="h-screen w-full flex flex-col bg-gradient-to-b from-[#0f1530] to-[#070a17]" style={{ paddingBottom: 'var(--applied-safe-area-bottom, 0px)' }}>
            <header className="flex-shrink-0 bg-[#0e1433] border-b border-[#1a2353] p-3 flex items-center justify-between z-10">
                <h1 className="text-2xl font-bold">Game Rules</h1>
                <button 
                    onClick={onBack} 
                    className="py-2 px-4 rounded-xl font-semibold bg-gradient-to-b from-gray-600 to-gray-800 border border-gray-500 transition-transform duration-150 hover:-translate-y-0.5"
                >
                    Back
                </button>
            </header>
            
            <div className="p-4 flex-shrink-0">
                <div className="flex flex-col gap-3">
                    <button onClick={handleCopy} className={`${wideButtonClass} w-full bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-500`}>
                        {copyStatus === 'idle' ? 'Copy Rules' : 'Copied to Clipboard!'}
                    </button>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={handleAskGemini} className={`${buttonClass} bg-gradient-to-b from-purple-600 to-purple-800 border border-purple-500`}>
                            Ask Gemini
                        </button>
                        <button onClick={handleAskChatGPT} className={`${buttonClass} bg-gradient-to-b from-teal-600 to-teal-800 border border-teal-500`}>
                            Ask ChatGPT
                        </button>
                         <button onClick={handleAskGroq} className={`${buttonClass} bg-gradient-to-b from-orange-600 to-orange-800 border border-orange-500`}>
                            Ask Groq
                        </button>
                    </div>
                </div>
            </div>

            <main className="flex-grow min-h-0 overflow-y-auto px-4 pb-4">
                <div className="bg-[#0e1433d1] border border-[#1a2353] rounded-2xl p-4 md:p-6 shadow-2xl">
                    <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                        {GAME_RULES}
                    </pre>
                </div>
            </main>
        </div>
    );
};

export default RulesScreen;