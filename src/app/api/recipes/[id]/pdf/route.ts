import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export const maxDuration = 120;

// Detect internal app URL for Puppeteer
function getInternalUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

async function renderPdf(recipeId: string): Promise<Buffer> {
  // Dynamic import — keeps puppeteer out of the module graph for routes that don't use it
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    headless: true,
  });

  try {
    const page = await browser.newPage();

    // Ensure correct viewport for A5 rendering
    await page.setViewport({ width: 559, height: 794 }); // A5 at 96dpi

    const url = `${getInternalUrl()}/_print/recipe/${recipeId}`;
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });

    // Wait for web fonts to finish loading
    await page.evaluateHandle("document.fonts.ready");

    const pdf = await page.pdf({
      format: "A5",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      // CSS @page margins handle the spacing
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { id: true, title: true, createdById: true, isPublic: true } });
  if (!recipe) return NextResponse.json({ error: "Rezept nicht gefunden" }, { status: 404 });

  // Allow owner or public recipes
  if (recipe.createdById !== session.user.id && !recipe.isPublic) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  try {
    const pdf = await renderPdf(id);
    const filename = recipe.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    return new Response(pdf.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Content-Length": String(pdf.length),
      },
    });
  } catch (err) {
    console.error("PDF generation failed:", err);
    return NextResponse.json(
      { error: "PDF-Generierung fehlgeschlagen", detail: String(err) },
      { status: 500 },
    );
  }
}
