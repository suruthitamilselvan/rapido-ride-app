'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[420px] bg-[#EFEFEF] rounded-2xl flex flex-col items-center justify-center animate-pulse border border-[#E0E0E0]">
      <div className="w-12 h-12 rounded-full bg-[#957DAD]/20 flex items-center justify-center text-[#957DAD] mb-2">
        <span className="text-2xl">🗺️</span>
      </div>
      <p className="text-sm font-medium text-[#6E6680]">Loading Live GPS Navigation Map...</p>
    </div>
  ),
});

export default function Map(props: any) {
  return <MapInner {...props} />;
}
