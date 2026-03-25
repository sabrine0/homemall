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

const envFlagEnabled = (value: string | undefined, fallback: boolean) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(normalized);
};

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
  const shouldSeedDemoZones = envFlagEnabled(
    process.env.SEED_DEMO_ZONES,
    process.env.NODE_ENV !== "production"
  );

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? "admin@homemall.local";
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? "Admin12345!";
  const superAdminHash = await bcrypt.hash(superAdminPassword, 10);

  await prisma.user.upsert({
    where: {
      email: superAdminEmail
    },
    data: {
      email: superAdminEmail,
      passwordHash: superAdminHash,
      role: "SUPER_ADMIN"
    },
    update: {
      passwordHash: superAdminHash,
      role: "SUPER_ADMIN",
      isActive: true
    }
  });

  const managerEmail = process.env.MANAGER_EMAIL?.trim();
  const managerPassword = process.env.MANAGER_PASSWORD?.trim();
  if (managerEmail && managerPassword) {
    const managerHash = await bcrypt.hash(managerPassword, 10);
    await prisma.user.upsert({
      where: {
        email: managerEmail
      },
      data: {
        email: managerEmail,
        passwordHash: managerHash,
        role: "MANAGER"
      },
      update: {
        passwordHash: managerHash,
        role: "MANAGER",
        isActive: true
      }
    });
  }

  let createdZones = 0;
  let updatedZones = 0;

  if (shouldSeedDemoZones) {
    for (const [index, city] of MOROCCO_CITY_CENTERS.entries()) {
      const zoneName = `${city.city} City Center`;
      const metricsData = buildMetrics(index);
      const existingZone = await prisma.zone.findFirst({
        where: {
          name: zoneName,
          city: city.city
        },
        select: {
          id: true
        }
      });

      if (!existingZone) {
        await prisma.zone.create({
          data: {
            name: zoneName,
            city: city.city,
            centerLat: city.centerLat,
            centerLng: city.centerLng,
            metaJson: {},
            metrics: {
              create: metricsData
            }
          }
        });
        createdZones += 1;
        continue;
      }

      await prisma.zone.update({
        where: {
          id: existingZone.id
        },
        data: {
          centerLat: city.centerLat,
          centerLng: city.centerLng,
          metaJson: {},
          metrics: {
            upsert: {
              create: metricsData,
              update: metricsData
            }
          }
        }
      });
      updatedZones += 1;
    }
  }

  console.log(
    `Seed complete. Demo zones ${shouldSeedDemoZones ? `created ${createdZones}, updated ${updatedZones}` : "skipped"}, default super admin ${superAdminEmail}.`
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
