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
  private shouldKeepListening: boolean = false;
  private locale: string = 'en-IN';
  private callbacks: SpeechListenerCallbacks = {};
  private currentTranscript: string = '';
  private accumulatedTranscript: string = '';
  private isInitialized: boolean = false;
  private restartTimer: any = null;

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
    if (__DEV__) console.log('[Voice] Speech listening active');
    this.isListening = true;
    this.isStarting = false;
    this.callbacks.onStart?.();
  }

  private onSpeechRecognized(e: SpeechRecognizedEvent) {
    if (__DEV__) console.log('[Voice] Speech recognized');
  }

  private onSpeechEnd(e: SpeechEndEvent) {
    if (__DEV__) console.log('[Voice] Speech segment ended');
    this.isListening = false;

    // If user explicitly pressed STOP, finalize session
    if (!this.shouldKeepListening) {
      if (__DEV__) console.log('[Voice] User stopped listening -> staying stopped');
      const finalVal = this.getBestTranscript();
      if (finalVal.length > 0) {
        this.callbacks.onResult?.(finalVal);
      } else {
        this.callbacks.onError?.('NO_SPEECH_DETECTED', 'No speech detected.');
      }
      this.callbacks.onEnd?.();
      return;
    }

    // User is STILL listening! Auto-restart speech engine segment
    if (__DEV__) console.log('[Voice] Segment ended due to silence, user still listening -> auto-restarting segment');
    this.scheduleAutoRestart();
  }

  private onSpeechError(e: SpeechErrorEvent) {
    if (__DEV__) console.log('[Voice] Speech error event:', e);
    this.isListening = false;

    if (!this.shouldKeepListening) {
      const errorObj = e.error;
      const errorMsg = typeof errorObj === 'string' ? errorObj : (errorObj?.message || errorObj?.code || '');
      let errorCode: SpeechErrorCode = 'SERVICE_ERROR';
      if (String(errorMsg).includes('permission') || errorObj?.code === '9') {
        errorCode = 'PERMISSION_DENIED';
      } else if (
        errorObj?.code === '7' ||
        errorObj?.code === '6' ||
        String(errorMsg).includes('No match') ||
        String(errorMsg).includes('7')
      ) {
        errorCode = 'NO_SPEECH_DETECTED';
      }
      this.callbacks.onError?.(errorCode, 'Speech recognition error.');
      this.callbacks.onEnd?.();
      return;
    }

    // User is STILL listening! Recover automatically
    if (__DEV__) console.log('[Voice] Recoverable error while user is listening -> auto-restarting');
    this.scheduleAutoRestart();
  }

  private scheduleAutoRestart() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
    }

    this.restartTimer = setTimeout(async () => {
      if (!this.shouldKeepListening) return;
      await this.restartEngineInternal();
    }, 300);
  }

  private async restartEngineInternal() {
    if (!this.shouldKeepListening || this.isStarting) return;
    this.isStarting = true;

    try {
      await Voice.cancel().catch(() => {});
      await Voice.destroy().catch(() => {});
      this.isInitialized = false;
      this.initVoiceListeners();

      const options = {
        EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
        EXTRA_MAX_RESULTS: 5,
        EXTRA_PARTIAL_RESULTS: true,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 3000,
        REQUEST_PERMISSIONS_AUTO: true,
      };

      try {
        await Voice.start(this.locale, options);
      } catch (e) {
        await Voice.start('en-US', options);
      }
      this.isListening = true;
      if (__DEV__) console.log('[Voice] Engine segment restarted successfully');
    } catch (err) {
      if (__DEV__) console.log('[Voice] Exception restarting engine:', err);
    } finally {
      this.isStarting = false;
    }
  }

  private onSpeechResults(e: SpeechResultsEvent) {
    if (__DEV__) console.log('[Voice] Final Speech Results:', e.value);
    if (e.value && e.value.length > 0) {
      const topResult = e.value[0]?.trim();
      if (topResult && topResult.length > 0) {
        this.updateAccumulatedTranscript(topResult);
      }
    }
  }

  private onSpeechPartialResults(e: SpeechResultsEvent) {
    if (__DEV__) console.log('[Voice] Partial Speech Results:', e.value);
    if (e.value && e.value.length > 0) {
      const partialText = e.value[0]?.trim();
      if (partialText && partialText.length > 0) {
        this.updateAccumulatedTranscript(partialText);
      }
    }
  }

  private updateAccumulatedTranscript(text: string) {
    if (!text) return;

    if (this.accumulatedTranscript && !text.toLowerCase().startsWith(this.accumulatedTranscript.toLowerCase())) {
      if (!this.accumulatedTranscript.toLowerCase().includes(text.toLowerCase())) {
        this.accumulatedTranscript = `${this.accumulatedTranscript} ${text}`.trim();
      }
    } else {
      this.accumulatedTranscript = text;
    }

    this.currentTranscript = this.accumulatedTranscript;
    this.callbacks.onPartialResult?.(this.accumulatedTranscript);
  }

  public clearCallbacks(): void {
    this.callbacks = {};
  }

  public getBestTranscript(): string {
    return (this.accumulatedTranscript || this.currentTranscript || '').trim();
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

  public async startListening(
    callbacks: SpeechListenerCallbacks,
    localeOverride?: string
  ): Promise<void> {
    const activeLocale = localeOverride || this.locale || 'en-IN';
    if (__DEV__) console.log(`[Voice] Start requested (locale: ${activeLocale})`);

    this.shouldKeepListening = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.currentTranscript = '';
    this.accumulatedTranscript = '';
    this.callbacks = callbacks;

    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission) {
      this.shouldKeepListening = false;
      this.callbacks.onError?.('PERMISSION_DENIED', 'Microphone permission was denied.');
      return;
    }

    if (this.isStarting || this.isListening) {
      if (__DEV__) console.log('[Voice] Already starting or listening, ignoring duplicate start');
      return;
    }

    this.isStarting = true;
    try {
      await Voice.cancel().catch(() => {});
      await Voice.destroy().catch(() => {});
      this.isInitialized = false;
      this.initVoiceListeners();

      const options = {
        EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
        EXTRA_MAX_RESULTS: 5,
        EXTRA_PARTIAL_RESULTS: true,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 3000,
        REQUEST_PERMISSIONS_AUTO: true,
      };

      try {
        await Voice.start(activeLocale, options);
      } catch (e) {
        if (__DEV__) console.log(`[Voice] ${activeLocale} start failed, trying en-US...`);
        await Voice.start('en-US', options);
      }
      this.isListening = true;
      if (__DEV__) console.log('[Voice] Voice engine started successfully');
    } catch (err: any) {
      if (__DEV__) console.log('[Voice] Exception starting voice:', err);
      this.isListening = false;
      this.shouldKeepListening = false;
      this.callbacks.onError?.('SERVICE_ERROR', err?.message || 'Failed to start speech engine.');
    } finally {
      this.isStarting = false;
    }
  }

  public async stopListening(): Promise<void> {
    if (__DEV__) console.log('[Voice] User explicitly pressed STOP');
    this.shouldKeepListening = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    try {
      await Voice.stop();
    } catch (err) {
      if (__DEV__) console.log('[Voice] Error stopping voice:', err);
    } finally {
      this.isListening = false;
      this.isStarting = false;

      const finalVal = this.getBestTranscript();
      if (finalVal.length > 0) {
        this.callbacks.onResult?.(finalVal);
      } else {
        this.callbacks.onError?.('NO_SPEECH_DETECTED', 'No speech detected before stopping.');
      }
      this.callbacks.onEnd?.();
    }
  }

  public async cancel(): Promise<void> {
    if (__DEV__) console.log('[Voice] Cancelling speech session');
    this.shouldKeepListening = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.callbacks = {};
    try {
      await Voice.cancel();
    } catch (err) {
      if (__DEV__) console.log('[Voice] Error cancelling voice:', err);
    } finally {
      this.isListening = false;
      this.isStarting = false;
      this.currentTranscript = '';
      this.accumulatedTranscript = '';
    }
  }

  public async destroy(): Promise<void> {
    if (__DEV__) console.log('[Voice] Destroying voice service instance');
    this.shouldKeepListening = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.callbacks = {};
    try {
      await Voice.destroy();
      Voice.removeAllListeners();
      this.isInitialized = false;
    } catch (err) {
      if (__DEV__) console.log('[Voice] Error destroying voice:', err);
    } finally {
      this.isListening = false;
      this.isStarting = false;
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getShouldKeepListening(): boolean {
    return this.shouldKeepListening;
  }

  public getCurrentTranscript(): string {
    return this.getBestTranscript();
  }
}

export const speechService = new NativeSpeechService();
