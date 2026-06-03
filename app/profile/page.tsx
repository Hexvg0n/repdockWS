import type { Metadata } from "next";

import { ProfileContent } from "@/components/ProfileContent";

export const metadata: Metadata = {
  title: "Profile",
  description: "View your RepDock profile and account area.",
};

export default function ProfilePage() {
  return <ProfileContent />;
}
