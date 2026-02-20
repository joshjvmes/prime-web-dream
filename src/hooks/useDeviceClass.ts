import { useState, useEffect } from 'react';

export type DeviceClass = 'mobile' | 'tablet' | 'desktop';

const MOBILE_MAX = 767;
const TABLET_MAX = 1024;

export function useDeviceClass(): DeviceClass {
  const [device, setDevice] = useState<DeviceClass>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w <= MOBILE_MAX) return 'mobile';
    if (w <= TABLET_MAX) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const tabletQuery = window.matchMedia(`(min-width: ${MOBILE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`);

    const update = () => {
      if (mobileQuery.matches) setDevice('mobile');
      else if (tabletQuery.matches) setDevice('tablet');
      else setDevice('desktop');
    };

    mobileQuery.addEventListener('change', update);
    tabletQuery.addEventListener('change', update);
    return () => {
      mobileQuery.removeEventListener('change', update);
      tabletQuery.removeEventListener('change', update);
    };
  }, []);

  return device;
}
