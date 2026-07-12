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
  // Bootstrap-Semantik statt Upsert: der Default-Admin wird NUR angelegt,
  // wenn die DB noch leer ist. Sonst wuerde ein geloeschter/umbenannter
  // Admin bei jedem Containerstart mit dem Default-Passwort wiederauferstehen.
  const userCount = await prisma.user.count();
  let admin: { id: string; name: string; activeCookbookId: string | null } | null = null;
  if (userCount === 0) {
    const adminEmail = "admin@kochbuch.local";
    const adminPassword = "kochbuch";
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Admin",
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`Admin-User: ${adminEmail} (PW: ${adminPassword})`);

    // Jeder User braucht mindestens ein eigenes Kochbuch + activeCookbookId.
    let cookbook = await prisma.cookbook.findFirst({ where: { ownerId: admin.id } });
    if (!cookbook) {
      cookbook = await prisma.cookbook.create({
        data: { ownerId: admin.id, name: `${admin.name} Kochbuch` },
      });
    }
    if (!admin.activeCookbookId) {
      await prisma.user.update({
        where: { id: admin.id },
        data: { activeCookbookId: cookbook.id },
      });
    }
  } else {
    console.log("Bestehende User gefunden — Admin-Bootstrap übersprungen");
  }

  // Create-only: globale Kategorien/Zutaten aus dem Seed duerfen bestehende
  // User-Korrekturen (Icon, Kategorie, Aliase) nicht bei jedem Deploy
  // ueberschreiben. `Category.name` ist seit dem Cookbook-Scoping nur noch
  // ueber (cookbookId, name) eindeutig; SQLite behandelt NULL-cookbookId im
  // Unique-Index als paarweise distinct, ein `upsert` ueber diesen
  // Composite-Key wuerde also bei jedem Lauf einen Duplikat-Datensatz
  // anlegen statt den bestehenden zu treffen. Deshalb hier explizit
  // findFirst + create statt upsert.
  let createdCategories = 0;
  for (const c of CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { cookbookId: null, name: c.name },
    });
    if (!existing) {
      await prisma.category.create({ data: { name: c.name, icon: c.icon, cookbookId: null } });
      createdCategories++;
    }
  }
  console.log(`${createdCategories} neue Kategorien angelegt (${CATEGORIES.length} im Seed-Set)`);

  let createdIngredients = 0;
  for (const i of INGREDIENTS) {
    const existing = await prisma.ingredient.findUnique({ where: { name: i.name } });
    if (!existing) {
      await prisma.ingredient.create({ data: i });
      createdIngredients++;
    }
  }
  console.log(
    `${createdIngredients} neue Basis-Zutaten angelegt (${INGREDIENTS.length} im Seed-Set)`,
  );

  const { count: nutritionCount } = await seedNutrition(prisma);
  console.log(`${nutritionCount} Zutaten mit Nährwerten versehen`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
