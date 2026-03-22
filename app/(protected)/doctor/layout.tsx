import { PremiumLayout } from "@/components/layout/PremiumLayout";

export default function DashboardLayout({ children }: { children?: React.ReactNode }) {
    return (
        <PremiumLayout>
            {children}
        </PremiumLayout>
    );
}
