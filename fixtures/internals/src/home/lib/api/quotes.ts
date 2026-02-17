import type { Quote } from "../../types/index.ts";
import type { ApiClientConfig, ApiResponse } from "../api-client.ts";
import { apiFetch } from "../api-client.ts";

export function quotesApi(config: ApiClientConfig) {
  return {
    list(contractorId?: string): Promise<ApiResponse<Quote[]>> {
      const qs = contractorId ? `?contractorId=${contractorId}` : "";
      return apiFetch<Quote[]>(config, `/quote${qs}`);
    },

    getById(id: string): Promise<ApiResponse<Quote>> {
      return apiFetch<Quote>(config, `/quote/${id}`);
    },

    create(data: Omit<Quote, "id">): Promise<ApiResponse<Quote>> {
      return apiFetch<Quote>(config, "/quote", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    update(
      id: string,
      data: Partial<Quote>,
    ): Promise<ApiResponse<Quote>> {
      return apiFetch<Quote>(config, `/quote/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    remove(id: string): Promise<ApiResponse<void>> {
      return apiFetch<void>(config, `/quote/${id}`, { method: "DELETE" });
    },
  };
}
