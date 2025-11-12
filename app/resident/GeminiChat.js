import React, { useState, useEffect } from "react";
import * as GoogleGenerativeAI from "@google/generative-ai";

import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Entypo } from "@expo/vector-icons";
import FlashMessage, { showMessage } from "react-native-flash-message";
import { API_KEY } from "../../Constants";

const GeminiChat = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Removed speaking state to disable TTS responses

  useEffect(() => {
    const startChat = async () => {
      try {
        if (!API_KEY) {
          showMessage({
            message: "Gemini API key missing",
            description: "Set EXPO_PUBLIC_GEMINI_API_KEY in .env and restart",
            type: "danger",
          });
          return;
        }
        const genAI = new GoogleGenerativeAI.GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const prompt = "Hello!";
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        showMessage({
          message: "Welcome to Gemini Chat 🤖",
          description: text,
          type: "info",
          icon: "info",
          duration: 2000,
        });
        setMessages([{ text, user: false }]);
      } catch (err) {
        console.error("startChat error", err);
        showMessage({
          message: "Failed to start chat",
          description: err?.message || "Check network or API access",
          type: "danger",
        });
      }
    };
    startChat();
  }, []);

  const sendMessage = async () => {
    if (!userInput.trim()) return;
    if (!API_KEY) {
      showMessage({ message: "Missing API key", type: "danger" });
      return;
    }
    setLoading(true);
    const userMessage = { text: userInput.trim(), user: true };
    setMessages((prev) => [...prev, userMessage]);
    try {
      const genAI = new GoogleGenerativeAI.GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      const result = await model.generateContent(userMessage.text);
      const text = result.response.text();
      setMessages((prev) => [...prev, { text, user: false }]);
      // TTS disabled per request
    } catch (err) {
      console.error("sendMessage error", err);
      showMessage({
        message: "Request failed",
        description: err?.message || "See console",
        type: "danger",
      });
    } finally {
      setLoading(false);
      setUserInput("");
    }
  };

  
  const renderMessage = ({ item }) => (
    <View style={styles.messageContainer}>
      <Text style={[styles.messageText, item.user && styles.userMessage]}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlashMessage position="top" />
      <FlatList
        contentContainerStyle={styles.listContent}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={( _, idx) => idx.toString()}
        inverted
        showsVerticalScrollIndicator={false}
      />
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Type a message"
          onChangeText={setUserInput}
          value={userInput}
          onSubmitEditing={sendMessage}
          style={styles.input}
          placeholderTextColor="#687076"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Entypo name="paper-plane" size={18} color="#ffffff" />
        </TouchableOpacity>
        {loading && <ActivityIndicator size="small" color="#8BC500" />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: 50,
    paddingHorizontal: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  messageContainer: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginVertical: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f1f8e9", // light green tint
    color: "#1b3a1a",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    maxWidth: "82%",
    alignSelf: "flex-start",
  },
  userMessage: {
    backgroundColor: "#8BC500",
    color: "#ffffff",
    alignSelf: "flex-end",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f6fbe8",
    borderRadius: 14,
    marginBottom: 8,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    height: 48,
    color: "#11181C",
    borderWidth: 1,
    borderColor: "#dfe6d8",
    fontSize: 16,
  },
  sendButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: "#8BC500",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  micIcon: {
    padding: 10,
    backgroundColor: "#131314",
    borderRadius: 25,
    height: 48,
    width: 48,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  stopIcon: {
    padding: 10,
    backgroundColor: "#131314",
    borderRadius: 25,
    height: 48,
    width: 48,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});

export default GeminiChat;