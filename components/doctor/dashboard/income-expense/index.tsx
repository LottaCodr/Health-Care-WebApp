import React from 'react';
import { MdAttachMoney } from 'react-icons/md';
import StatCard from './stat-card';

export default function IncomeExpenseSection() {
    return (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
                type="income"
                icon={<MdAttachMoney className="text-xl text-foreground" />}
                label="Monthly Income"
                count={580000}
                comparison="↑ 12% from last month"
            />
            <StatCard
                type="expenses"
                icon={<MdAttachMoney className="text-xl text-foreground" />}
                label="Monthly Expenses"
                count={430000}
                comparison="↓ 5% from last month"
            />
        </section>
    );
}
