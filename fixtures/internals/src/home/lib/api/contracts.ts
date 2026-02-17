import type { Contract } from "../../types/index.ts";
import type { ApiClientConfig, ApiResponse } from "../api-client.ts";
import { apiFetch } from "../api-client.ts";

export function contractsApi(config: ApiClientConfig) {
  return {
    list(contractorId?: string): Promise<ApiResponse<Contract[]>> {
      const qs = contractorId ? `?contractorId=${contractorId}` : "";
      return apiFetch<Contract[]>(config, `/contract${qs}`);
    },

    getById(id: string): Promise<ApiResponse<Contract>> {
      return apiFetch<Contract>(config, `/contract/${id}`);
    },

    create(
      data: Omit<Contract, "id">,
    ): Promise<ApiResponse<Contract>> {
      return apiFetch<Contract>(config, "/contract", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    update(
      id: string,
      data: Partial<Contract>,
    ): Promise<ApiResponse<Contract>> {
      return apiFetch<Contract>(config, `/contract/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    remove(id: string): Promise<ApiResponse<void>> {
      return apiFetch<void>(config, `/contract/${id}`, { method: "DELETE" });
    },
  };
}
