import { CheckCircle, Ban } from "lucide-react";

interface StatusBadgeProps {
    status: "active" | "inactive";
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const isActive = status === "active";
    const styles = isActive
        ? "bg-red-100 text-red-700 border border-red-200"
        : "bg-gray-100 text-gray-500 border border-gray-200";

    return (
        <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 ${styles}`}
            title={isActive ? "Active" : "Inactive"}
        >
            {isActive ? (
                <CheckCircle className="w-4 h-4 text-red-500 mr-1" aria-hidden="true" />
            ) : (
                <Ban className="w-4 h-4 text-gray-400 mr-1" aria-hidden="true" />
            )}
            <span className="capitalize">{status}</span>
        </span>
    );
};

export default StatusBadge;
