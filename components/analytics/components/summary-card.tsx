import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import React from "react";

interface SummaryCardProps {
    icon: React.ReactNode;
    title: string;
    value: string;
    change: string;
    trend: "up" | "down";
}

export default function SummaryCard({ icon, title, value, change, trend }: SummaryCardProps) {
    return (
        <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                    {icon}
                    {title}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
                <div className={`flex items-center text-sm font-medium ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
                    {trend === "up" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span className="ml-1">{change}</span>
                </div>
            </CardContent>
        </Card>
    );
}
