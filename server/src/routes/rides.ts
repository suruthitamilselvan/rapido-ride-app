import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { calculateVehicleFare, calculateHaversineDistance } from '../services/fareService';

import { io } from '../index';

export const rideRouter = Router();

// Get all pending ride requests waiting for captain
rideRouter.get('/pending', async (_req: Request, res: Response) => {
  try {
    const rides = await prisma.ride.findMany({
      where: { status: 'REQUESTED' },
      include: { rider: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return res.json({ success: true, rides });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch pending rides' });
  }
});

// Auto-match or manually accept ride
rideRouter.post('/:id/accept', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let { captainId } = req.body;

    const ride = await prisma.ride.findUnique({ where: { id } });
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'REQUESTED') {
      return res.status(400).json({ error: 'Ride has already been accepted or finished' });
    }

    // If no captainId specified, find best matching captain from DB
    if (!captainId) {
      const matchingCaptain = await prisma.captainProfile.findFirst({
        where: { vehicleType: ride.vehicleType },
        include: { user: true },
      }) || await prisma.captainProfile.findFirst({ include: { user: true } });

      if (matchingCaptain) {
        captainId = matchingCaptain.id;
      }
    }

    const updated = await prisma.ride.update({
      where: { id },
      data: {
        captainId,
        status: 'ACCEPTED',
      },
      include: {
        rider: true,
        captain: { include: { user: true } },
      },
    });

    // Notify rider via Socket.IO
    try {
      io.to(`ride_${id}`).emit('ride_accepted', updated);
      io.to(`user_${ride.riderId}`).emit('ride_accepted', updated);
      io.emit('ride_accepted', updated);
    } catch (e) {
      console.error('Socket emit error:', e);
    }

    return res.json({ success: true, ride: updated });
  } catch (error: any) {
    console.error('Error accepting ride:', error);
    return res.status(500).json({ error: 'Failed to accept ride' });
  }
});

// Instant Auto-match endpoint for demo & fallback
rideRouter.post('/:id/auto-match', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ride = await prisma.ride.findUnique({ where: { id } });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    // Find matching captain
    const captain = await prisma.captainProfile.findFirst({
      where: { vehicleType: ride.vehicleType },
      include: { user: true },
    }) || await prisma.captainProfile.findFirst({ include: { user: true } });

    if (!captain) {
      return res.status(404).json({ error: 'No captains registered in database' });
    }

    const updated = await prisma.ride.update({
      where: { id },
      data: {
        captainId: captain.id,
        status: 'ACCEPTED',
      },
      include: {
        rider: true,
        captain: { include: { user: true } },
      },
    });

    try {
      io.to(`ride_${id}`).emit('ride_accepted', updated);
      io.to(`user_${ride.riderId}`).emit('ride_accepted', updated);
      io.emit('ride_accepted', updated);
    } catch (e) {}

    return res.json({ success: true, ride: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'Auto-match failed' });
  }
});

// Create a new ride request
rideRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      riderId,
      pickupAddress,
      pickupLat,
      pickupLng,
      dropoffAddress,
      dropoffLat,
      dropoffLng,
      vehicleType,
      promoCode,
    } = req.body;

    if (!riderId || !pickupAddress || !dropoffAddress || !vehicleType) {
      return res.status(400).json({ error: 'Missing required ride parameters' });
    }

    // Generate random 4-digit start OTP
    const startOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Calculate distance and fares
    const distanceKm = calculateHaversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);

    let promoDiscountPercent = 0;
    let maxDiscount = 0;
    if (promoCode) {
      const promo = await prisma.promoCode.findUnique({
        where: { code: String(promoCode).toUpperCase().trim() },
      });
      if (promo && promo.isActive) {
        promoDiscountPercent = promo.discountPercent;
        maxDiscount = promo.maxDiscount;
      }
    }

    const estimate = calculateVehicleFare(
      vehicleType,
      distanceKm,
      promoDiscountPercent,
      maxDiscount
    );

    // Verify rider exists or fallback to first available rider to prevent foreign key errors
    let validRiderId = riderId;
    const existingUser = await prisma.user.findUnique({ where: { id: riderId } });
    if (!existingUser) {
      const fallbackUser = (await prisma.user.findFirst({ where: { role: 'RIDER' } })) || (await prisma.user.findFirst());
      if (fallbackUser) {
        validRiderId = fallbackUser.id;
      }
    }

    const ride = await prisma.ride.create({
      data: {
        riderId: validRiderId,
        pickupAddress,
        pickupLat,
        pickupLng,
        dropoffAddress,
        dropoffLat,
        dropoffLng,
        vehicleType,
        startOtp,
        status: 'REQUESTED',
        baseFare: estimate.baseFare,
        distanceFare: estimate.distanceFare,
        taxFare: estimate.taxFare,
        discountFare: estimate.discountFare,
        totalFare: estimate.totalFare,
        distanceKm: estimate.distanceKm,
        durationMin: estimate.durationMin,
        promoCode: promoCode ? String(promoCode).toUpperCase().trim() : null,
      },
      include: {
        rider: true,
      },
    });

    // Broadcast alert via Socket.IO
    try {
      io.emit('incoming_ride_alert', ride);
    } catch (e) {
      console.error('Socket emit error:', e);
    }

    return res.status(201).json({ success: true, ride });
  } catch (error: any) {
    console.error('Error creating ride:', error);
    return res.status(500).json({ error: error?.message || 'Failed to create ride' });
  }
});

