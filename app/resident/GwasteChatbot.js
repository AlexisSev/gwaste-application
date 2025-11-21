import { Entypo } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FlashMessage, { showMessage } from "react-native-flash-message";
import { useResidentAuth } from "../../hooks/useResidentAuth";
import { getChatbotReply } from "../../services/gwasteChatbotService"; // Import the Edge Function service

const GwasteChatbot = () => {
  const router = useRouter();
  const { resident } = useResidentAuth();
  const residentId = resident?.id;
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const appendChunk = (messageId, chunk) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, text: `${msg.text || ""}${chunk}` } : msg
      )
    );
  };

  const addSuggestions = (messageId, suggestions) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, suggestions } : msg
      )
    );
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  const isIssueRelated = (text) => {
    const issueKeywords = [
      "issue",
      "problem",
      "damaged",
      "missed",
      "complaint",
      "report",
      "broken",
      "wrong",
      "late",
      "not collected",
      "not coming",
      "error",
    ];
    const lowerText = text.toLowerCase();
    return issueKeywords.some((keyword) => lowerText.includes(keyword));
  };

  const navigateToReportIssue = () => {
    router.push("resident/report-issue");
  };

  // Welcome message on mount
  useEffect(() => {
    const startChat = async () => {
      if (!residentId) return;
      setLoading(true);
      const assistantId = generateId();
      setMessages([{ id: assistantId, text: "", user: false, suggestions: [] }]);

      try {
        const response = await getChatbotReply(residentId, "Hello!", new Date());
        const welcomeText = typeof response === 'string' ? response : response?.reply || response;
        const suggestions = (typeof response === 'object' && response?.suggestions) ? response.suggestions : [];
        
        appendChunk(assistantId, welcomeText);
        if (suggestions && suggestions.length > 0) {
          addSuggestions(assistantId, suggestions);
        }
        
        showMessage({
          message: "Welcome to G-Waste Chat 🤖",
          description: welcomeText || "Hello!",
          type: "info",
          icon: "info",
          duration: 2000,
        });
      } catch (err) {
        console.error("startChat error", err);
        showMessage({
          message: "Failed to start chat",
          description: err?.message || "Check network or API access",
          type: "danger",
        });
      } finally {
        setLoading(false);
      }
    };
    startChat();
  }, [residentId]);

  const sendMessage = async (overrideInput) => {
    const messageToSend = overrideInput !== undefined ? overrideInput : userInput;
    
    if (!messageToSend || typeof messageToSend !== 'string' || !messageToSend.trim() || !residentId) {
      return;
    }

    setLoading(true);
    const trimmed = messageToSend.trim();
    const userMessage = { id: generateId(), text: trimmed, user: true };
    const assistantId = generateId();

    // Append user message and empty assistant message
    setMessages((prev) => [...prev, userMessage, { id: assistantId, text: "", user: false, suggestions: [] }]);
    if (!overrideInput) {
      setUserInput("");
    }

    try {
      const response = await getChatbotReply(residentId, trimmed, new Date());
      const botReply = typeof response === 'string' ? response : response?.reply || response;
      const suggestions = (typeof response === 'object' && response?.suggestions) ? response.suggestions : [];
      
      appendChunk(assistantId, botReply);
      if (suggestions && suggestions.length > 0) {
        addSuggestions(assistantId, suggestions);
      }
    } catch (err) {
      console.error("sendMessage error", err);
      showMessage({
        message: "Request failed",
        description: err?.message || "See console",
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={styles.messageContainer}>
      <Text style={[styles.messageText, item.user && styles.userMessage]}>
        {item.text}
      </Text>
      {!item.user && isIssueRelated(item.text) && (
        <TouchableOpacity
          style={styles.issueReportLink}
          onPress={navigateToReportIssue}
        >
          <Entypo name="flag" size={16} color="#8BC500" />
          <Text style={styles.issueReportLinkText}>Report an Issue</Text>
        </TouchableOpacity>
      )}
      {!item.user && item.suggestions && item.suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {item.suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionBubble}
              onPress={() => handleSuggestionClick(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlashMessage position="top" />
      <FlatList
        ref={flatListRef}
        contentContainerStyle={styles.listContent}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(_, idx) => idx.toString()}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        showsVerticalScrollIndicator={false}
      />
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Type a message"
          onChangeText={setUserInput}
          value={userInput}
          onSubmitEditing={() => sendMessage()}
          style={styles.input}
          placeholderTextColor="#687076"
        />
        <TouchableOpacity style={styles.sendButton} onPress={() => sendMessage()}>
          <Entypo name="paper-plane" size={18} color="#ffffff" />
        </TouchableOpacity>
        {loading && <ActivityIndicator size="small" color="#8BC500" />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingTop: 50, paddingHorizontal: 12 },
  listContent: { paddingBottom: 12 },
  messageContainer: { paddingVertical: 4, paddingHorizontal: 6, marginVertical: 2 },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f1f8e9",
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
  },
  suggestionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 6,
  },
  suggestionBubble: {
    backgroundColor: "#E8F5E9",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#8BC500",
  },
  suggestionText: {
    fontSize: 13,
    color: "#2E7D32",
    fontWeight: "500",
  },
  issueReportLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E1",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#8BC500",
    alignSelf: "flex-start",
  },
  issueReportLinkText: {
    fontSize: 14,
    color: "#8BC500",
    fontWeight: "600",
  },
});

export default GwasteChatbot;
