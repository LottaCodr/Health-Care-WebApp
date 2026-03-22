# Improved State Management Guide

## Overview

This project now uses a comprehensive state management system combining **Zustand** for global state and **React Query** (via `useData` hook) for server state management.

## Architecture

### 1. Global State Stores (Zustand)

Located in `/store/store.ts`, the following stores manage application state:

#### `useUserStore`
- Manages authenticated user information
- Stores: `user`, `isLoading`, `error`
- Methods: `setUser()`, `setLoading()`, `setError()`, `clearUser()`

```typescript
import { useUserStore } from "@/store/store";

function MyComponent() {
    const { user, isLoading, error } = useUserStore();
    // ...
}
```

#### `useCacheStore`
- Manages data caching with TTL (Time To Live)
- Stores: `cache` (Map)
- Methods: `set()`, `get()`, `has()`, `remove()`, `clear()`, `isExpired()`
- Default TTL: 5 minutes

```typescript
import { useCacheStore } from "@/store/store";

function MyComponent() {
    const cache = useCacheStore();
    
    // Set cache with 10-minute TTL
    cache.set("my-key", data, 10 * 60 * 1000);
    
    // Get from cache (returns null if expired)
    const cached = cache.get("my-key");
    
    // Check if key exists and isn't expired
    if (cache.has("my-key")) {
        // Use cached data
    }
}
```

#### `useLoadingStore`
- Manages loading states for multiple async operations
- Stores: `loadingKeys` (Set)
- Methods: `addLoading()`, `removeLoading()`, `isLoading()`, `hasAnyLoading()`, `clearAll()`

```typescript
import { useLoadingStore } from "@/store/store";

function MyComponent() {
    const loading = useLoadingStore();
    
    loading.addLoading("fetch-patients");
    // ... do async work
    loading.removeLoading("fetch-patients");
    
    // Check specific operation
    if (loading.isLoading("fetch-patients")) {
        // Show loading
    }
}
```

#### `useErrorStore`
- Manages application errors with context
- Stores: `errors` (Map)
- Methods: `addError()`, `removeError()`, `getError()`, `clearAll()`, `getLastError()`

```typescript
import { useErrorStore } from "@/store/store";

function MyComponent() {
    const errors = useErrorStore();
    
    errors.addError("api-key", "Failed to fetch data", "FETCH_ERROR", {
        endpoint: "/patients",
        status: 500,
    });
    
    const error = errors.getError("api-key");
    if (error) {
        console.log(error.message, error.code, error.context);
    }
}
```

#### `useNotificationStore`
- Manages toast/notification messages
- Stores: `notifications` (array)
- Methods: `addNotification()`, `removeNotification()`, `clearAll()`
- Auto-dismiss support via `duration` parameter

```typescript
import { useNotificationStore } from "@/store/store";

function MyComponent() {
    const notifications = useNotificationStore();
    
    const id = notifications.addNotification({
        type: "success",
        message: "Operation successful!",
        duration: 3000, // Auto-dismiss after 3 seconds
    });
    
    // Manually remove
    notifications.removeNotification(id);
}
```

#### `useUIStore`
- Manages UI state (sidebar, dark mode, etc.)
- Stores: `sidebarOpen`, `darkMode`
- Methods: `setSidebarOpen()`, `setDarkMode()`, `toggleSidebar()`, `toggleDarkMode()`
- **Persisted to localStorage**

```typescript
import { useUIStore } from "@/store/store";

function MyComponent() {
    const { sidebarOpen, darkMode, toggleSidebar } = useUIStore();
    
    return <button onClick={toggleSidebar}>Toggle Sidebar</button>;
}
```

### 2. Server State Management

Located in `/hooks/use-data.ts`, provides hooks for fetching and mutating data from the server.

#### `useData<T>`
Generic hook for fetching data with caching and deduplication.

**Features:**
- Automatic caching with configurable TTL
- Request deduplication (prevents duplicate concurrent requests)
- Automatic retry on failure
- Error handling

```typescript
import { useData } from "@/hooks/use-data";
import { getPatientById } from "@/lib/appwrite-service";

function PatientDetail({ patientId }: { patientId: string }) {
    const { data, loading, error, refetch, isRefetching } = useData(
        () => getPatientById(patientId),
        {
            cacheKey: `patient-${patientId}`,
            cacheTTL: 10 * 60 * 1000, // 10 minutes
            retry: 3,
            retryDelay: 1000,
            deduplicate: true,
            onSuccess: (data) => {
                console.log("Data loaded:", data);
            },
            onError: (error) => {
                console.error("Failed to load data:", error);
            },
        }
    );

    if (loading) return <LoadingSkeleton />;
    if (error) return <ErrorAlert error={error} />;

    return (
        <div>
            {data && <PatientCard patient={data} />}
            <button onClick={refetch} disabled={isRefetching}>
                {isRefetching ? "Refetching..." : "Refetch"}
            </button>
        </div>
    );
}
```

#### `useMutation<T, R>`
Hook for handling mutations with optimistic updates and cache invalidation.

