import { motion } from 'framer-motion'
import DetailSection from './DetailSection'

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

interface MetadataCardProps {
  metadata?: string
}

const MetadataCard: React.FC<MetadataCardProps> = ({ metadata }) => (
  <motion.div variants={itemVariants}>
    <DetailSection title="Metadata / Additional Links">
      <pre className="text-xs bg-gray-800 p-3 rounded border border-gray-700">
        <code className="text-gray-400">{metadata}</code>
      </pre>
    </DetailSection>
  </motion.div>
)

export default MetadataCard
