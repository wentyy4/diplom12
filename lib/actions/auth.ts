"use server";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidEmail } from "@/lib/validations";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  if (!email || !password) {
    return { error: "Email and password are required" };
  }
  if (!isValidEmail(email)) {
    return { error: "Invalid email format" };
  }
  const result = await signIn("credentials", {
    email,
    password,
    redirect: false,
  });
  if (result?.error) {
    return { error: "Invalid email or password" };
  }
  revalidatePath("/");
  redirect("/dashboard");
}

export async function register(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = (formData.get("role") as string) || "MEMBER";

  if (!name || !email || !password) {
    return { error: "Name, email, and password are required" };
  }
  if (!isValidEmail(email)) {
    return { error: "Invalid email format" };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });
  if (existing) {
    return { error: "Email already registered" };
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role as "ADMIN" | "MANAGER" | "MEMBER",
    },
  });

  revalidatePath("/");
  redirect("/login");
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
