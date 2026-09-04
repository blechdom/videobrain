import { createContext } from 'react';
import type { AudioInputState } from '../hooks/useAudioLevel';
import type {
  VideoFacingMode,
  VideoInputState,
} from '../hooks/useVideoInput';

export interface OperatorInputRuntime {
  audio: {
    inputState: AudioInputState;
    meterLevel: number;
    enable: () => Promise<void>;
    disable: () => void;
  };
  video: {
    inputState: VideoInputState;
    errorMessage: string | null;
    facingMode: VideoFacingMode;
    enable: (facingMode: VideoFacingMode) => Promise<void>;
    disable: () => void;
  };
}

export const OperatorInputRuntimeContext =
  createContext<OperatorInputRuntime | null>(null);
