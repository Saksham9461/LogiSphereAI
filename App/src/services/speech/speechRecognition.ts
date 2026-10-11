import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechRecognizedEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';
import { PermissionsAndroid, Platform } from 'react-native';

export type SpeechErrorCode =
  | 'PERMISSION_DENIED'
  | 'SPEECH_UNAVAILABLE'
  | 'NO_SPEECH_DETECTED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'SERVICE_ERROR';

export interface SpeechListenerCallbacks {
  onStart?: () => void;
  onPartialResult?: (partialText: string) => void;
  onResult?: (finalText: string) => void;
  onError?: (code: SpeechErrorCode, message: string) => void;
  onEnd?: () => void;
}

export class NativeSpeechService {
  private isListening: boolean = false;
  private isStarting: boolean = false;
  private isStopping: boolean = false;
  private locale: string = 'en-US';
  private callbacks: SpeechListenerCallbacks = {};
  private currentTranscript: string = '';
  private isInitialized: boolean = false;
  private resultDelivered: boolean = false;
  private activeSessionToken: number = 0;

  constructor() {
    this.initVoiceListeners();
  }

  private initVoiceListeners() {
    if (this.isInitialized) return;

    Voice.onSpeechStart = this.onSpeechStart.bind(this);
    Voice.onSpeechRecognized = this.onSpeechRecognized.bind(this);
    Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
    Voice.onSpeechError = this.onSpeechError.bind(this);
    Voice.onSpeechResults = this.onSpeechResults.bind(this);
    Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);

