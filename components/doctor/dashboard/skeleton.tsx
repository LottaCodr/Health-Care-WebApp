import { Skeleton } from "@/components/ui/skeleton";

export default function StatCardSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 space-y-2">
            <Skeleton className="h-16 w-full rounded-md" />
        </div>
    );
}