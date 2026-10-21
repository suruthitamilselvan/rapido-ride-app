import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

export const captainRouter = Router();

// Get list of captains (optionally filter by vehicleType or isOnline)
captainRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { vehicleType, isOnline } = req.query;

    const whereClause: any = {};
    if (vehicleType) whereClause.vehicleType = String(vehicleType);
    if (isOnline !== undefined) whereClause.isOnline = isOnline === 'true';

    const captains = await prisma.captainProfile.findMany({
      where: whereClause,
      include: {
        user: true,
      },
    });

    return res.json({ success: true, captains });
  } catch (error: any) {
    console.error('Error fetching captains:', error);
    return res.status(500).json({ error: 'Failed to fetch captains' });
  }
});

// Toggle Captain duty (Online / Offline)
captainRouter.post('/duty', async (req: Request, res: Response) => {
  try {
    const { captainId, isOnline, currentLat, currentLng } = req.body;

    if (!captainId || isOnline === undefined) {
      return res.status(400).json({ error: 'captainId and isOnline status are required' });
    }

    const updated = await prisma.captainProfile.update({
      where: { id: captainId },
      data: {
        isOnline: Boolean(isOnline),
        ...(currentLat ? { currentLat } : {}),
        ...(currentLng ? { currentLng } : {}),
      },
      include: {
        user: true,
      },
    });

    return res.json({ success: true, captain: updated });
  } catch (error: any) {
    console.error('Error toggling captain duty:', error);
    return res.status(500).json({ error: 'Failed to update captain duty' });
  }
});

// Get captain by user ID or captain ID
captainRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const captain = await prisma.captainProfile.findFirst({
      where: {
        OR: [{ id }, { userId: id }],
      },
      include: {
        user: true,
        ridesAsCaptain: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!captain) {
      return res.status(404).json({ error: 'Captain profile not found' });
    }

    return res.json({ success: true, captain });
  } catch (error: any) {
    console.error('Error fetching captain profile:', error);
    return res.status(500).json({ error: 'Failed to fetch captain profile' });
  }
});
