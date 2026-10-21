import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

export const reviewRouter = Router();

// Submit rating and review
reviewRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { rideId, riderId, captainId, rating, comment } = req.body;

    if (!rideId || !riderId || !captainId || !rating) {
      return res.status(400).json({ error: 'Missing required review fields' });
    }

    const review = await prisma.review.create({
      data: {
        rideId,
        riderId,
        captainId,
        rating: Math.min(5, Math.max(1, Number(rating))),
        comment: comment || '',
      },
    });

    // Recalculate Captain's average rating
    const allCaptainReviews = await prisma.review.findMany({
      where: { captainId },
      select: { rating: true },
    });

    const totalRatings = allCaptainReviews.reduce((sum, r) => sum + r.rating, 0);
    const newAverage = Number((totalRatings / allCaptainReviews.length).toFixed(1));

    await prisma.captainProfile.update({
      where: { id: captainId },
      data: { ratingAvg: newAverage },
    });

    return res.status(201).json({ success: true, review, newAverage });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return res.status(500).json({ error: 'Failed to submit review' });
  }
});
