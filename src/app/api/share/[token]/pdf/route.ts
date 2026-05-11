import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const maxDuration = 120;

function getInternalUrl(): string {
  return process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const recipe = await prisma.recipe.findFirst({
    where: { shareToken: token, isPublic: true },
    select: { id: true, title: true },
  });
  if (!recipe) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 559, height: 794 });
      await page.goto(`${getInternalUrl()}/_print/recipe/${recipe.id}`, {
        waitUntil: "networkidle0",
        timeout: 60_000,
      });
      await page.evaluateHandle("document.fonts.ready");
      const pdfBuf = Buffer.from(await page.pdf({ format: "A5", printBackground: true }));

      const filename = recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
      return new Response(pdfBuf.buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error("Share PDF failed:", err);
    return NextResponse.json({ error: "PDF-Generierung fehlgeschlagen" }, { status: 500 });
  }
}
