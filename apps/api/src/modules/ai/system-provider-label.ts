export function getSystemProviderDisplayName(baseUrl: string): string {
  if (baseUrl.toLowerCase().includes("deepseek.com")) {
    return "DeepSeek（系统）";
  }
  return "系统 Provider";
}
