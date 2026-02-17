import type { Customer } from "../../types/index.ts";
import type { ApiClientConfig, ApiResponse } from "../api-client.ts";
import { apiFetch } from "../api-client.ts";

export function customersApi(config: ApiClientConfig) {
  return {
    list(contractorId?: string): Promise<ApiResponse<Customer[]>> {
      const qs = contractorId ? `?contractorId=${contractorId}` : "";
      return apiFetch<Customer[]>(config, `/customer${qs}`);
    },

    getById(id: string): Promise<ApiResponse<Customer>> {
      return apiFetch<Customer>(config, `/customer/${id}`);
    },

    create(data: Omit<Customer, "id">): Promise<ApiResponse<Customer>> {
      return apiFetch<Customer>(config, "/customer", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    update(
      id: string,
      data: Partial<Customer>,
    ): Promise<ApiResponse<Customer>> {
      return apiFetch<Customer>(config, `/customer/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    remove(id: string): Promise<ApiResponse<void>> {
      return apiFetch<void>(config, `/customer/${id}`, { method: "DELETE" });
    },
  };
}
