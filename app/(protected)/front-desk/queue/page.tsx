"use client";

import dynamic from "next/dynamic";

const QueueSuite = dynamic(() => import("@/components/front-desk/QueueSuite"), {
  loading: () => (
    <div className="animate-pulse space-y-4 rounded-2xl border border-gray-100 bg-white p-6 min-h-[240px]" />
  ),
});
import { Button } from "@/components/ui/button";
import { ArrowLeft, ListOrdered } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QueuePage() {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Button onClick={() => router.back()} variant="ghost" className="gap-2 rounded-xl px-3">
          <ArrowLeft size={18} />
        </Button>
        <span className="flex items-center gap-2 text-blue-800 font-bold text-2xl">
          <ListOrdered size={24} /> Triage & Queue
        </span>
      </div>

      <QueueSuite />
    </div>
  );
}