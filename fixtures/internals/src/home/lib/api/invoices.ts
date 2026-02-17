import type { Invoice } from "../../types/index.ts";
import type { ApiClientConfig, ApiResponse } from "../api-client.ts";
import { apiFetch } from "../api-client.ts";

export function invoicesApi(config: ApiClientConfig) {
  return {
    list(contractorId?: string): Promise<ApiResponse<Invoice[]>> {
      const qs = contractorId ? `?contractorId=${contractorId}` : "";
      return apiFetch<Invoice[]>(config, `/invoice${qs}`);
    },

    getById(id: string): Promise<ApiResponse<Invoice>> {
      return apiFetch<Invoice>(config, `/invoice/${id}`);
    },

    create(data: Omit<Invoice, "id">): Promise<ApiResponse<Invoice>> {
      return apiFetch<Invoice>(config, "/invoice", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    update(
      id: string,
      data: Partial<Invoice>,
    ): Promise<ApiResponse<Invoice>> {
      return apiFetch<Invoice>(config, `/invoice/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    remove(id: string): Promise<ApiResponse<void>> {
      return apiFetch<void>(config, `/invoice/${id}`, { method: "DELETE" });
    },
  };
}
