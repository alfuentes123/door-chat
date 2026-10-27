export class ApiError extends Error {
    readonly status: number;

    constructor(status: number) {
        super(`Request failed: HTTP ${status}`);
        this.name = 'ApiError';
        this.status = status;
    }
}

export async function api<T>(
    path: string,
    method: 'GET' | 'POST' = 'GET',
    data?: unknown
): Promise<T> {
    const response = await fetch(`/api${path}`, {
        method,
        credentials: 'include',
        headers: data !== undefined
            ? { 'Content-Type': 'application/json' }
            : undefined,
        body: data !== undefined
            ? JSON.stringify(data)
            : undefined,
    });

    if (!response.ok) {
        throw new ApiError(response.status);
    }

    const body = await response.text();
    return (body ? JSON.parse(body) : null) as T;
}
