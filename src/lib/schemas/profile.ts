import { z } from "zod";

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
