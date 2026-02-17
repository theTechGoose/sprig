import type { ContractorProfile } from "../../types/index.ts";
import type { ApiClientConfig, ApiResponse } from "../api-client.ts";
import { apiFetch } from "../api-client.ts";

export function profileApi(config: ApiClientConfig, profileId?: string) {
  return {
    get(): Promise<ApiResponse<ContractorProfile>> {
      return apiFetch<ContractorProfile>(config, `/profile/${profileId}`);
    },

    update(
      data: Partial<ContractorProfile>,
    ): Promise<ApiResponse<ContractorProfile>> {
      return apiFetch<ContractorProfile>(config, `/profile/${profileId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    list(): Promise<ApiResponse<ContractorProfile[]>> {
      return apiFetch<ContractorProfile[]>(config, "/profile");
    },
  };
}
