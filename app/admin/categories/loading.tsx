import { Skeleton } from "@/components/ui/skeleton"

export default function CategoriesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      <Skeleton className="h-10 w-full" />

      <div className="rounded-lg border border-gray-200 bg-white shadow">
        <div className="grid grid-cols-12 border-b bg-gray-50 p-4">
          <div className="col-span-4">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="col-span-3">
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="col-span-1">
            <Skeleton className="h-5 w-16 mx-auto" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-5 w-16 mx-auto" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-5 w-24 ml-auto" />
          </div>
        </div>

        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-12 items-center p-4">
              <div className="col-span-4 flex items-center space-x-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="col-span-3">
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="col-span-1 flex justify-center">
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              <div className="col-span-2 flex justify-center">
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="col-span-2 flex justify-end space-x-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
