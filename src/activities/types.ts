export interface FetchResult { source: string; value: any }
export type FetchActivity = () => Promise<FetchResult>
export type TransformActivity = (input: FetchResult) => Promise<FetchResult>
export type SaveActivity = (input: FetchResult) => Promise<void>
