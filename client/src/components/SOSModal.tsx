'use client';

import React, { useState } from 'react';
import { ShieldAlert, PhoneCall, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getSocket } from '../lib/socket';

interface SOSModalProps {
  rideId: string;
  lat: number;
  lng: number;
  riderName: string;
  onClose: () => void;
}

export default function SOSModal({ rideId, lat, lng, riderName, onClose }: SOSModalProps) {
  const [triggered, setTriggered] = useState(false);

  const handleTriggerSOS = () => {
    const socket = getSocket();
    socket.emit('trigger_sos', {
      rideId,
      lat,
      lng,
      riderName,
    });
    setTriggered(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2D283E]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FDFDFD] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border-2 border-[#FFD6A5]">
        <div className="text-center space-y-1">
          <div className="w-16 h-16 bg-[#FFD6A5]/40 rounded-full flex items-center justify-center mx-auto text-[#784315] animate-pulse border border-[#FFD6A5]">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h3 className="text-xl font-black text-[#784315]">EMERGENCY SOS</h3>
          <p className="text-xs text-[#6E6680]">
            Rapido 24x7 Dedicated Safety Support & Emergency Dispatch
          </p>
        </div>

        {!triggered ? (
          <div className="space-y-3">
            <div className="bg-[#FFD6A5]/20 p-3.5 rounded-2xl border border-[#FFD6A5]/60 text-xs text-[#784315] space-y-1">
              <p className="font-bold flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4 text-[#784315]" />
                <span>Immediate Safety Action</span>
              </p>
              <p className="text-[11px] leading-relaxed text-[#784315]/90">
                Pressing the button below will immediately transmit your live GPS coordinates to our safety response desk and notify your emergency contacts.
              </p>
            </div>

            <button
              onClick={handleTriggerSOS}
              className="w-full bg-[#957DAD] hover:bg-[#856D9D] text-white font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-[#957DAD]/25 transition-transform active:scale-95 flex items-center justify-center space-x-2"
            >
              <ShieldAlert className="w-5 h-5 text-white" />
              <span>TRANSMIT LIVE SOS ALERT</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#F1F5D8] border border-[#DCE4B0] rounded-2xl p-4 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#7BA644] mx-auto" />
            <h4 className="font-bold text-sm text-[#415720]">SOS Alert Dispatched</h4>
            <p className="text-xs text-[#415720]/90">
              Live coordinates ({lat.toFixed(4)}, {lng.toFixed(4)}) transmitted. Response team alerted.
            </p>
          </div>
        )}

        {/* Quick Dial Emergency Numbers */}
        <div className="border-t border-[#EFEFEF] pt-3 space-y-2">
          <div className="text-xs font-bold text-[#6E6680]">Direct Helpline Numbers:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <a
              href="tel:112"
              className="p-2.5 bg-[#EFEFEF] hover:bg-[#E5E5E5] rounded-xl text-center font-bold text-[#2D283E] flex items-center justify-center space-x-1.5 transition-colors border border-[#E0E0E0]"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#957DAD]" />
              <span>Call 112 (Police)</span>
            </a>
            <a
              href="tel:108"
              className="p-2.5 bg-[#EFEFEF] hover:bg-[#E5E5E5] rounded-xl text-center font-bold text-[#2D283E] flex items-center justify-center space-x-1.5 transition-colors border border-[#E0E0E0]"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#7BA644]" />
              <span>Call 108 (Medical)</span>
            </a>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full text-xs text-[#6E6680] hover:text-[#2D283E] font-semibold py-1.5 text-center transition-colors"
        >
          Close SOS Panel
        </button>
      </div>
    </div>
  );
}
