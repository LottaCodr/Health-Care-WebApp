import React from "react";

interface NavItem {
    title: string;
    url: string;
    icon: React.ElementType;
    isActive?: boolean;
}

interface NurseNavSecondaryProps {
    items: NavItem[];
    className?: string;
}

export function NurseNavSecondary({ items, className }: NurseNavSecondaryProps) {
    return (
        <nav aria-label="Secondary Navigation" className={`flex flex-col gap-1 px-2 ${className}`}>
            {items.map(({ title, url, icon: Icon, isActive }) => (
                <a
                    key={url}
                    href={url}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
            ${isActive
                            ? "bg-sidebar-primary-hover text-sidebar-primary-foreground"
                            : "text-sidebar-secondary-foreground hover:bg-sidebar-primary-hover hover:text-sidebar-primary-foreground"
                        }
          `}
                    aria-current={isActive ? "page" : undefined}
                >
                    <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    {title}
                </a>
            ))}
        </nav>
    );
}
