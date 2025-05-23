import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartCardProps {
    title: string;
    children: React.ReactNode;
}

export default function ChartCard({ title, children }: ChartCardProps) {
    return (
        <Card className="rounded-xl shadow-sm border border-gray-200">
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}
