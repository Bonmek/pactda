import { motion } from 'framer-motion';
import DetailSection from './DetailSection';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface KeyTermsCardProps {
  termsReference: string;
}

const KeyTermsCard: React.FC<KeyTermsCardProps> = ({ termsReference }) => (
  <motion.div variants={itemVariants}>
    <DetailSection title="Key Contract Terms">
      <p className="text-sm whitespace-pre-wrap">{termsReference}</p>
    </DetailSection>
  </motion.div>
);

export default KeyTermsCard;