import React from "react";

interface NavItem {
    title: string;
    url: string;
    icon: React.ElementType;
    isActive?: boolean;
}

interface NurseNavMainProps {
    items: NavItem[];
}

export const NurseNavMain = ({ items }: NurseNavMainProps) => {
    return (
        <nav
            aria-label="Primary Navigation"
            className="flex flex-col gap-2 px-3 py-2 bg-white rounded-xl shadow-md"
        >
            {items.map(({ title, url, icon: Icon, isActive }) => (
                <a
                    key={url}
                    href={url}
                    aria-current={isActive ? "page" : undefined}
                    className={`
                        group flex items-center gap-4 rounded-lg px-4 py-3 text-base font-medium transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-red-400
                        ${
                            isActive
                                ? "bg-red-600 text-white font-semibold shadow border-l-4 border-red-400"
                                : "text-gray-700 hover:bg-red-50 hover:text-red-700 hover:shadow"
                        }
                    `}
                    tabIndex={0}
                >
                    <span
                        className={`
                            flex items-center justify-center w-6 h-6 rounded transition-colors
                            ${
                                isActive
                                    ? "bg-red-500 text-white"
                                    : "bg-gray-100 text-red-400 group-hover:bg-red-100 group-hover:text-red-600"
                            }
                        `}
                    >
                        <Icon
                            className="w-5 h-5"
                            aria-hidden="true"
                        />
                    </span>
                    <span className="truncate">{title}</span>
                    {isActive && (
                        <span className="ml-auto inline-block w-2 h-2 rounded-full bg-white border-2 border-red-500" aria-hidden="true"></span>
                    )}
                </a>
            ))}
        </nav>
    );
};
