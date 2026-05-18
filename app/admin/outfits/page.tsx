import { redirect } from "next/navigation";

import { AdminOutfitsPanel } from "@/components/AdminOutfitsPanel";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminOutfitsPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/");
  }

  return <AdminOutfitsPanel />;
}
