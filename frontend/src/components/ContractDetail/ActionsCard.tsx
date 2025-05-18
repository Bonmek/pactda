import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import DetailSection from './DetailSection'

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

interface ActionsCardProps {
  onSign: () => void
}

const ActionsCard: React.FC<ActionsCardProps> = ({ onSign }) => (
  <motion.div variants={itemVariants}>
    <DetailSection title="Actions">
      <motion.div className="flex">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full"
        >
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
            onClick={onSign}
          >
            Sign
          </Button>
        </motion.div>
      </motion.div>
    </DetailSection>
  </motion.div>
)

export default ActionsCard
