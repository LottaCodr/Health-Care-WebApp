import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";

export default function AccountSettings() {
    return (
        <Card className="shadow-sm border border-gray-200 rounded-2xl">
            <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                    <User className="w-5 h-5 text-indigo-500" />
                    <span>Account Information</span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" placeholder="John Doe" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" placeholder="john@example.com" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" placeholder="johnnyD" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" type="tel" placeholder="+1234567890" />
                    </div>
                </div>

                <div className="pt-4">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-200">
                        Update Profile
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
