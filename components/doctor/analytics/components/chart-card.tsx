import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartCardProps {
    title: string;
    children: React.ReactNode;
}

export default function ChartCard({ title, children }: ChartCardProps) {
    return (
        <Card className="rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-gray-100">{title}</CardTitle>
            </CardHeader>
            <CardContent className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">{children}</CardContent>
        </Card>
    );
}
