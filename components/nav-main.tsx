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
                flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
                ${isActive
                            ? "bg-blue-600 text-white font-semibold shadow-lg border-l-4 border-blue-400"
                            : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
                        }
              `}
                >
                    <Icon
                        className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-white" : "text-gray-500 group-hover:text-blue-600"
                            }`}
                        aria-hidden="true"
                    />
                    {title}
                </a>
            ))}
        </nav>
    );
};
