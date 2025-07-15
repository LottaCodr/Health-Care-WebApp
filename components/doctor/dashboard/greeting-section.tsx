"use client";
import { useAuth } from "@/context/auth-provider";
import { FaStethoscope } from "react-icons/fa";

export default function GreetingSection() {
    const { user } = useAuth();

    return (
        <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-md p-6 flex items-center gap-6 mb-6 border-l-8 border-red-600">
            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                <FaStethoscope className="text-red-600 text-3xl" />
            </div>
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-red-700 flex items-center gap-2">
                    Welcome back,{" "}
                    <span className="capitalize">
                        Dr. {user?.full_name || "Doctor"}
                    </span>
                    <span className="text-2xl">👋</span>
                </h1>
                <p className="text-zinc-600 dark:text-zinc-300 text-base mt-2">
                    Here’s your hospital dashboard. Stay updated on your appointments and activity.
                </p>
            </div>
        </section>
    );
}
