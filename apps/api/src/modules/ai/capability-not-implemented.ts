import { AiProviderError } from "./ai.errors";

export function capabilityNotImplemented(capability: string, label?: string): never {
  throw new AiProviderError(
    `${label ?? capability} 尚未实现。`,
    "CAPABILITY_NOT_IMPLEMENTED",
  );
}
