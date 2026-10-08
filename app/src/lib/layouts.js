/** Shared geometry for dashboard panels and event tables. */
export const layouts = {
  scores: 'grid gap-4 sm:grid-cols-3',
  dashboardScores: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
  dashboardCharts: 'grid gap-5 lg:grid-cols-[1fr_2fr]',
  dashboardLower: 'grid gap-5 lg:grid-cols-2',
  organization: 'grid gap-5 sm:grid-cols-2',
  historyTable: 'w-full min-w-[960px] table-fixed text-left text-sm',
};
export const historyColumns = [
  { label: 'Checked at', width: '25%' },
  { label: 'Status', width: '16%' },
  { label: 'HTTP', width: '9%' },
  { label: 'Response', width: '12%' },
  { label: 'Start delay', width: '12%' },
  { label: 'Details', width: '26%' },
];
