'use client';

import React, { useEffect, useState } from 'react';
import { Ride } from '../types';
import { MapPin, Navigation, Clock, Check, X } from 'lucide-react';

interface CaptainAlertModalProps {
  ride: Ride;
  onAccept: (rideId: string) => void;
  onDecline: () => void;
}

export default function CaptainAlertModal({ ride, onAccept, onDecline }: CaptainAlertModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#2D283E]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FDFDFD] border-2 border-[#957DAD] rounded-3xl max-w-md w-full p-6 text-[#2D283E] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Radar Timer Header */}
        <div className="flex items-center justify-between border-b border-[#EFEFEF] pb-3">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#957DAD] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#957DAD]" />
            </span>
            <span className="font-extrabold text-xs text-[#957DAD] uppercase tracking-wider">
              Incoming Ride Request
            </span>
          </div>

          <div className="flex items-center space-x-1 font-mono text-xs font-bold bg-[#EFEFEF] px-2.5 py-1 rounded-full text-[#2D283E]">
            <Clock className="w-3.5 h-3.5 text-[#957DAD]" />
            <span>{secondsLeft}s</span>
          </div>
        </div>

        {/* Vehicle Badge & Earnings */}
        <div className="bg-[#EFEFEF] rounded-2xl p-4 border border-[#E0E0E0] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#6E6680]">Estimated Earnings</span>
            <div className="text-3xl font-black text-[#784315] bg-[#FFD6A5]/50 px-2.5 py-0.5 rounded-xl inline-block mt-1">
              ₹{ride.totalFare}
            </div>
            <div className="text-xs text-[#6E6680] font-medium mt-1">
              {ride.distanceKm} km • ~{ride.durationMin} mins
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block bg-[#F1F5D8] border border-[#DCE4B0] text-[#415720] font-extrabold text-xs px-2.5 py-1.5 rounded-xl uppercase shadow-sm">
              {ride.vehicleType.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Pickup & Dropoff details */}
        <div className="space-y-3 text-xs bg-[#FDFDFD] p-3.5 rounded-xl border border-[#EFEFEF]">
          <div className="flex items-start space-x-2.5">
            <div className="w-5 h-5 rounded-full bg-[#F1F5D8] border border-[#DCE4B0] text-[#415720] flex items-center justify-center text-[10px] font-black mt-0.5 shrink-0">
              P
            </div>
            <div>
              <div className="font-bold text-[#6E6680]">Pickup Address</div>
              <div className="text-[#2D283E] text-sm font-semibold">{ride.pickupAddress}</div>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <div className="w-5 h-5 rounded-full bg-[#FFD6A5] border border-[#F5C285] text-[#784315] flex items-center justify-center text-[10px] font-black mt-0.5 shrink-0">
              D
            </div>
            <div>
              <div className="font-bold text-[#6E6680]">Drop-off Destination</div>
              <div className="text-[#2D283E] text-sm font-semibold">{ride.dropoffAddress}</div>
            </div>
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <div className="w-full bg-[#EFEFEF] h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#957DAD] h-full transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${(secondsLeft / 15) * 100}%` }}
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onDecline}
            className="w-full py-3 px-4 rounded-xl border border-[#D5D5D5] bg-[#EFEFEF] hover:bg-[#E5E5E5] text-[#2D283E] font-bold text-sm transition-colors flex items-center justify-center space-x-1.5"
          >
            <X className="w-4 h-4 text-[#6E6680]" />
            <span>Decline</span>
          </button>

          <button
            onClick={() => onAccept(ride.id)}
            className="w-full py-3 px-4 rounded-xl bg-[#957DAD] hover:bg-[#856D9D] text-white font-extrabold text-sm transition-transform active:scale-95 flex items-center justify-center space-x-1.5 shadow-md shadow-[#957DAD]/25"
          >
            <Check className="w-4 h-4 text-white stroke-[3]" />
            <span>Accept Ride</span>
          </button>
        </div>
      </div>
    </div>
  );
}
