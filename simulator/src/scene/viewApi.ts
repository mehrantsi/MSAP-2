export interface ViewApi {
  zoom: (factor: number) => void
  reset: () => void
}

export const viewApi: ViewApi = {
  zoom: () => {},
  reset: () => {},
}
