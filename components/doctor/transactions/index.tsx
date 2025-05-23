"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface Transaction {
    id: string;
    amount: number;
    currency: string;
    date: string; // ISO string
    status: "Success" | "Pending" | "Failed";
    description: string;
    payer: string;
    payee: string;
}

const STATUS_COLORS = {
    Success: "text-green-600 bg-green-100",
    Pending: "text-yellow-600 bg-yellow-100",
    Failed: "text-red-600 bg-red-100",
};

const Spinner = () => (
    <div className="flex justify-center items-center h-40" role="status" aria-live="polite" aria-busy="true">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="sr-only">Loading transactions...</span>
    </div>
);

const SearchInput = ({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) => (
    <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-gray-300 rounded px-3 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={placeholder}
    />
);

const Select = ({
    value,
    onChange,
    options,
    label,
}: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    label: string;
}) => (
    <label className="flex flex-col text-sm font-medium text-gray-700">
        {label}
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <option value="">All</option>
            {options.map((opt) => (
                <option key={opt} value={opt}>
                    {opt}
                </option>
            ))}
        </select>
    </label>
);

const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) => {
    if (totalPages <= 1) return null;

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <nav aria-label="Pagination" className="flex justify-center space-x-2 mt-4">
            {pages.map((page) => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    aria-current={page === currentPage ? "page" : undefined}
                    className={`px-3 py-1 rounded ${page === currentPage ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                    {page}
                </button>
            ))}
        </nav>
    );
};

const TransactionsTable = ({
    transactions,
}: {
    transactions: Transaction[];
}) => (
    <div className="overflow-x-auto bg-white shadow rounded-md">
        <table className="min-w-full table-auto" role="table" aria-label="Transaction data">
            <thead className="bg-gray-100">
                <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Payer</th>
                    <th className="px-4 py-2 text-left">Payee</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Description</th>
                </tr>
            </thead>
            <tbody>
                {transactions.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="text-center py-6 text-gray-500">
                            No transactions found.
                        </td>
                    </tr>
                ) : (
                    transactions.map((tx) => (
                        <tr key={tx.id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2">{format(new Date(tx.date), "yyyy-MM-dd HH:mm")}</td>
                            <td className="px-4 py-2">{tx.payer}</td>
                            <td className="px-4 py-2">{tx.payee}</td>
                            <td className="px-4 py-2">{`${tx.currency} ${tx.amount.toFixed(2)}`}</td>
                            <td className={`px-4 py-2 font-semibold rounded ${STATUS_COLORS[tx.status]}`}>
                                {tx.status}
                            </td>
                            <td className="px-4 py-2">{tx.description}</td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    </div>
);

const TransactionComponent = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const transactionsPerPage = 10;

    useEffect(() => {
        // Simulate fetching data with delay & error handling
        const fetchTransactions = () => {
            setLoading(true);
            setError(null);

            setTimeout(() => {
                try {
                    // Here, replace with real API fetch
                    const dummyData: Transaction[] = Array.from({ length: 45 }, (_, i) => ({
                        id: (i + 1).toString(),
                        amount: Math.random() * 1000,
                        currency: "USD",
                        date: new Date(Date.now() - i * 86400000).toISOString(),
                        status: ["Success", "Pending", "Failed"][i % 3] as Transaction["status"],
                        description: `Transaction #${i + 1}`,
                        payer: `Payer ${i % 5}`,
                        payee: `Payee ${i % 3}`,
                    }));

                    setTransactions(dummyData);
                } catch (err) {
                    setError("Failed to load transactions.");
                } finally {
                    setLoading(false);
                }
            }, 1200);
        };

        fetchTransactions();
    }, []);

    // Filter logic
    const filteredTransactions = transactions.filter((tx) => {
        const searchMatch =
            tx.payer.toLowerCase().includes(search.toLowerCase()) ||
            tx.payee.toLowerCase().includes(search.toLowerCase()) ||
            tx.description.toLowerCase().includes(search.toLowerCase());

        const dateMatch = !dateFilter || tx.date.startsWith(dateFilter);
        const statusMatch = !statusFilter || tx.status === statusFilter;

        return searchMatch && dateMatch && statusMatch;
    });

    const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * transactionsPerPage,
        currentPage * transactionsPerPage
    );

    const handleExportCSV = () => {
        const headers = ["Date", "Payer", "Payee", "Amount", "Status", "Description"];
        const rows = filteredTransactions.map((tx) => [
            format(new Date(tx.date), "yyyy-MM-dd HH:mm"),
            tx.payer,
            tx.payee,
            `${tx.currency} ${tx.amount.toFixed(2)}`,
            tx.status,
            tx.description,
        ]);
        const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "transactions.csv";
        link.click();
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        autoTable(doc, {
            head: [["Date", "Payer", "Payee", "Amount", "Status", "Description"]],
            body: filteredTransactions.map((tx) => [
                format(new Date(tx.date), "yyyy-MM-dd HH:mm"),
                tx.payer,
                tx.payee,
                `${tx.currency} ${tx.amount.toFixed(2)}`,
                tx.status,
                tx.description,
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] },
        });
        doc.save("transactions.pdf");
    };

    // Reset to page 1 when filters or search change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, dateFilter, statusFilter]);

    return (
        <section className="p-6 max-w-7xl mx-6">
            <header className="mb-6">
                <h1 className="text-3xl font-semibold text-gray-900">Transactions</h1>
                <p className="text-gray-600 mt-1">Manage and review your transaction history.</p>
            </header>

            <div className="flex flex-wrap gap-4 mb-6 items-end">
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search payer, payee or description..."
                />
                <div>
                    <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
                        Filter by Date
                    </label>
                    <input
                        type="date"
                        id="date-filter"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={["Success", "Pending", "Failed"]}
                    label="Filter by Status"
                />

                <div className="ml-auto flex gap-2">
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Export CSV
                    </button>
                    <button
                        type="button"
                        onClick={handleExportPDF}
                        className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600"
                    >
                        Export PDF
                    </button>
                </div>
            </div>

            {loading ? (
                <Spinner />
            ) : error ? (
                <div
                    role="alert"
                    className="p-4 text-red-700 bg-red-100 border border-red-400 rounded"
                >
                    {error}
                </div>
            ) : (
                <>
                    <TransactionsTable transactions={paginatedTransactions} />
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}
        </section>
    );
};

export default TransactionComponent;
