import React, { ReactElement } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";

interface StatCardProps {
  type: 'admitted' | 'staff' | 'discharged' | 'waiting';
  icon: React.ReactNode;
  label: string;
  count: number;
  comparison?: string;
}

const StatCard = ({ type, icon, label, count = 0, comparison }: StatCardProps) => {
  return (
    <Card
      className="rounded-2xl bg-white border-grey-300 p-6 transition-transform duration-300 hover:scale-[1.02] border hover:border-primary flex flex-col justify-between gap-4"
      role="region"
      aria-label={label}
    >
      <CardHeader className="p-0 mb-2 flex text-primary flex-row items-center gap-4">
        {icon}
        <CardTitle className="text-black text-sm font-medium uppercase tracking-wide opacity-90 m-0">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex flex-col gap-2">
        <h2
          className="text-black text-5xl font-extrabold tracking-tight leading-snug"
          aria-live="polite"
        >
          {count.toLocaleString()}
          {comparison && (
            <CardDescription className="text-black text-sm font-light opacity-80 tracking-wide mt-2">
              {comparison}
            </CardDescription>
          )}
        </h2>
      </CardContent>
    </Card>
  );
};

export default StatCard;
