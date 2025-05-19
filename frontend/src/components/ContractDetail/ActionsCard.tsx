import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import DetailSection from './DetailSection'

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

interface ActionsCardProps {
  status: number
  address: string
  partyA: string
  partyB: string
  partyASigned: boolean
  partyBSigned: boolean
  onSign: () => void
  onSubmit: () => void
}

const ActionsCard: React.FC<ActionsCardProps> = ({
  status,
  address,
  partyA,
  partyB,
  partyASigned,
  partyBSigned,
  onSign,
  onSubmit,
}) => (
  <motion.div variants={itemVariants}>
    <DetailSection title="Actions">
      <motion.div className="flex">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full"
        >
          {status === 0 && address === partyA && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
              onClick={onSubmit}
            >
              Submit
            </Button>
          )}
          {status === 1 && (
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
              onClick={onSign}
              disabled={
                (address === partyA && partyASigned) ||
                (address === partyB && partyBSigned)
              }
            >
              {(address === partyA && partyASigned) ||
              (address === partyB && partyBSigned)
                ? 'Signed'
                : 'Sign'}
            </Button>
          )}
        </motion.div>
      </motion.div>
    </DetailSection>
  </motion.div>
)

export default ActionsCard
