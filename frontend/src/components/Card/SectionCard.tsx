const SectionCard = ({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) => (
  <div className={`bg-[#161b22] rounded-2xl p-6 shadow-md ${className}`}>
    <h2 className="text-xl font-semibold mb-4 text-white">{title}</h2>
    {children}
  </div>
)

export default SectionCard
