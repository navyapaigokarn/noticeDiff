export interface ModifiedSection {
  label: string;
  previous: string;
  next: string;
}

export interface ChangeEvent {
  id: string;
  monitorId: string;
  previousSnapshotId: string;
  currentSnapshotId: string;
  detectedAt: number;
  addedText: string[];
  removedText: string[];
  modified: ModifiedSection[];
  changeSummary: string;
  isRead: boolean;
}

export interface ContentDiff {
  identical: boolean;
  added: string[];
  removed: string[];
  modified: ModifiedSection[];
  summary: string;
}
