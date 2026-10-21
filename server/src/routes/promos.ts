import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

export const promoRouter = Router();

// Validate a promo code
promoRouter.get('/validate/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code.toUpperCase().trim();
    const promo = await prisma.promoCode.findUnique({
      where: { code },
    });

    if (!promo || !promo.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired promo code',
      });
    }

    return res.json({
      success: true,
      promo: {
        code: promo.code,
        description: promo.description,
        discountPercent: promo.discountPercent,
        maxDiscount: promo.maxDiscount,
        minRideFare: promo.minRideFare,
      },
    });
  } catch (error: any) {
    console.error('Error validating promo code:', error);
    return res.status(500).json({ error: 'Failed to validate promo code' });
  }
});

// List all active promotions
promoRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const promos = await prisma.promoCode.findMany({
      where: { isActive: true },
    });
    return res.json({ success: true, promos });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch promos' });
  }
});
