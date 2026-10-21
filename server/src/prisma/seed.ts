import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Clearing existing demo records...');
  await prisma.review.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.captainProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.promoCode.deleteMany();

  console.log('[Seed] Creating demo users and captains...');

  // 1. Rider User
  const rider = await prisma.user.create({
    data: {
      id: 'rider-demo-01',
      name: 'Rahul Sharma',
      email: 'rahul@rapido-demo.com',
      phone: '+91 98765 43210',
      role: 'RIDER',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    },
  });

  // 2. Captain Bike
  const userBikeCaptain = await prisma.user.create({
    data: {
      id: 'captain-user-bike',
      name: 'Arun Kumar',
      email: 'arun.captain@rapido-demo.com',
      phone: '+91 98111 22334',
      role: 'CAPTAIN',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    },
  });

  await prisma.captainProfile.create({
    data: {
      id: 'captain-bike-01',
      userId: userBikeCaptain.id,
      vehicleType: 'BIKE',
      vehicleModel: 'Hero Splendor Plus',
      vehicleNumber: 'KA 01 AB 1234',
      isOnline: true,
      currentLat: 12.9720,
      currentLng: 77.5950,
      ratingAvg: 4.9,
      totalRides: 342,
    },
  });

  // 3. Captain Auto
  const userAutoCaptain = await prisma.user.create({
    data: {
      id: 'captain-user-auto',
      name: 'Manjunath Gowda',
      email: 'manju.auto@rapido-demo.com',
      phone: '+91 98222 33445',
      role: 'CAPTAIN',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  await prisma.captainProfile.create({
    data: {
      id: 'captain-auto-01',
      userId: userAutoCaptain.id,
      vehicleType: 'AUTO',
      vehicleModel: 'Bajaj Compact Auto',
      vehicleNumber: 'KA 05 CD 5678',
      isOnline: true,
      currentLat: 12.9710,
      currentLng: 77.5935,
      ratingAvg: 4.8,
      totalRides: 512,
    },
  });

  // 4. Captain Cab Economy
  const userCabCaptain = await prisma.user.create({
    data: {
      id: 'captain-user-cab',
      name: 'Vikram Reddy',
      email: 'vikram.cab@rapido-demo.com',
      phone: '+91 98333 44556',
      role: 'CAPTAIN',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
  });

  await prisma.captainProfile.create({
    data: {
      id: 'captain-cab-01',
      userId: userCabCaptain.id,
      vehicleType: 'CAB_ECONOMY',
      vehicleModel: 'Maruti Suzuki WagonR',
      vehicleNumber: 'KA 03 EF 9012',
      isOnline: true,
      currentLat: 12.9735,
      currentLng: 77.5960,
      ratingAvg: 4.7,
      totalRides: 219,
    },
  });

  // 5. Captain Cab Comfort
  const userComfortCaptain = await prisma.user.create({
    data: {
      id: 'captain-user-comfort',
      name: 'Siddharth Rao',
      email: 'sid.comfort@rapido-demo.com',
      phone: '+91 98444 55667',
      role: 'CAPTAIN',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    },
  });

  await prisma.captainProfile.create({
    data: {
      id: 'captain-comfort-01',
      userId: userComfortCaptain.id,
      vehicleType: 'CAB_COMFORT',
      vehicleModel: 'Hyundai Verna SX',
      vehicleNumber: 'KA 04 GH 3456',
      isOnline: true,
      currentLat: 12.9740,
      currentLng: 77.5920,
      ratingAvg: 5.0,
      totalRides: 168,
    },
  });

  // 6. Promo Codes
  console.log('[Seed] Creating promo codes...');
  await prisma.promoCode.createMany({
    data: [
      {
        code: 'RAPIDO50',
        description: '50% off on your bike/auto ride up to ₹50',
        discountPercent: 50,
        maxDiscount: 50,
        minRideFare: 40,
        isActive: true,
      },
      {
        code: 'WELCOME20',
        description: 'Flat 20% off for new commuters up to ₹40',
        discountPercent: 20,
        maxDiscount: 40,
        minRideFare: 30,
        isActive: true,
      },
      {
        code: 'BIKERUSH',
        description: '30% off on Rapido Bike Taxi up to ₹30',
        discountPercent: 30,
        maxDiscount: 30,
        minRideFare: 25,
        isActive: true,
      },
    ],
  });

  console.log('[Seed] Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
