import { Router, Request, Response } from 'express';
import { getAllFareEstimates } from '../services/fareService';
import { prisma } from '../prisma';

export const fareRouter = Router();

fareRouter.get('/estimate', async (req: Request, res: Response) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng, promoCode } = req.query;

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({ error: 'Pickup and Dropoff coordinates are required' });
    }

    const pLat = parseFloat(pickupLat as string);
    const pLng = parseFloat(pickupLng as string);
    const dLat = parseFloat(dropoffLat as string);
    const dLng = parseFloat(dropoffLng as string);

    let discountPercent = 0;
    let maxDiscount = 0;

    if (promoCode) {
      const promo = await prisma.promoCode.findUnique({
        where: { code: String(promoCode).toUpperCase().trim() },
      });
      if (promo && promo.isActive) {
        discountPercent = promo.discountPercent;
        maxDiscount = promo.maxDiscount;
      }
    }

    const estimates = getAllFareEstimates(pLat, pLng, dLat, dLng, discountPercent, maxDiscount);

    return res.json({
      success: true,
      pickup: { lat: pLat, lng: pLng },
      dropoff: { lat: dLat, lng: dLng },
      appliedPromo: discountPercent > 0 ? { discountPercent, maxDiscount } : null,
      estimates,
    });
  } catch (error: any) {
    console.error('Error generating fare estimates:', error);
    return res.status(500).json({ error: 'Failed to calculate fares' });
  }
});
