import React from 'react';
import { MdAttachMoney } from 'react-icons/md';
import StatCard from './stat-card';

export default function IncomeExpenseSection() {
    return (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-white rounded-xl shadow-lg">
            <StatCard
                type="income"
                icon={
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                        <MdAttachMoney className="text-3xl text-red-600" />
                    </span>
                }
                label="Monthly Income"
                count={580000}
                // countClassName="text-3xl font-bold text-red-600"
                comparison={"↑ 12% from last month"}
                bgClassName="bg-red-50"
            />
            <StatCard
                type="expenses"
                icon={
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                        <MdAttachMoney className="text-3xl text-red-600" />
                    </span>
                }
                label="Monthly Expenses"
                count={430000}
                // countClassName="text-3xl font-bold text-red-600"
                comparison={"↓ 5% from last month"}
                bgClassName="bg-red-50"
            />
        </section>
    );
}
