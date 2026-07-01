import { create } from 'zustand';
import { featuresApi } from '../api';
import { FeatureFlags } from '../types';

interface FeaturesState extends FeatureFlags {
  loaded: boolean;
  load: () => Promise<void>;
}

export const useFeaturesStore = create<FeaturesState>((set) => ({
  voiceCall: false,
  videoCall: false,
  loaded: false,
  load: async () => {
    try {
      const f = await featuresApi.get();
      set({ ...f, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
