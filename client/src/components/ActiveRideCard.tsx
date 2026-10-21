'use client';

import React, { useState } from 'react';
import { Ride } from '../types';
import { Phone, ShieldAlert, Share2, XCircle, Navigation, KeyRound, Star, CheckCircle } from 'lucide-react';

interface ActiveRideCardProps {
  ride: Ride;
  telemetry?: {
    distanceRemainingKm: number;
    durationRemainingMin: number;
    progressPercent: number;
    currentSpeed: number;
  } | null;
  onCancel: () => void;
  onTriggerSOS: () => void;
  onShare: () => void;
  onAutoMatch?: () => void;
}

export default function ActiveRideCard({
  ride,
  telemetry,
  onCancel,
  onTriggerSOS,
  onShare,
  onAutoMatch,
}: ActiveRideCardProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);

  const getStatusBadge = () => {
    switch (ride.status) {
      case 'REQUESTED':
        return {
          text: 'Matching Nearby Captain...',
          bg: 'bg-[#FFD6A5]/40 text-[#784315] border-[#FFD6A5]',
          pulse: true,
        };
      case 'ACCEPTED':
        return {
          text: 'Captain Accepted • On the Way',
          bg: 'bg-[#EFEFEF] text-[#4A3B5C] border-[#D0D0D0]',
          pulse: true,
        };
      case 'ARRIVED_PICKUP':
        return {
          text: 'Captain Arrived at Pickup Point!',
          bg: 'bg-[#F1F5D8] text-[#415720] border-[#DCE4B2]',
          pulse: false,
        };
      case 'IN_PROGRESS':
        return {
          text: 'Trip In Progress',
          bg: 'bg-[#957DAD]/15 text-[#4A3B5C] border-[#957DAD]/40',
          pulse: true,
        };
      default:
        return { text: ride.status, bg: 'bg-[#EFEFEF] text-[#2D283E] border-[#E0E0E0]', pulse: false };
    }
  };

  const statusInfo = getStatusBadge();

  return (
    <div className="bg-[#FDFDFD] rounded-3xl shadow-xs border border-[#EFEFEF] p-5 space-y-4">
      {/* Top Status Banner */}
      <div className="flex items-center justify-between">
        <div
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold border ${statusInfo.bg}`}
        >
          {statusInfo.pulse && <span className="w-2 h-2 rounded-full bg-current animate-ping" />}
          <span>{statusInfo.text}</span>
        </div>
        <span className="text-xs font-bold text-[#888199] uppercase tracking-wider">
          Ride ID: #{ride.id.substring(0, 6)}
        </span>
      </div>

      {/* Live Trip In Progress Telemetry (Pastel HUD) */}
      {ride.status === 'IN_PROGRESS' && (
        <div className="bg-[#FDFDFD] text-[#2D283E] rounded-3xl p-4 shadow-xs border border-[#EFEFEF] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#957DAD] animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-[#957DAD]">
                Live Trip Navigation
              </span>
            </div>
            <span className="text-[10px] bg-[#F1F5D8] text-[#415720] font-bold px-2.5 py-0.5 rounded-full border border-[#DCE4B2] font-mono">
              ⚡ {telemetry?.currentSpeed ?? 34} km/h Cruising
            </span>
          </div>

          {/* Big Digital Readout Counters */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-[#FFD6A5]/25 rounded-2xl p-3 border border-[#FFD6A5]/70 text-center shadow-xs">
              <div className="text-[10px] font-bold text-[#784315] uppercase tracking-wider">Distance Left</div>
              <div className="text-2xl font-black text-[#784315] font-mono mt-0.5">
                {telemetry ? `${telemetry.distanceRemainingKm} km` : `${ride.distanceKm} km`}
              </div>
            </div>
            <div className="bg-[#EFEFEF] rounded-2xl p-3 border border-[#E0E0E0] text-center shadow-xs">
              <div className="text-[10px] font-bold text-[#4A3B5C] uppercase tracking-wider">Estimated Time</div>
              <div className="text-2xl font-black text-[#2D283E] font-mono mt-0.5">
                {telemetry ? `${telemetry.durationRemainingMin} mins` : `${ride.durationMin} mins`}
              </div>
            </div>
          </div>

          {/* Animated Journey Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="truncate max-w-[130px] text-[#415720]">📍 {ride.pickupAddress.split(',')[0]}</span>
              <span className="text-[#957DAD] font-extrabold font-mono">{telemetry ? `${telemetry.progressPercent}%` : '0%'}</span>
              <span className="truncate max-w-[130px] text-[#784315]">🏁 {ride.dropoffAddress.split(',')[0]}</span>
            </div>
            <div className="w-full h-3 bg-[#EFEFEF] rounded-full overflow-hidden p-0.5 relative">
              <div
                className="h-full bg-gradient-to-r from-[#F1F5D8] via-[#FFD6A5] to-[#957DAD] rounded-full transition-all duration-500 ease-out shadow-xs"
                style={{ width: `${Math.max(5, Math.min(100, telemetry?.progressPercent ?? 5))}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#6E6680] pt-0.5 border-t border-[#EFEFEF]">
            <span className="truncate">Heading to: <strong className="text-[#2D283E]">{ride.dropoffAddress}</strong></span>
          </div>
        </div>
      )}

      {/* 4-Digit Ride Start OTP Highlight (Shown before ride starts) */}
      {ride.status !== 'IN_PROGRESS' && (
        <div className="bg-[#FFD6A5]/35 rounded-2xl p-4 text-[#2D283E] border border-[#FFD6A5] shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#784315]">
              <KeyRound className="w-4 h-4 text-[#784315]" />
              <span>Start Ride PIN</span>
            </div>
            <p className="text-[11px] text-[#6E6680] mt-0.5 font-medium">
              Share this PIN with Captain when boarding
            </p>
          </div>
          <div className="flex items-center space-x-1.5 bg-[#FDFDFD] text-[#2D283E] border border-[#FFD6A5] px-3.5 py-2 rounded-xl font-mono text-xl sm:text-2xl font-black tracking-widest shadow-xs">
            {ride.startOtp.split('').map((digit, idx) => (
              <span key={idx} className="border-b-2 border-[#957DAD] pb-0.5">
                {digit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Captain Profile Card (if assigned) */}
      {ride.captain ? (
        <div className="bg-[#FDFDFD] rounded-2xl p-4 border border-[#EFEFEF] flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F1F5D8] text-[#415720] font-black flex items-center justify-center text-lg border border-[#DCE4B2]">
              {ride.captain.user?.name ? ride.captain.user.name[0] : 'C'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[#2D283E] text-sm">
                  {ride.captain.user?.name || 'Captain'}
                </span>
                <span className="flex items-center text-xs font-bold text-[#784315] bg-[#FFD6A5]/40 px-1.5 py-0.5 rounded-md border border-[#FFD6A5]">
                  <Star className="w-3 h-3 fill-[#784315] text-[#784315] mr-0.5" />
                  {ride.captain.ratingAvg}
                </span>
              </div>
              <p className="text-xs text-[#6E6680] font-medium">
                {ride.captain.vehicleModel}
              </p>
              <div className="mt-1 inline-block bg-[#EFEFEF] text-[#4A3B5C] font-mono font-bold text-[11px] px-2 py-0.5 rounded-md border border-[#E0E0E0]">
                {ride.captain.vehicleNumber}
              </div>
            </div>
          </div>

          {/* Call action */}
          <a
            href={`tel:${ride.captain.user?.phone || '9999999999'}`}
            className="w-10 h-10 rounded-2xl bg-[#F1F5D8] hover:bg-[#E5EBC6] text-[#415720] border border-[#DCE4B2] flex items-center justify-center shadow-xs transition-colors"
            title="Call Captain"
          >
            <Phone className="w-5 h-5" />
          </a>
        </div>
      ) : (
        <div className="p-4 bg-[#FFD6A5]/20 rounded-2xl border border-[#FFD6A5]/60 text-center space-y-3">
          <div className="animate-spin w-7 h-7 border-3 border-[#957DAD] border-t-transparent rounded-full mx-auto" />
          <div>
            <p className="text-xs text-[#2D283E] font-bold">
              Matching nearest Rapido Captain...
            </p>
            <p className="text-[11px] text-[#6E6680] mt-0.5">
              Broadcasted to nearby active Captains
            </p>
          </div>
          {onAutoMatch && (
            <div className="pt-1">
              <button
                onClick={onAutoMatch}
                className="w-full bg-[#957DAD] hover:bg-[#856C9E] text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5"
              >
                <span>⚡ Instant Match Captain (Test Flow)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Route Details */}
      <div className="border-t border-[#EFEFEF] pt-3 space-y-2 text-xs">
        <div className="flex items-start space-x-2.5">
          <span className="w-3 h-3 rounded-full bg-[#7BA644] mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-bold text-[#415720]">Pickup Location</div>
            <div className="text-[#6E6680]">{ride.pickupAddress}</div>
          </div>
        </div>
        <div className="flex items-start space-x-2.5">
          <span className="w-3 h-3 rounded-full bg-[#FFD6A5] mt-0.5 flex-shrink-0 border border-[#D97706]" />
          <div>
            <div className="font-bold text-[#784315]">Destination</div>
            <div className="text-[#6E6680]">{ride.dropoffAddress}</div>
          </div>
        </div>
      </div>

      {/* Ride Fare Preview */}
      <div className="flex items-center justify-between bg-[#EFEFEF]/60 px-3.5 py-2.5 rounded-2xl border border-[#E0E0E0] text-xs font-medium">
        <span className="text-[#6E6680]">Fare Payable:</span>
        <span className="text-base font-extrabold text-[#2D283E]">₹{ride.totalFare}</span>
      </div>

      {/* Safety & Action Buttons */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          onClick={onTriggerSOS}
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#FFD6A5]/30 hover:bg-[#FFD6A5]/60 border border-[#FFD6A5] text-[#784315] text-xs font-bold transition-colors shadow-xs"
        >
          <ShieldAlert className="w-4 h-4 text-[#784315] mb-0.5" />
          <span>SOS Alert</span>
        </button>

        <button
          onClick={onShare}
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#EFEFEF] hover:bg-[#E5E5E5] border border-[#E0E0E0] text-[#2D283E] text-xs font-bold transition-colors shadow-xs"
        >
          <Share2 className="w-4 h-4 text-[#6E6680] mb-0.5" />
          <span>Share Ride</span>
        </button>

        <button
          onClick={() => setShowCancelModal(true)}
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#EFEFEF] hover:bg-[#FFD6A5]/40 hover:text-[#784315] border border-[#E0E0E0] text-[#6E6680] text-xs font-bold transition-colors shadow-xs"
        >
          <XCircle className="w-4 h-4 mb-0.5" />
          <span>Cancel</span>
        </button>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-[#2D283E]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FDFDFD] rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-[#EFEFEF]">
            <h3 className="font-bold text-base text-[#2D283E]">Cancel this ride?</h3>
            <p className="text-xs text-[#6E6680] leading-relaxed">
              Are you sure you want to cancel your ride? No cancellation fee applies if cancelled within 2 minutes.
            </p>
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 px-3 border border-[#D5D5D5] bg-[#EFEFEF] hover:bg-[#E5E5E5] rounded-xl text-xs font-bold text-[#2D283E] transition-colors"
              >
                Keep Ride
              </button>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  onCancel();
                }}
                className="flex-1 py-2.5 px-3 bg-[#FFD6A5] hover:bg-[#F5C285] text-[#784315] font-extrabold rounded-xl text-xs transition-colors shadow-sm"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
