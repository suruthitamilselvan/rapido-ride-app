'use client';

import React, { useState } from 'react';
import { VehicleEstimate, VehicleType } from '../types';
import { ShieldCheck, Tag, Info, CheckCircle2, AlertCircle } from 'lucide-react';

interface VehicleSelectorProps {
  estimates: VehicleEstimate[];
  selectedType: VehicleType;
  onSelect: (type: VehicleType) => void;
  onBook: () => void;
  isLoading: boolean;
  onApplyPromo: (code: string) => Promise<boolean>;
  appliedPromo: string | null;
  onRemovePromo: () => void;
}

export default function VehicleSelector({
  estimates,
  selectedType,
  onSelect,
  onBook,
  isLoading,
  onApplyPromo,
  appliedPromo,
  onRemovePromo,
}: VehicleSelectorProps) {
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [showFareDetails, setShowFareDetails] = useState(false);

  const selectedEstimate = estimates.find((e) => e.vehicleType === selectedType) || estimates[0];

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setIsApplyingPromo(true);
    setPromoError(null);
    setPromoSuccess(null);
    try {
      const ok = await onApplyPromo(promoInput.trim());
      if (ok) {
        setPromoSuccess(`Coupon ${promoInput.toUpperCase()} applied!`);
        setPromoInput('');
      } else {
        setPromoError('Invalid coupon code');
      }
    } catch (e: any) {
      setPromoError(e.message || 'Failed to apply coupon');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  return (
    <div className="bg-[#FDFDFD] rounded-3xl shadow-xs border border-[#EFEFEF] p-5 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#EFEFEF] pb-3">
        <div>
          <h2 className="text-lg font-bold text-[#2D283E]">Select Ride Option</h2>
          <p className="text-xs text-[#6E6680]">Affordable & fast city rides</p>
        </div>
        <div className="flex items-center space-x-1.5 bg-[#F1F5D8] text-[#415720] px-2.5 py-1 rounded-full text-xs font-semibold border border-[#DCE4B2]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Rapido Safety Promise</span>
        </div>
      </div>

      {/* Vehicle Options List */}
      <div className="space-y-2.5">
        {estimates.map((item) => {
          const isSelected = selectedType === item.vehicleType;
          return (
            <div
              key={item.vehicleType}
              onClick={() => onSelect(item.vehicleType)}
              className={`relative p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                isSelected
                  ? 'border-[#957DAD] bg-[#F1F5D8]/50 shadow-xs'
                  : 'border-[#EFEFEF] hover:border-[#DCE4B2] hover:bg-[#FDFDFD]'
              }`}
            >
              {/* Vehicle Icon & Details */}
              <div className="flex items-center space-x-3.5">
                <div className="text-3xl bg-[#EFEFEF] rounded-2xl p-2 w-12 h-12 flex items-center justify-center border border-[#E0E0E0]">
                  {item.icon}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#2D283E] text-sm sm:text-base">{item.title}</span>
                    <span className="text-[11px] font-semibold bg-[#EFEFEF] text-[#6E6680] px-2 py-0.5 rounded-full">
                      {item.etaMinutes} mins away
                    </span>
                  </div>
                  <p className="text-xs text-[#6E6680] mt-0.5">{item.subtitle}</p>
                  {item.vehicleType === 'BIKE' && (
                    <div className="mt-1 flex items-center space-x-1 text-[11px] text-[#784315] font-medium">
                      <span>🪖 Helmet provided for passenger</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Selection */}
              <div className="text-right">
                <div className="text-lg font-extrabold text-[#2D283E]">
                  ₹{item.totalFare}
                </div>
                {item.discountFare > 0 && (
                  <div className="text-xs text-[#415720] font-semibold line-through">
                    ₹{item.totalFare + item.discountFare}
                  </div>
                )}
                <span className="text-[11px] text-[#888199] font-medium">
                  {item.distanceKm} km
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Promo Code Section */}
      <div className="bg-[#EFEFEF]/60 p-3 rounded-2xl border border-[#E0E0E0] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#2D283E]">
            <Tag className="w-3.5 h-3.5 text-[#957DAD]" />
            <span>Apply Coupons / Promo Code</span>
          </div>
          {appliedPromo && (
            <button
              onClick={onRemovePromo}
              className="text-[11px] text-[#991B1B] hover:underline font-semibold"
            >
              Remove ({appliedPromo})
            </button>
          )}
        </div>

        {!appliedPromo ? (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="e.g. RAPIDO50, WELCOME20"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              className="flex-1 bg-[#FDFDFD] border border-[#D0D0D0] rounded-xl px-3 py-1.5 text-xs text-[#2D283E] placeholder-[#888199] uppercase font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-[#957DAD]"
            />
            <button
              onClick={handleApplyPromo}
              disabled={isApplyingPromo || !promoInput.trim()}
              className="bg-[#957DAD] hover:bg-[#856C9E] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
            >
              {isApplyingPromo ? 'Checking...' : 'Apply'}
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-xs text-[#415720] bg-[#F1F5D8] p-2 rounded-xl border border-[#DCE4B2] font-medium">
            <CheckCircle2 className="w-4 h-4 text-[#415720]" />
            <span>Coupon <strong>{appliedPromo}</strong> applied successfully!</span>
          </div>
        )}

        {promoError && (
          <p className="text-[11px] text-[#991B1B] flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>{promoError}</span>
          </p>
        )}
      </div>

      {/* Fare Breakdown Toggle */}
      {selectedEstimate && (
        <div className="border-t border-[#EFEFEF] pt-3 text-xs">
          <button
            onClick={() => setShowFareDetails(!showFareDetails)}
            className="text-[#6E6680] hover:text-[#2D283E] flex items-center justify-between w-full font-medium"
          >
            <span className="flex items-center space-x-1">
              <Info className="w-3.5 h-3.5 text-[#888199]" />
              <span>Fare Breakdown & Details</span>
            </span>
            <span className="text-[#957DAD] font-semibold">{showFareDetails ? 'Hide' : 'View'}</span>
          </button>

          {showFareDetails && (
            <div className="mt-2.5 p-3.5 bg-[#EFEFEF]/50 rounded-2xl space-y-1.5 text-[#6E6680] border border-[#E5E5E5]">
              <div className="flex justify-between">
                <span>Base Fare:</span>
                <span>₹{selectedEstimate.baseFare}</span>
              </div>
              <div className="flex justify-between">
                <span>Distance Fare ({selectedEstimate.distanceKm} km):</span>
                <span>₹{selectedEstimate.distanceFare}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & Fees (5% GST):</span>
                <span>₹{selectedEstimate.taxFare}</span>
              </div>
              {selectedEstimate.discountFare > 0 && (
                <div className="flex justify-between text-[#415720] font-semibold">
                  <span>Promo Discount:</span>
                  <span>-₹{selectedEstimate.discountFare}</span>
                </div>
              )}
              <div className="border-t border-[#DCDCDC] pt-1.5 flex justify-between font-bold text-[#2D283E] text-sm">
                <span>Total Amount:</span>
                <span>₹{selectedEstimate.totalFare}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Book Ride Button */}
      <button
        onClick={onBook}
        disabled={isLoading}
        className="w-full bg-[#957DAD] hover:bg-[#856C9E] text-white font-bold text-base py-3.5 px-4 rounded-2xl shadow-xs transition-all transform active:scale-[0.99] flex items-center justify-center space-x-2 disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center space-x-2">
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            <span>Finding Nearby Captain...</span>
          </span>
        ) : (
          <span>Book {selectedEstimate?.title || 'Ride'} • ₹{selectedEstimate?.totalFare}</span>
        )}
      </button>
    </div>
  );
}
