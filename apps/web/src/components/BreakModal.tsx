'use client';

import { useEffect, useState } from 'react';

interface BreakModalProps {
  isOpen: boolean;
  breakStartTime: Date;
  onEndBreak: () => void;
}

export default function BreakModal({ isOpen, breakStartTime, onEndBreak }: BreakModalProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - breakStartTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, breakStartTime]);

  if (!isOpen) return null;

  const remainingSeconds = Math.max(3600 - elapsedSeconds, 0); // 1 hour = 3600 seconds
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const progress = (elapsedSeconds / 3600) * 100;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Break Time</h2>
          <p className="text-gray-600">Take your time to rest and recharge</p>
        </div>

        {/* Hourglass Animation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* Hourglass SVG with animation */}
            <svg
              className="w-32 h-32"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Hourglass outline */}
              <path
                d="M20,10 L80,10 L80,15 L65,15 L50,35 L65,55 L80,55 L80,90 L20,90 L20,55 L35,55 L50,35 L35,15 L20,15 Z"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
              />

              {/* Top sand */}
              <rect
                x="23"
                y="13"
                width="54"
                height={40 - (progress * 0.4)}
                fill="#FCD34D"
                className="transition-all duration-1000"
              />

              {/* Bottom sand */}
              <rect
                x="23"
                y={58 + (40 - (progress * 0.4))}
                width="54"
                height={progress * 0.4}
                fill="#FCD34D"
                className="transition-all duration-1000"
              />

              {/* Falling sand animation */}
              <circle
                cx="50"
                cy="35"
                r="1"
                fill="#FCD34D"
                opacity="0.6"
                className="animate-pulse"
              />
            </svg>

            {/* Rotation animation */}
            {progress >= 100 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin text-blue-600">
                  <svg className="w-32 h-32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z"/>
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-gray-900 tabular-nums mb-2">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <p className="text-sm text-gray-600">
            {remainingSeconds > 0 ? 'Remaining' : 'Break time completed!'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Elapsed Time */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600">
            Break started: {Math.floor(elapsedSeconds / 60)} min {elapsedSeconds % 60} sec ago
          </p>
        </div>

        {/* End Break Button */}
        <button
          onClick={onEndBreak}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          End Break
        </button>

        {/* Info */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Standard break time is 1 hour. You can end your break anytime.
        </p>
      </div>
    </div>
  );
}
