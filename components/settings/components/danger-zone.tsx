import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

export default function DangerZone() {
    return (
        <Card className="shadow-sm border border-red-200 rounded-2xl bg-red-50">
            <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-2 text-xl font-semibold text-red-600">
                    <Trash2 className="w-5 h-5" />
                    <span>Danger Zone</span>
                </div>

                <p className="text-sm text-red-700">
                    Deleting your account is irreversible. All your data will be permanently removed.
                </p>

                <Button variant="destructive" className="w-fit">
                    Delete My Account
                </Button>
            </CardContent>
        </Card>
    );
}
