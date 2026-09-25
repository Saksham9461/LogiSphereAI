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
  private locale: string = 'en-IN';
  private callbacks: SpeechListenerCallbacks = {};
  private currentTranscript: string = '';

  public setLocale(locale: string) {
    this.locale = locale;
  }

  public getLocale(): string {
    return this.locale;
  }

  /**
   * Request Microphone permissions
   */
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
        console.warn('Microphone permission error:', err);
        return false;
      }
    }
    return true; // iOS permission requested on active speech API call
  }

  /**
   * Start Speech Listening Session
   * NEVER AUTO-FILLS DEFAULT VALUES OR USES TIMEOUT FALLBACKS
   */
  public async startListening(
    callbacks: SpeechListenerCallbacks
  ): Promise<void> {
    if (this.isListening) {
      console.warn('Speech recognition session already active.');
      return;
    }

    this.callbacks = callbacks;
    this.currentTranscript = '';

    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission) {
      this.callbacks.onError?.('PERMISSION_DENIED', 'Microphone permission was denied.');
      return;
    }

    this.isListening = true;
    this.callbacks.onStart?.();
  }

  /**
   * Called when partial speech results arrive
   */
  public updatePartialResult(text: string): void {
    if (!this.isListening) return;
    this.currentTranscript = text;
    this.callbacks.onPartialResult?.(text);
  }

  /**
   * Stop Active Listening Session (Triggered by user or speech service)
   * Only returns a result if valid non-empty speech text exists!
   */
  public stopListening(): void {
    if (!this.isListening) return;
    this.isListening = false;

    const trimmed = (this.currentTranscript || '').trim();
    if (trimmed.length > 0) {
      this.callbacks.onResult?.(trimmed);
    } else {
      this.callbacks.onError?.('NO_SPEECH_DETECTED', 'No speech detected.');
    }
    this.callbacks.onEnd?.();
  }

  /**
   * Explicitly submit recognized text if available
   */
  public submitText(text: string): void {
    this.isListening = false;
    const trimmed = (text || '').trim();
    if (trimmed.length > 0) {
      this.callbacks.onResult?.(trimmed);
    } else {
      this.callbacks.onError?.('NO_SPEECH_DETECTED', 'No speech detected.');
    }
    this.callbacks.onEnd?.();
  }

  /**
   * Cancel Session and release resources
   */
  public cancel(): void {
    this.isListening = false;
    this.currentTranscript = '';
    this.callbacks = {};
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getCurrentTranscript(): string {
    return this.currentTranscript;
  }
}

export const speechService = new NativeSpeechService();
