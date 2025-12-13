import axios from "axios";

// LightRAG API (for document queries)
const LIGHTRAG_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9621";

// Backend ERP/LMS API (for student data)
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// LightRAG API client
export const lightragApi = axios.create({
  baseURL: LIGHTRAG_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Backend API client
export const backendApi = axios.create({
  baseURL: BACKEND_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable cookies for HttpOnly authentication
});

// Add tokens to requests
lightragApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("lightrag_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Backend API now uses HttpOnly cookies, no need to add Authorization header
// Cookies are automatically sent with withCredentials: true

// ========== LightRAG Query API (for document-based queries) ==========
export const queryApi = {
  query: async (data: {
    query: string;
    mode?: string;
    top_k?: number;
    include_references?: boolean;
    conversation_history?: Array<{ role: string; content: string }>;
  }) => {
    const response = await lightragApi.post("/query", {
      query: data.query,
      mode: data.mode || "mix",
      top_k: data.top_k,
      include_references: data.include_references ?? true,
      conversation_history: data.conversation_history,
    });
    return response.data;
  },

  queryStream: async function* (data: {
    query: string;
    mode?: string;
    top_k?: number;
    conversation_history?: Array<{ role: string; content: string }>;
  }): AsyncGenerator<string, void, unknown> {
    try {
      const token = localStorage.getItem("lightrag_token");
      const response = await fetch(`${LIGHTRAG_API_URL}/query/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: data.query,
          mode: data.mode || "mix",
          top_k: data.top_k,
          stream: true,
          conversation_history: data.conversation_history,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Stream API error:", response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Handle SSE format (data: {...})
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.startsWith("data: ")) {
              try {
                const dataStr = trimmedLine.slice(6);
                if (dataStr === "[DONE]" || dataStr === "null") {
                  return;
                }
                const parsed = JSON.parse(dataStr);
                if (parsed.content) {
                  yield parsed.content;
                } else if (parsed.response) {
                  yield parsed.response;
                }
                if (parsed.done === true) {
                  return;
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error: any) {
      console.error("Stream error:", error);
      throw error;
    }
  },
};

// ========== Document Management API (Backend Ingestion) ==========
export const documentApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await backendApi.post("/ingestion/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Note: Other methods (insertText, getStatus, etc.) might not be supported by new backend ingestion yet.
  // For now, we only updated upload. The frontend status checking logic relies on getStatus.
  // The backend currently only returns { success: true, ... }. It does not provide status tracking endpoints yet.
  // So I also need to update DocumentUpload.tsx to handle the immediate success/failure response instead of polling.

  insertText: async (text: string, docId?: string, metadata?: Record<string, any>) => {
    // Legacy support or implemented in backend? Assuming legacy or placeholder for now.
    const response = await lightragApi.post("/documents/text", {
      text,
      doc_id: docId,
      metadata,
    });
    return response.data;
  },

  getStatus: async (docId: string) => {
    // Backend doesn't support status tracking yet, so this might fail if called.
    const response = await lightragApi.get(`/documents/${docId}/status`);
    return response.data;
  },

  // ... other methods ...


  getTrackStatus: async (trackId: string) => {
    const response = await lightragApi.get(`/documents/track_status/${trackId}`);
    return response.data;
  },

  list: async (params?: { status?: string; limit?: number; offset?: number }) => {
    const response = await lightragApi.get("/documents", { params });
    return response.data;
  },

  delete: async (docId: string) => {
    const response = await lightragApi.delete(`/documents/${docId}`);
    return response.data;
  },

  scan: async () => {
    const response = await lightragApi.post("/documents/scan");
    return response.data;
  },

  reprocess: async (docIds: string[]) => {
    const response = await lightragApi.post("/documents/reprocess", { doc_ids: docIds });
    return response.data;
  },

  getPipelineStatus: async () => {
    const response = await lightragApi.get("/documents/pipeline_status");
    return response.data;
  },
};

// ========== Backend ERP/LMS API ==========
// Authentication
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await backendApi.post("/auth/login", { email, password });
    // Token is now stored in HttpOnly cookie, only store user data
    if (response.data.user) {
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }
    return response.data;
  },

  getProfile: async () => {
    const response = await backendApi.get("/auth/me");
    // Update stored user data
    if (response.data) {
      localStorage.setItem("user", JSON.stringify(response.data));
    }
    return response.data;
  },

  logout: async () => {
    try {
      // Call backend logout endpoint to clear cookie
      await backendApi.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage
      localStorage.removeItem("user");
      localStorage.removeItem("userType");
      localStorage.removeItem("userEmail");
    }
  },
};

// Student Data (Private)
export const studentApi = {
  getProfile: async () => {
    const response = await backendApi.get("/student/profile");
    return response.data;
  },

  getGrades: async (semester?: string) => {
    const params = semester ? { semester } : {};
    const response = await backendApi.get("/student/grades", { params });
    return response.data;
  },

  getPayments: async (semester?: string) => {
    const params = semester ? { semester } : {};
    const response = await backendApi.get("/student/payments", { params });
    return response.data;
  },

  getEnrolledCourses: async (semester?: string) => {
    const params = semester ? { semester } : {};
    const response = await backendApi.get("/student/courses", { params });
    return response.data;
  },

  getAttendance: async (courseId?: number) => {
    const params = courseId ? { courseId } : {};
    const response = await backendApi.get("/student/attendance", { params });
    return response.data;
  },

  getAcademicSummary: async () => {
    const response = await backendApi.get("/student/summary");
    return response.data;
  },
};

// Public Data (Academic Information)
export const publicApi = {
  getOpenElectives: async (semester?: string) => {
    const params = semester ? { semester } : {};
    const response = await backendApi.get("/public/courses/open-electives", { params });
    return response.data;
  },

  getMidsemDates: async (semester?: string) => {
    const params = semester ? { semester } : {};
    const response = await backendApi.get("/public/midsem-dates", { params });
    return response.data;
  },

  getTimetable: async (courseCode?: string, department?: string) => {
    const params: any = {};
    if (courseCode) params.courseCode = courseCode;
    if (department) params.department = department;
    const response = await backendApi.get("/public/timetable", { params });
    return response.data;
  },

  getGpaRules: async () => {
    const response = await backendApi.get("/public/gpa-rules");
    return response.data;
  },

  getCreditSystem: async () => {
    const response = await backendApi.get("/public/credit-system");
    return response.data;
  },

  getAnnouncementLocations: async () => {
    const response = await backendApi.get("/public/announcements/locations");
    return response.data;
  },

  getAcademicCalendar: async (semester?: string) => {
    const params = semester ? { semester } : {};
    const response = await backendApi.get("/public/calendar", { params });
    return response.data;
  },
};

// Unified Query API (routes to backend for classification, then to LightRAG or backend)
export const unifiedQueryApi = {
  query: async (query: string) => {
    const response = await backendApi.post("/query", { query });
    return response.data;
  },

  queryStream: async function* (query: string): AsyncGenerator<string, void, unknown> {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${BACKEND_API_URL}/query/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let metadata: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const dataStr = trimmed.slice(6);
              if (dataStr === "[DONE]") {
                // Return metadata if available
                if (metadata) {
                  yield JSON.stringify({ type: 'metadata', ...metadata });
                }
                return;
              }
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                yield parsed.content;
              } else if (parsed.metadata) {
                // Store metadata to return at the end
                metadata = parsed.metadata;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Unified query stream error:", error);
      throw error;
    }
  },
};

// Graph Management API (LightRAG)
export const graphApi = {
  getLabels: async () => {
    const response = await lightragApi.get("/graph/label/list");
    return response.data;
  },

  getEntity: async (entityName: string) => {
    const response = await lightragApi.get(`/graph/entity/${encodeURIComponent(entityName)}`);
    return response.data;
  },

  searchEntities: async (query: string, limit: number = 20) => {
    const response = await lightragApi.get("/graph/entity/search", {
      params: { query, limit },
    });
    return response.data;
  },
};

// Ollama Emulation API (LightRAG)
export const ollamaApi = {
  listModels: async () => {
    const response = await lightragApi.get("/api/tags");
    return response.data;
  },

  chat: async (data: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    stream?: boolean;
  }) => {
    const response = await lightragApi.post("/api/chat", {
      model: data.model,
      messages: data.messages,
      stream: data.stream || false,
    });
    return response.data;
  },

  getRunningModels: async () => {
    const response = await lightragApi.get("/api/ps");
    return response.data;
  },
};

// System API
export const systemApi = {
  health: async () => {
    const response = await lightragApi.get("/health");
    return response.data;
  },

  getVersion: async () => {
    const response = await lightragApi.get("/api/version");
    return response.data;
  },
};
