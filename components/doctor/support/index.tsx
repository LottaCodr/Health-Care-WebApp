"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, HelpCircle } from "lucide-react";

const faqList = [
    {
        question: "How do I reset my password?",
        answer:
            "Click on 'Forgot password' on the login page and follow the email instructions.",
    },
    {
        question: "How can I contact customer support?",
        answer:
            "You can fill out the contact form below or reach out to us via email or phone.",
    },
    {
        question: "Where can I view my billing information?",
        answer:
            "Navigate to the billing section under your account settings to view invoices and payment methods.",
    },
];

export default function SupportComponent() {
    return (
        <div className="max-w-5xl mx-6 p-6 space-y-12">
            {/* Header */}
            <section className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-gray-800">Support Center</h1>
                <p className="text-gray-500 text-sm">
                    We're here to help. Browse FAQs or contact our support team directly.
                </p>
            </section>

            {/* Contact Info */}
            <section className="grid md:grid-cols-3 gap-6">
                <Card className="text-center">
                    <CardContent className="p-6 space-y-2">
                        <Mail className="mx-auto text-blue-600" />
                        <h3 className="font-semibold text-lg">Email Support</h3>
                        <p className="text-sm text-gray-600">support@example.com</p>
                    </CardContent>
                </Card>
                <Card className="text-center">
                    <CardContent className="p-6 space-y-2">
                        <Phone className="mx-auto text-green-600" />
                        <h3 className="font-semibold text-lg">Phone Support</h3>
                        <p className="text-sm text-gray-600">+1 (234) 567-8901</p>
                    </CardContent>
                </Card>
                <Card className="text-center">
                    <CardContent className="p-6 space-y-2">
                        <HelpCircle className="mx-auto text-purple-600" />
                        <h3 className="font-semibold text-lg">Knowledge Base</h3>
                        <p className="text-sm text-gray-600">Explore guides and articles.</p>
                    </CardContent>
                </Card>
            </section>

            {/* FAQ Section */}
            <section>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {faqList.map((faq, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                            <h4 className="font-medium text-gray-800">{faq.question}</h4>
                            <p className="text-sm text-gray-600 mt-1">{faq.answer}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Contact Form */}
            <section>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Contact Support</h2>
                <Card>
                    <CardContent className="p-6 space-y-4">
                        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                            <Input placeholder="Your Name" required />
                            <Input placeholder="Your Email" type="email" required />
                            <Textarea placeholder="How can we help you?" rows={5} required />
                            <Button type="submit" className="w-full">
                                Submit Request
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
