/**
 * Advanced data fetching hooks with caching
 * Provides automatic caching, deduplication, and error handling
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCacheStore, useLoadingStore, useErrorStore, useNotificationStore } from "@/store/store";

interface UseDataOptions {
    cacheKey?: string;
    cacheTTL?: number; // milliseconds
    onError?: (error: Error) => void;
    onSuccess?: (data: any) => void;
    retry?: number;
    retryDelay?: number;
    deduplicate?: boolean; // Deduplicate concurrent requests
}

interface UseDataResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<T | null>;
    isRefetching: boolean;
}

// Track in-flight requests for deduplication
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Generic hook for data fetching with caching
 */
export function useData<T>(
    fetchFn: () => Promise<T>,
    options: UseDataOptions = {}
): UseDataResult<T> {
    const {
        cacheKey,
        cacheTTL = 5 * 60 * 1000,
        onError,
        onSuccess,
        retry = 1,
        retryDelay = 1000,
        deduplicate = true,
    } = options;

    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isRefetching, setIsRefetching] = useState(false);
    const mountedRef = useRef(true);

    const cache = useCacheStore();
    const loading = useLoadingStore();
    const errorStore = useErrorStore();
    const notifications = useNotificationStore();

    const loadingKey = cacheKey || `data-${Date.now()}`;

    // Check cache first
    const cachedData = cacheKey ? cache.get<T>(cacheKey) : null;

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const fetchWithRetry = useCallback(
        async (retryCount = 0): Promise<T | null> => {
            if (!mountedRef.current) return null;

            // Return cached data if available
            if (cacheKey && cache.has(cacheKey)) {
                const cached = cache.get<T>(cacheKey);
                if (mountedRef.current) {
                    setData(cached);
                    setError(null);
                }
                return cached;
            }

            // Check for in-flight request (deduplication)
            if (deduplicate && inFlightRequests.has(loadingKey)) {
                return inFlightRequests.get(loadingKey);
            }

            loading.addLoading(loadingKey);

            try {
                // Create fetch promise
                const fetchPromise = fetchFn();
                if (deduplicate) {
                    inFlightRequests.set(loadingKey, fetchPromise);
                }

                const result = await fetchPromise;

                if (!mountedRef.current) return null;

                // Cache the result
                if (cacheKey) {
                    cache.set(cacheKey, result, cacheTTL);
                }

                setData(result);
                setError(null);
                errorStore.removeError(loadingKey);
                onSuccess?.(result);

                return result;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));

                if (!mountedRef.current) return null;

                if (retryCount < retry) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
                    return fetchWithRetry(retryCount + 1);
                }

                setError(error);
                errorStore.addError(loadingKey, error.message, "FETCH_ERROR", {
                    retryCount,
                });
                onError?.(error);

                return null;
            } finally {
                if (deduplicate) {
                    inFlightRequests.delete(loadingKey);
                }
                loading.removeLoading(loadingKey);
            }
        },
        [cacheKey, cacheTTL, fetchFn, onError, onSuccess, retry, retryDelay, deduplicate, loadingKey]
    );

    useEffect(() => {
        if (cachedData) {
            setData(cachedData);
            return;
        }

        fetchWithRetry();
    }, [cacheKey]);

    const refetch = useCallback(async () => {
        setIsRefetching(true);
        try {
            if (cacheKey) {
                cache.remove(cacheKey);
            }
            const result = await fetchWithRetry();
            return result;
        } finally {
            if (mountedRef.current) {
                setIsRefetching(false);
            }
        }
    }, [cacheKey, fetchWithRetry]);

    return {
        data,
        loading: loading.isLoading(loadingKey),
        error,
        refetch,
        isRefetching,
    };
}

/**
 * Mutation hook for mutations with optimistic updates
 */
interface UseMutationOptions<T, R> {
    mutationFn: (data: T) => Promise<R>;
    onSuccess?: (data: R) => void;
    onError?: (error: Error) => void;
    onMutate?: (data: T) => void;
    invalidateKeys?: string[]; // Cache keys to invalidate on success
}

interface UseMutationResult<T, R> {
    mutate: (data: T) => Promise<R | null>;
    isPending: boolean;
    error: Error | null;
    data: R | null;
    reset: () => void;
}

export function useMutation<T, R>(
    options: UseMutationOptions<T, R>
): UseMutationResult<T, R> {
    const {
        mutationFn,
        onSuccess,
        onError,
        onMutate,
        invalidateKeys = [],
    } = options;

    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<R | null>(null);

    const cache = useCacheStore();
    const notifications = useNotificationStore();

    const mutate = useCallback(
        async (mutationData: T): Promise<R | null> => {
            setIsPending(true);
            setError(null);

            try {
                onMutate?.(mutationData);
                const result = await mutationFn(mutationData);

                // Invalidate related cache entries
                invalidateKeys.forEach((key) => {
                    cache.remove(key);
                });

                setData(result);
                onSuccess?.(result);

                return result;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                onError?.(error);
                return null;
            } finally {
                setIsPending(false);
            }
        },
        [mutationFn, onSuccess, onError, onMutate, invalidateKeys]
    );

    const reset = useCallback(() => {
        setError(null);
        setData(null);
    }, []);

    return {
        mutate,
        isPending,
        error,
        data,
        reset,
    };
}

/**
 * Hook for infinite queries / pagination
 */
interface UseInfiniteQueryOptions<T> {
    queryFn: (pageParam: number) => Promise<T[]>;
    cacheKey: string;
    cacheTTL?: number;
    initialPageParam?: number;
}

interface UseInfiniteQueryResult<T> {
    data: T[];
    loading: boolean;
    error: Error | null;
    hasNextPage: boolean;
    fetchNextPage: () => Promise<void>;
    refetch: () => Promise<void>;
}

export function useInfiniteQuery<T>(
    options: UseInfiniteQueryOptions<T>
): UseInfiniteQueryResult<T> {
    const { queryFn, cacheKey, cacheTTL = 5 * 60 * 1000, initialPageParam = 0 } = options;

    const [data, setData] = useState<T[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [currentPage, setCurrentPage] = useState(initialPageParam);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const cache = useCacheStore();

    const fetchPage = useCallback(
        async (page: number) => {
            setIsLoading(true);

            try {
                const result = await queryFn(page);
                setData((prev) => (page === initialPageParam ? result : [...prev, ...result]));
                setHasNextPage(result.length > 0);
                setError(null);

                // Cache the entire dataset
                cache.set(cacheKey, data, cacheTTL);
            } catch (err) {
                setError(err instanceof Error ? err : new Error(String(err)));
            } finally {
                setIsLoading(false);
            }
        },
        [queryFn, cacheKey, cacheTTL, initialPageParam]
    );

    useEffect(() => {
        fetchPage(initialPageParam);
    }, []);

    const fetchNextPage = useCallback(async () => {
        if (hasNextPage) {
            setCurrentPage((prev) => prev + 1);
            await fetchPage(currentPage + 1);
        }
    }, [hasNextPage, currentPage, fetchPage]);

    const refetch = useCallback(async () => {
        cache.remove(cacheKey);
        setCurrentPage(initialPageParam);
        setData([]);
        await fetchPage(initialPageParam);
    }, [cacheKey, initialPageParam, fetchPage]);

    return {
        data,
        loading: isLoading,
        error,
        hasNextPage,
        fetchNextPage,
        refetch,
    };
}
