"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RadiologyRequestsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Radiology requests</h1>
      <p className="text-sm text-gray-500 mt-2">
        Imaging requests from clinicians can be listed here. The dashboard shows pending work.
      </p>
      <Button asChild className="mt-6 rounded-xl">
        <Link href="/radiology/dashboard">Open radiology dashboard</Link>
      </Button>
    </div>
  );
}
