"use client";
import dynamic from "next/dynamic";
const Pie = dynamic(() => import("react-chartjs-2").then(mod => mod.Pie), { ssr: false });

export default function PieChart() {
    return (
        <Pie
            data={{
                labels: ["North America", "Europe", "Asia", "Other"],
                datasets: [
                    {
                        label: "Users",
                        data: [45, 30, 15, 10],
                        backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#e11d48"],
                    },
                ],
            }}
            options={{
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: "#4b5563" },
                    },
                },
            }}
        />
    );
}
