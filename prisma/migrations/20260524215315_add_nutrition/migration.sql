-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "nutritionCarbsG" REAL;
ALTER TABLE "Recipe" ADD COLUMN "nutritionFatG" REAL;
ALTER TABLE "Recipe" ADD COLUMN "nutritionKcal" REAL;
ALTER TABLE "Recipe" ADD COLUMN "nutritionProteinG" REAL;

-- CreateTable
CREATE TABLE "IngredientNutrition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredientId" TEXT NOT NULL,
    "kcal" REAL NOT NULL,
    "proteinG" REAL,
    "carbsG" REAL,
    "fatG" REAL,
    "fiberG" REAL,
    CONSTRAINT "IngredientNutrition_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "IngredientNutrition_ingredientId_key" ON "IngredientNutrition"("ingredientId");
