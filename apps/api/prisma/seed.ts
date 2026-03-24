import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type CityCenterSeed = {
  city: string;
  centerLat: number;
  centerLng: number;
};

const MOROCCO_CITY_CENTERS: CityCenterSeed[] = [
  { city: "Casablanca", centerLat: 33.5731, centerLng: -7.5898 },
  { city: "Rabat", centerLat: 34.0209, centerLng: -6.8416 },
  { city: "Sale", centerLat: 34.0372, centerLng: -6.7985 },
  { city: "Marrakech", centerLat: 31.6295, centerLng: -7.9811 },
  { city: "Tangier", centerLat: 35.7595, centerLng: -5.834 },
  { city: "Agadir", centerLat: 30.4278, centerLng: -9.5981 },
  { city: "Fes", centerLat: 34.0331, centerLng: -5.0003 },
  { city: "Meknes", centerLat: 33.8731, centerLng: -5.5407 },
  { city: "Oujda", centerLat: 34.6814, centerLng: -1.9086 },
  { city: "Kenitra", centerLat: 34.261, centerLng: -6.5802 },
  { city: "Temara", centerLat: 33.9287, centerLng: -6.9066 },
  { city: "El Jadida", centerLat: 33.2316, centerLng: -8.5007 },
  { city: "Mohammedia", centerLat: 33.6874, centerLng: -7.382 },
  { city: "Dakhla", centerLat: 23.6848, centerLng: -15.957 },
  { city: "Laayoune", centerLat: 27.1536, centerLng: -13.2033 }
];

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

const buildMetrics = (index: number) => ({
  noiseIndex: clamp(38 + ((index * 7) % 28)),
  greenIndex: clamp(44 + ((index * 11) % 34)),
  airQualityIndex: clamp(55 + ((index * 5) % 28)),
  pollenIndex: clamp(30 + ((index * 9) % 26)),
  floodRiskIndex: clamp(18 + ((index * 6) % 28)),
  heatIndex: clamp(40 + ((index * 8) % 30)),
  transitIndex: clamp(48 + ((index * 10) % 36)),
  walkIndex: clamp(42 + ((index * 12) % 40)),
  futureValueIndex: clamp(54 + ((index * 9) % 34)),
  zoningRiskIndex: clamp(22 + ((index * 7) % 24))
});

const main = async () => {
  await prisma.chatMessage.deleteMany();
  await prisma.chatConversation.deleteMany();
  await prisma.listingReport.deleteMany();
  await prisma.userListing.deleteMany();
  await prisma.analysisResult.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.zoneMetrics.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.user.deleteMany();

  for (const [index, city] of MOROCCO_CITY_CENTERS.entries()) {
    await prisma.zone.create({
      data: {
        name: `${city.city} City Center`,
        city: city.city,
        centerLat: city.centerLat,
        centerLng: city.centerLng,
        metaJson: {},
        metrics: {
          create: buildMetrics(index)
        }
      }
    });
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? "admin@homemall.local";
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? "Admin12345!";
  const superAdminHash = await bcrypt.hash(superAdminPassword, 10);

  await prisma.user.create({
    data: {
      email: superAdminEmail,
      passwordHash: superAdminHash,
      role: "SUPER_ADMIN"
    }
  });

  const managerEmail = process.env.MANAGER_EMAIL?.trim();
  const managerPassword = process.env.MANAGER_PASSWORD?.trim();
  if (managerEmail && managerPassword) {
    const managerHash = await bcrypt.hash(managerPassword, 10);
    await prisma.user.create({
      data: {
        email: managerEmail,
        passwordHash: managerHash,
        role: "MANAGER"
      }
    });
  }

  console.log(
    `Seed complete. Inserted ${MOROCCO_CITY_CENTERS.length} zones, 0 listings, and default super admin ${superAdminEmail}.`
  );
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
