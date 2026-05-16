"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
          <ShieldAlert className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Unauthorized</h1>
        <p className="mt-2 text-sm text-slate-500">
          You do not have permission to access this page.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/login">Go to Login</Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
