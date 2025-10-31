import { useEffect } from 'react';
import { useBlockNumber, useAccount } from 'wagmi';
import { useLocalStorage } from 'usehooks-ts';

interface BlockRecord {
  number: string; // Store as string to avoid BigInt serialization issues
  timestamp: number; // milliseconds
}

interface ChainBlockTimeData {
  [chainId: number]: {
    blocks: BlockRecord[];
    lastUpdated: number;
  };
}

export interface UseBlockTimeReturn {
  blockTime: number; // Average block time in seconds
  confidence: 'low' | 'medium' | 'high';
  sampleSize: number;
}

/**
 * Hook to calculate actual block time based on observed blocks
 * Tracks block history per chain and calculates rolling average
 * Uses median to handle outliers
 * 
 * @returns {UseBlockTimeReturn} Block time data with confidence indicator
 */
export function useBlockTime(): UseBlockTimeReturn {
  const { chain } = useAccount();
  const { data: currentBlock } = useBlockNumber({ watch: true });
  const [data, setData] = useLocalStorage<ChainBlockTimeData>('blockTimeData', {});

  const chainId = chain?.id || 31337; // Default to localhost
  const chainData = data[chainId] || { blocks: [], lastUpdated: 0 };

  useEffect(() => {
    if (!currentBlock) return;

    const now = Date.now();
    const newBlock: BlockRecord = { 
      number: currentBlock.toString(), 
      timestamp: now 
    };

    // Add new block and keep last 20
    const updatedBlocks = [...chainData.blocks, newBlock].slice(-20);

    setData({
      ...data,
      [chainId]: {
        blocks: updatedBlocks,
        lastUpdated: now,
      },
    });
  }, [currentBlock, chainId]);

  // Calculate median block time from observed blocks
  const calculateBlockTime = (): number => {
    if (chainData.blocks.length < 2) return 12; // Default fallback

    const intervals: number[] = [];
    
    for (let i = 1; i < chainData.blocks.length; i++) {
      const timeDiff = chainData.blocks[i].timestamp - chainData.blocks[i - 1].timestamp;
      const blockDiff = BigInt(chainData.blocks[i].number) - BigInt(chainData.blocks[i - 1].number);

      if (blockDiff > 0) {
        // Convert to seconds per block
        const secondsPerBlock = timeDiff / Number(blockDiff) / 1000;
        
        // Filter out extreme outliers (>60s or <0.1s)
        if (secondsPerBlock > 0.1 && secondsPerBlock < 60) {
          intervals.push(secondsPerBlock);
        }
      }
    }

    if (intervals.length === 0) return 12;

    // Calculate median to handle outliers
    intervals.sort((a, b) => a - b);
    const mid = Math.floor(intervals.length / 2);
    const median = intervals.length % 2 === 0
      ? (intervals[mid - 1] + intervals[mid]) / 2
      : intervals[mid];

    return median;
  };

  const blockTime = calculateBlockTime();
  
  // Determine confidence based on sample size
  let confidence: 'low' | 'medium' | 'high';
  if (chainData.blocks.length >= 10) {
    confidence = 'high';
  } else if (chainData.blocks.length >= 3) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    blockTime: Math.round(blockTime * 10) / 10, // Round to 1 decimal
    confidence,
    sampleSize: chainData.blocks.length,
  };
}
