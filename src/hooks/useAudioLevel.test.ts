import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAudioLevel } from './useAudioLevel';

const originalMediaDevices = Object.getOwnPropertyDescriptor(
  navigator,
  'mediaDevices',
);

function setGetUserMedia(
  getUserMedia: (constraints?: MediaStreamConstraints) => Promise<MediaStream>,
): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
}

function makeStream() {
  const stop = vi.fn();
  const stream = {
    getTracks: () => [{ stop }],
  } as unknown as MediaStream;
  return { stop, stream };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (originalMediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
  } else {
    Reflect.deleteProperty(navigator, 'mediaDevices');
  }
});

describe('microphone lifecycle', () => {
  it('releases an acquired stream when audio setup fails partway through', async () => {
    const { stop, stream } = makeStream();
    const disconnectSource = vi.fn();
    const closeContext = vi.fn().mockResolvedValue(undefined);

    class PartiallyWorkingAudioContext {
      close = closeContext;

      createMediaStreamSource() {
        return {
          connect: vi.fn(),
          disconnect: disconnectSource,
        };
      }

      createAnalyser(): never {
        throw new Error('analyser initialization failed');
      }
    }

    setGetUserMedia(vi.fn().mockResolvedValue(stream));
    vi.stubGlobal('AudioContext', PartiallyWorkingAudioContext);
    const { result } = renderHook(() => useAudioLevel());

    await act(async () => {
      await result.current.enableMicrophone();
    });

    expect(result.current.inputState).toBe('unavailable');
    expect(stop).toHaveBeenCalledOnce();
    expect(disconnectSource).toHaveBeenCalledOnce();
    expect(closeContext).toHaveBeenCalledOnce();
  });

  it('stops a stream that arrives after the hook has unmounted', async () => {
    const { stop, stream } = makeStream();
    let resolveStream: ((value: MediaStream) => void) | undefined;
    const pendingStream = new Promise<MediaStream>((resolve) => {
      resolveStream = resolve;
    });
    setGetUserMedia(vi.fn().mockReturnValue(pendingStream));
    const { result, unmount } = renderHook(() => useAudioLevel());
    let enablePromise = Promise.resolve();

    act(() => {
      enablePromise = result.current.enableMicrophone();
    });
    unmount();
    resolveStream?.(stream);
    await act(async () => {
      await enablePromise;
    });

    expect(stop).toHaveBeenCalledOnce();
  });
});
