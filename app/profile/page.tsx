"use client";

import { useLanguageCopy } from "@/lib/use-repdock-language";

const profileCopy = {
  PL: {
    description: "Profil użytkownika jest jeszcze w przygotowaniu.",
    title: "Profil",
  },
  EN: {
    description: "User profile placeholder.",
    title: "Profile",
  },
} as const;

export default function ProfilePage() {
  const copy = useLanguageCopy(profileCopy);

  return (
    <main className="min-h-screen bg-black px-6 py-28 text-white">
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/[0.04] p-8">
        <h1 className="text-3xl font-semibold">{copy.title}</h1>
        <p className="mt-3 text-sm text-zinc-400">{copy.description}</p>
      </div>
    </main>
  );
}
