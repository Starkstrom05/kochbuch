import { describe, expect, it } from "vitest";
import { changePasswordSchema } from "./profile";

const ok = {
  currentPassword: "altesPasswort",
  newPassword: "neuesPasswort1",
  confirmPassword: "neuesPasswort1",
};

describe("changePasswordSchema", () => {
  it("akzeptiert gültige Eingabe", () => {
    expect(changePasswordSchema.parse(ok)).toEqual(ok);
  });

  it("weist neues Passwort < 8 Zeichen ab", () => {
    const r = changePasswordSchema.safeParse({
      ...ok,
      newPassword: "kurz",
      confirmPassword: "kurz",
    });
    expect(r.success).toBe(false);
  });

  it("weist abweichende Bestätigung ab", () => {
    const r = changePasswordSchema.safeParse({
      ...ok,
      confirmPassword: "andersPasswort1",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["confirmPassword"]);
    }
  });

  it("weist identisches aktuelles und neues Passwort ab", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "gleichesPasswort1",
      newPassword: "gleichesPasswort1",
      confirmPassword: "gleichesPasswort1",
    });
    expect(r.success).toBe(false);
  });
});
