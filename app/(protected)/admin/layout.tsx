import { PremiumLayout } from "@/components/layout/PremiumLayout";
import { UserRole } from "@/types/models";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PremiumLayout requiredRole={UserRole.Admin}>
            {children}
        </PremiumLayout>
    );
}
