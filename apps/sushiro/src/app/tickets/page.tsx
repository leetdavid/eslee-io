import type { Metadata } from "next";
import { TicketTracker } from "@/components/ticket-tracker";

export const metadata: Metadata = { title: "記低輪候時間 | Sushiro HK" };

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}) {
  const { storeId } = await searchParams;
  return <TicketTracker initialStoreId={storeId && /^\d+$/.test(storeId) ? storeId : ""} />;
}
