export type CisionMultimedia = {
  caption: string
  type: string
  url: string
  thumbnailUrl: string | null
}

export type CisionReleaseSummary = {
  releaseId: string
  title: string
  summary: string
  date: string
  companies: string[]
  language: string | null
  sourceUrl: string | null
  multimedia: CisionMultimedia[]
  importedTitleId: string | null
}

export type CisionSearchResponse = {
  releases: CisionReleaseSummary[]
  pagination: {
    from: number
    size: number
    totalItems: number
    hasNext: boolean
  }
}
