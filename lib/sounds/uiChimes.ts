import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

let modeReady = false;
let addPlayer: AudioPlayer | null = null;
let payPlayer: AudioPlayer | null = null;

async function ensureAudioMode(): Promise<void> {
  if (modeReady) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
      shouldRouteThroughEarpiece: false,
    });
    modeReady = true;
  } catch {
    // Silent fallback (e.g. web / permission edge cases)
  }
}

async function replay(player: AudioPlayer): Promise<void> {
  await player.seekTo(0);
  player.play();
}

/** Short high “ding” when an item lands in a cart. */
export async function playAddToCartChime(): Promise<void> {
  try {
    await ensureAudioMode();
    if (!addPlayer) {
      addPlayer = createAudioPlayer(require('../../assets/sounds/cart-add.wav'));
    }
    await replay(addPlayer);
  } catch {
    // ignore
  }
}

/** Lower, longer chime when checkout completes (success screen). */
export async function playPaymentSuccessChime(): Promise<void> {
  try {
    await ensureAudioMode();
    if (!payPlayer) {
      payPlayer = createAudioPlayer(require('../../assets/sounds/payment-success.wav'));
    }
    await replay(payPlayer);
  } catch {
    // ignore
  }
}
