export interface WebsiteSnapshot {
  id: string;
  monitorId: string;
  contentHash: string;
  extractedText: string;
  title: string;
  fetchedAt: number;
  truncated: boolean;
}
