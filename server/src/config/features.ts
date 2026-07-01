import { env } from './env';

/**
 * Single source of truth for isolated, backend-controlled feature toggles.
 * Consumed by both the REST layer (GET /api/features) and the socket layer
 * (call signaling handlers are only registered when a call feature is on).
 */
export interface FeatureFlags {
  voiceCall: boolean;
  videoCall: boolean;
}

export function getFeatures(): FeatureFlags {
  return {
    voiceCall: env.features.voiceCall,
    videoCall: env.features.videoCall,
  };
}

export function anyCallEnabled(): boolean {
  const f = getFeatures();
  return f.voiceCall || f.videoCall;
}
