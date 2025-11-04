/**
 * Development component to verify infrastructure hooks
 * This component can be temporarily added to a route to test the hooks
 */

import { useNetworkEnforcement } from '@/hooks/useNetworkEnforcement';
import { useIsLotteryManager } from '@/hooks/useIsLotteryManager';
import { useFriendlyTime } from '@/hooks/useFriendlyTime';
import { useUserParticipations } from '@/hooks/useUserParticipations';

export function HookVerification() {
  // Test useNetworkEnforcement
  const networkState = useNetworkEnforcement();

  // Test useIsLotteryManager
  const { isManager, isLoading: isLoadingManager } = useIsLotteryManager();

  // Test useFriendlyTime with a timestamp 1 hour from now
  const oneHourFromNow = Math.floor(Date.now() / 1000) + 3600;
  const { friendlyText, isPast, timeRemaining } = useFriendlyTime(oneHourFromNow, {
    prefix: 'Ends in',
    suffix: '!',
  });

  // Test useUserParticipations
  const {
    participations,
    isLoading: isLoadingParticipations,
    hasParticipations,
    unclaimedWinnings,
  } = useUserParticipations();

  return (
    <div className="p-8 space-y-6 bg-gray-50 rounded-lg">
      <h2 className="text-2xl font-bold">Hook Verification</h2>

      {/* Network Enforcement */}
      <div className="p-4 bg-white rounded shadow">
        <h3 className="font-semibold mb-2">useNetworkEnforcement</h3>
        <div className="space-y-1 text-sm">
          <p>Connected: {networkState.isConnected ? '✅' : '❌'}</p>
          <p>Correct Network: {networkState.isCorrectNetwork ? '✅' : '❌'}</p>
          <p>Current Chain ID: {networkState.currentChainId || 'N/A'}</p>
          <p>Required Chain ID: {networkState.requiredChainId}</p>
          <p>Needs Connection: {networkState.needsConnection ? '⚠️' : '✅'}</p>
          <p>Needs Network Switch: {networkState.needsNetworkSwitch ? '⚠️' : '✅'}</p>
        </div>
      </div>

      {/* Lottery Manager */}
      <div className="p-4 bg-white rounded shadow">
        <h3 className="font-semibold mb-2">useIsLotteryManager</h3>
        <div className="space-y-1 text-sm">
          <p>Is Manager: {isManager ? '✅' : '❌'}</p>
          <p>Loading: {isLoadingManager ? '⏳' : '✅'}</p>
        </div>
      </div>

      {/* Friendly Time */}
      <div className="p-4 bg-white rounded shadow">
        <h3 className="font-semibold mb-2">useFriendlyTime</h3>
        <div className="space-y-1 text-sm">
          <p>Friendly Text: {friendlyText}</p>
          <p>Is Past: {isPast ? '✅' : '❌'}</p>
          <p>Time Remaining: {timeRemaining}s</p>
        </div>
      </div>

      {/* User Participations */}
      <div className="p-4 bg-white rounded shadow">
        <h3 className="font-semibold mb-2">useUserParticipations</h3>
        <div className="space-y-1 text-sm">
          <p>Has Participations: {hasParticipations ? '✅' : '❌'}</p>
          <p>Loading: {isLoadingParticipations ? '⏳' : '✅'}</p>
          <p>Participations Count: {participations.length}</p>
          <p>Unclaimed Winnings: {unclaimedWinnings.length}</p>
        </div>
      </div>
    </div>
  );
}
