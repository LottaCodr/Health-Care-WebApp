"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RadiologyReportsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Radiology reports</h1>
      <p className="text-sm text-gray-500 mt-2">
        Full report listing can live here. Use the dashboard to complete pending studies.
      </p>
      <Button asChild className="mt-6 rounded-xl">
        <Link href="/radiology/dashboard">Open radiology dashboard</Link>
      </Button>
    </div>
  );
}
