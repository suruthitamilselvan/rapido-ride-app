export interface FareCalculationInput {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  vehicleType: 'BIKE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_COMFORT';
  promoDiscountPercent?: number;
  maxDiscount?: number;
}

export interface VehicleEstimate {
  vehicleType: 'BIKE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_COMFORT';
  title: string;
  subtitle: string;
  icon: string;
  etaMinutes: number;
  distanceKm: number;
  durationMin: number;
  baseFare: number;
  distanceFare: number;
  taxFare: number;
  discountFare: number;
  totalFare: number;
  capacity: number;
}

// Haversine formula to compute distance in km
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistance = R * c;
  // Apply a 1.28 urban detour factor to reflect realistic road routes
  return Math.max(0.8, Number((straightDistance * 1.28).toFixed(1)));
}

// Vehicle configuration reflecting Rapido pricing in INR (₹)
export const VEHICLE_CONFIGS = {
  BIKE: {
    title: 'Rapido Bike',
    subtitle: 'Fastest & Pocket Friendly • Helmet Included',
    icon: '🛵',
    capacity: 1,
    baseFare: 25,
    includedKm: 1.5,
    perKm: 10,
    perMin: 1.5,
    speedKmh: 28,
  },
  AUTO: {
    title: 'Rapido Auto',
    subtitle: 'Doorstep Pickup • Meter Fare Guaranteed',
    icon: '🛺',
    capacity: 3,
    baseFare: 35,
    includedKm: 1.8,
    perKm: 14,
    perMin: 2.0,
    speedKmh: 24,
  },
  CAB_ECONOMY: {
    title: 'Rapido Cab Economy',
    subtitle: 'Comfy Hatchbacks & Compact Sedans',
    icon: '🚗',
    capacity: 4,
    baseFare: 60,
    includedKm: 2.0,
    perKm: 18,
    perMin: 2.5,
    speedKmh: 22,
  },
  CAB_COMFORT: {
    title: 'Rapido Cab Comfort',
    subtitle: 'Top-rated Captains • Spacious AC Sedans',
    icon: '🚘',
    capacity: 4,
    baseFare: 90,
    includedKm: 2.0,
    perKm: 24,
    perMin: 3.0,
    speedKmh: 22,
  },
};

export function calculateVehicleFare(
  vehicleType: 'BIKE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_COMFORT',
  distanceKm: number,
  promoDiscountPercent: number = 0,
  maxDiscount: number = 0
): VehicleEstimate {
  const config = VEHICLE_CONFIGS[vehicleType];
  const travelDurationHours = distanceKm / config.speedKmh;
  const durationMin = Math.max(5, Math.round(travelDurationHours * 60));

  const extraKm = Math.max(0, distanceKm - config.includedKm);
  const distanceFare = Number((extraKm * config.perKm).toFixed(2));
  const timeFare = Number((durationMin * config.perMin).toFixed(2));

  const subtotal = config.baseFare + distanceFare + timeFare;
  const taxFare = Number((subtotal * 0.05).toFixed(2)); // 5% GST
  let grossTotal = subtotal + taxFare;

  let discountFare = 0;
  if (promoDiscountPercent > 0) {
    const rawDiscount = (grossTotal * promoDiscountPercent) / 100;
    discountFare = maxDiscount > 0 ? Math.min(rawDiscount, maxDiscount) : rawDiscount;
    discountFare = Number(discountFare.toFixed(2));
  }

  const totalFare = Math.max(20, Math.round(grossTotal - discountFare));
  const etaMinutes = vehicleType === 'BIKE' ? 3 : vehicleType === 'AUTO' ? 4 : 6;

  return {
    vehicleType,
    title: config.title,
    subtitle: config.subtitle,
    icon: config.icon,
    capacity: config.capacity,
    etaMinutes,
    distanceKm,
    durationMin,
    baseFare: config.baseFare,
    distanceFare,
    taxFare,
    discountFare,
    totalFare,
  };
}

export function getAllFareEstimates(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  promoDiscountPercent: number = 0,
  maxDiscount: number = 0
): VehicleEstimate[] {
  const distanceKm = calculateHaversineDistance(lat1, lon1, lat2, lon2);
  const types: ('BIKE' | 'AUTO' | 'CAB_ECONOMY' | 'CAB_COMFORT')[] = [
    'BIKE',
    'AUTO',
    'CAB_ECONOMY',
    'CAB_COMFORT',
  ];

  return types.map((type) =>
    calculateVehicleFare(type, distanceKm, promoDiscountPercent, maxDiscount)
  );
}
