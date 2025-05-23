"use client"

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function VisitorsWalkinsComponent() {
    const [visitor, setVisitor] = useState({
        name: "",
        reason: "",
        phone: "",
        staffToSee: "",
        notes: "",
    });

    type Visitor = {
        name: string;
        reason: string;
        phone: string;
        staffToSee: string;
        notes: string;
        time?: string;
    };

    const [visitorLog, setVisitorLog] = useState<Visitor[]>([]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setVisitor({ ...visitor, [name]: value });
    };

    const handleAddVisitor = () => {
        if (visitor.name && visitor.reason && visitor.staffToSee) {
            setVisitorLog([...visitorLog, { ...visitor, time: new Date().toLocaleString() }]);
            setVisitor({ name: "", reason: "", phone: "", staffToSee: "", notes: "" });
        } else {
            alert("Please fill required fields (name, reason, staff to see)");
        }
    };

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-semibold">Visitors & Walk-ins</h2>
            <Tabs defaultValue="newVisitor">
                <TabsList>
                    <TabsTrigger value="newVisitor">New Visitor</TabsTrigger>
                    <TabsTrigger value="log">Visitor Log</TabsTrigger>
                </TabsList>

                <TabsContent value="newVisitor">
                    <Card className="max-w-xl">
                        <CardContent className="space-y-4 pt-6">
                            <div>
                                <Label htmlFor="name">Full Name *</Label>
                                <Input name="name" value={visitor.name} onChange={handleInputChange} />
                            </div>
                            <div>
                                <Label htmlFor="reason">Reason for Visit *</Label>
                                <Input name="reason" value={visitor.reason} onChange={handleInputChange} />
                            </div>
                            <div>
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input name="phone" value={visitor.phone} onChange={handleInputChange} />
                            </div>
                            <div>
                                <Label htmlFor="staffToSee">Staff to See *</Label>
                                <Input name="staffToSee" value={visitor.staffToSee} onChange={handleInputChange} />
                            </div>
                            <div>
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea name="notes" value={visitor.notes} onChange={handleInputChange} />
                            </div>
                            <Button onClick={handleAddVisitor} className="w-full">
                                Add Visitor
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="log">
                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            {visitorLog.length === 0 ? (
                                <p>No visitors logged yet.</p>
                            ) : (
                                visitorLog.map((v, idx) => (
                                    <div key={idx} className="border-b pb-2 mb-2">
                                        <p className="font-medium">{v.name}</p>
                                        <p className="text-sm text-gray-500">Reason: {v.reason}</p>
                                        <p className="text-sm text-gray-500">Phone: {v.phone || "-"}</p>
                                        <p className="text-sm text-gray-500">Staff: {v.staffToSee}</p>
                                        <p className="text-sm text-gray-500">Time: {v.time}</p>
                                        {v.notes && <p className="text-sm text-gray-400">Notes: {v.notes}</p>}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
