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
  onFundEscrow?: () => void
  onRefund?: () => void
  onCreateSolanaStub?: () => void // Add this prop
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
  onFundEscrow,
  onRefund,
  onCreateSolanaStub,
}) => (
  <motion.div variants={itemVariants}>
    <DetailSection title="Actions">
      <div className="flex flex-col gap-2">
        {/* Submit Button */}
        {status === 0 && address === partyA && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
            onClick={onSubmit}
          >
            Submit
          </Button>
        )}
        {/* Sign Button */}
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
        {/* Fund Escrow Button */}
        {onFundEscrow && (
          <Button
            className="bg-green-600 hover:bg-green-700 text-white w-full"
            onClick={onFundEscrow}
            type="button"
          >
            Fund Escrow
          </Button>
        )}        {/* Refund Button (always visible if onRefund is provided) */}
        {onRefund && (
          <Button
            className="bg-red-600 hover:bg-red-700 text-white w-full"
            onClick={onRefund}
            type="button"
          >
            Refund
          </Button>
        )}
        {/* Create Solana Stub Button */}
        {onCreateSolanaStub && (
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white w-full"
            onClick={onCreateSolanaStub}
            type="button"
          >
            🌐 Create Solana Stub
          </Button>
        )}
      </div>
    </DetailSection>
  </motion.div>
)

export default ActionsCard
