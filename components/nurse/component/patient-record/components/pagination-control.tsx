import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface Props {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function PaginationControls({ currentPage, totalPages, onPageChange }: Props) {
    return (
        <Pagination className="pt-2">
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious onClick={() => onPageChange(Math.max(1, currentPage - 1))} />
                </PaginationItem>
                <PaginationItem>
                    <span className="text-sm px-3">Page {currentPage} of {totalPages}</span>
                </PaginationItem>
                <PaginationItem>
                    <PaginationNext onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}
