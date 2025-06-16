import SectionCard from '../Card/SectionCard'

const ContractDetailSkeleton = () => {
  const SkeletonBox = ({ width = 'w-full', height = 'h-5' }) => (
    <div className={`bg-gray-700 rounded animate-pulse ${width} ${height}`} />
  )

  const DetailRowSkeleton = () => (
    <div className="flex justify-between items-center py-1 gap-4">
      <SkeletonBox width="w-1/3" />
      <SkeletonBox width="w-1/2" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0d1117] px-4 py-10 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <SkeletonBox width="w-32" height="h-6" />
        </div>

        <div className="bg-[#161b22] rounded-3xl p-8 shadow-2xl space-y-3">
          <SkeletonBox width="w-1/2" height="h-8" />
          <SkeletonBox width="w-3/4" height="h-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <SectionCard title="📦 Metadata">
            <DetailRowSkeleton />
            <DetailRowSkeleton />
            <DetailRowSkeleton />
          </SectionCard>

          <SectionCard title="👥 Parties">
            <DetailRowSkeleton />
            <DetailRowSkeleton />
            <DetailRowSkeleton />
            <DetailRowSkeleton />
          </SectionCard>
        </div>

        <SectionCard title="📌 Milestones" className="mt-8">
          <SkeletonBox width="w-full" height="h-20" />
        </SectionCard>
      </div>
    </div>
  )
}

export default ContractDetailSkeleton
