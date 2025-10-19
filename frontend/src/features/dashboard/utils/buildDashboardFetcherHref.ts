// fetcher.load() はデフォルトで現在ルートのindex loaderを呼ばないため、明示的に `?index`
// を付与してダッシュボードのローダーを手動トリガーできるように整形する
export function buildDashboardFetcherHref(query: string): string {
  return query ? `/?index&${query}` : '/?index'
}
