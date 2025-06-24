export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
    const sizes = {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-10 w-10",
    };

    return (
        <div className={`animate-spin rounded-full border-4 border-gray-300 border-t-primary ${sizes[size]}`} />
    );
}
