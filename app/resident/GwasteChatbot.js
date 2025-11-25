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

  // Smart suggestion responses - instant answers for common questions
  const smartResponses = {
    "What are collection schedules?": {
      answer: "Collection schedules vary by area and waste type. You can view your personalized collection schedule by:\n\n1. Going to the Schedule tab\n2. Checking the 'Next Collection' card on the home screen\n3. Enabling location services to see real-time truck tracking\n\nWould you like to know more about your specific area's schedule?",
      suggestions: ["View my schedule", "Track garbage truck", "Change notification settings"]
    },
    "How do I report an issue?": {
      answer: "To report an issue:\n\n1. Tap the 'Report Issue' button\n2. Select the issue type (missed collection, damaged bin, etc.)\n3. Add a description and photos if needed\n4. Submit your report\n\nOur team will review and respond within 24 hours. You can also track your reported issues in your profile.",
      suggestions: ["Report an Issue", "View my reports", "Contact support"]
    },
    "What waste types are collected?": {
      answer: "We collect several types of waste:\n\n🗑️ Biodegradable - Food scraps, yard waste\n♻️ Recyclable - Paper, plastic, glass, metal\n⚠️ Non-biodegradable - General waste\n🔋 E-Waste - Electronics, batteries\n☢️ Hazardous - Chemicals, paint, oil\n\nEach type has specific collection days. Check your schedule for details!",
      suggestions: ["View collection schedule", "How to segregate waste", "E-waste disposal"]
    },
    "How to segregate waste properly?": {
      answer: "Proper waste segregation helps the environment! 🌍\n\n✅ Biodegradable: Food waste, garden clippings\n✅ Recyclable: Clean plastic, paper, cardboard, metal\n✅ Residual: Mixed waste, soiled materials\n✅ Special: Electronics, batteries, hazardous items\n\nTip: Rinse recyclables before disposal!",
      suggestions: ["View waste categories", "Eco tips", "What goes where?"]
    },
    "Track garbage truck": {
      answer: "Track the garbage truck in real-time! 🚛\n\n1. Go to the Map tab\n2. Enable location permissions\n3. See nearby trucks and estimated arrival time\n4. Get notified when truck is near your area\n\nYou can view distance and route on the live map!",
      suggestions: ["Open map", "Enable notifications", "View route details"]
    },
    "View my schedule": {
      answer: "Your collection schedule shows:\n\n📅 Next pickup date and time\n📍 Your area coverage\n🚛 Truck route information\n⏰ Estimated arrival window\n\nGo to the Schedule tab to see your full weekly schedule!",
      suggestions: ["Open schedule", "Set reminders", "View past collections"]
    },
    "Enable notifications": {
      answer: "Stay updated with notifications! 🔔\n\nYou'll receive alerts for:\n• Truck approaching your area\n• Schedule changes\n• Missed collections\n• Special announcements\n\nGo to Settings → Notifications to customize your preferences.",
      suggestions: ["Open settings", "Notification preferences", "Alert frequency"]
    },
    "Eco tips": {
      answer: "Help the environment with these eco tips! 🌱\n\n♻️ Reduce single-use plastics\n🎒 Use reusable bags\n💧 Compost organic waste\n📦 Recycle properly\n🔋 Dispose e-waste safely\n🌳 Reduce, reuse, recycle!\n\nSmall actions make a big difference!",
      suggestions: ["More eco tips", "Composting guide", "Recycling benefits"]
    },
    "Contact support": {
      answer: "Need help? We're here! 💚\n\nContact us through:\n📧 Email: support@gwaste.com\n📱 Hotline: (123) 456-7890\n💬 In-app chat (here!)\n🏢 Office: Visit our local branch\n\nResponse time: Usually within 24 hours.",
      suggestions: ["Report an Issue", "FAQs", "Office locations"]
    }
  };

  const handleSuggestionClick = (suggestion) => {
    // Check if we have a smart response for this suggestion
    const smartResponse = smartResponses[suggestion];
    
    if (smartResponse) {
      // Instant answer - no API call needed!
      const userMessage = { id: generateId(), text: suggestion, user: true };
      const assistantId = generateId();
      const botMessage = { 
        id: assistantId, 
        text: smartResponse.answer, 
        user: false, 
        suggestions: smartResponse.suggestions || [] 
      };
      
      setMessages((prev) => [...prev, userMessage, botMessage]);
      
      // Show success notification
      showMessage({
        message: "Quick Answer! ⚡",
        type: "success",
        duration: 1500,
      });
    } else {
      // Fall back to API call for other suggestions
      sendMessage(suggestion);
    }
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
