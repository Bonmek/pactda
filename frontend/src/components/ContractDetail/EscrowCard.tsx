import { motion } from 'framer-motion'
import DetailSection from './DetailSection'

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

interface EscrowCardProps {
  address: string
  balance: string
  status: 'Active' | 'Inactive'
}

const EscrowCard: React.FC<EscrowCardProps> = ({
  address,
  balance,
  status,
}) => (
  <motion.div variants={itemVariants}>
    <DetailSection title="Escrow Details">
      <p className="text-sm">
        Escrow Address: <span className="font-mono">{address}</span>
      </p>
      <p className="text-sm">
        Balance: <span className="text-green-400">{balance} ETH</span>
      </p>
      <p className="text-sm">
        Status:{' '}
        <span className={`text-${status === 'Active' ? 'green' : 'red'}-400`}>
          {status}
        </span>
      </p>
    </DetailSection>
  </motion.div>
)

export default EscrowCard
