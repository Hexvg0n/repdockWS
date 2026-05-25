import { redirect } from "next/navigation";

import { AdminRestorePanel } from "@/components/AdminRestorePanel";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminRestorePage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/");
  }

  return <AdminRestorePanel />;
}
