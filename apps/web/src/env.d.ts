/// <reference types="astro/client" />

import type { AuthUser } from "@firmador/shared";

declare global {
  namespace App {
    interface Locals {
      user: AuthUser | null;
    }
  }
}

interface ImportMetaEnv {
  readonly API_BASE_URL?: string;
}

export {};
