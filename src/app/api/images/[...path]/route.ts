import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function notFound() {
  return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Erlaubte Pfad-Pattern: /recipes/<recipeId>/<file>. Alles andere wird abgewiesen.
// Owner-Check: das Recipe muss dem eingeloggten User gehören ODER public sein
// (geteilte Rezepte sehen ihre Bilder im PDF). Puppeteer-Renderer schickt
// den x-internal-token (s. proxy.ts) und überspringt diesen Pfad bereits in
// der Middleware — hier kommen also nur "echte" Browser-Requests an.
async function authorizeRecipeImage(
  segments: string[],
): Promise<{ ok: true } | { ok: false; status: 403 | 404 }> {
  if (segments[0] !== "recipes" || !segments[1]) {
    return { ok: false, status: 404 };
  }
  const recipeId = segments[1];
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { createdById: true, isPublic: true },
  });
  if (!recipe) return { ok: false, status: 404 };

  if (recipe.isPublic) return { ok: true };

  const session = await auth();
  if (!session?.user) return { ok: false, status: 403 };
  if (session.user.id !== recipe.createdById) return { ok: false, status: 403 };
  return { ok: true };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  if (segments.length === 0) return notFound();

  // Pfad-Traversal-Schutz: resolve → startsWith. Robuster als die alte
  // includes("..")-Heuristik gegen URL-decoded Edge-Cases.
  const baseDir = path.resolve(UPLOAD_DIR);
  const filePath = path.resolve(baseDir, segments.join("/"));
  if (filePath !== baseDir && !filePath.startsWith(baseDir + path.sep)) {
    return NextResponse.json({ error: "Ungültiger Pfad" }, { status: 400 });
  }

  // Internal-Token (Puppeteer) wird schon in der Middleware durchgelassen —
  // wenn er hier ankommt, gilt er als vertrauenswürdig.
  const internalToken = req.headers.get("x-internal-token");
  const isInternal =
    !!internalToken && internalToken === process.env.AUTH_SECRET;

  if (!isInternal) {
    const auth = await authorizeRecipeImage(segments);
    if (!auth.ok) {
      return auth.status === 403 ? forbidden() : notFound();
    }
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).replace(".", "").toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";
    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return notFound();
  }
}