```typescript
import { useMutation } from "@/hooks/use-data";
import { updatePatientStatus } from "@/lib/appwrite-service";

function UpdatePatient() {
    const { mutate, isPending, error, data } = useMutation({
        mutationFn: (status: string) => updatePatientStatus(patientId, status),
        onSuccess: (result) => {
            console.log("Updated successfully:", result);
        },
        onError: (error) => {
            console.error("Update failed:", error);
        },
        onMutate: (data) => {
            // Called before mutation (for optimistic updates)
        },
        invalidateKeys: ["patient-*", "patients-*"], // Cache keys to clear
    });

    return (
        <button 
            onClick={() => mutate("Active")} 
            disabled={isPending}
        >
            {isPending ? "Updating..." : "Update Status"}
        </button>
    );
}
```

#### `useInfiniteQuery<T>`
Hook for infinite queries / pagination.

```typescript
import { useInfiniteQuery } from "@/hooks/use-data";
import { listPatientsByStatus } from "@/lib/appwrite-service";

function PatientsList() {
    const { 
        data, 
        loading, 
        error, 
        hasNextPage, 
        fetchNextPage, 
        refetch 
    } = useInfiniteQuery({
        queryFn: (pageParam) => listPatientsByStatus("Active", pageParam),
        cacheKey: "patients-list",
        initialPageParam: 0,
    });

    return (
        <div>
            {data.map(patient => (
                <PatientCard key={patient.$id} patient={patient} />
            ))}
            {hasNextPage && (
                <button onClick={fetchNextPage} disabled={loading}>
                    Load More
                </button>
            )}
        </div>
    );
}
```

### 3. Convenience Hooks

Located in `/hooks/use-store.ts`, provides simplified access to stores.

```typescript
import { useAppNotification, useAppUser, useAppState } from "@/hooks/use-store";

// Individual store access
function MyComponent() {
    const { notify, success, error } = useAppNotification();
    
    try {
        await doSomething();
        success("Operation completed!");
    } catch (err) {
        error("Operation failed!");
    }
}

// Combined access
function AnotherComponent() {
    const { user, notifications, errors, loading } = useAppState();
    
    // Use all stores
}
```

### 4. Improved EMR Hooks

Located in `/hooks/use-emr-improved.ts`, provides pre-configured hooks for EMR data with automatic caching.

```typescript
import { usePatient, useCreateConsultation, usePendingLabRequests } from "@/hooks/use-emr-improved";

function DoctorDashboard() {
    // All hooks automatically cache data
    const patient = usePatient(patientId);
    const pending = usePendingLabRequests();
    const { mutate: createConsultation } = useCreateConsultation();
    
    // Same interface as useData/useMutation
}
```

## Component Best Practices

### 1. Using the Error Boundary

Wrap your app with `<ErrorBoundary>` to catch unexpected errors:

```typescript
import { ErrorBoundary } from "@/components/error-boundary";

export default function App() {
    return (
        <ErrorBoundary>
            <YourApp />
        </ErrorBoundary>
    );
}
```

### 2. Notifications

Use the notification system instead of toast:

```typescript
import { useAppNotification } from "@/hooks/use-store";

function MyForm() {
    const { success, error, warn, info } = useAppNotification();
    
    const handleSubmit = async () => {
        try {
            await submitForm();
            success("Form submitted!");
        } catch (err) {
            error("Failed to submit form");
        }
    };
}
```

The `<NotificationContainer />` component is already added to the root layout and displays all notifications automatically.

### 3. Loading States

Use loading store for fine-grained control:

```typescript
import { useLoadingStore } from "@/store/store";

function MyComponent() {
    const loading = useLoadingStore();
    
    const handleClick = async () => {
        loading.addLoading("action-1");
        try {
            await doSomething();
        } finally {
            loading.removeLoading("action-1");
        }
    };
    
    return <button disabled={loading.isLoading("action-1")}>Action</button>;
}
```

## Migration from Old State Management

### Old way (with useState in multiple components):
```typescript
const [patients, setPatients] = useState<Patient[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
    setLoading(true);
    getPatients()
        .then(data => { setPatients(data); setError(null); })
        .catch(err => { setError(err); })
        .finally(() => setLoading(false));
}, []);
```

### New way (using improved hooks):
```typescript
const { data: patients, loading, error, refetch } = useData(
    () => getPatients(),
    { cacheKey: "patients" }
);
```

## Performance Optimization

The improved state management provides several performance benefits:

1. **Automatic Caching**: Data is cached with configurable TTL to prevent unnecessary refetches
2. **Request Deduplication**: Multiple simultaneous requests for the same data are consolidated
3. **Selective Subscriptions**: Components only subscribe to the specific state they need
4. **Immer Integration**: Immutable state updates are optimized
5. **DevTools**: Zustand DevTools integration for debugging

## Devtools

All stores are integrated with Redux DevTools. To debug:

1. Install Redux DevTools browser extension
2. Open DevTools to view store state changes
3. Time-travel through state changes
4. Inspect action history

## Summary

The new state management system provides:

✅ **Global state**: Zustand stores for authentication, notifications, errors, UI state  
✅ **Server state**: React Query-like caching and mutations  
✅ **Error handling**: Centralized error management with context  
✅ **Loading states**: Fine-grained loading state management  
✅ **Notifications**: Built-in notification system with auto-dismiss  
✅ **Caching**: Automatic data caching with TTL  
✅ **Deduplication**: Prevents duplicate concurrent requests  
✅ **DevTools**: Redux DevTools integration  
✅ **Error boundaries**: Graceful error handling  

This architecture provides a solid foundation for scalable state management while maintaining simplicity and performance.
