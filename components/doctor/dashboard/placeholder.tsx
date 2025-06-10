import { MdInfoOutline } from "react-icons/md";

interface PlaceholderSectionProps {
    title: string;
    description: string;
    children?: React.ReactNode;
}

export default function PlaceholderSection({ title, description, children }: PlaceholderSectionProps) {
    return (
        <section
            className="rounded-2xl border border-border bg-muted/40 p-6 shadow-sm flex flex-col gap-4"
            aria-label={`${title} section`}
        >
            <div className="flex items-center gap-3">
                <MdInfoOutline className="text-muted-foreground text-xl" />
                <div>
                    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>
            {children && <div className="pt-2">{children}</div>}
        </section>
    );
}
