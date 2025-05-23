import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

export default function SecuritySettings() {
    return (
        <Card className="shadow-sm border border-gray-200 rounded-2xl">
            <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                    <Lock className="w-5 h-5 text-yellow-500" />
                    <span>Security</span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input id="currentPassword" type="password" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input id="newPassword" type="password" />
                    </div>
                </div>

                <div className="pt-4">
                    <Button className="bg-yellow-500 hover:bg-yellow-600 text-white transition-colors duration-200">
                        Change Password
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
