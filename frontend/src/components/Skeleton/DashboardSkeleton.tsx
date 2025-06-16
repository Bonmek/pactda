const SkeletonBox = ({
  height = 'h-6',
  className = '',
}: {
  height?: string
  className?: string
}) => (
  <div
    className={`bg-gray-700 rounded-md animate-pulse ${height} ${className}`}
  />
)

const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#0d1117] py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Loading Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#161b22] p-4 rounded-xl shadow-md space-y-3"
            >
              <SkeletonBox className="w-2/3 h-6" />
              <SkeletonBox className="w-1/3 h-4" />
              <SkeletonBox className="w-1/2 h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DashboardSkeleton
