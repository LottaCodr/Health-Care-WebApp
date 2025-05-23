"use client";
import dynamic from "next/dynamic";
const Line = dynamic(() => import("react-chartjs-2").then(mod => mod.Line), { ssr: false });

export default function LineChart() {
    return (
        <Line
            data={{
                labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                datasets: [
                    {
                        label: "Visitors",
                        data: [3800, 4100, 3900, 4400, 4600, 4800, 5000],
                        borderColor: "#3b82f6",
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        fill: true,
                        tension: 0.4,
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
