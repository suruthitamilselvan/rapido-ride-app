import { Server, Socket } from 'socket.io';
import { prisma } from '../prisma';

export interface LocationPayload {
  lat: number;
  lng: number;
  heading?: number;
}

interface RideSimulationState {
  rideId: string;
  captainId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  totalKm: number;
  totalMin: number;
  step: number;
  totalSteps: number;
  interval?: NodeJS.Timeout;
}

const activeSimulations = new Map<string, RideSimulationState>();

function startOrResumeServerSimulation(ride: any, io: Server, fromStep?: number) {
  const rideId = ride.id;
  if (activeSimulations.has(rideId)) {
    const existing = activeSimulations.get(rideId)!;
    if (existing.interval) clearInterval(existing.interval);
  }

  const totalSteps = 24; // 24 steps * 800ms = ~19.2s of realistic movement
  const step = fromStep !== undefined ? fromStep : (activeSimulations.get(rideId)?.step || 0);

  const state: RideSimulationState = {
    rideId,
    captainId: ride.captainId,
    pickupLat: ride.pickupLat,
    pickupLng: ride.pickupLng,
    dropoffLat: ride.dropoffLat,
    dropoffLng: ride.dropoffLng,
    totalKm: ride.distanceKm || 5.0,
    totalMin: ride.durationMin || 14,
    step,
    totalSteps,
  };

  state.interval = setInterval(async () => {
    state.step++;
    const progress = Math.min(1, state.step / state.totalSteps);
    // Smooth road curve along route
    const currentLat = Number((state.pickupLat + (state.dropoffLat - state.pickupLat) * progress + Math.sin(progress * Math.PI) * 0.003).toFixed(6));
    const currentLng = Number((state.pickupLng + (state.dropoffLng - state.pickupLng) * progress + Math.sin(progress * Math.PI) * 0.002).toFixed(6));

    const remainingKm = Math.max(0, Number((state.totalKm * (1 - progress)).toFixed(1)));
    const remainingMin = Math.max(0, Math.round(state.totalMin * (1 - progress)));
    const speed = state.step >= state.totalSteps ? 0 : Math.round(30 + Math.sin(progress * Math.PI) * 12);
    const progressPercent = Math.round(progress * 100);

    const payload = {
      captainId: state.captainId,
      rideId,
      lat: currentLat,
      lng: currentLng,
      distanceRemainingKm: remainingKm,
      durationRemainingMin: remainingMin,
      progressPercent,
      currentSpeed: speed,
    };

    io.to(`ride_${rideId}`).emit('captain_live_position', payload);
    io.emit('captain_live_position', payload);
    io.emit('captain_map_location', {
      captainId: state.captainId,
      lat: currentLat,
      lng: currentLng,
    });

    try {
      if (state.captainId) {
        await prisma.captainProfile.update({
          where: { id: state.captainId },
          data: { currentLat, currentLng },
        });
      }
    } catch (e) {}

    if (state.step >= state.totalSteps) {
      if (state.interval) clearInterval(state.interval);
      activeSimulations.delete(rideId);

      io.to(`ride_${rideId}`).emit('captain_arrived_destination', {
        rideId,
        lat: state.dropoffLat,
        lng: state.dropoffLng,
      });
      io.emit('captain_arrived_destination', {
        rideId,
        lat: state.dropoffLat,
        lng: state.dropoffLng,
      });
    }
  }, 800);

  activeSimulations.set(rideId, state);
}

function pauseServerSimulation(rideId: string) {
  if (activeSimulations.has(rideId)) {
    const existing = activeSimulations.get(rideId)!;
    if (existing.interval) clearInterval(existing.interval);
    existing.interval = undefined;
  }
}

function stopServerSimulation(rideId: string) {
  if (activeSimulations.has(rideId)) {
    const existing = activeSimulations.get(rideId)!;
    if (existing.interval) clearInterval(existing.interval);
    activeSimulations.delete(rideId);
  }
}

