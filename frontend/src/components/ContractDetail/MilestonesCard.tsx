import { motion } from 'framer-motion'
import DetailSection from './DetailSection'

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

interface Milestone {
  description_hash: string
  status: 'Completed' | 'In Progress' | 'Pending'
}

interface MilestonesCardProps {
  milestones: Milestone[]
}

const MilestonesCard: React.FC<MilestonesCardProps> = ({ milestones }) => (
  <motion.div variants={itemVariants}>
    <DetailSection title="Milestones">
      <ul className="list-disc list-inside">
        {milestones.map((milestone, index) => (
          <li key={index} className="text-sm">
            {milestone.description_hash} -{' '}
            <span
              className={`text-${milestone.status === 'Completed' ? 'green' : milestone.status === 'In Progress' ? 'yellow' : 'gray'}-400`}
            >
              {milestone.status}
            </span>
          </li>
        ))}
      </ul>
    </DetailSection>
  </motion.div>
)

export default MilestonesCard
