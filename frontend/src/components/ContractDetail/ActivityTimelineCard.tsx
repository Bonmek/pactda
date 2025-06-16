import { motion } from 'framer-motion'
import DetailSection from './DetailSection'

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

interface Activity {
  date: string
  description: string
}

interface ActivityTimelineCardProps {
  activities: Activity[]
}

const ActivityTimelineCard: React.FC<ActivityTimelineCardProps> = ({
  activities,
}) => (
  <motion.div variants={itemVariants}>
    <DetailSection title="Activity Timeline">
      <ul className="space-y-2 text-xs text-gray-400">
        {activities.map((activity, index) => (
          <li key={index}>
            <span className="font-medium text-blue-300">{activity.date}:</span>{' '}
            {activity.description}
          </li>
        ))}
      </ul>
    </DetailSection>
  </motion.div>
)

export default ActivityTimelineCard
