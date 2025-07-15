import React from "react";

interface NavItem {
    title: string;
    url: string;
    icon: React.ElementType;
    isActive?: boolean;
}

interface NavMainProps {
    items: NavItem[];
}

export const NavMain = ({ items }: NavMainProps) => {
    return (
        <nav aria-label="Primary Navigation" className="flex flex-col gap-1 px-2">
            {items.map(({ title, url, icon: Icon, isActive }) => (
                <a
                    key={url}
                    href={url}
                    aria-current={isActive ? "page" : undefined}
                    className={`
                        group flex items-center gap-3 rounded-lg px-4 py-2 text-[15px] font-medium transition-all
                        ${isActive
                            ? "bg-red-600 text-white font-semibold shadow-lg border-l-4 border-red-400"
                            : "text-gray-700 dark:text-gray-200 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700"
                        }
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1
                        relative
                    `}
                    tabIndex={0}
                >
                    <span
                        className={`
                            flex items-center justify-center w-6 h-6 rounded-md transition-colors
                            ${isActive
                                ? "bg-red-700 text-white"
                                : "bg-red-100 text-red-500 group-hover:bg-red-200 group-hover:text-red-700"
                            }
                        `}
                        aria-hidden="true"
                    >
                        <Icon className="w-5 h-5" />
                    </span>
                    <span className="truncate">{title}</span>
                    {isActive && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-400 shadow-md" aria-hidden="true"></span>
                    )}
                </a>
            ))}
        </nav>
    );
};
