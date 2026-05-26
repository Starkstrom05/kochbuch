"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import {
  encryptSecret,
  isCredentialsKeyConfigured,
  packCredentials,
} from "@/lib/crypto/credentials";
import { connectOurGroceriesSchema, selectDefaultListSchema } from "@/lib/schemas/ourgroceries";
import { OurGroceriesAuthError, OurGroceriesClient } from "@/lib/integrations/ourgroceries/client";

const SETTINGS_PATH = "/profil/ourgroceries";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  return session.user;
}

export type ConnectResult =
  | { ok: true; lists: { id: string; name: string }[] }
  | { ok: false; error: string };

export async function connectOurGroceriesAction(formData: FormData): Promise<ConnectResult> {
  const user = await requireUser();

  if (!isCredentialsKeyConfigured()) {
    return {
      ok: false,
      error: "OurGroceries-Modul ist nicht konfiguriert (OURGROCERIES_ENCRYPTION_KEY fehlt).",
    };
  }

  const parsed = connectOurGroceriesSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  const client = new OurGroceriesClient();
  let session;
  try {
    session = await client.login(parsed.data.username, parsed.data.password);
  } catch (err) {
    const reason =
      err instanceof OurGroceriesAuthError
        ? "E-Mail oder Passwort wurde abgelehnt."
        : `Login fehlgeschlagen: ${(err as Error).message}`;
    return { ok: false, error: reason };
  }

  let lists;
  try {
    lists = await client.listLists(session);
  } catch (err) {
    return { ok: false, error: `Listen konnten nicht geladen werden: ${(err as Error).message}` };
  }

  const packed = packCredentials(parsed.data.username, parsed.data.password);
  const blob = encryptSecret(packed);
  const defaultList = lists[0];
  const ciphertext = toBytes(blob.ciphertext);
  const iv = toBytes(blob.iv);
  const authTag = toBytes(blob.authTag);

  await prisma.userOurGroceriesCredentials.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      encryptedSecret: ciphertext,
      iv,
      authTag,
      defaultListId: defaultList?.id ?? null,
      defaultListName: defaultList?.name ?? null,
    },
    update: {
      encryptedSecret: ciphertext,
      iv,
      authTag,
      defaultListId: defaultList?.id ?? null,
      defaultListName: defaultList?.name ?? null,
    },
  });

  revalidatePath(SETTINGS_PATH);
  return {
    ok: true,
    lists: lists.map((l) => ({ id: l.id, name: l.name })),
  };
}

export async function selectDefaultListAction(formData: FormData) {
  const user = await requireUser();
  const parsed = selectDefaultListSchema.safeParse({ listId: formData.get("listId") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ungültige Liste");
  }

  const creds = await prisma.userOurGroceriesCredentials.findUnique({
    where: { userId: user.id },
  });
  if (!creds) throw new Error("Bitte zuerst mit OurGroceries verbinden.");

  let name: string | null = null;
  try {
    const client = new OurGroceriesClient();
    const session = await reauthenticate(client, creds);
    const lists = await client.listLists(session);
    name = lists.find((l) => l.id === parsed.data.listId)?.name ?? null;
  } catch {
    // Listen-Refresh fehlgeschlagen — ID trotzdem persistieren, Name leer lassen.
  }

  await prisma.userOurGroceriesCredentials.update({
    where: { userId: user.id },
    data: { defaultListId: parsed.data.listId, defaultListName: name },
  });
  revalidatePath(SETTINGS_PATH);
}

export async function disconnectOurGroceriesAction() {
  const user = await requireUser();
  await prisma.userOurGroceriesCredentials.deleteMany({ where: { userId: user.id } });
  revalidatePath(SETTINGS_PATH);
}

function toBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  const ab = new ArrayBuffer(buf.byteLength);
  const out = new Uint8Array(ab);
  out.set(buf);
  return out;
}

async function reauthenticate(
  client: OurGroceriesClient,
  creds: { encryptedSecret: Uint8Array; iv: Uint8Array; authTag: Uint8Array },
) {
  const { decryptSecret, unpackCredentials } = await import("@/lib/crypto/credentials");
  const plain = decryptSecret({
    ciphertext: Buffer.from(creds.encryptedSecret),
    iv: Buffer.from(creds.iv),
    authTag: Buffer.from(creds.authTag),
  });
  const { username, password } = unpackCredentials(plain);
  return client.login(username, password);
}
