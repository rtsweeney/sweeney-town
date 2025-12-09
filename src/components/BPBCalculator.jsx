import { useState } from 'react';
import confetti from 'canvas-confetti';

const BPBCalculator = () => {
    const [volume, setVolume] = useState('');
    const [abv, setAbv] = useState('');
    const [result, setResult] = useState(null);

    const calculateBPB = () => {
        const volNum = parseFloat(volume);
        const abvNum = parseFloat(abv);

        if (isNaN(volNum) || isNaN(abvNum)) return;

        const bpb = (volNum * abvNum) / (12 * 4.2);
        setResult(bpb.toFixed(1));

        // Trigger confetti
        triggerConfetti();
    };

    const triggerConfetti = () => {
        const duration = 2000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
                colors: ['#007AFF', '#FF2D55', '#5856D6', '#FF9500']
            });
            confetti({
                particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
                colors: ['#007AFF', '#FF2D55', '#5856D6', '#FF9500']
            });

            if (Date.now() < end) requestAnimationFrame(frame);
        }());
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <h1>BPB Calculator</h1>
                <p className="subtitle">Beers Per Beer</p>
            </header>

            <div className="ios-card input-card">
                <div className="input-group">
                    <label>Volume (oz)</label>
                    <input
                        type="number"
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                        placeholder="e.g. 16"
                        inputMode="decimal"
                    />
                </div>
                <div className="divider"></div>
                <div className="input-group">
                    <label>ABV (%)</label>
                    <input
                        type="number"
                        value={abv}
                        onChange={(e) => setAbv(e.target.value)}
                        placeholder="e.g. 7.5"
                        inputMode="decimal"
                    />
                </div>
            </div>

            <button className="ios-btn" onClick={calculateBPB}>Calculate</button>

            {result && (
                <div className="result-container visible">
                    <div className="result-value">{result}</div>
                    <div className="result-label">Standard Beers</div>
                </div>
            )}

            <style>{`
        .page-container { padding: 20px; max-width: 600px; margin: 0 auto; width: 100%; }
        .page-header { text-align: center; margin-bottom: 30px; margin-top: 20px; }
        .input-group { display: flex; justify-content: space-between; padding: 16px 20px; align-items: center; }
        .input-group input { border: none; text-align: right; font-size: 17px; width: 100px; outline: none; background: transparent; }
        .divider { height: 1px; background: var(--divider-color); margin-left: 20px; }
        .result-container { text-align: center; margin-top: 30px; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .result-value { font-size: 64px; font-weight: 800; line-height: 1.1; }
        .result-label { font-size: 19px; color: var(--text-secondary); }
        @keyframes popIn { from { transform: scale(0.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
      `}</style>
        </div>
    );
};

export default BPBCalculator;
