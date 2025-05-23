import React from 'react';

interface PlaceholderSectionProps {
    title: string;
    description: string;
}

export default function PlaceholderSection({ title, description }: PlaceholderSectionProps) {
    return (
        <section className="rounded-md border bg-background shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4">{title}</h2>
            <div className="text-muted-foreground text-sm">{description}</div>
        </section>
    );
}
