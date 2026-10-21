'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Map from '../components/Map';
import VehicleSelector from '../components/VehicleSelector';
import ActiveRideCard from '../components/ActiveRideCard';
import PaymentModal from '../components/PaymentModal';
import SOSModal from '../components/SOSModal';
import { getSocket } from '../lib/socket';
import { fetchFareEstimates, createRide, getActiveRide, cancelRide, validatePromo, getRide, autoMatchRide } from '../lib/api';
import { Ride, VehicleEstimate, VehicleType } from '../types';
import { MapPin, ArrowRightLeft, ShieldCheck, Sparkles, Navigation } from 'lucide-react';

const PRESET_LOCATIONS = [
  { name: 'MG Road Metro Station', lat: 12.9756, lng: 77.6066 },
  { name: 'Indiranagar 100ft Road', lat: 12.9719, lng: 77.6412 },
  { name: 'Koramangala Sony World Signal', lat: 12.9352, lng: 77.6245 },
  { name: 'Whitefield ITPL Tech Park', lat: 12.9863, lng: 77.7314 },
  { name: 'Electronic City Phase 1', lat: 12.8452, lng: 77.6602 },
  { name: 'Kempegowda Int. Airport (BLR)', lat: 13.1986, lng: 77.7066 },
];

export default function RiderPage() {
  const [pickup, setPickup] = useState(PRESET_LOCATIONS[0]);
  const [dropoff, setDropoff] = useState(PRESET_LOCATIONS[1]);
  const [estimates, setEstimates] = useState<VehicleEstimate[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('BIKE');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [captainLocation, setCaptainLocation] = useState<{ lat: number; lng: number; vehicleType?: string } | null>(null);
  const [tripTelemetry, setTripTelemetry] = useState<{
    distanceRemainingKm: number;
    durationRemainingMin: number;
    progressPercent: number;
    currentSpeed: number;
  } | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [currentRiderId, setCurrentRiderId] = useState<string>('rider-demo-01');

  // Load fare estimates
  const loadEstimates = useCallback(async () => {
    try {
      const data = await fetchFareEstimates(
        pickup.lat,
        pickup.lng,
        dropoff.lat,
        dropoff.lng,
        appliedPromo || undefined
      );
      setEstimates(data.estimates);
    } catch (err) {
      console.error('Error fetching estimates:', err);
    }
  }, [pickup, dropoff, appliedPromo]);

  useEffect(() => {
    loadEstimates();
  }, [loadEstimates]);

  // Sync active user & check active ride
  useEffect(() => {
    const syncUser = () => {
      const storedId = localStorage.getItem('rapido_current_user_id') || 'rider-demo-01';
      setCurrentRiderId(storedId);
      getActiveRide(storedId).then((ride) => {
        if (ride) {
          setActiveRide(ride);
          if (ride.status === 'ARRIVED_PICKUP') {
            setCaptainLocation({
              lat: ride.pickupLat,
              lng: ride.pickupLng,
              vehicleType: ride.vehicleType,
            });
          } else if (ride.status === 'COMPLETED') {
            setCaptainLocation({
              lat: ride.dropoffLat,
              lng: ride.dropoffLng,
              vehicleType: ride.vehicleType,
            });
            if (ride.paymentStatus === 'UNPAID') {
              setShowPaymentModal(true);
            }
          } else if (ride.captain) {
            setCaptainLocation({
              lat: ride.captain.currentLat,
              lng: ride.captain.currentLng,
              vehicleType: ride.vehicleType,
            });
          }
        } else {
          setActiveRide(null);
        }
      });
    };

    syncUser();
    window.addEventListener('rapido_user_changed', syncUser);
    return () => window.removeEventListener('rapido_user_changed', syncUser);
  }, []);

  // Socket.IO event listeners for live ride updates
  useEffect(() => {
    const socket = getSocket();

    if (activeRide) {
      socket.emit('join_room', `ride_${activeRide.id}`);
      socket.emit('join_room', `user_${activeRide.riderId}`);
    }

    const handleRideAccepted = (updatedRide: Ride) => {
      console.log('Ride accepted event received:', updatedRide);
      setActiveRide(updatedRide);
      if (updatedRide.captain) {
        setCaptainLocation({
          lat: updatedRide.captain.currentLat,
          lng: updatedRide.captain.currentLng,
          vehicleType: updatedRide.vehicleType,
        });
      }
    };

    const handleRideStatusUpdated = (updatedRide: Ride) => {
      console.log('Ride status updated:', updatedRide.status);
      setActiveRide(updatedRide);
      if (updatedRide.status === 'ARRIVED_PICKUP') {
        // Snap vehicle marker right onto the green pickup pin!
        setCaptainLocation({
          lat: updatedRide.pickupLat,
          lng: updatedRide.pickupLng,
          vehicleType: updatedRide.vehicleType,
        });
      } else if (updatedRide.status === 'IN_PROGRESS') {
        setTripTelemetry((prev) => prev || {
          distanceRemainingKm: updatedRide.distanceKm,
          durationRemainingMin: updatedRide.durationMin,
          progressPercent: 0,
          currentSpeed: 32,
        });
      } else if (updatedRide.status === 'COMPLETED') {
        setCaptainLocation({
          lat: updatedRide.dropoffLat,
          lng: updatedRide.dropoffLng,
          vehicleType: updatedRide.vehicleType,
        });
        setTripTelemetry({
          distanceRemainingKm: 0,
          durationRemainingMin: 0,
          progressPercent: 100,
          currentSpeed: 0,
        });
      } else if (updatedRide.captain) {
        setCaptainLocation({
          lat: updatedRide.captain.currentLat,
          lng: updatedRide.captain.currentLng,
          vehicleType: updatedRide.vehicleType,
        });
      }
    };

    const handleCaptainPosition = (pos: {
      lat: number;
      lng: number;
      distanceRemainingKm?: number;
      durationRemainingMin?: number;
      progressPercent?: number;
      currentSpeed?: number;
    }) => {
      setCaptainLocation((prev) => ({
        lat: pos.lat,
        lng: pos.lng,
        vehicleType: activeRide?.vehicleType || prev?.vehicleType || 'BIKE',
      }));

      if (pos.distanceRemainingKm !== undefined) {
        setTripTelemetry({
          distanceRemainingKm: pos.distanceRemainingKm,
          durationRemainingMin: pos.durationRemainingMin ?? 0,
          progressPercent: pos.progressPercent ?? 0,
          currentSpeed: pos.currentSpeed ?? 32,
        });
      }
    };

    const handleRideCompleted = (completedRide: Ride) => {
      console.log('Ride completed:', completedRide);
      setActiveRide(completedRide);
      // Place vehicle marker at destination dropoff
      setCaptainLocation({
        lat: completedRide.dropoffLat,
        lng: completedRide.dropoffLng,
        vehicleType: completedRide.vehicleType,
      });
      setTripTelemetry({
        distanceRemainingKm: 0,
        durationRemainingMin: 0,
        progressPercent: 100,
        currentSpeed: 0,
      });
      setShowPaymentModal(true);
    };

    const handleRideCancelled = () => {
      alert('Your ride was cancelled.');
      setActiveRide(null);
      setCaptainLocation(null);
    };

    const handleDestinationArrived = (data: { rideId: string; lat: number; lng: number }) => {
      setCaptainLocation((prev) => ({
        lat: data.lat,
        lng: data.lng,
        vehicleType: activeRide?.vehicleType || prev?.vehicleType || 'BIKE',
      }));
      setTripTelemetry({
        distanceRemainingKm: 0,
        durationRemainingMin: 0,
        progressPercent: 100,
        currentSpeed: 0,
      });
    };

    socket.on('ride_accepted', handleRideAccepted);
    socket.on('ride_status_updated', handleRideStatusUpdated);
    socket.on('captain_live_position', handleCaptainPosition);
    socket.on('captain_arrived_destination', handleDestinationArrived);
    socket.on('ride_completed', handleRideCompleted);
    socket.on('ride_cancelled', handleRideCancelled);

    return () => {
      socket.off('ride_accepted', handleRideAccepted);
      socket.off('ride_status_updated', handleRideStatusUpdated);
      socket.off('captain_live_position', handleCaptainPosition);
      socket.off('captain_arrived_destination', handleDestinationArrived);
      socket.off('ride_completed', handleRideCompleted);
      socket.off('ride_cancelled', handleRideCancelled);
    };
  }, [activeRide?.id]);

  // Polling fallback when matching captain
  useEffect(() => {
    if (!activeRide || activeRide.status !== 'REQUESTED') return;

    const interval = setInterval(async () => {
      try {
        const fresh = await getRide(activeRide.id);
        if (fresh && fresh.status !== 'REQUESTED') {
          setActiveRide(fresh);
          if (fresh.captain) {
            setCaptainLocation({
              lat: fresh.captain.currentLat,
              lng: fresh.captain.currentLng,
              vehicleType: fresh.vehicleType,
            });
          }
        }
      } catch (e) {}
    }, 2000);

    return () => clearInterval(interval);
  }, [activeRide?.id, activeRide?.status]);

  // Quick auto-match captain
  const handleAutoMatch = async () => {
    if (!activeRide) return;
    try {
      const matched = await autoMatchRide(activeRide.id);
      setActiveRide(matched);
      if (matched.captain) {
        setCaptainLocation({
          lat: matched.captain.currentLat,
          lng: matched.captain.currentLng,
          vehicleType: matched.vehicleType,
        });
      }
    } catch (err: any) {
      console.error('Auto match failed:', err);
    }
  };

  // Swap pickup & dropoff
  const handleSwapLocations = () => {
    const temp = pickup;
    setPickup(dropoff);
    setDropoff(temp);
  };

  // Promo code validation
  const handleApplyPromo = async (code: string) => {
    const promo = await validatePromo(code);
    if (promo) {
      setAppliedPromo(promo.code);
      return true;
    }
    return false;
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
  };

  // Book Ride
  const handleBookRide = async () => {
    setIsBooking(true);
    try {
      const newRide = await createRide({
        riderId: currentRiderId,
        pickupAddress: pickup.name,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffAddress: dropoff.name,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        vehicleType: selectedVehicle,
        promoCode: appliedPromo || undefined,
      });

      setActiveRide(newRide);

      // Broadcast ride request to online captains via Socket.io
      const socket = getSocket();
      socket.emit('rider_request_ride', newRide);
    } catch (err: any) {
      alert(err.message || 'Failed to request ride');
    } finally {
      setIsBooking(false);
    }
  };

  // Cancel Active Ride
  const handleCancelActiveRide = async () => {
    if (!activeRide) return;
    try {
      await cancelRide(activeRide.id, 'Cancelled by passenger');
      const socket = getSocket();
      socket.emit('cancel_ride', { rideId: activeRide.id });
      setActiveRide(null);
      setCaptainLocation(null);
    } catch (err) {
      console.error('Error cancelling ride:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#F1F5D8]/70 via-[#FDFDFD] to-[#FFD6A5]/40 text-[#2D283E] rounded-3xl p-6 sm:p-8 shadow-xs border border-[#E8E8E8] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 bg-[#957DAD] text-white font-bold text-xs px-3.5 py-1 rounded-full uppercase tracking-wider mb-2.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Gentle & Reliable City Travel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#2D283E]">
            Where are you heading today?
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6680] mt-1.5 max-w-xl">
            Commute comfortably with <strong>Bike Taxi</strong>, <strong>Auto</strong>, and <strong>Cabs</strong> with zero surge surprises and real-time live map tracking.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-white/90 p-3.5 rounded-2xl border border-[#E0E0E0] shadow-xs">
          <div className="text-2xl">🪖</div>
          <div className="text-xs">
            <div className="font-bold text-[#957DAD]">100% Helmet Safety</div>
            <div className="text-[#6E6680]">Clean, sanitized helmets provided for every ride</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Booking / Active Ride Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Control Panel (5 columns) */}
        <div className="lg:col-span-5 space-y-4">
          {!activeRide ? (
            <>
              {/* Pickup & Destination Input Card */}
              <div className="bg-[#FDFDFD] rounded-3xl p-5 shadow-xs border border-[#EFEFEF] space-y-4">
                <h2 className="text-base font-bold text-[#2D283E] flex items-center space-x-2">
                  <Navigation className="w-4 h-4 text-[#957DAD]" />
                  <span>Choose Your Route</span>
                </h2>

                <div className="space-y-3 relative">
                  {/* Pickup Dropdown */}
                  <div>
                    <label className="text-xs font-bold text-[#415720] block mb-1.5">
                      📍 Pickup Location
                    </label>
                    <select
                      value={pickup.name}
                      onChange={(e) => {
                        const found = PRESET_LOCATIONS.find((loc) => loc.name === e.target.value);
                        if (found) setPickup(found);
                      }}
                      className="w-full bg-[#F1F5D8]/40 border border-[#DCE4B2] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#2D283E] focus:outline-none focus:ring-2 focus:ring-[#957DAD]"
                    >
                      {PRESET_LOCATIONS.map((loc) => (
                        <option key={loc.name} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Swap Button */}
                  <div className="flex justify-center -my-1">
                    <button
                      onClick={handleSwapLocations}
                      className="bg-[#EFEFEF] hover:bg-[#957DAD] hover:text-white text-[#6E6680] p-2 rounded-full border border-[#E0E0E0] shadow-xs transition-all"
                      title="Swap Pickup and Drop-off"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 rotate-90 sm:rotate-0" />
                    </button>
                  </div>

                  {/* Destination Dropdown */}
                  <div>
                    <label className="text-xs font-bold text-[#784315] block mb-1.5">
                      🏁 Drop-off Destination
                    </label>
                    <select
                      value={dropoff.name}
                      onChange={(e) => {
                        const found = PRESET_LOCATIONS.find((loc) => loc.name === e.target.value);
                        if (found) setDropoff(found);
                      }}
                      className="w-full bg-[#FFD6A5]/30 border border-[#FFD6A5] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#2D283E] focus:outline-none focus:ring-2 focus:ring-[#957DAD]"
                    >
                      {PRESET_LOCATIONS.map((loc) => (
                        <option key={loc.name} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Vehicle Options & Fare Estimation */}
              <VehicleSelector
                estimates={estimates}
                selectedType={selectedVehicle}
                onSelect={(type) => setSelectedVehicle(type)}
                onBook={handleBookRide}
                isLoading={isBooking}
                onApplyPromo={handleApplyPromo}
                appliedPromo={appliedPromo}
                onRemovePromo={handleRemovePromo}
              />
            </>
          ) : (
            /* Active Ride in Progress Card */
            <ActiveRideCard
              ride={activeRide}
              telemetry={tripTelemetry}
              onCancel={handleCancelActiveRide}
              onTriggerSOS={() => setShowSOSModal(true)}
              onShare={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Live ride link copied to clipboard!');
              }}
              onAutoMatch={handleAutoMatch}
            />
          )}
        </div>

        {/* Right Map View (7 columns) */}
        <div className="lg:col-span-7 bg-[#FDFDFD] p-3.5 rounded-3xl shadow-xs border border-[#EFEFEF] h-[560px] flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#6E6680]">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#7BA644]" />
              <span>Live Interactive GPS Route</span>
            </span>
            <span className="text-[#957DAD] font-bold">
              {activeRide?.status === 'IN_PROGRESS'
                ? `🚗 ${tripTelemetry ? `${tripTelemetry.distanceRemainingKm} km left • ${tripTelemetry.durationRemainingMin} mins` : 'Trip in motion'}`
                : activeRide?.status === 'ACCEPTED'
                ? '🛵 Captain approaching'
                : 'Click map to explore route'}
            </span>
          </div>

          <div className="flex-1 rounded-2xl overflow-hidden relative">
            <Map
              pickup={{
                lat: activeRide ? activeRide.pickupLat : pickup.lat,
                lng: activeRide ? activeRide.pickupLng : pickup.lng,
                address: activeRide ? activeRide.pickupAddress : pickup.name,
              }}
              dropoff={
                activeRide
                  ? {
                      lat: activeRide.dropoffLat,
                      lng: activeRide.dropoffLng,
                      address: activeRide.dropoffAddress,
                    }
                  : { lat: dropoff.lat, lng: dropoff.lng, address: dropoff.name }
              }
              captainLocation={captainLocation}
              telemetry={tripTelemetry}
            />
          </div>
        </div>
      </div>

      {/* Payment & Receipt Modal */}
      {showPaymentModal && activeRide && (
        <PaymentModal
          ride={activeRide}
          onClose={() => {
            setShowPaymentModal(false);
            setActiveRide(null);
            setCaptainLocation(null);
          }}
        />
      )}

      {/* Emergency SOS Modal */}
      {showSOSModal && activeRide && (
        <SOSModal
          rideId={activeRide.id}
          lat={pickup.lat}
          lng={pickup.lng}
          riderName="Rahul Sharma"
          onClose={() => setShowSOSModal(false)}
        />
      )}
    </div>
  );
}