    this.isInitialized = true;
  }

  private onSpeechStart(e: SpeechStartEvent) {
    if (__DEV__) console.log('[Voice] onSpeechStart');
    this.isListening = true;
    this.isStarting = false;
    this.callbacks.onStart?.();
  }

  private onSpeechRecognized(e: SpeechRecognizedEvent) {
    if (__DEV__) console.log('[Voice] onSpeechRecognized');
  }

  private onSpeechEnd(e: SpeechEndEvent) {
    if (__DEV__) console.log('[Voice] onSpeechEnd');
    this.isListening = false;
    this.callbacks.onEnd?.();

    // If final results haven't been delivered via onSpeechResults yet,
    // but we captured a partial transcript during the speech segment, deliver it cleanly.
    if (!this.resultDelivered && this.currentTranscript && this.currentTranscript.trim().length > 0) {
      this.resultDelivered = true;
      const textToDeliver = this.currentTranscript.trim();
      if (__DEV__) console.log('[Voice] Delivering best transcript on end:', textToDeliver);
      this.callbacks.onResult?.(textToDeliver);
    }
  }

  private onSpeechError(e: SpeechErrorEvent) {
    if (__DEV__) console.log('[Voice] onSpeechError:', e);

    // If result was already delivered or we have captured valid transcript,
    // do not disrupt the form with an error.
    if (this.resultDelivered) {
      this.isListening = false;
      this.isStarting = false;
      return;
    }

    if (this.currentTranscript && this.currentTranscript.trim().length > 0) {
      this.isListening = false;
      this.isStarting = false;
      this.resultDelivered = true;
      this.callbacks.onResult?.(this.currentTranscript.trim());
      return;
    }

    const errorObj = e?.error;
    const errorMsg = typeof errorObj === 'string' ? errorObj : (errorObj?.message || errorObj?.code || '');
    const errorCodeStr = String(errorObj?.code || errorMsg);

    // If a transient disconnect/busy error (11, 8, 5) arrives while the engine is starting up,
    // it is a leftover artifact from previous session cancel/teardown.
    // Do NOT abort the starting session!
    if (this.isStarting || !this.isListening) {
      if (errorCodeStr.includes('11') || errorCodeStr.includes('8') || errorCodeStr.includes('5')) {
        if (__DEV__) console.log('[Voice] Ignoring transient cleanup error during startup:', errorCodeStr);
        return;
      }
    }

    this.isListening = false;
    this.isStarting = false;

    let code: SpeechErrorCode = 'SERVICE_ERROR';
    if (errorCodeStr.includes('9') || errorCodeStr.toLowerCase().includes('permission')) {
      code = 'PERMISSION_DENIED';
    } else if (
      errorCodeStr.includes('7') ||
      errorCodeStr.includes('6') ||
      errorCodeStr.toLowerCase().includes('no match') ||
      errorCodeStr.toLowerCase().includes('no speech')
    ) {
      code = 'NO_SPEECH_DETECTED';
    } else if (errorCodeStr.includes('SPEECH_UNAVAILABLE')) {
      code = 'SPEECH_UNAVAILABLE';
    }

    this.callbacks.onError?.(code, String(errorMsg || 'Speech recognition error.'));
  }

  private onSpeechResults(e: SpeechResultsEvent) {
    if (__DEV__) console.log('[Voice] onSpeechResults:', e.value);
    if (e.value && e.value.length > 0) {
      const topResult = e.value[0]?.trim();
      if (topResult && topResult.length > 0) {
        this.currentTranscript = topResult;
        if (!this.resultDelivered) {
          this.resultDelivered = true;
          this.callbacks.onResult?.(topResult);
        }
      }
    }
  }

  private onSpeechPartialResults(e: SpeechResultsEvent) {
    if (__DEV__) console.log('[Voice] onSpeechPartialResults:', e.value);
    if (e.value && e.value.length > 0) {
      const partialText = e.value[0]?.trim();
      if (partialText && partialText.length > 0) {
        this.currentTranscript = partialText;
        this.callbacks.onPartialResult?.(partialText);
      }
    }
  }

  public clearCallbacks(): void {
    this.callbacks = {};
  }

  public getBestTranscript(): string {
    return (this.currentTranscript || '').trim();
  }

  public setLocale(locale: string) {
    this.locale = locale;
  }

  public getLocale(): string {
    return this.locale;
  }

  public async requestMicrophonePermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const alreadyGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (alreadyGranted) return true;

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'LogiSphere AI needs microphone access for voice driver registration.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[Voice] Permission request error:', err);
        return false;
      }
    }
    return true;
  }

  public async isSpeechAvailable(): Promise<boolean> {
    try {
      if (Voice && typeof Voice.isAvailable === 'function') {
        const available = await Voice.isAvailable();
        return available === 1;
      }
      return true;
    } catch {
      return true;
    }
  }

  public async startListening(
    callbacks: SpeechListenerCallbacks,
    localeOverride?: string
  ): Promise<void> {
    const sessionToken = ++this.activeSessionToken;
    const activeLocale = localeOverride || this.locale || 'en-IN';
    if (__DEV__) console.log(`[Voice] startListening requested (locale: ${activeLocale})`);

    this.callbacks = callbacks;
    this.currentTranscript = '';
    this.resultDelivered = false;

    // Check permission first
    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission) {
      if (sessionToken === this.activeSessionToken) {
        this.callbacks.onError?.('PERMISSION_DENIED', 'Microphone permission was denied.');
      }
      return;
    }

    if (this.isStarting || this.isListening) {
      if (__DEV__) console.log('[Voice] Already active, cleaning up previous session before starting fresh');
      try {
        await Voice.cancel();
      } catch (e) {}
      this.isListening = false;
      this.isStarting = false;
      await new Promise<void>(resolve => setTimeout(() => resolve(), 150));
    }

    this.isStarting = true;
    this.initVoiceListeners();

    try {
      const options = {
        EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
        EXTRA_MAX_RESULTS: 5,
        EXTRA_PARTIAL_RESULTS: true,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 6000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 6000,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 2500,
        REQUEST_PERMISSIONS_AUTO: true,
      };

      try {
        await Voice.start(activeLocale, options);
      } catch (err) {
        if (__DEV__) console.log(`[Voice] Start failed with ${activeLocale}, trying en-US...`);
        await Voice.start('en-US', options);
      }

      this.isListening = true;
      if (__DEV__) console.log('[Voice] Voice started successfully');
    } catch (err: any) {
      if (__DEV__) console.log('[Voice] Exception starting voice:', err);
      this.isListening = false;
      if (sessionToken === this.activeSessionToken) {
        this.callbacks.onError?.('SERVICE_ERROR', err?.message || 'Failed to start speech recognition.');
      }
    } finally {
      this.isStarting = false;
    }
  }

  public async stopListening(): Promise<void> {
    if (this.isStopping) return;
    this.isStopping = true;
    if (__DEV__) console.log('[Voice] stopListening requested');

    try {
      await Voice.stop();
    } catch (err) {
      if (__DEV__) console.log('[Voice] Error calling Voice.stop():', err);
    } finally {
      this.isListening = false;
      this.isStarting = false;
      this.isStopping = false;

      const finalVal = this.getBestTranscript();
      if (!this.resultDelivered && finalVal.length > 0) {
        this.resultDelivered = true;
        this.callbacks.onResult?.(finalVal);
      } else if (!this.resultDelivered) {
        this.callbacks.onError?.('NO_SPEECH_DETECTED', 'No speech detected before stopping.');
      }
      this.callbacks.onEnd?.();
    }
  }

  public async cancel(): Promise<void> {
    this.activeSessionToken++;
    this.callbacks = {}; // Detach listeners first to prevent stale updates
    if (__DEV__) console.log('[Voice] cancel requested');

    try {
      await Voice.cancel();
    } catch (err) {
      if (__DEV__) console.log('[Voice] Error calling Voice.cancel():', err);
    } finally {
      this.isListening = false;
      this.isStarting = false;
      this.isStopping = false;
      this.resultDelivered = false;
      this.currentTranscript = '';
    }
  }

  public async destroy(): Promise<void> {
    this.activeSessionToken++;
    this.callbacks = {}; // Detach listeners first
    if (__DEV__) console.log('[Voice] destroy requested');

    try {
      await Voice.destroy();
      Voice.removeAllListeners();
      this.isInitialized = false;
    } catch (err) {
      if (__DEV__) console.log('[Voice] Error calling Voice.destroy():', err);
    } finally {
      this.isListening = false;
      this.isStarting = false;
      this.isStopping = false;
      this.resultDelivered = false;
      this.currentTranscript = '';
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getCurrentTranscript(): string {
    return this.getBestTranscript();
  }
}

export const speechService = new NativeSpeechService();
export default speechService;
