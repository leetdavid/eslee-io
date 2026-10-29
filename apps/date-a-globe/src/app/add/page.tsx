import type { Metadata } from "next";
import { AddFlow } from "@/components/add/add-flow";

export const metadata: Metadata = { title: "Add an event" };

export default function AddPage() {
  return <AddFlow />;
}
