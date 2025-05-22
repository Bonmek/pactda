import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './button'; // Assuming you have a Button component
import { Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  isLoading?: boolean; // For the dry run loading state
  isConfirming?: boolean; // For the actual transaction execution loading state
  currentBalance?: string | null; // SUI balance as string (e.g. "12.3456")
  estimatedGas?: string | null;
  gasCalculationError?: string | null;
  children?: React.ReactNode; // For additional content in the modal body
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  isLoading = false,
  isConfirming = false,
  currentBalance,
  estimatedGas,
  gasCalculationError,
  children,
}) => {
  if (!isOpen) {
    return null;
  }

  // Calculate post-transaction balance if possible
  let postTxnBalance: string | null = null;
  if (currentBalance && estimatedGas) {
    const current = parseFloat(currentBalance);
    const gas = parseFloat(estimatedGas);
    if (!isNaN(current) && !isNaN(gas)) {
      postTxnBalance = (current - gas).toFixed(6);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose} // Close on backdrop click
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] text-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-slate-700"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            <h2 className="text-2xl font-semibold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-300">{title}</h2>
            
            {children && <div className="mb-4 text-slate-300">{children}</div>}

            {/* SUI balance info */}
            <div className="mb-4 p-3 bg-slate-800/40 rounded-lg border border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-1">Your SUI Balance:</h3>
              {currentBalance !== undefined && currentBalance !== null ? (
                <div className="text-base text-sky-300 font-semibold">{currentBalance} SUI</div>
              ) : (
                <div className="text-base text-slate-500">N/A</div>
              )}
              {postTxnBalance !== null && (
                <div className="text-xs text-slate-400 mt-1">After transaction: <span className="text-green-400 font-semibold">{postTxnBalance} SUI</span></div>
              )}
            </div>

            <div className="mb-6 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-sm font-medium text-slate-400 mb-1">Estimated Transaction Fee:</h3>
              {isLoading && (
                <div className="flex items-center text-slate-300">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating fee...
                </div>
              )}
              {gasCalculationError && !isLoading && (
                <div className="flex items-center text-red-400">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Error: {gasCalculationError}
                </div>
              )}
              {!isLoading && !gasCalculationError && estimatedGas && (
                <p className="text-lg font-semibold text-sky-400">{estimatedGas}</p>
              )}
              {!isLoading && !gasCalculationError && !estimatedGas && (
                 <p className="text-lg font-semibold text-slate-500">Not available</p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isConfirming || isLoading}
                className="bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                disabled={isConfirming || isLoading || !!gasCalculationError || !estimatedGas}
                className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white"
              >
                {isConfirming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isConfirming ? 'Confirming...' : 'Confirm'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
