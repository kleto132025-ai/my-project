import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

let coinPlayer: AudioPlayer | null = null;

export function playCoinSound(): void {
  try {
    if (!coinPlayer) {
      coinPlayer = createAudioPlayer(require('../../assets/sounds/coin.wav'));
    }
    coinPlayer.seekTo(0);
    coinPlayer.play();
  } catch {
    // Sound playback is best-effort; ignore failures (e.g. unsupported platform).
  }
}
