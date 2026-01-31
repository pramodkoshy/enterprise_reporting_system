export default function Loading() {
  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded" />
      </div>

      <div className="flex gap-2">
        <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>

      <div className="border rounded-lg">
        <div className="flex border-b">
          <div className="px-4 py-2 border-b-2 border-primary bg-blue-50 dark:bg-blue-900/20">
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          </div>
          <div className="px-4 py-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="h-64 bg-muted animate-pulse rounded" />
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-2 border rounded">
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
