import { Skeleton } from "@/components/ui/skeleton";

export default function StatCardSkeleton() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-md" />
        </div>
    );
}