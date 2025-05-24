import { Input } from '@/components/ui/input';

interface Props {
    searchQuery: string;
    setSearchQuery: (value: string) => void;
}

export default function SearchAndFilter({ searchQuery, setSearchQuery }: Props) {
    return (
        <div className="flex justify-between items-center gap-4">
            <Input
                placeholder="Search patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-1/2"
            />
        </div>
    );
}
