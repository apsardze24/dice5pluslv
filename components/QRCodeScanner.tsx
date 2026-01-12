import React, { useRef, useEffect, useCallback } from 'react';

// Assume jsQR is loaded globally from a script tag in index.html
declare const jsQR: any;

interface QRCodeScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // FIX: Changed useRef to be correctly typed and initialized with null.
    // The call `useRef<number>()` is invalid as it requires an initial value.
    const animationFrameId = useRef<number | null>(null);

    const tick = useCallback((time: number) => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const video = videoRef.current;
            const canvasElement = canvasRef.current;
            const canvas = canvasElement?.getContext('2d', { willReadFrequently: true });

            if (canvasElement && canvas) {
                canvasElement.height = video.videoHeight;
                canvasElement.width = video.videoWidth;
                canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
                const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                if (code) {
                    onScan(code.data);
                    return; // Stop scanning
                }
            }
        }
        animationFrameId.current = requestAnimationFrame(tick);
    }, [onScan]);

    useEffect(() => {
        const videoElement = videoRef.current;
        let stream: MediaStream | null = null;

        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
            .then(s => {
                stream = s;
                if (videoElement) {
                    videoElement.srcObject = stream;
                    videoElement.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
                    videoElement.play();
                    animationFrameId.current = requestAnimationFrame(tick);
                }
            })
            .catch(err => {
                console.error("Error accessing camera: ", err);
                alert("Could not access camera. Please ensure permissions are granted.");
                onClose();
            });

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [tick, onClose]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4">
            <div className="relative w-full max-w-md h-auto" style={{paddingBottom: 'calc(100% * 9 / 16)'}}>
                <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover rounded-lg shadow-2xl" />
                <div className="absolute inset-0 border-8 border-white border-opacity-50 rounded-lg" style={{
                    clipPath: 'polygon(0% 0%, 0% 100%, 25% 100%, 25% 25%, 75% 25%, 75% 75%, 25% 75%, 25% 100%, 100% 100%, 100% 0%)'
                }}></div>
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="absolute top-0 left-0 right-0 p-4 text-center text-white text-lg font-semibold bg-black bg-opacity-50">
                Point your camera at a QR code
            </div>
             <button
                onClick={onClose}
                className="absolute bottom-5 bg-gradient-to-b from-gray-600 to-gray-800 border border-gray-500 text-white font-bold py-3 px-8 rounded-xl mt-4 shadow-lg"
             >
                Cancel
            </button>
        </div>
    );
};

export default QRCodeScanner;