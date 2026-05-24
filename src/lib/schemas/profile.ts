import { z } from "zod";
import { ROLES } from "@/lib/db/enums";

export const createUserSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail eingeben").max(200),
  name: z.string().min(1, "Name fehlt").max(80),
  password: z.string().min(8, "Passwort braucht mindestens 8 Zeichen").max(200),
  role: z.enum(ROLES).default("MEMBER"),
  familyId: z.string().min(1).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const createFamilySchema = z.object({
  name: z.string().min(1, "Name fehlt").max(80),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Aktuelles Passwort fehlt"),
    newPassword: z
      .string()
      .min(8, "Neues Passwort muss mindestens 8 Zeichen haben")
      .max(200, "Neues Passwort ist zu lang"),
    confirmPassword: z.string().min(1, "Bitte wiederhole das neue Passwort"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Die Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "Neues Passwort muss sich vom aktuellen unterscheiden",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
