import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../prisma';

export const paymentRouter = Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Create Stripe Payment Intent or Simulated Test Intent
paymentRouter.post('/create-intent', async (req: Request, res: Response) => {
  try {
    const { rideId, tipAmount = 0 } = req.body;

    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const totalAmount = Math.round((ride.totalFare + Number(tipAmount)) * 100); // in paise / cents

    if (stripe) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'inr',
        metadata: {
          rideId: ride.id,
          riderId: ride.riderId,
          vehicleType: ride.vehicleType,
        },
      });

      await prisma.ride.update({
        where: { id: ride.id },
        data: { stripeIntentId: paymentIntent.id },
      });

      return res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        amount: totalAmount / 100,
        currency: 'INR',
        isSimulation: false,
      });
    } else {
      // Simulation mode
      const mockIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await prisma.ride.update({
        where: { id: ride.id },
        data: { stripeIntentId: mockIntentId },
      });

      return res.json({
        success: true,
        clientSecret: `${mockIntentId}_secret_test`,
        amount: (ride.totalFare + Number(tipAmount)),
        currency: 'INR',
        isSimulation: true,
        message: 'Stripe simulated mode active (Add STRIPE_SECRET_KEY in server/.env for live Stripe)',
      });
    }
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return res.status(500).json({ error: 'Payment initialization failed' });
  }
});

// Confirm payment completion
paymentRouter.post('/confirm', async (req: Request, res: Response) => {
  try {
    const { rideId, paymentMethod = 'STRIPE', tipAmount = 0 } = req.body;

    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const updated = await prisma.ride.update({
      where: { id: rideId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod,
        totalFare: ride.totalFare + Number(tipAmount),
      },
      include: {
        rider: true,
        captain: { include: { user: true } },
      },
    });

    return res.json({
      success: true,
      ride: updated,
      receiptNumber: `RPD-INV-${ride.id.substring(0, 8).toUpperCase()}`,
    });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({ error: 'Payment confirmation failed' });
  }
});
