import React from "react";

interface NavItem {
    title: string;
    url: string;
    icon: React.ElementType;
    isActive?: boolean;
}

interface PharmacyNavMainProps {
    items: NavItem[];
}

export const PharmacyNavMain = ({ items }: PharmacyNavMainProps) => {
    return (
        <nav
            aria-label="Primary Navigation"
            className="flex flex-col gap-2 px-3 py-2 bg-white dark:bg-gray-900 rounded-xl shadow-md"
        >
            {items.map(({ title, url, icon: Icon, isActive }) => (
                <a
                    key={url}
                    href={url}
                    aria-current={isActive ? "page" : undefined}
                    className={`
                        group flex items-center gap-3 rounded-lg px-4 py-2 text-base font-medium transition
                        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                        ${isActive
                            ? "bg-red-600 text-white font-semibold shadow border-l-4 border-red-500"
                            : "text-gray-800 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-800 hover:text-red-700 dark:hover:text-red-200"
                        }
                    `}
                    tabIndex={0}
                >
                    <span
                        className={`
                            flex items-center justify-center w-6 h-6 rounded transition-colors
                            ${isActive
                                ? "bg-red-500 text-white"
                                : "bg-gray-100 dark:bg-gray-800 text-red-500 group-hover:bg-red-100 dark:group-hover:bg-gray-700 group-hover:text-red-600 dark:group-hover:text-red-300"
                            }
                        `}
                    >
                        <Icon
                            className="w-5 h-5"
                            aria-hidden="true"
                        />
                    </span>
                    <span className="truncate">{title}</span>
                </a>
            ))}
        </nav>
    );
};
