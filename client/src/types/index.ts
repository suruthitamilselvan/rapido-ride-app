export type VehicleType = 'BIKE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_COMFORT';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'RIDER' | 'CAPTAIN' | 'ADMIN';
  avatarUrl?: string | null;
  captain?: CaptainProfile | null;
}

export interface CaptainProfile {
  id: string;
  userId: string;
  user?: User;
  vehicleType: VehicleType;
  vehicleNumber: string;
  vehicleModel: string;
  isOnline: boolean;
  currentLat: number;
  currentLng: number;
  ratingAvg: number;
  totalRides: number;
}

export interface VehicleEstimate {
  vehicleType: VehicleType;
  title: string;
  subtitle: string;
  icon: string;
  capacity: number;
  etaMinutes: number;
  distanceKm: number;
  durationMin: number;
  baseFare: number;
  distanceFare: number;
  taxFare: number;
  discountFare: number;
  totalFare: number;
}

export interface Ride {
  id: string;
  riderId: string;
  rider?: User;
  captainId?: string | null;
  captain?: (CaptainProfile & { user?: User }) | null;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  vehicleType: VehicleType;
  startOtp: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'ARRIVED_PICKUP' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  baseFare: number;
  distanceFare: number;
  taxFare: number;
  discountFare: number;
  totalFare: number;
  distanceKm: number;
  durationMin: number;
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod: string;
  stripeIntentId?: string | null;
  promoCode?: string | null;
  createdAt: string;
  completedAt?: string | null;
  review?: Review | null;
}

export interface Review {
  id: string;
  rideId: string;
  riderId: string;
  captainId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountPercent: number;
  maxDiscount: number;
  minRideFare: number;
}
