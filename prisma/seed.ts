import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db/prisma";
import { seedNutrition } from "../src/lib/nutrition/seed";

const CATEGORIES = [
  { name: "Hauptgerichte", icon: "🍲" },
  { name: "Suppen", icon: "🥣" },
  { name: "Backen", icon: "🥧" },
  { name: "Desserts", icon: "🍰" },
  { name: "Salate", icon: "🥗" },
  { name: "Beilagen", icon: "🥔" },
  { name: "Getränke", icon: "🍷" },
  { name: "Fruehstueck", icon: "🥞" },
];

const INGREDIENTS = [
  { name: "Mehl", category: "Trockenwaren" },
  { name: "Zucker", category: "Trockenwaren" },
  { name: "Salz", category: "Gewuerze" },
  { name: "Pfeffer", category: "Gewuerze" },
  { name: "Butter", category: "Kuehlregal" },
  { name: "Milch", category: "Kuehlregal" },
  { name: "Ei", category: "Kuehlregal" },
  { name: "Zwiebel", category: "Gemuese" },
  { name: "Knoblauch", category: "Gemuese" },
  { name: "Tomate", category: "Gemuese", aliases: "Paradeiser,Tomaten" },
  { name: "Kartoffel", category: "Gemuese", aliases: "Erdaepfel,Kartoffeln" },
  { name: "Olivenoel", category: "Vorrat" },
];

async function main() {
  const adminEmail = "admin@kochbuch.local";
  const adminPassword = "kochbuch";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`Admin-User: ${admin.email} (PW: ${adminPassword})`);

  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: { icon: c.icon },
      create: c,
    });
  }
  console.log(`${CATEGORIES.length} Kategorien angelegt`);

  for (const i of INGREDIENTS) {
    await prisma.ingredient.upsert({
      where: { name: i.name },
      update: { category: i.category, aliases: i.aliases ?? null },
      create: i,
    });
  }
  console.log(`${INGREDIENTS.length} Basis-Zutaten angelegt`);

  const { count: nutritionCount } = await seedNutrition(prisma);
  console.log(`${nutritionCount} Zutaten mit Nährwerten versehen`);

  await prisma.appMeta.upsert({
    where: { key: "currentVersion" },
    update: { value: process.env.npm_package_version ?? "0.1.0" },
    create: { key: "currentVersion", value: process.env.npm_package_version ?? "0.1.0" },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
