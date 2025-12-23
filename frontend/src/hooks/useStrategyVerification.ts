/**
 * useStrategyVerification Hook
 *
 * Custom hook for verifying that Facebook entities were created correctly
 * after a strategy completes. This hook:
 * - Calls the verification API automatically after campaign completion
 * - Compares sent data vs actual Facebook data
 * - Auto-corrects mismatches when enabled
 * - Updates the failure tracking context to show mismatches in the UI
 *
 * Usage:
 * const { verify, isVerifying, verificationResult } = useStrategyVerification();
 *
 * // After strategy completes:
 * await verify({
 *   originalRequest: formData,
 *   createdEntities: { campaignId, adsetIds, adIds },
 *   strategyType: 'strategyForAll'
 * });
 */

import { useState, useCallback } from 'react';
import { verificationApi, VerificationResult, CreatedEntities } from '../services/api';
import { useFailureTracking } from '../contexts/FailureTrackingContext';

interface VerificationParams {
  originalRequest: any;
  createdEntities: CreatedEntities;
  strategyType: string;
  autoCorrect?: boolean;
}

interface UseStrategyVerificationReturn {
  verify: (params: VerificationParams) => Promise<VerificationResult | null>;
  isVerifying: boolean;
  verificationResult: VerificationResult | null;
  error: string | null;
  clearResult: () => void;
}

export const useStrategyVerification = (): UseStrategyVerificationReturn => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get failure tracking context to refresh after verification
  const { refreshFailures } = useFailureTracking();

  const verify = useCallback(async (params: VerificationParams): Promise<VerificationResult | null> => {
    const { originalRequest, createdEntities, strategyType, autoCorrect = true } = params;

    // Validate inputs
    if (!originalRequest || !createdEntities) {
      setError('Missing required verification parameters');
      return null;
    }

    if (!createdEntities.campaignId && (!createdEntities.adsetIds || createdEntities.adsetIds.length === 0)) {
      setError('No entities to verify');
      return null;
    }

    setIsVerifying(true);
    setError(null);

    try {
      console.log(`\n🔍 [Verification Hook] Starting verification for ${strategyType}...`);
      console.log(`   Campaign ID: ${createdEntities.campaignId}`);
      console.log(`   AdSet IDs: ${createdEntities.adsetIds?.length || 0}`);
      console.log(`   Ad IDs: ${createdEntities.adIds?.length || 0}`);
      console.log(`   Auto-correct: ${autoCorrect}`);

      const response = await verificationApi.verifyStrategy(
        originalRequest,
        createdEntities,
        strategyType,
        autoCorrect
      );

      if (response.success && response.verification) {
        const result = response.verification;
        setVerificationResult(result);

        console.log('\n📊 [Verification Hook] Verification complete:');
        console.log(`   Passed: ${result.passed}`);
        console.log(`   Total Mismatches: ${result.totalMismatches}`);
        console.log(`   Corrections Attempted: ${result.corrections.attempted}`);
        console.log(`   Corrections Successful: ${result.corrections.successful}`);
        console.log(`   Corrections Failed: ${result.corrections.failed}`);

        if (result.summary.length > 0) {
          console.log('\n   Summary:');
          result.summary.forEach((item, idx) => {
            console.log(`   ${idx + 1}. ${item.entity} (${item.entityId}): ${item.mismatches.length} mismatch(es)`);
            item.mismatches.forEach(m => {
              console.log(`      - ${m.field}: "${m.expected}" vs "${m.actual}"`);
            });
          });
        }

        // Refresh failures to show any verification mismatches in the UI
        if (result.totalMismatches > 0) {
          console.log('\n🔄 [Verification Hook] Refreshing failure list...');
          await refreshFailures();
        }

        return result;
      } else {
        setError('Verification request failed');
        return null;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Verification failed';
      console.error('❌ [Verification Hook] Error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsVerifying(false);
    }
  }, [refreshFailures]);

  const clearResult = useCallback(() => {
    setVerificationResult(null);
    setError(null);
  }, []);

  return {
    verify,
    isVerifying,
    verificationResult,
    error,
    clearResult
  };
};

export default useStrategyVerification;
