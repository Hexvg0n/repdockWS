import { redirect } from "next/navigation";

import { AdminTikTokItemsPanel } from "@/components/AdminTikTokItemsPanel";
import { getAdminSession } from "@/lib/admin-auth";

export default async function AdminTikTokItemsPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/");
  }

  return <AdminTikTokItemsPanel />;
}
