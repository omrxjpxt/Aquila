/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from '../firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE_URL}/api/v1`;

export type ApiErrorType = 'NETWORK_ERROR' | 'AUTH_REQUIRED' | 'FORBIDDEN' | 'NOT_FOUND' | 'SERVER_ERROR' | 'UNKNOWN';

export class ApiError extends Error {
  public status: number;
  public type: ApiErrorType;
  public data: unknown;

  constructor(status: number, message: string, type: ApiErrorType, data?: unknown) {
    super(message);
    this.status = status;
    this.type = type;
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

    let errorType: ApiErrorType = 'SERVER_ERROR';
    if (response.status === 401) errorType = 'AUTH_REQUIRED';
    else if (response.status === 403) errorType = 'FORBIDDEN';
    else if (response.status === 404) errorType = 'NOT_FOUND';

    throw new ApiError(response.status, errorMessage, errorType, data);
  }

  return response.json();
}

let memoryToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  memoryToken = token;
};

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (memoryToken) return { 'Authorization': `Bearer ${memoryToken}` };
  if (typeof window !== 'undefined') {
    const localToken = localStorage.getItem('aquila_auth_token') || localStorage.getItem('token');
    if (localToken) {
      memoryToken = localToken;
      return { 'Authorization': `Bearer ${localToken}` };
    }
  }
  if (auth) {
    if (typeof (auth as any).authStateReady === 'function') {
      try {
        await (auth as any).authStateReady();
      } catch {
        // ignore
      }
    }
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        if (token) {
          memoryToken = token;
          return { 'Authorization': `Bearer ${token}` };
        }
      } catch (e) {
        console.warn("Failed to get auth token from auth.currentUser:", e);
      }
    }
  }
  return {};
}

export const apiClient = {
  baseUrl: API_V1,
  getAuthHeaders,
  get: async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    const authHeaders = await getAuthHeaders();
    let response: Response;
    try {
      response = await fetch(`${API_V1}${endpoint}`, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...authHeaders,
          ...options?.headers,
        },
      });
    } catch (error) {
      throw new ApiError(0, "Failed to connect to the backend API.", "NETWORK_ERROR", error);
    }
    return handleResponse<T>(response);
  },

  post: async <T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> => {
    const authHeaders = await getAuthHeaders();
    const isFormData = data instanceof FormData;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...authHeaders,
      ...options?.headers as Record<string, string>,
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(`${API_V1}${endpoint}`, {
        method: 'POST',
        body: isFormData ? data : JSON.stringify(data),
        ...options,
        headers,
      });
    } catch (error) {
      throw new ApiError(0, "Failed to connect to the backend API.", "NETWORK_ERROR", error);
    }
    
    return handleResponse<T>(response);
  },
};
