'use client';
import React from 'react';
import { MdSearch } from 'react-icons/md';

interface SearchInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChange,
    placeholder = 'Search patients...',
}) => (
    <div className="relative w-full max-w-md">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-red-500">
            <MdSearch className="w-5 h-5" aria-hidden="true" />
        </span>
        <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            aria-label="Search patients"
            className={`
                w-full pl-11 pr-4 py-2 rounded-lg border border-red-300
                bg-white dark:bg-muted/30
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
                transition
                shadow-sm
                hover:border-red-400
            `}
            autoComplete="off"
            spellCheck={false}
        />
    </div>
);

export default SearchInput;