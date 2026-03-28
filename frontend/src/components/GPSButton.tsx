import React from 'react';
import { GPSState } from '../types';

interface GPSButtonProps {
  gps: GPSState;
  onStart: () => void;
  onStop: () => void;
  onToggleFollow: () => void;
}

export default function GPSButton({ gps, onStart, onStop, onToggleFollow }: GPSButtonProps) {
  if (!gps.tracking && !gps.lat) {
    return (
      <button
        onClick={onStart}
        title="Enable GPS tracking"
        className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-white/10 text-sm font-medium text-gray-300 hover:text-white hover:border-ocean-400 transition-all"
      >
        <span className="text-base">📍</span>
        <span className="hidden sm:inline">Track me</span>
      </button>
    );
  }

  if (gps.error) {
    return (
      <button
        onClick={onStart}
        title={gps.error}
        className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-red-500/40 text-sm text-red-400 hover:bg-red-500/10 transition-all"
      >
        <span className="text-base">⚠️</span>
        <span className="hidden sm:inline text-xs">GPS error</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {/* Follow toggle */}
      <button
        onClick={onToggleFollow}
        title={gps.following ? 'Unfollow (free pan)' : 'Follow my location'}
        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl glass border text-sm font-medium transition-all ${
          gps.following
            ? 'border-ocean-400 text-ocean-300 bg-ocean-500/15'
            : 'border-white/10 text-gray-400 hover:border-ocean-400/60 hover:text-ocean-300'
        }`}
      >
        <span className="text-base relative">
          {gps.following ? (
            <span className="inline-flex">
              🔵
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            </span>
          ) : '⚪'}
        </span>
        <span className="hidden sm:inline text-xs">{gps.following ? 'Following' : 'Follow'}</span>
      </button>

      {/* GPS info & stop button */}
      <button
        onClick={onStop}
        title="Stop GPS tracking"
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl glass border border-white/10 text-sm text-gray-400 hover:border-red-500/40 hover:text-red-400 transition-all"
      >
        {gps.tracking ? (
          <>
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="hidden sm:inline text-xs">GPS On</span>
          </>
        ) : (
          <>
            <span className="inline-block w-2 h-2 rounded-full bg-gray-600" />
            <span className="hidden sm:inline text-xs">GPS</span>
          </>
        )}
      </button>
    </div>
  );
}
