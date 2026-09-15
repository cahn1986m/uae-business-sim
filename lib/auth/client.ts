"use client";
import { createAuthClient } from "@neondatabase/auth/next";

/**
 * عميل Neon Auth للمتصفح. بيتواصل مع /api/auth/* (نفس الأصل)، وهو نفس
 * العميل يلي بنمرره لـ NeonAuthUIProvider ويستخدمه UserButton/AuthView.
 */
export const authClient = createAuthClient();
