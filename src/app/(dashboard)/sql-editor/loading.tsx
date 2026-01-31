export default function Loading() {
  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded" />
      </div>

      <div className="flex gap-2">
        <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        <div className="h-10 w-24 bg-muted animate-pulse rounded" />
      </div>

      <div className="border rounded-lg p-4 space-y-2">
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        </div>
      </div>

      <div className="border rounded-lg p-4 flex items-center justify-center" style={{ height: '400px' }}>
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading SQL Editor...</p>
          <p className="text-xs text-muted-foreground/50">Preparing Monaco Editor (2.5MB)</p>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-2">
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    </div>
  );
}
