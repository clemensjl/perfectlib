import type { ComponentType } from "react";
import LoginClemens from "./login-clemens/login-clemens";

// Jedes Element aus registry.json braucht hier einen Eintrag, damit die Seite es live zeigen kann.
// Schlüssel = "name" aus registry.json.
export const previews: Record<string, ComponentType> = {
  "login-clemens": LoginClemens,
};
