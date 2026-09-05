const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE_URL}/api/v1`;

export class ApiError extends Error {
  public status: number;
  public data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'An error occurred while fetching data';
    let data;
    
    try {
      data = await response.json();
      errorMessage = data.detail || errorMessage;
    } catch {
      errorMessage = response.statusText;
    }

    throw new ApiError(response.status, errorMessage, data);
  }

  return response.json();
}

export const apiClient = {
  baseUrl: API_V1,
  get: async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    const response = await fetch(`${API_V1}${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options?.headers,
      },
    });
    return handleResponse<T>(response);
  },

  post: async <T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> => {
    const isFormData = data instanceof FormData;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...options?.headers as Record<string, string>,
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_V1}${endpoint}`, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
      ...options,
      headers,
    });
    
    return handleResponse<T>(response);
  },
};
