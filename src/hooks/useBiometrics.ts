import { useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricsInfo {
  hasHardware: boolean;
  isEnrolled: boolean;
  hasFaceId: boolean;
  hasFingerprint: boolean;
}

export function useBiometrics(): BiometricsInfo {
  const [info, setInfo] = useState<BiometricsInfo>({
    hasHardware: false,
    isEnrolled: false,
    hasFaceId: false,
    hasFingerprint: false,
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (!isMounted) return;
      setInfo({
        hasHardware,
        isEnrolled,
        hasFaceId: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
        hasFingerprint: types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
      });
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return info;
}

export async function authenticateBiometric(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Отмена' });
  return result.success;
}
