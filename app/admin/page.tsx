import { redirect } from "next/navigation";

import { AdminW2CPanel } from "@/components/AdminW2CPanel";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/");
  }

  return <AdminW2CPanel />;
}
