import React from "react";
import { usePathname } from "next/navigation";

interface NavItem {
    title: string;
    url: string;
    icon: React.ElementType;
    isActive?: boolean;
    badge?: number | (() => number);
    description?: string;
}

interface FrontDeskNavMainProps {
    items: NavItem[];
}

export const FrontDeskNavMain = ({ items }: FrontDeskNavMainProps) => {
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    return (
        <nav
            aria-label="Primary Navigation"
            className="flex flex-col gap-1 px-2 py-2 bg-gradient-to-b from-white via-gray-50 to-gray-100 rounded-xl shadow-sm"
        >
            {items.map(({ title, url, icon: Icon, isActive, badge, description }) => {
                // Fallback to pathname match if isActive is not provided
                const active = typeof isActive === "boolean" ? isActive : pathname === url;
                const badgeValue = typeof badge === "function" ? badge() : badge;
                return (
                    <a
                        key={url}
                        href={url}
                        aria-current={active ? "page" : undefined}
                        title={description || title}
                        tabIndex={0}
                        className={`
                            group flex items-center gap-3 rounded-lg px-4 py-2 text-base font-medium transition
                            focus:outline-none focus:ring-2 focus:ring-red-400/60
                            ${active
                                ? "bg-gradient-to-r from-red-600 via-red-500 to-red-400 text-white font-semibold shadow-lg border-l-4 border-red-400"
                                : "text-gray-800 hover:bg-red-50 hover:text-red-700 hover:shadow-md"}
                        `}
                    >
                        <span
                            className={`
                                flex items-center justify-center w-9 h-9 rounded-md transition-colors
                                ${active
                                    ? "bg-white/20 text-white shadow"
                                    : "bg-gray-100 group-hover:bg-red-100 text-red-500 group-hover:text-red-700"}
                            `}
                        >
                            <Icon
                                className={`w-5 h-5 flex-shrink-0 transition-colors`}
                                aria-hidden="true"
                            />
                        </span>
                        <span className="flex-1 truncate">{title}</span>
                        {typeof badgeValue === "number" && badgeValue > 0 && (
                            <span
                                className={`
                                    ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold
                                    ${active
                                        ? "bg-white/80 text-red-600"
                                        : "bg-red-100 text-red-700 group-hover:bg-red-200"}
                                `}
                                aria-label={`${badgeValue} new`}
                            >
                                {badgeValue}
                            </span>
                        )}
                    </a>
                );
            })}
        </nav>
    );
};
