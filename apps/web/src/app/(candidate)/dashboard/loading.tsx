import { PageSkeleton } from "@/components/common/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageSkeleton />
    </div>
  );
}
