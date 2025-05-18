import React from 'react'
import { motion } from 'framer-motion'
import DetailSection from './DetailSection'

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

interface SignatureStatusProps {
  isSigned: boolean
}

interface PartiesCardProps {
  partyA: string
  partyASigned: boolean
  partyB: string
  partyBSigned: boolean
}

const SignatureStatus: React.FC<SignatureStatusProps> = ({ isSigned }) => (
  <span className={isSigned ? 'text-green-500' : 'text-amber-400'}>
    {isSigned ? '(Signed)' : '(Pending Signature)'}
  </span>
)

const PartiesCard: React.FC<PartiesCardProps> = ({
  partyA,
  partyASigned,
  partyB,
  partyBSigned,
}) => (
  <motion.div variants={itemVariants}>
    <DetailSection title="Contracting Parties">
      <p className="block text-md font-semibold text-indigo-400 mb-2">
        Promisee:{' '}
        <div className="font-mono mt-2 text-sm text-white">
          {partyA} <SignatureStatus isSigned={partyASigned} />
        </div>
      </p>
      <p className="block text-md font-semibold text-indigo-400 mb-2">
        Promisor:{' '}
        <div className="font-mono mt-2 text-sm text-white">
          {partyB} <SignatureStatus isSigned={partyBSigned} />
        </div>
      </p>
    </DetailSection>
  </motion.div>
)

export default PartiesCard
