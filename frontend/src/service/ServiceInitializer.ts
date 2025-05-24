/**
 * Service initialization for the frontend application
 */
import { solanaService } from './SolanaService';

/**
 * Initialize all services when the app starts
 */
export const initializeServices = () => {
  try {
    // Initialize Solana service with sponsor key from environment
    solanaService.initializeSponsor();
    console.log('✅ Services initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing services:', error);
  }
};

export default initializeServices;
