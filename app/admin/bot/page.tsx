import { redirect } from "next/navigation";

import { AdminBotPanel } from "@/components/AdminBotPanel";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminBotPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/");
  }

  return <AdminBotPanel />;
}
