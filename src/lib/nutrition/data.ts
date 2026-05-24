// Lokale Nährwert-Tabelle, je 100 g (Masse). Werte sind Richtwerte aus
// gängigen Nährwert-Referenzen — keine Cloud-/API-Abfrage (DSGVO). `density`
// (g/ml) erlaubt die Umrechnung volumenbasierter Mengen (ml/EL/TL) auf Gramm.

export type NutritionEntry = {
  name: string;
  aliases?: string;
  category?: string;
  density?: number;
  kcal: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
};

export const NUTRITION_DATA: NutritionEntry[] = [
  // Grundzutaten
  { name: "Mehl", category: "Trockenwaren", kcal: 340, proteinG: 10, carbsG: 72, fatG: 1, fiberG: 3 },
  { name: "Zucker", category: "Trockenwaren", kcal: 400, proteinG: 0, carbsG: 100, fatG: 0 },
  { name: "Puderzucker", category: "Trockenwaren", kcal: 400, proteinG: 0, carbsG: 100, fatG: 0 },
  { name: "Salz", category: "Gewuerze", kcal: 0 },
  { name: "Pfeffer", category: "Gewuerze", kcal: 250, proteinG: 11, carbsG: 64, fatG: 3 },
  { name: "Backpulver", category: "Backen", kcal: 90, carbsG: 22 },
  { name: "Haferflocken", category: "Trockenwaren", kcal: 370, proteinG: 13, carbsG: 59, fatG: 7, fiberG: 10 },
  { name: "Reis", category: "Trockenwaren", aliases: "Basmatireis,Langkornreis", kcal: 350, proteinG: 7, carbsG: 78, fatG: 0.6, fiberG: 1.3 },
  { name: "Nudeln", category: "Trockenwaren", aliases: "Spaghetti,Pasta,Penne", kcal: 350, proteinG: 12, carbsG: 70, fatG: 1.5, fiberG: 3 },

  // Kühlregal
  { name: "Butter", category: "Kuehlregal", density: 0.91, kcal: 740, proteinG: 0.7, carbsG: 0.6, fatG: 83 },
  { name: "Milch", category: "Kuehlregal", density: 1.03, kcal: 64, proteinG: 3.4, carbsG: 4.8, fatG: 3.6 },
  { name: "Ei", category: "Kuehlregal", kcal: 155, proteinG: 13, carbsG: 1.1, fatG: 11 },
  { name: "Sahne", category: "Kuehlregal", aliases: "Schlagsahne,Schlagobers", density: 1.0, kcal: 290, proteinG: 2.3, carbsG: 3.2, fatG: 30 },
  { name: "Schmand", category: "Kuehlregal", kcal: 240, proteinG: 3, carbsG: 4, fatG: 24 },
  { name: "Crème fraîche", category: "Kuehlregal", aliases: "Creme fraiche", kcal: 290, proteinG: 2.4, carbsG: 3, fatG: 30 },
  { name: "Joghurt", category: "Kuehlregal", density: 1.03, kcal: 60, proteinG: 3.5, carbsG: 5, fatG: 3.2 },
  { name: "Quark", category: "Kuehlregal", aliases: "Magerquark,Topfen", kcal: 67, proteinG: 12, carbsG: 4, fatG: 0.3 },
  { name: "Frischkäse", category: "Kuehlregal", aliases: "Frischkaese", kcal: 250, proteinG: 6, carbsG: 3.5, fatG: 24 },
  { name: "Gouda", category: "Kuehlregal", aliases: "Käse,Kaese,Reibekäse", kcal: 356, proteinG: 25, carbsG: 0, fatG: 28 },
  { name: "Parmesan", category: "Kuehlregal", kcal: 392, proteinG: 36, carbsG: 0, fatG: 27 },
  { name: "Mozzarella", category: "Kuehlregal", kcal: 280, proteinG: 18, carbsG: 2, fatG: 22 },

  // Fleisch & Fisch
  { name: "Hähnchenbrust", category: "Fleisch", aliases: "Haehnchenbrust,Hühnerbrust", kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
  { name: "Hackfleisch", category: "Fleisch", aliases: "Hack,Faschiertes", kcal: 230, proteinG: 19, carbsG: 0, fatG: 17 },
  { name: "Lachs", category: "Fisch", kcal: 208, proteinG: 20, carbsG: 0, fatG: 13 },
  { name: "Thunfisch", category: "Fisch", kcal: 116, proteinG: 26, carbsG: 0, fatG: 1 },
  { name: "Speck", category: "Fleisch", aliases: "Bacon", kcal: 540, proteinG: 17, carbsG: 0, fatG: 52 },

  // Gemüse & Obst
  { name: "Zwiebel", category: "Gemuese", kcal: 40, proteinG: 1.1, carbsG: 9, fatG: 0.1, fiberG: 1.7 },
  { name: "Knoblauch", category: "Gemuese", kcal: 149, proteinG: 6, carbsG: 33, fatG: 0.5 },
  { name: "Tomate", category: "Gemuese", aliases: "Paradeiser,Tomaten", kcal: 18, proteinG: 0.9, carbsG: 3.9, fatG: 0.2, fiberG: 1.2 },
  { name: "Kartoffel", category: "Gemuese", aliases: "Erdaepfel,Kartoffeln", kcal: 77, proteinG: 2, carbsG: 17, fatG: 0.1, fiberG: 2.2 },
  { name: "Karotte", category: "Gemuese", aliases: "Möhre,Moehre,Karotten,Möhren", kcal: 41, proteinG: 0.9, carbsG: 10, fatG: 0.2, fiberG: 2.8 },
  { name: "Paprika", category: "Gemuese", kcal: 31, proteinG: 1, carbsG: 6, fatG: 0.3, fiberG: 2.1 },
  { name: "Zucchini", category: "Gemuese", kcal: 17, proteinG: 1.2, carbsG: 3.1, fatG: 0.3, fiberG: 1 },
  { name: "Brokkoli", category: "Gemuese", kcal: 34, proteinG: 2.8, carbsG: 7, fatG: 0.4, fiberG: 2.6 },
  { name: "Spinat", category: "Gemuese", kcal: 23, proteinG: 2.9, carbsG: 3.6, fatG: 0.4, fiberG: 2.2 },
  { name: "Champignons", category: "Gemuese", aliases: "Pilze,Champignon", kcal: 22, proteinG: 3, carbsG: 3.3, fatG: 0.3 },
  { name: "Gurke", category: "Gemuese", kcal: 12, proteinG: 0.6, carbsG: 2, fatG: 0.1 },
  { name: "Banane", category: "Obst", kcal: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3, fiberG: 2.6 },
  { name: "Apfel", category: "Obst", aliases: "Äpfel,Aepfel", kcal: 52, proteinG: 0.3, carbsG: 14, fatG: 0.2, fiberG: 2.4 },
  { name: "Zitrone", category: "Obst", kcal: 29, proteinG: 1.1, carbsG: 9, fatG: 0.3 },

  // Vorrat / Öle / Saucen
  { name: "Olivenoel", category: "Vorrat", aliases: "Olivenöl", density: 0.91, kcal: 884, proteinG: 0, carbsG: 0, fatG: 100 },
  { name: "Sonnenblumenöl", category: "Vorrat", aliases: "Sonnenblumenoel,Öl,Oel", density: 0.92, kcal: 884, fatG: 100 },
  { name: "Tomatenmark", category: "Vorrat", kcal: 82, proteinG: 4.3, carbsG: 19, fatG: 0.5 },
  { name: "Passierte Tomaten", category: "Vorrat", aliases: "Passata", density: 1.05, kcal: 35, proteinG: 1.5, carbsG: 6, fatG: 0.3 },
  { name: "Kokosmilch", category: "Vorrat", density: 1.0, kcal: 230, proteinG: 2.3, carbsG: 6, fatG: 24 },
  { name: "Sojasauce", category: "Vorrat", aliases: "Sojasoße", density: 1.15, kcal: 60, proteinG: 8, carbsG: 5, fatG: 0 },
  { name: "Senf", category: "Vorrat", density: 1.05, kcal: 100, proteinG: 6, carbsG: 8, fatG: 6 },
  { name: "Ketchup", category: "Vorrat", aliases: "Tomatenketchup", density: 1.1, kcal: 110, proteinG: 1.2, carbsG: 26, fatG: 0.2 },
  { name: "Honig", category: "Vorrat", density: 1.4, kcal: 304, proteinG: 0.3, carbsG: 82, fatG: 0 },

  // Backen & Nüsse
  { name: "Schokolade", category: "Backen", aliases: "Zartbitterschokolade", kcal: 540, proteinG: 7, carbsG: 50, fatG: 33 },
  { name: "Kakao", category: "Backen", aliases: "Kakaopulver", kcal: 230, proteinG: 20, carbsG: 50, fatG: 14 },
  { name: "Walnüsse", category: "Backen", aliases: "Walnuesse,Walnuss", kcal: 654, proteinG: 15, carbsG: 14, fatG: 65 },
  { name: "Mandeln", category: "Backen", kcal: 575, proteinG: 21, carbsG: 22, fatG: 49 },
];
