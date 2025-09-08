import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

export default function ResidentChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', text: 'Hi! Need help with schedules, sorting, or reporting?' }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  const scrollToEnd = useCallback(() => {
    if (listRef.current) listRef.current.scrollToEnd({ animated: true });
  }, []);

  async function getGeminiResponseLocal(p) {
    const BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';
    const GEMINI_PROXY_URL = `${BASE_URL}/api/gemini`;
    const controller = new AbortController();
    const TIMEOUT_MS = 15000;
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(GEMINI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`Bad response: ${res.status}`);
      }
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not respond.';
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  const handleSend = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || sending) return;
    setSending(true);
    setInput('');

    const userMessage = { id: `${Date.now()}-user`, role: 'user', text: prompt };
    setMessages(prev => [...prev, userMessage]);
    requestAnimationFrame(scrollToEnd);

    try {
      const reply = await getGeminiResponseLocal(prompt);
      const assistantMessage = { id: `${Date.now()}-assistant`, role: 'assistant', text: reply };
      setMessages(prev => [...prev, assistantMessage]);
      requestAnimationFrame(scrollToEnd);
    } catch (e) {
      const errorText = e?.name === 'AbortError'
        ? 'The request timed out. Please check your connection and try again.'
        : 'Sorry, something went wrong. Please try again.';
      const errorMessage = { id: `${Date.now()}-error`, role: 'assistant', text: errorText };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  }, [input, sending, scrollToEnd]);

  return (
    <>
      {/* Floating bubble */}
      <View pointerEvents="box-none" style={styles.fabContainer}>
        <TouchableOpacity onPress={() => setOpen(true)} style={styles.fab} accessibilityRole="button" accessibilityLabel="Open chat">
          <FontAwesome5 name="android" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Chat panel as modal overlay */}
      <Modal visible={open} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          {/* Scrim that does not cover the tab bar area */}
          <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.select({ ios: 'padding', android: undefined })}
            keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
            style={styles.sheet}
          >
            <ThemedView style={styles.sheetInner}>
              <View style={styles.sheetHeader}>
                <ThemedText type="title">Assistant</ThemedText>
                <Pressable onPress={() => setOpen(false)} style={styles.closeBtn}>
                  <ThemedText type="defaultSemiBold">Close</ThemedText>
                </Pressable>
              </View>

              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isUser = item.role === 'user';
                  return (
                    <View style={[styles.messageRow, isUser ? styles.rowEnd : styles.rowStart]}>
                      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                        <ThemedText type="default" style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
                          {item.text}
                        </ThemedText>
                      </View>
                    </View>
                  );
                }}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={scrollToEnd}
                onLayout={scrollToEnd}
              />

              <View style={styles.inputBar}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Type your message..."
                  placeholderTextColor="#9AA0A6"
                  multiline
                  style={styles.input}
                  editable={!sending}
                />
                <TouchableOpacity style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]} onPress={handleSend} disabled={!canSend}>
                  {sending ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText type="defaultSemiBold" style={styles.sendText}>Send</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </ThemedView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 84,
  },
  fab: {
    backgroundColor: '#22c55e',
    borderRadius: 28,
    height: 56,
    minWidth: 56,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }
  },
  fabText: {
    color: '#ffffff'
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  sheet: {
    width: '100%',
    marginTop: 21,
  },
  sheetInner: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden'
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  listContent: {
    padding: 12,
    paddingBottom: 8
  },
  messageRow: {
    marginVertical: 6,
    flexDirection: 'row'
  },
  rowStart: { justifyContent: 'flex-start' },
  rowEnd: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  assistantBubble: { backgroundColor: '#EEF2FF' },
  userBubble: { backgroundColor: '#2563EB' },
  bubbleText: { lineHeight: 20 },
  assistantText: { color: '#1F2937' },
  userText: { color: '#ffffff' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)'
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12
  },
  sendBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendText: { color: '#ffffff' }
});


