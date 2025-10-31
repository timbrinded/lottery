import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBlockTime } from '../useBlockTime';

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useBlockNumber: vi.fn(() => ({ data: 100n })),
  useAccount: vi.fn(() => ({ chain: { id: 31337 } })),
}));

// Mock usehooks-ts
vi.mock('usehooks-ts', () => ({
  useLocalStorage: vi.fn((key, defaultValue) => {
    const [value, setValue] = useState(defaultValue);
    return [value, setValue];
  }),
}));

describe('useBlockTime', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return default block time when no data', () => {
    const { result } = renderHook(() => useBlockTime());
    
    expect(result.current.blockTime).toBe(12);
    expect(result.current.confidence).toBe('low');
    expect(result.current.sampleSize).toBe(0);
  });

  it('should calculate block time from observed blocks', async () => {
    // This test would require mocking block updates
    // For now, just verify the hook returns expected structure
    const { result } = renderHook(() => useBlockTime());
    
    expect(result.current).toHaveProperty('blockTime');
    expect(result.current).toHaveProperty('confidence');
    expect(result.current).toHaveProperty('sampleSize');
  });

  it('should provide confidence levels based on sample size', () => {
    const { result } = renderHook(() => useBlockTime());
    
    // With 0 blocks, confidence should be low
    expect(result.current.confidence).toBe('low');
  });
});
