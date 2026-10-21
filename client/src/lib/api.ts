import { Ride, VehicleEstimate, User, PromoCode, Review } from '../types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://rapido-backend-v1zf.onrender.com/api'
    : 'http://localhost:5000/api');

export async function fetchFareEstimates(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  promoCode?: string
): Promise<{ estimates: VehicleEstimate[]; appliedPromo?: any }> {
  const params = new URLSearchParams({
    pickupLat: pickupLat.toString(),
    pickupLng: pickupLng.toString(),
    dropoffLat: dropoffLat.toString(),
    dropoffLng: dropoffLng.toString(),
    ...(promoCode ? { promoCode } : {}),
  });

  const res = await fetch(`${API_BASE}/fares/estimate?${params}`);
  if (!res.ok) throw new Error('Failed to fetch fare estimates');
  return res.json();
}

export async function createRide(rideData: {
  riderId: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  vehicleType: string;
  promoCode?: string;
}): Promise<Ride> {
  const res = await fetch(`${API_BASE}/rides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rideData),
  });
  if (!res.ok) throw new Error('Failed to create ride');
  const data = await res.json();
  return data.ride;
}

export async function getRide(rideId: string): Promise<Ride> {
  const res = await fetch(`${API_BASE}/rides/${rideId}`);
  if (!res.ok) throw new Error('Failed to fetch ride');
  const data = await res.json();
  return data.ride;
}

export async function getActiveRide(userId: string): Promise<Ride | null> {
  const res = await fetch(`${API_BASE}/rides/active/user/${userId}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.ride || null;
}

export async function fetchCurrentActiveRide(userId?: string): Promise<Ride | null> {
  try {
    if (userId) {
      const res = await fetch(`${API_BASE}/rides/active/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        return data.ride || null;
      }
    }
  } catch (e) {}
  return null;
}

export async function resetDemoRides(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rides/reset`, { method: 'POST' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function fetchPendingRides(): Promise<Ride[]> {
  try {
    const res = await fetch(`${API_BASE}/rides/pending`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.rides || [];
  } catch (e) {
    return [];
  }
}

export async function acceptRide(rideId: string, captainId?: string): Promise<Ride> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ captainId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to accept ride');
  return data.ride;
}

export async function autoMatchRide(rideId: string): Promise<Ride> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/auto-match`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Auto-match failed');
  return data.ride;
}

export async function verifyRideOtp(rideId: string, otp: string, captainId?: string): Promise<Ride> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp, captainId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to verify OTP');
  return data.ride;
}

export async function cancelRide(rideId: string, reason?: string): Promise<Ride> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('Failed to cancel ride');
  const data = await res.json();
  return data.ride;
}

export async function completeRide(rideId: string): Promise<Ride> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/complete`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to complete ride');
  const data = await res.json();
  return data.ride;
}

export async function fetchRideHistory(userId: string): Promise<Ride[]> {
  const res = await fetch(`${API_BASE}/rides/history/user/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch ride history');
  const data = await res.json();
  return data.rides;
}

export async function toggleCaptainDuty(captainId: string, isOnline: boolean, lat?: number, lng?: number) {
  const res = await fetch(`${API_BASE}/captains/duty`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ captainId, isOnline, currentLat: lat, currentLng: lng }),
  });
  if (!res.ok) throw new Error('Failed to toggle duty');
  return res.json();
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  const data = await res.json();
  return data.users;
}

export async function validatePromo(code: string): Promise<PromoCode> {
  const res = await fetch(`${API_BASE}/promos/validate/${code}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invalid promo code');
  return data.promo;
}

export async function submitReview(reviewData: {
  rideId: string;
  riderId: string;
  captainId: string;
  rating: number;
  comment?: string;
}) {
  const res = await fetch(`${API_BASE}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reviewData),
  });
  if (!res.ok) throw new Error('Failed to submit review');
  return res.json();
}

export async function processPayment(paymentData: {
  rideId: string;
  paymentMethod?: string;
  tipAmount?: number;
}) {
  const res = await fetch(`${API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData),
  });
  if (!res.ok) throw new Error('Failed to process payment');
  return res.json();
}
