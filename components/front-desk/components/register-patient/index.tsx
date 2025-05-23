"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function RegisterPatientComponent() {
    const { toast } = useToast();

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        gender: "",
        dob: "",
        phone: "",
        email: "",
        address: "",
        nextOfKin: "",
        kinPhone: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleGenderChange = (value: string) => {
        setForm({ ...form, gender: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // You would add validation + backend call here
        toast({
            title: "Patient Registered",
            description: `${form.firstName} ${form.lastName} has been registered.`,
        });
        setForm({
            firstName: "",
            lastName: "",
            gender: "",
            dob: "",
            phone: "",
            email: "",
            address: "",
            nextOfKin: "",
            kinPhone: "",
        });
    };

    return (
        <Card className="max-w-4xl mx-6 mt-6 shadow-xl">
            <CardHeader>
                <CardTitle className="text-xl font-bold text-blue-700">Register New Patient</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} required />
                    </div>

                    <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} required />
                    </div>

                    <div>
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={form.gender} onValueChange={handleGenderChange}>
                            <SelectTrigger id="gender">
                                <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="dob">Date of Birth</Label>
                        <Input id="dob" name="dob" type="date" value={form.dob} onChange={handleChange} required />
                    </div>

                    <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} required />
                    </div>

                    <div>
                        <Label htmlFor="email">Email (optional)</Label>
                        <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
                    </div>

                    <div className="sm:col-span-2">
                        <Label htmlFor="address">Home Address</Label>
                        <Textarea id="address" name="address" value={form.address} onChange={handleChange} required />
                    </div>

                    <div>
                        <Label htmlFor="nextOfKin">Next of Kin</Label>
                        <Input id="nextOfKin" name="nextOfKin" value={form.nextOfKin} onChange={handleChange} />
                    </div>

                    <div>
                        <Label htmlFor="kinPhone">Next of Kin Phone</Label>
                        <Input id="kinPhone" name="kinPhone" type="tel" value={form.kinPhone} onChange={handleChange} />
                    </div>

                    <div className="sm:col-span-2 flex justify-end pt-4">
                        <Button type="submit" className="px-8">Register Patient</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
