import type { Message } from "../../types/index.ts";
import type { ApiClientConfig, ApiResponse } from "../api-client.ts";
import { apiFetch } from "../api-client.ts";

export function conversationsApi(
  config: ApiClientConfig,
  contractorId?: string,
) {
  return {
    getByCustomer(customerId: string): Promise<ApiResponse<Message[]>> {
      return apiFetch<Message[]>(
        config,
        `/conversation/customer/${contractorId}/${customerId}`,
      );
    },

    getByContractor(): Promise<ApiResponse<Message[]>> {
      return apiFetch<Message[]>(
        config,
        `/conversation/contractor/${contractorId}`,
      );
    },

    pushMessage(
      customerId: string,
      message: Message,
    ): Promise<ApiResponse<void>> {
      return apiFetch<void>(
        config,
        `/conversation/customer/${contractorId}/${customerId}/push`,
        {
          method: "POST",
          body: JSON.stringify(message),
        },
      );
    },

    pushToContractor(message: Message): Promise<ApiResponse<Message[]>> {
      return apiFetch<Message[]>(
        config,
        `/conversation/contractor/${contractorId}/push`,
        {
          method: "POST",
          body: JSON.stringify(message),
        },
      );
    },
  };
}
