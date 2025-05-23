"use client";
import dynamic from "next/dynamic";
const Bar = dynamic(() => import("react-chartjs-2").then(mod => mod.Bar), { ssr: false });

export default function BarChart() {
    return (
        <Bar
            data={{
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                datasets: [
                    {
                        label: "Conversions",
                        data: [900, 1200, 1000, 1400, 1300, 1600],
                        backgroundColor: "#10b981",
                        borderRadius: 6,
                    },
                ],
            }}
            options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { ticks: { color: "#4b5563" } },
                    x: { ticks: { color: "#4b5563" } },
                },
            }}
        />
    );
}
