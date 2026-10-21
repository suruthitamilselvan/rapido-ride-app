import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

export const userRouter = Router();

// Get demo users for easy testing / switcher
userRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        captain: true,
      },
    });
    return res.json({ success: true, users });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user profile
userRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, avatarUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
        ...(avatarUrl ? { avatarUrl } : {}),
      },
      include: { captain: true },
    });

    return res.json({ success: true, user: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update user' });
  }
});