// Get ride by ID
rideRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        rider: true,
        captain: {
          include: {
            user: true,
          },
        },
        review: true,
      },
    });

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    return res.json({ success: true, ride });
  } catch (error: any) {
    console.error('Error fetching ride:', error);
    return res.status(500).json({ error: 'Failed to fetch ride' });
  }
});

// Verify 4-digit OTP to start trip
rideRouter.post('/:id/verify-otp', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { otp, captainId } = req.body;

    const ride = await prisma.ride.findUnique({ where: { id } });
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.startOtp !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid 4-digit OTP! Ask rider for the PIN shown on their screen.',
      });
    }

    const updated = await prisma.ride.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        ...(captainId ? { captainId } : {}),
      },
      include: {
        rider: true,
        captain: { include: { user: true } },
      },
    });

    try {
      io.to(`ride_${id}`).emit('ride_status_updated', updated);
      if (updated.riderId) io.to(`user_${updated.riderId}`).emit('ride_status_updated', updated);
      io.emit('ride_status_updated', updated);
    } catch (e) {}

    return res.json({ success: true, ride: updated });
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// Cancel a ride
rideRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const ride = await prisma.ride.findUnique({ where: { id } });
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const updated = await prisma.ride.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { rider: true, captain: { include: { user: true } } },
    });

    try {
      io.to(`ride_${id}`).emit('ride_cancelled', { ride: updated, reason });
      io.emit('ride_cancelled', { ride: updated, reason });
    } catch (e) {}

    return res.json({ success: true, ride: updated, reason });
  } catch (error: any) {
    console.error('Error cancelling ride:', error);
    return res.status(500).json({ error: 'Failed to cancel ride' });
  }
});

// Complete a ride
rideRouter.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ride = await prisma.ride.findUnique({ where: { id } });
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const updated = await prisma.ride.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        rider: true,
        captain: { include: { user: true } },
      },
    });

    if (updated.captainId) {
      await prisma.captainProfile.update({
        where: { id: updated.captainId },
        data: {
          currentLat: ride.dropoffLat,
          currentLng: ride.dropoffLng,
          totalRides: { increment: 1 },
        },
      });
    }

    try {
      io.to(`ride_${id}`).emit('ride_completed', updated);
      if (updated.riderId) io.to(`user_${updated.riderId}`).emit('ride_completed', updated);
      io.emit('ride_completed', updated);
      io.emit('captain_live_position', {
        captainId: updated.captainId,
        rideId: updated.id,
        lat: updated.dropoffLat,
        lng: updated.dropoffLng,
      });
    } catch (e) {}

    return res.json({ success: true, ride: updated });
  } catch (error: any) {
    console.error('Error completing ride:', error);
    return res.status(500).json({ error: 'Failed to complete ride' });
  }
});

// Ride History for a user (Rider or Captain)
rideRouter.get('/history/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const rides = await prisma.ride.findMany({
      where: {
        OR: [
          { riderId: userId },
          { captain: { userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        rider: true,
        captain: { include: { user: true } },
        review: true,
      },
    });

    return res.json({ success: true, rides });
  } catch (error: any) {
    console.error('Error fetching ride history:', error);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Reset all active demo rides to clean slate
rideRouter.post('/reset', async (_req: Request, res: Response) => {
  try {
    await prisma.ride.updateMany({
      where: {
        status: { in: ['REQUESTED', 'ACCEPTED', 'ARRIVED_PICKUP', 'IN_PROGRESS'] },
      },
      data: { status: 'CANCELLED' },
    });
    try {
      io.emit('ride_cancelled', { reason: 'System demo reset' });
    } catch (e) {}
    return res.json({ success: true, message: 'All demo rides reset to clean slate' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reset demo rides' });
  }
});

// Active ride query for specific user or captain
rideRouter.get('/active/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const ride = await prisma.ride.findFirst({
      where: {
        OR: [
          { riderId: userId },
          { captainId: userId },
          { captain: { userId } },
          { captain: { id: userId } },
        ],
        status: { in: ['REQUESTED', 'ACCEPTED', 'ARRIVED_PICKUP', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        rider: true,
        captain: { include: { user: true } },
      },
    });

    return res.json({ success: true, ride });
  } catch (error: any) {
    console.error('Error checking active ride:', error);
    return res.status(500).json({ error: 'Failed to check active ride' });
  }
});
