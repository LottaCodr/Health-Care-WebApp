"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Shield,
    AlertTriangle,
    CheckCircle,
    Clock,
    Search,
    Download,
    Filter,
    Eye,
    EyeOff,
    RefreshCw
} from "lucide-react";
import { authService } from "@/lib/auth-service";

interface SecurityEvent {
    timestamp: string;
    event: string;
    details: any;
    userAgent?: string;
    ip?: string;
}

interface AuditLogEntry {
    id: string;
    timestamp: string;
    event: string;
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    details: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export default function SecurityAudit() {
    const [events, setEvents] = useState<AuditLogEntry[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
    const [selectedEvent, setSelectedEvent] = useState<string>("all");
    const [showDetails, setShowDetails] = useState<Set<string>>(new Set());

    // Mock security events - in production, fetch from your logging service
    const mockEvents: AuditLogEntry[] = [
        {
            id: "1",
            timestamp: new Date().toISOString(),
            event: "LOGIN_SUCCESS",
            userId: "user123",
            email: "doctor@hospital.com",
            ip: "192.168.1.100",
            userAgent: "Mozilla/5.0...",
            details: { role: "doctor", sessionId: "sess_123" },
            severity: "low"
        },
        {
            id: "2",
            timestamp: new Date(Date.now() - 300000).toISOString(),
            event: "LOGIN_FAILED",
            userId: "user456",
            email: "nurse@hospital.com",
            ip: "192.168.1.101",
            userAgent: "Mozilla/5.0...",
            details: { failedAttempts: 3, reason: "Invalid password" },
            severity: "medium"
        },
        {
            id: "3",
            timestamp: new Date(Date.now() - 600000).toISOString(),
            event: "ACCOUNT_LOCKED",
            userId: "user789",
            email: "admin@hospital.com",
            ip: "192.168.1.102",
            userAgent: "Mozilla/5.0...",
            details: { failedAttempts: 5, lockoutDuration: "15 minutes" },
            severity: "high"
        },
        {
            id: "4",
            timestamp: new Date(Date.now() - 900000).toISOString(),
            event: "PASSWORD_CHANGED",
            userId: "user123",
            email: "doctor@hospital.com",
            ip: "192.168.1.100",
            userAgent: "Mozilla/5.0...",
            details: { changedAt: new Date().toISOString() },
            severity: "low"
        },
        {
            id: "5",
            timestamp: new Date(Date.now() - 1200000).toISOString(),
            event: "SESSION_EXPIRED",
            userId: "user456",
            email: "nurse@hospital.com",
            ip: "192.168.1.101",
            userAgent: "Mozilla/5.0...",
            details: { sessionId: "sess_456", duration: "8 hours" },
            severity: "low"
        }
    ];

    useEffect(() => {
        setEvents(mockEvents);
        setFilteredEvents(mockEvents);
    }, []);

    useEffect(() => {
        filterEvents();
    }, [events, searchTerm, selectedSeverity, selectedEvent]);

    const filterEvents = () => {
        let filtered = events;

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(event =>
                event.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.userId?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by severity
        if (selectedSeverity !== "all") {
            filtered = filtered.filter(event => event.severity === selectedSeverity);
        }

        // Filter by event type
        if (selectedEvent !== "all") {
            filtered = filtered.filter(event => event.event === selectedEvent);
        }

        setFilteredEvents(filtered);
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "critical": return "bg-red-100 text-red-800 border-red-200";
            case "high": return "bg-orange-100 text-orange-800 border-orange-200";
            case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "low": return "bg-green-100 text-green-800 border-green-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getEventIcon = (event: string) => {
        switch (event) {
            case "LOGIN_SUCCESS": return <CheckCircle className="w-4 h-4 text-green-600" />;
            case "LOGIN_FAILED": return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
            case "ACCOUNT_LOCKED": return <AlertTriangle className="w-4 h-4 text-red-600" />;
            case "PASSWORD_CHANGED": return <Shield className="w-4 h-4 text-blue-600" />;
            case "SESSION_EXPIRED": return <Clock className="w-4 h-4 text-gray-600" />;
            default: return <Shield className="w-4 h-4 text-gray-600" />;
        }
    };

    const toggleDetails = (eventId: string) => {
        const newShowDetails = new Set(showDetails);
        if (newShowDetails.has(eventId)) {
            newShowDetails.delete(eventId);
        } else {
            newShowDetails.add(eventId);
        }
        setShowDetails(newShowDetails);
    };

    const exportAuditLog = () => {
        const csvContent = [
            "Timestamp,Event,User ID,Email,IP,Severity,Details",
            ...filteredEvents.map(event =>
                `"${event.timestamp}","${event.event}","${event.userId || ''}","${event.email || ''}","${event.ip || ''}","${event.severity}","${JSON.stringify(event.details)}"`
            ).join('\n')
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-audit-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const refreshData = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
        }, 1000);
    };

    const getEventTypes = () => {
        const types = new Set(events.map(event => event.event));
        return Array.from(types);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Security Audit Log</h1>
                    <p className="text-gray-600">Monitor security events and user activities</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={refreshData} disabled={loading} variant="outline">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={exportAuditLog} variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Events</p>
                                <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                            </div>
                            <Shield className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">High Severity</p>
                                <p className="text-2xl font-bold text-orange-600">
                                    {events.filter(e => e.severity === 'high' || e.severity === 'critical').length}
                                </p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-orange-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                                <p className="text-2xl font-bold text-green-600">{authService.getActiveSessionsCount()}</p>
                            </div>
                            <Clock className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Today's Events</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {events.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString()).length}
                                </p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search by email, user ID, or event..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={selectedSeverity}
                                onChange={(e) => setSelectedSeverity(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Severities</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                            <select
                                value={selectedEvent}
                                onChange={(e) => setSelectedEvent(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Events</option>
                                {getEventTypes().map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Events Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Security Events</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredEvents.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No events found matching your criteria.
                            </div>
                        ) : (
                            filteredEvents.map((event) => (
                                <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {getEventIcon(event.event)}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{event.event}</span>
                                                    <Badge className={getSeverityColor(event.severity)}>
                                                        {event.severity}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    {fmtFull(event.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">
                                                {event.email || event.userId || 'Unknown User'}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleDetails(event.id)}
                                            >
                                                {showDetails.has(event.id) ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {showDetails.has(event.id) && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p><strong>User ID:</strong> {event.userId || 'N/A'}</p>
                                                    <p><strong>Email:</strong> {event.email || 'N/A'}</p>
                                                    <p><strong>IP Address:</strong> {event.ip || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p><strong>User Agent:</strong> {event.userAgent || 'N/A'}</p>
                                                    <p><strong>Details:</strong></p>
                                                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                                                        {JSON.stringify(event.details, null, 2)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 