export function registerRideSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // Join personal user room or ride-specific room
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
      console.log(`[Socket] ${socket.id} joined room: ${roomId}`);
    });

    socket.on('leave_room', (roomId: string) => {
      socket.leave(roomId);
      console.log(`[Socket] ${socket.id} left room: ${roomId}`);
    });

    // Captain duty state change
    socket.on(
      'captain_duty_change',
      async (data: { captainId: string; isOnline: boolean; lat?: number; lng?: number }) => {
        try {
          const updated = await prisma.captainProfile.update({
            where: { id: data.captainId },
            data: {
              isOnline: data.isOnline,
              ...(data.lat ? { currentLat: data.lat } : {}),
              ...(data.lng ? { currentLng: data.lng } : {}),
            },
            include: { user: true },
          });
          io.emit('captain_status_updated', {
            captainId: updated.id,
            isOnline: updated.isOnline,
            vehicleType: updated.vehicleType,
            lat: updated.currentLat,
            lng: updated.currentLng,
          });
        } catch (err) {
          console.error('[Socket] Error updating captain duty:', err);
        }
      }
    );

    // Live Captain location broadcast with distance, duration, and speed telemetry
    socket.on(
      'captain_location_stream',
      async (data: {
        captainId: string;
        rideId?: string;
        lat: number;
        lng: number;
        heading?: number;
        distanceRemainingKm?: number;
        durationRemainingMin?: number;
        progressPercent?: number;
        currentSpeed?: number;
      }) => {
        const payload = {
          captainId: data.captainId,
          rideId: data.rideId,
          lat: data.lat,
          lng: data.lng,
          heading: data.heading || 0,
          distanceRemainingKm: data.distanceRemainingKm,
          durationRemainingMin: data.durationRemainingMin,
          progressPercent: data.progressPercent,
          currentSpeed: data.currentSpeed,
        };

        // Broadcast to specific ride room and globally
        if (data.rideId) {
          io.to(`ride_${data.rideId}`).emit('captain_live_position', payload);
        }
        // Broadcast globally so any connected tab/rider gets the live stream immediately
        io.emit('captain_live_position', payload);
        io.emit('captain_map_location', {
          captainId: data.captainId,
          lat: data.lat,
          lng: data.lng,
        });

        // Persist latest coordinate to database asynchronously
        try {
          await prisma.captainProfile.update({
            where: { id: data.captainId },
            data: { currentLat: data.lat, currentLng: data.lng },
          });
        } catch (e) {}
      }
    );

    // New ride request broadcasted by Rider
    socket.on('rider_request_ride', (rideData: any) => {
      console.log(`[Socket] Broadcasting ride request ${rideData.id} for ${rideData.vehicleType}`);
      // Notify all connected captains or specific vehicle types
      io.emit('incoming_ride_alert', rideData);
    });

    // Captain accepts ride
    socket.on('captain_accept_ride', async (data: { rideId: string; captainId: string }) => {
      try {
        const ride = await prisma.ride.findUnique({
          where: { id: data.rideId },
          include: { rider: true },
        });

        if (!ride || ride.status !== 'REQUESTED') {
          socket.emit('ride_accept_failed', { message: 'Ride is no longer available.' });
          return;
        }

        const updatedRide = await prisma.ride.update({
          where: { id: data.rideId },
          data: {
            captainId: data.captainId,
            status: 'ACCEPTED',
          },
          include: {
            rider: true,
            captain: { include: { user: true } },
          },
        });

        // Emit to the ride room, rider's personal room, and globally
        io.to(`ride_${data.rideId}`).emit('ride_accepted', updatedRide);
        io.to(`user_${ride.riderId}`).emit('ride_accepted', updatedRide);
        io.emit('ride_accepted', updatedRide);
        socket.emit('ride_accepted_confirmation', updatedRide);

        console.log(`[Socket] Ride ${data.rideId} accepted by Captain ${data.captainId}`);
      } catch (err) {
        console.error('[Socket] Error accepting ride:', err);
        socket.emit('ride_accept_failed', { message: 'Failed to accept ride.' });
      }
    });

    // Captain marks "Arrived at Pickup"
    socket.on('captain_arrived_pickup', async (data: { rideId: string }) => {
      try {
        const ride = await prisma.ride.findUnique({ where: { id: data.rideId } });
        if (ride && ride.captainId) {
          await prisma.captainProfile.update({
            where: { id: ride.captainId },
            data: { currentLat: ride.pickupLat, currentLng: ride.pickupLng },
          });
        }

        const updated = await prisma.ride.update({
          where: { id: data.rideId },
          data: { status: 'ARRIVED_PICKUP' },
          include: { rider: true, captain: { include: { user: true } } },
        });

        // Broadcast status update
        io.to(`ride_${data.rideId}`).emit('ride_status_updated', updated);
        if (updated.riderId) io.to(`user_${updated.riderId}`).emit('ride_status_updated', updated);
        io.emit('ride_status_updated', updated);

        // Broadcast captain position explicitly snapped to pickup point
        io.to(`ride_${data.rideId}`).emit('captain_live_position', {
          captainId: updated.captainId,
          rideId: updated.id,
          lat: updated.pickupLat,
          lng: updated.pickupLng,
        });
        io.emit('captain_live_position', {
          captainId: updated.captainId,
          rideId: updated.id,
          lat: updated.pickupLat,
          lng: updated.pickupLng,
        });

        console.log(`[Socket] Captain arrived at pickup for ride ${data.rideId}`);
      } catch (err) {
        console.error('[Socket] Error updating arrived at pickup:', err);
      }
    });

    // Captain starts ride with OTP
    socket.on('captain_start_ride', async (data: { rideId: string; otp: string }) => {
      try {
        const ride = await prisma.ride.findUnique({ where: { id: data.rideId } });
        if (!ride) {
          socket.emit('otp_verification_failed', { message: 'Ride not found' });
          return;
        }

        if (ride.startOtp !== data.otp.trim()) {
          socket.emit('otp_verification_failed', { message: 'Invalid 4-digit PIN! Please ask rider for correct PIN.' });
          return;
        }

        const updated = await prisma.ride.update({
          where: { id: data.rideId },
          data: { status: 'IN_PROGRESS' },
          include: { rider: true, captain: { include: { user: true } } },
        });

        io.to(`ride_${data.rideId}`).emit('ride_status_updated', updated);
        if (updated.riderId) io.to(`user_${updated.riderId}`).emit('ride_status_updated', updated);
        io.emit('ride_status_updated', updated);
        socket.emit('otp_verification_success', updated);
        console.log(`[Socket] Ride ${data.rideId} started successfully with OTP ${data.otp}`);

        // Automatically start smooth server-side driving telemetry broadcast
        startOrResumeServerSimulation(updated, io, 0);
      } catch (err) {
        console.error('[Socket] Error starting ride:', err);
      }
    });

    // Start or resume simulation on explicit request
    socket.on('start_trip_simulation', async (data: { rideId: string; step?: number }) => {
      try {
        const ride = await prisma.ride.findUnique({ where: { id: data.rideId } });
        if (ride && ride.status === 'IN_PROGRESS') {
          startOrResumeServerSimulation(ride, io, data.step);
          console.log(`[Socket] Driving simulation started/resumed for ride ${data.rideId}`);
        }
      } catch (e) {
        console.error('[Socket] Error starting simulation:', e);
      }
    });

    // Pause driving simulation
    socket.on('pause_trip_simulation', (data: { rideId: string }) => {
      pauseServerSimulation(data.rideId);
      console.log(`[Socket] Driving simulation paused for ride ${data.rideId}`);
    });

    // Captain completes ride
    socket.on('captain_complete_ride', async (data: { rideId: string }) => {
      stopServerSimulation(data.rideId);
      try {
        const ride = await prisma.ride.findUnique({ where: { id: data.rideId } });
        if (ride && ride.captainId) {
          await prisma.captainProfile.update({
            where: { id: ride.captainId },
            data: {
              currentLat: ride.dropoffLat,
              currentLng: ride.dropoffLng,
              totalRides: { increment: 1 },
            },
          });
        }

        const updated = await prisma.ride.update({
          where: { id: data.rideId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
          include: { rider: true, captain: { include: { user: true } } },
        });

        io.to(`ride_${data.rideId}`).emit('ride_completed', updated);
        if (updated.riderId) io.to(`user_${updated.riderId}`).emit('ride_completed', updated);
        io.emit('ride_completed', updated);

        // Snap position to dropoff
        io.emit('captain_live_position', {
          captainId: updated.captainId,
          rideId: updated.id,
          lat: updated.dropoffLat,
          lng: updated.dropoffLng,
          distanceRemainingKm: 0,
          durationRemainingMin: 0,
          progressPercent: 100,
          currentSpeed: 0,
        });

        console.log(`[Socket] Ride ${data.rideId} marked completed.`);
      } catch (err) {
        console.error('[Socket] Error completing ride:', err);
      }
    });

    // Ride cancelled
    socket.on('cancel_ride', async (data: { rideId: string; reason?: string }) => {
      stopServerSimulation(data.rideId);
      try {
        const updated = await prisma.ride.update({
          where: { id: data.rideId },
          data: { status: 'CANCELLED' },
          include: { rider: true, captain: { include: { user: true } } },
        });
        io.to(`ride_${data.rideId}`).emit('ride_cancelled', {
          ride: updated,
          reason: data.reason || 'Trip cancelled by participant.',
        });
      } catch (err) {
        console.error('[Socket] Error cancelling ride:', err);
      }
    });

    // Emergency SOS Trigger
    socket.on('trigger_sos', (data: { rideId: string; lat: number; lng: number; riderName: string }) => {
      console.warn(`[SOS ALERT] Emergency triggered for Ride ${data.rideId} by ${data.riderName}! Lat: ${data.lat}, Lng: ${data.lng}`);
      io.to(`ride_${data.rideId}`).emit('sos_triggered', {
        rideId: data.rideId,
        lat: data.lat,
        lng: data.lng,
        message: 'EMERGENCY SOS: High-priority safety dispatch alerted.',
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
}
