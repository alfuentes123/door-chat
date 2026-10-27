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
        throw new Error(`Request failed: HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
}