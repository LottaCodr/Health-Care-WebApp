interface StatusBadgeProps {
    status: "Active" | "Inactive";
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const styles =
        status === "Active"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800";

    return (
        <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${styles}`}
        >
            {status}
        </span>
    );
};

export default StatusBadge;
  