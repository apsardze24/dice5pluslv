let audioContext: AudioContext | null = null;
let isEnabled = true;

const init = () => {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("Web Audio API is not supported in this browser");
        }
    }
};

export const setEnabled = (enabled: boolean) => {
    isEnabled = enabled;
};

export const play = (type: 'attack' | 'win' | 'lose' | 'turn') => {
    init();
    if (!isEnabled || !audioContext) return;
    
    // Create a new oscillator and gain node for each sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);

    switch (type) {
        case 'attack':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, now);
            gainNode.gain.linearRampToValueAtTime(0.1, now + 0.02);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
            break;
        case 'win':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, now);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
            oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.15);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
            break;
        case 'lose':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(400, now);
            gainNode.gain.linearRampToValueAtTime(0.1, now + 0.02);
            oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.2);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
            break;
        case 'turn':
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(500, now);
            gainNode.gain.linearRampToValueAtTime(0.08, now + 0.02);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
            break;
    }
    
    oscillator.start(now);
    oscillator.stop(now + 0.25);
};
