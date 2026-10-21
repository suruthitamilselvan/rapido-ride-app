'use client';

import React, { useState, useEffect, useRef } from 'react';
import Map from '../../components/Map';
import CaptainAlertModal from '../../components/CaptainAlertModal';
import { getSocket } from '../../lib/socket';
import { toggleCaptainDuty, verifyRideOtp, completeRide, getRide, fetchPendingRides, acceptRide, fetchCurrentActiveRide, fetchUsers } from '../../lib/api';
import { Ride, CaptainProfile } from '../../types';
import { Power, CheckCircle, Navigation, KeyRound, Star, Award, Shield, Play, Pause, BellRing, ArrowRight } from 'lucide-react';

export default function CaptainDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [incomingRide, setIncomingRide] = useState<Ride | null>(null);
  const [pendingRidesList, setPendingRidesList] = useState<Ride[]>([]);
  const [activeTrip, setActiveTrip] = useState<Ride | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);
  const [reachedDestination, setReachedDestination] = useState(false);
  const [completedTripSummary, setCompletedTripSummary] = useState<{
    id: string;
    fare: number;
    pickup: string;
    dropoff: string;
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
  } | null>(null);

  // Live Navigation Telemetry (Kilometers and Minutes remaining)
  const [liveTelemetry, setLiveTelemetry] = useState<{
    distanceRemainingKm: number;
    durationRemainingMin: number;
    progressPercent: number;
    currentSpeed: number;
  }>({
    distanceRemainingKm: 5.0,
    durationRemainingMin: 14,
    progressPercent: 0,
    currentSpeed: 32,
  });

  // Captain Profile
  const [captain, setCaptain] = useState<CaptainProfile>({
    id: 'captain-bike-01',
    userId: 'captain-user-bike',
    vehicleType: 'BIKE',
    vehicleNumber: 'KA 01 AB 1234',
    vehicleModel: 'Hero Splendor Plus',
    isOnline: true,
    currentLat: 12.9720,
    currentLng: 77.5950,
    ratingAvg: 4.9,
    totalRides: 342,
  });

  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync active Captain profile from navbar selector
  useEffect(() => {
    const syncCaptainUser = async () => {
      try {
        const users = await fetchUsers();
        const storedId = localStorage.getItem('rapido_current_user_id');
        const activeUser = users.find((u) => u.id === storedId && u.captain) || users.find((u) => u.captain);
        if (activeUser && activeUser.captain) {
          setCaptain(activeUser.captain);
        }
      } catch (e) {}
    };

    syncCaptainUser();
    window.addEventListener('rapido_user_changed', syncCaptainUser);
    return () => window.removeEventListener('rapido_user_changed', syncCaptainUser);
  }, []);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, []);

  // Poll for active trip in progress or accepted
  useEffect(() => {
    const syncActiveRide = async () => {
      try {
        const current = await fetchCurrentActiveRide(captain.id);
        if (current && ['ACCEPTED', 'ARRIVED_PICKUP', 'IN_PROGRESS'].includes(current.status)) {
          setActiveTrip((prev) => {
            if (prev && prev.id === current.id && prev.status === current.status) {
              return prev;
            }
            return current;
          });
          setIncomingRide(null);
        } else if (!current || current?.status === 'COMPLETED' || current?.status === 'CANCELLED') {
          setActiveTrip((prev) => (prev ? null : prev));
        }
      } catch (e) {}
    };

    syncActiveRide();
    const interval = setInterval(syncActiveRide, 2000);
    return () => clearInterval(interval);
  }, [captain.id]);

  // Socket setup
  useEffect(() => {
    const socket = getSocket();

    // Listen for incoming ride alerts
    const handleIncomingAlert = (rideData: Ride) => {
      console.log('Captain incoming ride alert:', rideData);
      if (isOnline && !activeTrip) {
        setIncomingRide(rideData);
      }
    };

    const handleRideAccepted = (acceptedRide: Ride) => {
      console.log('Captain console received ride_accepted:', acceptedRide);
      setActiveTrip(acceptedRide);
      setIncomingRide(null);
      if (acceptedRide.id) {
        socket.emit('join_room', `ride_${acceptedRide.id}`);
      }
    };

    const handleRideStatusUpdated = (updated: Ride) => {
      setActiveTrip((prev) => {
        if (prev && prev.id === updated.id && prev.status === updated.status) return prev;
        return updated;
      });
    };

    const handleRideCancelled = () => {
      alert('The rider cancelled this request.');
      setActiveTrip(null);
      setIncomingRide(null);
      setIsSimulatingDrive(false);
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };

    const handleCaptainPosition = (pos: {
      captainId?: string;
      rideId?: string;
      lat: number;
      lng: number;
      distanceRemainingKm?: number;
      durationRemainingMin?: number;
      progressPercent?: number;
      currentSpeed?: number;
    }) => {
      if (pos.captainId === captain.id || (activeTrip && pos.rideId === activeTrip.id)) {
        setCaptain((prev) => ({
          ...prev,
          currentLat: pos.lat,
          currentLng: pos.lng,
        }));
        if (pos.distanceRemainingKm !== undefined) {
          setLiveTelemetry({
            distanceRemainingKm: pos.distanceRemainingKm,
            durationRemainingMin: pos.durationRemainingMin ?? 0,
            progressPercent: pos.progressPercent ?? 0,
            currentSpeed: pos.currentSpeed ?? 30,
          });
          setIsSimulatingDrive(true);
        }
        if (pos.progressPercent !== undefined && pos.progressPercent >= 100) {
          setReachedDestination(true);
          setIsSimulatingDrive(false);
        }
      }
    };

    const handleDestinationArrived = (data: { rideId: string; lat: number; lng: number }) => {
      if (activeTrip && data.rideId === activeTrip.id) {
        setReachedDestination(true);
        setIsSimulatingDrive(false);
        setCaptain((prev) => ({ ...prev, currentLat: data.lat, currentLng: data.lng }));
        setLiveTelemetry({
          distanceRemainingKm: 0,
          durationRemainingMin: 0,
          progressPercent: 100,
          currentSpeed: 0,
        });
      }
    };

    socket.on('incoming_ride_alert', handleIncomingAlert);
    socket.on('ride_accepted', handleRideAccepted);
    socket.on('ride_status_updated', handleRideStatusUpdated);
    socket.on('ride_cancelled', handleRideCancelled);
    socket.on('captain_live_position', handleCaptainPosition);
    socket.on('captain_arrived_destination', handleDestinationArrived);

    return () => {
      socket.off('incoming_ride_alert', handleIncomingAlert);
      socket.off('ride_accepted', handleRideAccepted);
      socket.off('ride_status_updated', handleRideStatusUpdated);
      socket.off('ride_cancelled', handleRideCancelled);
      socket.off('captain_live_position', handleCaptainPosition);
      socket.off('captain_arrived_destination', handleDestinationArrived);
    };
  }, [isOnline, activeTrip?.id]);

  // Periodically check for any pending rides in database
  useEffect(() => {
    if (!isOnline || activeTrip) return;

    const checkPending = async () => {
      try {
        const pending = await fetchPendingRides();
        setPendingRidesList(pending);
        if (pending.length > 0 && !incomingRide) {
          setIncomingRide(pending[0]);
        }
      } catch (e) {}
    };

    checkPending();
    const interval = setInterval(checkPending, 2500);
    return () => clearInterval(interval);
  }, [isOnline, activeTrip, incomingRide]);

  // Toggle online/offline
  const handleToggleDuty = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    try {
      await toggleCaptainDuty(captain.id, nextState, captain.currentLat, captain.currentLng);
      const socket = getSocket();
      socket.emit('captain_duty_change', {
        captainId: captain.id,
        isOnline: nextState,
        lat: captain.currentLat,
        lng: captain.currentLng,
      });
    } catch (err) {
      console.error('Error toggling duty:', err);
    }
  };

  // Accept incoming ride
  const handleAcceptRide = async (rideId: string) => {
    try {
      const updated = await acceptRide(rideId, captain.id);
      setActiveTrip(updated);
      setIncomingRide(null);

      const socket = getSocket();
      socket.emit('captain_accept_ride', {
        rideId,
        captainId: captain.id,
      });
      socket.emit('join_room', `ride_${rideId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to accept ride');
    }
  };

  // Captain arrived at pickup
  const handleArrivedPickup = () => {
    if (!activeTrip) return;
    const socket = getSocket();
    socket.emit('captain_arrived_pickup', { rideId: activeTrip.id });
    setActiveTrip({ ...activeTrip, status: 'ARRIVED_PICKUP' });

    // Instantly snap vehicle location directly to the pickup point!
    setCaptain((prev) => ({
      ...prev,
      currentLat: activeTrip.pickupLat,
      currentLng: activeTrip.pickupLng,
    }));

    socket.emit('captain_location_stream', {
      captainId: captain.id,
      rideId: activeTrip.id,
      lat: activeTrip.pickupLat,
      lng: activeTrip.pickupLng,
    });
  };

  // Auto-drive simulation moving vehicle from pickup to dropoff along curved route
  const startDriveSimulation = (trip: Ride) => {
    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    setIsSimulatingDrive(true);
    setReachedDestination(false);

    const startLat = trip.pickupLat;
    const startLng = trip.pickupLng;
    const endLat = trip.dropoffLat;
    const endLng = trip.dropoffLng;
    const totalKm = trip.distanceKm || 5.0;
    const totalMin = trip.durationMin || 14;

    const totalSteps = 24;
    // Resume from current progress percentage if already partially travelled
    let step = Math.min(totalSteps - 1, Math.round(((liveTelemetry.progressPercent || 0) / 100) * totalSteps));

    simulationIntervalRef.current = setInterval(() => {
      step++;
      const progress = Math.min(1, step / totalSteps);
      // Realistic route curve matching road polyline
      const currentLat = Number((startLat + (endLat - startLat) * progress + Math.sin(progress * Math.PI) * 0.003).toFixed(6));
      const currentLng = Number((startLng + (endLng - startLng) * progress + Math.sin(progress * Math.PI) * 0.002).toFixed(6));

      const remainingKm = Math.max(0, Number((totalKm * (1 - progress)).toFixed(1)));
      const remainingMin = Math.max(0, Math.round(totalMin * (1 - progress)));
      const speed = step >= totalSteps ? 0 : Math.round(30 + Math.sin(progress * Math.PI) * 12);
      const progressPercent = Math.round(progress * 100);

      // Update local state
      setCaptain((prev) => ({ ...prev, currentLat, currentLng }));
      setLiveTelemetry({
        distanceRemainingKm: remainingKm,
        durationRemainingMin: remainingMin,
        progressPercent,
        currentSpeed: speed,
      });

      // Stream to Socket.IO with dynamic km, minutes, and speed
      const socket = getSocket();
      socket.emit('captain_location_stream', {
        captainId: captain.id,
        rideId: trip.id,
        lat: currentLat,
        lng: currentLng,
        distanceRemainingKm: remainingKm,
        durationRemainingMin: remainingMin,
        progressPercent,
        currentSpeed: speed,
      });

      if (step >= totalSteps) {
        if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
        setIsSimulatingDrive(false);
        setReachedDestination(true);
        setLiveTelemetry({
          distanceRemainingKm: 0,
          durationRemainingMin: 0,
          progressPercent: 100,
          currentSpeed: 0,
        });
        // Ensure final location is snapped directly to destination dropoff pin
        setCaptain((prev) => ({ ...prev, currentLat: endLat, currentLng: endLng }));
        socket.emit('captain_location_stream', {
          captainId: captain.id,
          rideId: trip.id,
          lat: endLat,
          lng: endLng,
          distanceRemainingKm: 0,
          durationRemainingMin: 0,
          progressPercent: 100,
          currentSpeed: 0,
        });
      }
    }, 800);
  };

  // Captain enters 4-digit OTP to start trip
  const handleStartTripWithOtp = async () => {
    if (!activeTrip || !otpInput.trim()) return;
    setOtpError(null);
    try {
      const updated = await verifyRideOtp(activeTrip.id, otpInput.trim(), captain.id);
      setActiveTrip(updated);
      setLiveTelemetry({
        distanceRemainingKm: updated.distanceKm,
        durationRemainingMin: updated.durationMin,
        progressPercent: 0,
        currentSpeed: 30,
      });
      const socket = getSocket();
      socket.emit('captain_start_ride', { rideId: activeTrip.id, otp: otpInput.trim() });
      socket.emit('start_trip_simulation', { rideId: activeTrip.id, step: 0 });
      
      // AUTOMATICALLY start live driving simulation along the route!
      startDriveSimulation(updated);
    } catch (err: any) {
      setOtpError(err.message || 'Incorrect 4-digit PIN! Ask rider for OTP.');
    }
  };

  // Manual Toggle / Replay for Drive Simulation
  const handleToggleDriveSimulation = () => {
    if (!activeTrip) return;
    const socket = getSocket();

    if (isSimulatingDrive) {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      setIsSimulatingDrive(false);
      socket.emit('pause_trip_simulation', { rideId: activeTrip.id });
      return;
    }

    const currentStep = Math.round(((liveTelemetry.progressPercent || 0) / 100) * 24);
    socket.emit('start_trip_simulation', { rideId: activeTrip.id, step: currentStep });
    startDriveSimulation(activeTrip);
  };

  // Complete Ride
  const handleCompleteTrip = async () => {
    if (!activeTrip) return;
    try {
      const trip = activeTrip;
      // Snap vehicle location directly to destination
      setCaptain((prev) => ({
        ...prev,
        currentLat: trip.dropoffLat,
        currentLng: trip.dropoffLng,
      }));

      const socket = getSocket();
      socket.emit('pause_trip_simulation', { rideId: trip.id });
      socket.emit('captain_location_stream', {
        captainId: captain.id,
        rideId: trip.id,
        lat: trip.dropoffLat,
        lng: trip.dropoffLng,
      });

      const completed = await completeRide(trip.id);
      socket.emit('captain_complete_ride', { rideId: trip.id });

      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      setIsSimulatingDrive(false);
      setReachedDestination(false);
      setCompletedTripSummary({
        id: completed.id,
        fare: completed.totalFare,
        pickup: trip.pickupAddress,
        dropoff: trip.dropoffAddress,
        pickupLat: trip.pickupLat,
        pickupLng: trip.pickupLng,
        dropoffLat: trip.dropoffLat,
        dropoffLng: trip.dropoffLng,
      });
      setActiveTrip(null);
      setOtpInput('');
    } catch (err: any) {
      alert(err.message || 'Failed to complete trip');
    }
  };

  // Auto-resume movement if trip is IN_PROGRESS when page loads or mounts
  useEffect(() => {
    if (activeTrip && activeTrip.status === 'IN_PROGRESS' && !isSimulatingDrive && !reachedDestination) {
      const socket = getSocket();
      const currentStep = Math.round(((liveTelemetry.progressPercent || 0) / 100) * 24);
      socket.emit('start_trip_simulation', { rideId: activeTrip.id, step: currentStep });
      startDriveSimulation(activeTrip);
    }
  }, [activeTrip?.id, activeTrip?.status]);

  return (
    <div className="space-y-6">
      {/* Captain Hero Header */}
      <div className="bg-gradient-to-r from-[#F1F5D8]/70 via-[#FDFDFD] to-[#FFD6A5]/40 text-[#2D283E] rounded-3xl p-6 sm:p-8 shadow-xs border border-[#E8E8E8] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-[#957DAD] text-white font-black text-2xl flex items-center justify-center shadow-xs border border-[#856C9E]">
            {captain.vehicleType === 'BIKE' ? '🛵' : captain.vehicleType === 'AUTO' ? '🛺' : '🚗'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#2D283E]">Rapido Captain Console</h1>
              <span className="bg-[#EFEFEF] text-[#4A3B5C] font-bold text-xs px-2.5 py-0.5 rounded-full border border-[#E0E0E0] uppercase">
                {captain.vehicleType.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-[#6E6680] mt-0.5">
              Vehicle: <strong className="text-[#2D283E]">{captain.vehicleModel}</strong> ({captain.vehicleNumber})
            </p>
            <div className="flex items-center space-x-3 mt-2 text-xs">
              <span className="flex items-center text-[#784315] font-bold bg-[#FFD6A5]/40 px-2 py-0.5 rounded-md border border-[#FFD6A5]">
                <Star className="w-3.5 h-3.5 fill-[#784315] mr-1" />
                {captain.ratingAvg} Rating
              </span>
              <span className="text-[#B0B0B0]">•</span>
              <span className="text-[#6E6680] font-medium">
                {captain.totalRides} Trips Completed
              </span>
            </div>
          </div>
        </div>

        {/* Online / Offline Duty Switch */}
        <div className="flex items-center space-x-3 bg-white/90 p-2 rounded-2xl border border-[#E0E0E0] shadow-xs">
          <button
            onClick={handleToggleDuty}
            className={`flex items-center space-x-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
              isOnline
                ? 'bg-[#7BA644] hover:bg-[#6B923B] text-white'
                : 'bg-[#EFEFEF] hover:bg-[#E5E5E5] text-[#6E6680]'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOnline ? 'DUTY ONLINE' : 'GO ONLINE'}</span>
          </button>
          <span className="text-xs text-[#6E6680] pr-3 font-medium hidden sm:inline">
            {isOnline ? 'Receiving city ride alerts' : 'Offline • No requests'}
          </span>
        </div>
      </div>

      {/* Main Grid: Control Actions & Live Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Operational Panel (5 columns) */}
        <div className="lg:col-span-5 space-y-4">
          {activeTrip ? (
            /* Active Trip Controls */
            <div className="bg-[#FDFDFD] rounded-3xl p-5 shadow-xs border border-[#EFEFEF] space-y-4">
              <div className="flex items-center justify-between border-b border-[#EFEFEF] pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7BA644] animate-pulse" />
                  <span className="font-extrabold text-sm text-[#2D283E]">Active Passenger Trip</span>
                </div>
                <span className="text-xs font-mono font-bold text-[#957DAD]">
                  Fare: ₹{activeTrip.totalFare}
                </span>
              </div>

              {/* Status Stepper */}
              <div className="space-y-3 bg-[#EFEFEF]/60 p-3.5 rounded-2xl border border-[#E5E5E5] text-xs">
                <div className="flex items-start space-x-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#7BA644] mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-[#415720]">Pickup Location</div>
                    <div className="text-[#6E6680]">{activeTrip.pickupAddress}</div>
                  </div>
                </div>
                <div className="flex items-start space-x-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#FFD6A5] mt-0.5 flex-shrink-0 border border-[#D97706]" />
                  <div>
                    <div className="font-bold text-[#784315]">Destination</div>
                    <div className="text-[#6E6680]">{activeTrip.dropoffAddress}</div>
                  </div>
                </div>
              </div>

              {/* Step 1: Arrive at Pickup */}
              {activeTrip.status === 'ACCEPTED' && (
                <button
                  onClick={handleArrivedPickup}
                  className="w-full bg-[#7BA644] hover:bg-[#6B923B] text-white font-bold text-sm py-3.5 rounded-2xl shadow-xs transition-transform active:scale-95 flex items-center justify-center space-x-2"
                >
                  <Navigation className="w-4 h-4" />
                  <span>I HAVE ARRIVED AT PICKUP POINT</span>
                </button>
              )}

              {/* Step 2: 4-Digit OTP Verification to Start Ride */}
              {activeTrip.status === 'ARRIVED_PICKUP' && (
                <div className="bg-[#FFD6A5]/30 border-2 border-[#FFD6A5] p-4 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 text-[#2D283E] font-bold text-xs">
                    <KeyRound className="w-4 h-4 text-[#784315]" />
                    <span>Enter Rider's 4-Digit Start PIN</span>
                  </div>
                  <p className="text-[11px] text-[#6E6680] font-medium">
                    Ask passenger for the 4-digit code shown on their Rapido app screen.
                  </p>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 5821"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="flex-1 bg-[#FDFDFD] border border-[#FFD6A5] rounded-xl px-4 py-2 text-center font-mono font-black text-lg tracking-widest text-[#2D283E] focus:outline-none focus:ring-2 focus:ring-[#957DAD]"
                    />
                    <button
                      onClick={handleStartTripWithOtp}
                      disabled={otpInput.length !== 4}
                      className="bg-[#957DAD] hover:bg-[#856C9E] text-white font-bold text-xs px-4 py-3 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
                    >
                      Start Ride
                    </button>
                  </div>

                  {otpError && (
                    <p className="text-[11px] text-[#991B1B] font-bold">{otpError}</p>
                  )}
                </div>
              )}

              {/* Step 3: Trip in progress - Pastel Live Navigation HUD */}
              {activeTrip.status === 'IN_PROGRESS' && (
                <div className="space-y-3">
                  {/* Digital Telemetry Counters */}
                  <div className="bg-[#FDFDFD] text-[#2D283E] p-4 rounded-3xl shadow-xs border border-[#EFEFEF] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            reachedDestination ? 'bg-[#7BA644]' : 'bg-[#957DAD] animate-ping'
                          }`}
                        />
                        <span className="text-xs font-black uppercase tracking-wider text-[#957DAD]">
                          {reachedDestination ? 'Arrived at Destination' : 'Captain Live Navigation'}
                        </span>
                      </div>
                      <span className="text-[10px] bg-[#F1F5D8] text-[#415720] font-bold px-2.5 py-0.5 rounded-full border border-[#DCE4B2] font-mono">
                        ⚡ {liveTelemetry.currentSpeed} km/h
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-[#FFD6A5]/25 rounded-2xl p-3 border border-[#FFD6A5]/70 text-center shadow-xs">
                        <div className="text-[10px] font-bold text-[#784315] uppercase tracking-wider">Distance Left</div>
                        <div className="text-2xl sm:text-3xl font-black text-[#784315] font-mono mt-0.5">
                          {liveTelemetry.distanceRemainingKm} <span className="text-xs text-[#784315]">KM</span>
                        </div>
                      </div>
                      <div className="bg-[#EFEFEF] rounded-2xl p-3 border border-[#E0E0E0] text-center shadow-xs">
                        <div className="text-[10px] font-bold text-[#4A3B5C] uppercase tracking-wider">Time Remaining</div>
                        <div className="text-2xl sm:text-3xl font-black text-[#2D283E] font-mono mt-0.5">
                          {liveTelemetry.durationRemainingMin} <span className="text-xs text-[#6E6680]">MINS</span>
                        </div>
                      </div>
                    </div>

                    {/* Live Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="truncate max-w-[130px] text-[#415720]">📍 {activeTrip.pickupAddress.split(',')[0]}</span>
                        <span className="text-[#957DAD] font-extrabold font-mono">{liveTelemetry.progressPercent}%</span>
                        <span className="truncate max-w-[130px] text-[#784315]">🏁 {activeTrip.dropoffAddress.split(',')[0]}</span>
                      </div>
                      <div className="w-full h-3 bg-[#EFEFEF] rounded-full overflow-hidden p-0.5 relative">
                        <div
                          className="h-full bg-gradient-to-r from-[#F1F5D8] via-[#FFD6A5] to-[#957DAD] rounded-full transition-all duration-500 ease-out shadow-xs"
                          style={{ width: `${Math.max(5, Math.min(100, liveTelemetry.progressPercent))}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-[11px] text-[#6E6680] pt-1 border-t border-[#EFEFEF] flex items-center justify-between">
                      <span className="truncate">Navigating to: <strong className="text-[#2D283E]">{activeTrip.dropoffAddress}</strong></span>
                    </div>
                  </div>

                  {/* Simulate Drive Button */}
                  <button
                    onClick={handleToggleDriveSimulation}
                    className="w-full bg-[#EFEFEF] hover:bg-[#E5E5E5] text-[#2D283E] font-bold text-xs py-3 rounded-2xl transition-all flex items-center justify-center space-x-2 border border-[#E0E0E0] shadow-xs"
                  >
                    {isSimulatingDrive ? <Pause className="w-4 h-4 text-[#957DAD]" /> : <Play className="w-4 h-4 text-[#957DAD]" />}
                    <span>
                      {isSimulatingDrive
                        ? 'Driving in Progress (Live GPS Telemetry Broadcasting...)'
                        : reachedDestination
                        ? 'Replay Driving Simulation'
                        : 'Resume Route Movement'}
                    </span>
                  </button>

                  {/* Complete Ride */}
                  <button
                    onClick={handleCompleteTrip}
                    className={`w-full text-white font-bold text-sm py-3.5 rounded-2xl shadow-xs transition-transform active:scale-95 flex items-center justify-center space-x-2 ${
                      reachedDestination
                        ? 'bg-[#7BA644] hover:bg-[#6B923B] ring-4 ring-[#F1F5D8]'
                        : 'bg-[#957DAD] hover:bg-[#856C9E]'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-white stroke-[2.5]" />
                    <span>COMPLETE RIDE & COLLECT FARE (₹{activeTrip.totalFare})</span>
                  </button>
                </div>
              )}
            </div>
          ) : completedTripSummary ? (
            /* Completed Trip Summary Card */
            <div className="bg-[#F1F5D8]/70 border-2 border-[#DCE4B2] p-6 rounded-3xl space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-[#FDFDFD] text-[#415720] flex items-center justify-center text-3xl mx-auto shadow-xs border border-[#DCE4B2]">
                🎉
              </div>
              <div className="text-center">
                <h3 className="font-black text-lg text-[#2D283E]">
                  Ride Completed Successfully!
                </h3>
                <p className="text-xs text-[#6E6680] mt-1">
                  Passenger dropped off safely at <strong>{completedTripSummary.dropoff}</strong>
                </p>
              </div>
              <div className="bg-[#FDFDFD] p-4 rounded-2xl border border-[#DCE4B2] flex items-center justify-between shadow-xs">
                <span className="text-xs font-bold text-[#6E6680]">Total Fare Collected:</span>
                <span className="text-xl font-black text-[#415720]">₹{completedTripSummary.fare}</span>
              </div>
              <button
                onClick={() => setCompletedTripSummary(null)}
                className="w-full bg-[#957DAD] hover:bg-[#856C9E] text-white font-bold py-3.5 px-4 rounded-2xl text-xs shadow-xs transition-transform active:scale-95 flex items-center justify-center space-x-1"
              >
                <span>Ready for Next Commuter Ride</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          ) : (
            /* Standby State */
            <div className="bg-[#FDFDFD] rounded-3xl p-6 shadow-xs border border-[#EFEFEF] text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#EFEFEF] text-[#957DAD] flex items-center justify-center mx-auto text-2xl border border-[#E0E0E0]">
                {isOnline ? '📡' : '💤'}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#2D283E]">
                  {isOnline ? 'Radar Searching for Rides' : 'Captain is Currently Offline'}
                </h3>
                <p className="text-xs text-[#6E6680] mt-1 max-w-xs mx-auto">
                  {isOnline
                    ? 'Stay on this screen. When a commuter books a ride nearby, a 15-second alert will pop up!'
                    : 'Switch your duty status to Online above to receive passenger trip requests.'}
                </p>
              </div>

              {isOnline && pendingRidesList.length > 0 && (
                <div className="border-t border-[#EFEFEF] pt-3 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#2D283E]">
                    <span className="flex items-center space-x-1.5">
                      <BellRing className="w-4 h-4 text-[#957DAD] animate-bounce" />
                      <span>{pendingRidesList.length} Commuter Ride Waiting!</span>
                    </span>
                  </div>
                  {pendingRidesList.map((req) => (
                    <div
                      key={req.id}
                      className="bg-[#FFD6A5]/25 border border-[#FFD6A5] rounded-2xl p-3 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#2D283E]">
                          {req.vehicleType.replace('_', ' ')} • ₹{req.totalFare}
                        </span>
                        <span className="text-[10px] bg-[#FFD6A5] text-[#784315] font-bold px-2 py-0.5 rounded-full">
                          {req.distanceKm} km
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6E6680] truncate">
                        📍 {req.pickupAddress} ➔ {req.dropoffAddress}
                      </div>
                      <button
                        onClick={() => handleAcceptRide(req.id)}
                        className="w-full bg-[#957DAD] hover:bg-[#856D9D] text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1 shadow-sm transition-transform active:scale-95"
                      >
                        <span>Accept Ride Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isOnline && pendingRidesList.length === 0 && (
                <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-[#415720] bg-[#F1F5D8] py-2 px-3 rounded-xl border border-[#DCE4B0]">
                  <span className="w-2 h-2 rounded-full bg-[#7BA644] animate-ping" />
                  <span>Captain Position Broadcast Active</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Map View (7 columns) */}
        <div className="lg:col-span-7 bg-[#FDFDFD] p-3 rounded-3xl shadow-xl border border-[#EFEFEF] h-[560px] flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#6E6680]">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#957DAD]" />
              <span>Captain GPS Navigation View</span>
            </span>
            <span>
              Lat: {captain.currentLat.toFixed(4)}, Lng: {captain.currentLng.toFixed(4)}
            </span>
          </div>

          <div className="flex-1 rounded-2xl overflow-hidden relative">
            <Map
              pickup={{
                lat: activeTrip
                  ? activeTrip.pickupLat
                  : completedTripSummary
                  ? completedTripSummary.pickupLat
                  : captain.currentLat,
                lng: activeTrip
                  ? activeTrip.pickupLng
                  : completedTripSummary
                  ? completedTripSummary.pickupLng
                  : captain.currentLng,
                address: activeTrip?.pickupAddress || (completedTripSummary ? completedTripSummary.pickup : 'Current Location'),
              }}
              dropoff={
                activeTrip
                  ? {
                      lat: activeTrip.dropoffLat,
                      lng: activeTrip.dropoffLng,
                      address: activeTrip.dropoffAddress,
                    }
                  : completedTripSummary
                  ? {
                      lat: completedTripSummary.dropoffLat,
                      lng: completedTripSummary.dropoffLng,
                      address: completedTripSummary.dropoff,
                    }
                  : null
              }
              captainLocation={{
                lat: captain.currentLat,
                lng: captain.currentLng,
                vehicleType: captain.vehicleType,
              }}
              telemetry={activeTrip?.status === 'IN_PROGRESS' ? liveTelemetry : null}
            />
          </div>
        </div>
      </div>

      {/* Incoming Ride Alert Modal (15-second countdown) */}
      {incomingRide && (
        <CaptainAlertModal
          ride={incomingRide}
          onAccept={handleAcceptRide}
          onDecline={() => setIncomingRide(null)}
        />
      )}
    </div>
  );
}
