import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Mic, X, AlertTriangle, PenTool, RefreshCw, Square } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { rf } from '../../theme/responsive';
import {
  VoiceStepState,
  DEFAULT_DRIVER_VOICE_FIELDS,
  DriverVoiceFormData,
} from '../../types/driverVoice';
import { speechService } from '../../services/speech/speechRecognition';
import { normalizeFieldValue } from '../../utils/driverVoiceNormalizer';
import { validateDriverField, validateFullDriverForm } from '../../utils/driverValidation';
import { VoiceProgress } from './VoiceProgress';
import { VoiceListeningIndicator } from './VoiceListeningIndicator';
import { VoiceQuestion } from './VoiceQuestion';
import { VoiceResultCard } from './VoiceResultCard';
import { DriverReview } from './DriverReview';
import useDriverStore from '../../store/DriverStore';

interface DriverVoiceRegistrationModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToManual: (prefilledData?: Partial<DriverVoiceFormData>) => void;
  onDriverCreated?: (credentials: { name: string; email: string; temporaryPassword: string }) => void;
}

export const DriverVoiceRegistrationModal: React.FC<DriverVoiceRegistrationModalProps> = ({
  visible,
  onClose,
  onSwitchToManual,
  onDriverCreated,
}) => {
  const { fetchDrivers, registerDriver } = useDriverStore();

  const [stepState, setStepState] = useState<VoiceStepState>('IDLE');
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [partialSpeechText, setPartialSpeechText] = useState('');
  const [rawSpeechText, setRawSpeechText] = useState('');
  const [normalizedValue, setNormalizedValue] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isEditingInline, setIsEditingInline] = useState(false);

  const [formData, setFormData] = useState<DriverVoiceFormData>({
    name: '',
    licenseNumber: '',
    licenseExpiry: '',
    contact: '',
    tripsCompleted: 0,
    safetyScore: 100,
    status: 'Available',
  });

  const fields = DEFAULT_DRIVER_VOICE_FIELDS;
  const currentField = fields[currentFieldIndex];

  const fieldIndexRef = useRef(currentFieldIndex);
  fieldIndexRef.current = currentFieldIndex;

  const stepStateRef = useRef<VoiceStepState>(stepState);
  stepStateRef.current = stepState;

  const isConfirmingRef = useRef(false);

  // Reset session state when modal opens
  useEffect(() => {
    if (visible) {
      setStepState('READY');
      setCurrentFieldIndex(0);
      setPartialSpeechText('');
      setRawSpeechText('');
      setNormalizedValue('');
      setValidationError('');
      setIsEditingInline(false);
      isConfirmingRef.current = false;
      setFormData({
        name: '',
        licenseNumber: '',
        licenseExpiry: '',
        contact: '',
        tripsCompleted: 0,
        safetyScore: 100,
        status: 'Available',
      });
    } else {
      speechService.cancel();
      speechService.destroy();
      setStepState('IDLE');
    }
  }, [visible]);

  // Clean up mic on unmount
  useEffect(() => {
    return () => {
      speechService.cancel();
      speechService.destroy();
    };
  }, []);

  /**
   * Start Listening Session for specific field index
   */
  const handleStartListeningForIndex = async (indexToListen: number) => {
    const activeFieldKey = fields[indexToListen].key;

    setStepState('REQUESTING_PERMISSION');
    setValidationError('');
    setPartialSpeechText('');
    setRawSpeechText('');
    setNormalizedValue('');
    setIsEditingInline(false);

    await speechService.startListening({
      onStart: () => {
        if (stepStateRef.current === 'COMPLETED' || stepStateRef.current === 'SAVING') return;
        setStepState('LISTENING');
        setValidationError('');
      },
      onPartialResult: (partialText: string) => {
        if (stepStateRef.current === 'COMPLETED' || stepStateRef.current === 'SAVING') return;
        if (fieldIndexRef.current !== indexToListen) return;

        const trimmed = (partialText || '').trim();
        if (trimmed.length > 0) {
          setValidationError(''); // Clear any old errors on speech detection
          setPartialSpeechText(trimmed);
          setRawSpeechText(trimmed);
          const parsed = normalizeFieldValue(activeFieldKey, trimmed);
          setNormalizedValue(parsed);
        }
      },
      onResult: (finalText: string) => {
        if (stepStateRef.current === 'COMPLETED' || stepStateRef.current === 'SAVING') return;
        if (fieldIndexRef.current !== indexToListen) return;

        const trimmed = (finalText || '').trim();
        if (trimmed.length > 0) {
          setValidationError('');
          setRawSpeechText(trimmed);
          const parsed = normalizeFieldValue(activeFieldKey, trimmed);
          setNormalizedValue(parsed);
        }
        if (!speechService.getShouldKeepListening() && stepStateRef.current === 'LISTENING') {
          setStepState('SHOWING_RESULT');
        }
      },
      onError: (code, message) => {
        if (stepStateRef.current === 'COMPLETED' || stepStateRef.current === 'SAVING') return;
        if (fieldIndexRef.current !== indexToListen) return;

        if (code === 'PERMISSION_DENIED') {
          setStepState('ERROR');
          Alert.alert(
            'Microphone Permission Required',
            'Microphone permission is required for voice registration. You can allow it in Settings or enter details manually.',
            [
              { text: 'Enter Manually', onPress: () => onSwitchToManual(formData) },
              { text: 'Try Again', onPress: () => handleStartListeningForIndex(fieldIndexRef.current) },
            ]
          );
        } else {
          // NEVER transition to ERROR screen if speech was already detected or continuous listening is active!
          if (!speechService.getShouldKeepListening() && !rawSpeechText && !normalizedValue && stepStateRef.current === 'LISTENING') {
            setStepState('ERROR');
            setValidationError('No speech detected. Would you like to try again?');
          }
        }
      },
      onEnd: () => {},
    });
  };

  const handleStartListening = () => {
    handleStartListeningForIndex(currentFieldIndex);
  };

  /**
   * User-Controlled Stop Listening
   */
  const handleStopListening = () => {
    speechService.stopListening();
    setStepState('SHOWING_RESULT');
  };

  /**
   * Called when user presses [ Confirm ] button for current field
   */
  const handleConfirmFieldValue = (finalValue: string) => {
    if (isConfirmingRef.current) return;
    isConfirmingRef.current = true;

    try {
      const valResult = validateDriverField(currentField.key, finalValue);
      if (!valResult.isValid) {
        setValidationError(valResult.error || 'Invalid value');
        isConfirmingRef.current = false;
        return;
      }

      const updatedForm = {
        ...formData,
        [currentField.key]: finalValue,
      };
      setFormData(updatedForm);

      // Move to next field or complete
      if (currentFieldIndex < fields.length - 1) {
        const nextIndex = currentFieldIndex + 1;
        setCurrentFieldIndex(nextIndex);
        setPartialSpeechText('');
        setRawSpeechText('');
        setNormalizedValue('');
        setValidationError('');
        setIsEditingInline(false);

        // Cancel previous speech session before starting next field
        speechService.cancel();

        setTimeout(() => {
          handleStartListeningForIndex(nextIndex);
          isConfirmingRef.current = false;
        }, 300);
      } else {
        // Final field (Mobile Number) confirmed! Cancel speech service so no dangling callbacks fire
        speechService.cancel();
        setStepState('COMPLETED');
        isConfirmingRef.current = false;
      }
    } catch (e) {
      isConfirmingRef.current = false;
    }
  };

  /**
   * Confirm details on final review screen and pass 4 values to Driver Registration bottomsheet
   */
  const handleSaveDriverToBackend = async () => {
    speechService.cancel();
    speechService.destroy();
    onSwitchToManual(formData);
  };

  const handleUpdateFieldInReview = (key: keyof DriverVoiceFormData, val: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: val,
    }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalContent}>
          {/* MODAL HEADER */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <View style={styles.micBadge}>
                <Mic size={rf(18)} color={colors.amber} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Add Driver with Voice</Text>
                <Text style={styles.modalSubtitle}>LogiSphere AI Conversational Assistant</Text>
              </View>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={rf(20)} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* CONTENT BODY */}
          {stepState === 'COMPLETED' || stepState === 'SAVING' ? (
            <DriverReview
              formData={formData}
              onUpdateField={handleUpdateFieldInReview}
              onBack={() => {
                setStepState('SHOWING_RESULT');
                setCurrentFieldIndex(fields.length - 1);
              }}
              onSave={handleSaveDriverToBackend}
              isSaving={stepState === 'SAVING'}
            />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
              {/* PROGRESS BAR */}
              <VoiceProgress
                currentIndex={currentFieldIndex}
                totalFields={fields.length}
                currentLabel={currentField.label}
              />

              {/* ASSISTANT QUESTION CARD */}
              <VoiceQuestion
                question={currentField.question}
                exampleSpoken={currentField.exampleSpoken}
              />

              {/* LISTENING & SPEECH INDICATOR */}
              {stepState === 'READY' || stepState === 'REQUESTING_PERMISSION' || stepState === 'LISTENING' || stepState === 'PROCESSING' ? (
                <View style={styles.centerContainer}>
                  <VoiceListeningIndicator
                    isListening={stepState === 'LISTENING'}
                    statusText={
                      stepState === 'LISTENING'
                        ? 'Listening continuously...'
                        : stepState === 'PROCESSING'
                        ? 'Processing voice input...'
                        : stepState === 'REQUESTING_PERMISSION'
                        ? 'Activating microphone...'
                        : 'Tap button to answer'
                    }
                    subText={stepState === 'LISTENING' ? 'Speak clearly now (Mic active)' : 'LogiSphere Speech Recognition'}
                    partialTranscript={partialSpeechText}
                  />

                  {stepState === 'READY' ? (
                    <Pressable style={styles.speakButton} onPress={handleStartListening}>
                      <Mic size={rf(20)} color="#1a1200" strokeWidth={2.5} />
                      <Text style={styles.speakButtonText}>Start Speaking</Text>
                    </Pressable>
                  ) : null}

                  {stepState === 'LISTENING' ? (
                    <Pressable style={styles.stopButton} onPress={handleStopListening}>
                      <Square size={rf(16)} color={colors.rose} fill={colors.rose} />
                      <Text style={styles.stopButtonText}>Stop Listening</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {/* SPEECH RESULT CARD (LIVE / REVIEW / EDIT / CONFIRM) */}
              {(normalizedValue || rawSpeechText || stepState === 'SHOWING_RESULT') && stepState !== 'ERROR' ? (
                <VoiceResultCard
                  rawSpeech={rawSpeechText}
                  normalizedValue={normalizedValue}
                  fieldLabel={currentField.label}
                  placeholder={currentField.placeholder}
                  isEditing={isEditingInline}
                  onRetry={handleStartListening}
                  onEditToggle={() => setIsEditingInline(prev => !prev)}
                  onConfirm={handleConfirmFieldValue}
                  validationError={validationError}
                />
              ) : null}

              {/* NO SPEECH DETECTED / ERROR STATE (ONLY IF NO SPEECH WAS CAPTURED AT ALL AND USER IS NOT LISTENING) */}
              {stepState === 'ERROR' && !normalizedValue && !rawSpeechText ? (
                <View style={styles.errorBox}>
                  <AlertTriangle size={rf(24)} color={colors.rose} />
                  <Text style={styles.errorBoxTitle}>No Speech Detected</Text>
                  <Text style={styles.errorBoxText}>
                    {validationError || 'We could not hear your answer. Please try speaking again or enter details manually.'}
                  </Text>
                  <View style={styles.errorActionsRow}>
                    <Pressable style={styles.retryBtnLarge} onPress={handleStartListening}>
                      <RefreshCw size={rf(16)} color={colors.textPrimary} />
                      <Text style={styles.retryBtnLargeText}>Try Again</Text>
                    </Pressable>
                    <Pressable style={styles.manualBtnLarge} onPress={() => onSwitchToManual(formData)}>
                      <PenTool size={rf(16)} color="#1a1200" />
                      <Text style={styles.manualBtnLargeText}>Enter Manually</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {/* MANUAL INPUT FALLBACK LINK */}
              {stepState !== 'ERROR' ? (
                <Pressable
                  style={styles.manualFallbackBtn}
                  onPress={() => onSwitchToManual(formData)}
                >
                  <PenTool size={rf(14)} color={colors.textMuted} />
                  <Text style={styles.manualFallbackText}>Switch to Manual Text Input</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rf(24),
    borderTopRightRadius: rf(24),
    padding: rf(20),
    paddingBottom: Platform.OS === 'android' ? rf(36) : rf(32),
    maxHeight: '92%',
    minHeight: '75%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: rf(16),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    marginBottom: rf(12),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rf(10),
  },
  micBadge: {
    width: rf(36),
    height: rf(36),
    borderRadius: rf(18),
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: rf(18),
    fontWeight: '800',
  },
  modalSubtitle: {
    color: colors.textMuted,
    fontSize: rf(12),
  },
  closeBtn: {
    padding: rf(6),
    borderRadius: rf(8),
    backgroundColor: colors.panel,
  },
  scrollBody: {
    paddingBottom: rf(20),
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: rf(12),
    gap: rf(12),
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.amber,
    paddingHorizontal: rf(24),
    paddingVertical: rf(12),
    borderRadius: rf(24),
    gap: rf(8),
    elevation: 3,
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  speakButtonText: {
    color: '#1a1200',
    fontSize: rf(15),
    fontWeight: '800',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251, 113, 133, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.4)',
    paddingHorizontal: rf(20),
    paddingVertical: rf(10),
    borderRadius: rf(20),
    gap: rf(8),
  },
  stopButtonText: {
    color: colors.rose,
    fontSize: rf(14),
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(16),
    padding: rf(20),
    alignItems: 'center',
    gap: rf(10),
    marginVertical: rf(16),
  },
  errorBoxTitle: {
    color: colors.textPrimary,
    fontSize: rf(16),
    fontWeight: '800',
  },
  errorBoxText: {
    color: colors.textMuted,
    fontSize: rf(13),
    textAlign: 'center',
    lineHeight: rf(18),
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: rf(12),
    marginTop: rf(8),
    width: '100%',
  },
  retryBtnLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: rf(44),
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rf(10),
    gap: rf(8),
  },
  retryBtnLargeText: {
    color: colors.textPrimary,
    fontSize: rf(14),
    fontWeight: '700',
  },
  manualBtnLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: rf(44),
    backgroundColor: colors.amber,
    borderRadius: rf(10),
    gap: rf(8),
  },
  manualBtnLargeText: {
    color: '#1a1200',
    fontSize: rf(14),
    fontWeight: '800',
  },
  manualFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rf(6),
    paddingVertical: rf(12),
    marginTop: rf(8),
  },
  manualFallbackText: {
    color: colors.textMuted,
    fontSize: rf(13),
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default DriverVoiceRegistrationModal;
