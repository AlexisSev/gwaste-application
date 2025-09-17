/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';
import { ThemedText } from './ThemedText';
// eslint-disable-next-line import/namespace
import { ThemedView } from './ThemedView';

export default function ResidentChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      id: 'welcome', 
      role: 'assistant', 
      text: 'Hello! I\'m here to help you with waste collection. I can help you with:\n\n• Collection schedules\n• How to sort your waste\n• Report problems to the city\n• Answer questions\n\nWhat would you like help with today?',
      timestamp: new Date(),
      suggestions: ['When is my pickup?', 'How do I sort waste?', 'Report a problem', 'Need help?']
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [conversationContext, setConversationContext] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportData, setReportData] = useState({
    category: '',
    description: '',
    location: null,
    urgency: 'medium',
    images: []
  });
  const [currentLocation, setCurrentLocation] = useState(null);
  const listRef = useRef(null);
  const fabScale = useRef(new Animated.Value(1)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const canSend = useMemo(() => (input.trim().length > 0 || selectedImage) && !sending, [input, selectedImage, sending]);

  const scrollToEnd = useCallback(() => {
    if (listRef.current) listRef.current.scrollToEnd({ animated: true });
  }, []);

  // Image picker functions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera roll permissions to select images.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Add Image',
      'Choose how you\'d like to add an image',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  // Location functions
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to submit reports with location data.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  // Report submission functions
  const submitReport = async () => {
    try {
      setIsReporting(true);
      
      // Get current location if not already set
      let location = reportData.location;
      if (!location) {
        location = await getCurrentLocation();
      }

      // Prepare report data
      const reportPayload = {
        ...reportData,
        location: location,
        submittedAt: serverTimestamp(),
        status: 'pending',
        type: 'chatbot_report',
        images: reportData.images.map(img => ({
          uri: img.uri,
          type: img.type || 'image/jpeg',
          name: img.fileName || `report_image_${Date.now()}.jpg`
        })),
        metadata: {
          platform: Platform.OS,
          appVersion: '1.0.0',
          timestamp: Date.now()
        }
      };

      // Submit to Firebase
      const reportsRef = collection(db, 'reports');
      const docRef = await addDoc(reportsRef, reportPayload);

      // Send notification to admin
      await notifyAdmin(docRef.id, reportPayload);

      // Reset report data
      setReportData({
        category: '',
        description: '',
        location: null,
        urgency: 'medium',
        images: []
      });
      setIsReporting(false);

      return docRef.id;
    } catch (error) {
      console.error('Error submitting report:', error);
      setIsReporting(false);
      throw error;
    }
  };

  const notifyAdmin = async (reportId, reportData) => {
    try {
      const notificationsRef = collection(db, 'admin_notifications');
      await addDoc(notificationsRef, {
        type: 'new_report',
        reportId: reportId,
        category: reportData.category,
        urgency: reportData.urgency,
        location: reportData.location,
        submittedAt: serverTimestamp(),
        message: `New ${reportData.category} report submitted via chatbot`,
        status: 'unread',
        priority: reportData.urgency === 'high' ? 'urgent' : 'normal'
      });
    } catch (error) {
      console.error('Error notifying admin:', error);
    }
  };

  const knowledgeBase = {
    schedules: {
      keywords: ['schedule', 'pickup', 'collection', 'when', 'time', 'day', 'weekly'],
      responses: [
        'Waste collection happens every day from 7 AM to 3 PM. Please prepare your waste for collection outside your house.',
        'Your waste is collected every day from - Mondays - Fridays.',
      ],
      suggestions: ['What if I miss collection?', 'Holiday schedule', 'Special pickup requests']
    },
    sorting: {
      keywords: ['sort', 'recycle', 'categorize', 'bin', 'blue', 'green', 'black', 'where'],
      responses: [
        'Here\'s how to sort your waste:\n• Blue bin: Paper, cardboard, metal cans, plastic bottles\n• Green bin: Food scraps, yard waste, organic materials\n• Black bin: Non-recyclable items, contaminated materials\n• Special items: Electronics and batteries go to collection centers',
        'Sorting guide:\n• Blue: Recyclables (paper, metal, clean plastic)\n• Green: Organics (food waste, yard trimmings)\n• Black: Everything else\n• Electronics: Drop-off centers only',
        'Waste sorting made easy:\n• Blue bin = Recyclables\n• Green bin = Organic waste\n• Black bin = General waste\n• Electronics = Special collection'
      ],
      suggestions: ['What can\'t be recycled?', 'Contaminated items', 'Special materials']
    },
    reporting: {
      keywords: ['report', 'problem', 'issue', 'complaint', 'missed', 'damage', 'spill'],
      responses: [
        'I can help you report issues! Let me guide you step by step.\n\n**STEP 1:** What type of problem do you have?\n\n• Garbage truck didn\'t come\n• Broken garbage bin\n• Spill or mess\n• Noise problem\n• Something else\n\nJust tell me what\'s wrong and I\'ll help you report it.',
        'Let\'s report your problem to the city officials. I\'ll make it easy for you!\n\n**What happened?** Just describe the problem in your own words. For example:\n• "The garbage truck didn\'t pick up my bins"\n• "My garbage bin is broken"\n• "There\'s a spill on my street"\n\nI\'ll take care of the rest!',
        'I\'m here to help you report problems to the city. Don\'t worry - I\'ll guide you through each step.\n\n**First, tell me:** What problem do you need to report?'
      ],
      suggestions: ['Garbage truck didn\'t come', 'Broken garbage bin', 'Spill or mess', 'Noise problem', 'Help me report']
    },
    centers: {
      keywords: ['center', 'drop', 'location', 'where', 'electronics', 'hazardous', 'battery'],
      responses: [
        'Collection centers are located at:\n• Downtown: 123 Main St (Mon-Fri 8 AM-6 PM)\n• Northside: 456 Oak Ave (Tue-Sat 9 AM-5 PM)\n• Eastside: 789 Pine Rd (Wed-Sun 7 AM-7 PM)\n\nAccept: Electronics, batteries, hazardous materials, large items',
        'Drop-off locations:\n• Downtown Center: 123 Main St\n• Northside Center: 456 Oak Ave\n• Eastside Center: 789 Pine Rd\n\nHours vary by location. Check our app for current hours.',
        'Find collection centers near you:\n• Downtown: 123 Main St\n• Northside: 456 Oak Ave\n• Eastside: 789 Pine Rd\n\nAll accept electronics, batteries, and hazardous waste.'
      ],
      suggestions: ['Center hours', 'What they accept', 'Directions', 'Fees']
    },
    holidays: {
      keywords: ['holiday', 'christmas', 'thanksgiving', 'new year', 'delay', 'postpone'],
      responses: [
        'Holiday collection schedule:\n• Christmas Day: No collection, delayed by 1 day\n• New Year\'s Day: No collection, delayed by 1 day\n• Thanksgiving: Normal schedule\n• Other holidays: Check our app for updates',
        'During holidays:\n• Major holidays delay collection by 1 day\n• Check our app for specific holiday schedules\n• Bins should still be out by 6:30 AM on collection days',
        'Holiday schedule: Major holidays delay pickup by 1 day. Check our app for current holiday information.'
      ],
      suggestions: ['Specific holiday dates', 'Weather delays', 'Emergency collection']
    },
    general: {
      keywords: ['help', 'what can you do', 'assistant', 'support'],
      responses: [
        'I can help you with:\n• Waste collection schedules\n• Sorting and recycling guidelines\n• Reporting issues or problems\n• Finding collection centers\n• Holiday schedules\n• General waste management questions\n• Identifying waste types from photos\n\nJust ask me anything or share a photo!',
        'I\'m here to help with:\n• Collection schedules and timing\n• Proper waste sorting\n• Problem reporting\n• Center locations\n• Holiday schedules\n• Any waste-related questions\n• Photo-based waste identification',
        'I assist with:\n• Schedules and pickup times\n• Sorting guidelines\n• Issue reporting\n• Center locations\n• Holiday information\n• General waste management help\n• Analyzing waste photos'
      ],
      suggestions: ['Collection schedule', 'Sorting guide', 'Report problem', 'Find centers']
    },
    imageAnalysis: {
      keywords: ['image', 'photo', 'picture', 'identify', 'what is this', 'sort this'],
      responses: [
        'I can help identify waste types from photos! Based on your image, here\'s what I can tell you:\n\n• If it\'s recyclable: Goes in the blue bin\n• If it\'s organic: Goes in the green bin\n• If it\'s general waste: Goes in the black bin\n• If it\'s hazardous: Take to collection center\n\nFor more specific guidance, describe what you see in the image.',
        'Thanks for sharing the photo! I can help you sort this waste properly:\n\n• Look for recycling symbols or numbers\n• Check if it\'s food waste or organic material\n• Consider if it\'s contaminated or clean\n• Determine if it needs special disposal\n\nWhat type of waste do you see in the image?',
        'Great photo! For proper sorting:\n\n• Clean recyclables → Blue bin\n• Food scraps/organics → Green bin\n• General waste → Black bin\n• Electronics/batteries → Collection center\n• Hazardous materials → Special disposal\n\nCan you tell me more about what\'s in the image?'
      ],
      suggestions: ['How to sort this', 'Is this recyclable?', 'Report contamination', 'Find disposal center']
    }
  };

  function getLocalResponse(prompt, context = []) {
    const lowerPrompt = prompt.toLowerCase();
    
    // Check for greetings first
    if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi') || lowerPrompt.includes('hey') || lowerPrompt.includes('good morning') || lowerPrompt.includes('good afternoon') || lowerPrompt.includes('good evening')) {
      return {
        text: 'Hello! I\'m your waste management assistant. How can I help you today?',
        suggestions: ['Collection schedule', 'How to sort waste', 'Report a problem', 'Find collection centers']
      };
    }

    // Enhanced keyword matching with context awareness
    for (const [category, data] of Object.entries(knowledgeBase)) {
      const hasKeyword = data.keywords.some(keyword => lowerPrompt.includes(keyword));
      
      if (hasKeyword) {
        // Select response based on context or random
        const responseIndex = context.length > 0 ? context.length % data.responses.length : Math.floor(Math.random() * data.responses.length);
        return {
          text: data.responses[responseIndex],
          suggestions: data.suggestions,
          category: category
        };
      }
    }

    // Handle specific report categories with senior-friendly language
    if (lowerPrompt.includes('missed') && (lowerPrompt.includes('collection') || lowerPrompt.includes('pickup') || lowerPrompt.includes('truck'))) {
      return {
        text: 'I understand - the garbage truck didn\'t come to pick up your bins. Let me help you report this.\n\n**STEP 2:** Tell me more details:\n\n• What day was pickup supposed to happen?\n• What\'s your address or area?\n• Did you put your bins out on time?\n\nJust tell me what you know, and I\'ll send this to the city officials.',
        suggestions: ['Yes, submit my report', 'Add my address', 'Take a photo', 'Need help?'],
        category: 'reporting',
        reportCategory: 'missed_collection'
      };
    }

    if (lowerPrompt.includes('damaged') && (lowerPrompt.includes('bin') || lowerPrompt.includes('container') || lowerPrompt.includes('broken'))) {
      return {
        text: 'I\'ll help you report your broken garbage bin to the city.\n\n**STEP 2:** Tell me about the damage:\n\n• What\'s wrong with the bin? (cracked, broken lid, etc.)\n• Where is the bin located?\n• How long has it been broken?\n\nDon\'t worry about taking photos - just describe what\'s wrong.',
        suggestions: ['Yes, submit my report', 'Add my location', 'Take a photo', 'Need help?'],
        category: 'reporting',
        reportCategory: 'damaged_bins'
      };
    }

    if (lowerPrompt.includes('spill') || lowerPrompt.includes('contamination') || lowerPrompt.includes('mess')) {
      return {
        text: 'I\'ll help you report this spill or mess to the city right away. This is important for everyone\'s safety!\n\n**STEP 2:** Tell me about the problem:\n\n• What kind of spill is it?\n• Where is it located?\n• Is it dangerous?\n• When did you notice it?\n\nI\'ll make sure the city officials know about this quickly.',
        suggestions: ['Yes, submit my report', 'Add my location', 'Take a photo', 'This is urgent!'],
        category: 'reporting',
        reportCategory: 'spill_contamination'
      };
    }

    if (lowerPrompt.includes('noise') && (lowerPrompt.includes('complaint') || lowerPrompt.includes('problem') || lowerPrompt.includes('loud'))) {
      return {
        text: 'I\'ll help you report this noise problem to the city.\n\n**STEP 2:** Tell me about the noise:\n\n• What kind of noise is it?\n• When does it happen?\n• Where is it coming from?\n• How long does it last?\n\nI\'ll send this information to the city officials.',
        suggestions: ['Yes, submit my report', 'Add my location', 'Describe the noise', 'Need help?'],
        category: 'reporting',
        reportCategory: 'noise_complaint'
      };
    }

    if (lowerPrompt.includes('help me report') || lowerPrompt.includes('start report') || lowerPrompt.includes('submit report')) {
      return {
        text: 'I\'m here to help you report problems to the city! Let\'s do this step by step.\n\n**STEP 1:** What problem do you need to report?\n\n• Garbage truck didn\'t come\n• Broken garbage bin\n• Spill or mess\n• Noise problem\n• Something else\n\nJust tell me what\'s wrong in your own words.',
        suggestions: ['Garbage truck didn\'t come', 'Broken garbage bin', 'Spill or mess', 'Noise problem'],
        category: 'reporting'
      };
    }

    if (lowerPrompt.includes('weather') || lowerPrompt.includes('storm') || lowerPrompt.includes('snow')) {
      return {
        text: 'During severe weather:\n• Collection may be delayed or cancelled\n• Check our app for real-time updates\n• Keep bins secure to prevent damage\n• Report weather-related issues immediately',
        suggestions: ['Check for delays', 'Report weather issue', 'Emergency contact']
      };
    }

    if (lowerPrompt.includes('large') || lowerPrompt.includes('bulky') || lowerPrompt.includes('furniture')) {
      return {
        text: 'For large items:\n• Schedule special pickup through our app\n• Drop off at collection centers\n• Fees may apply for oversized items\n• Call (555) 123-WASTE to arrange pickup',
        suggestions: ['Schedule pickup', 'Center locations', 'Fees and pricing']
      };
    }

    // Default response with context awareness
    const contextHint = context.length > 0 ? ` Based on our conversation about ${context[context.length - 1]},` : '';
    return {
      text: `I understand you're asking about: "${prompt}".${contextHint} I can help with schedules, sorting, reporting, or general waste management questions. Could you be more specific?`,
      suggestions: ['Collection schedule', 'Sorting guide', 'Report problem', 'Find centers']
    };
  }

  const handleSend = useCallback(async () => {
    const prompt = input.trim();
    if ((!prompt && !selectedImage) || sending) return;
    setSending(true);
    setInput('');

    const userMessage = { 
      id: `${Date.now()}-user`, 
      role: 'user', 
      text: prompt || (selectedImage ? 'Shared an image' : ''),
      image: selectedImage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Update conversation context
    const contextPrompt = prompt || (selectedImage ? 'image shared' : '');
    setConversationContext(prev => [...prev.slice(-4), contextPrompt]); // Keep last 5 messages for context
    requestAnimationFrame(scrollToEnd);

    // Clear selected image
    setSelectedImage(null);

    // Show typing indicator
    setTyping(true);

    // Simulate a more realistic delay with typing animation
    setTimeout(async () => {
      let response;
      if (selectedImage && !prompt) {
        // Image-only message
        response = getLocalResponse('image shared', conversationContext);
      } else {
        response = getLocalResponse(prompt, conversationContext);
      }
      
      // Handle report submission
      if (response.reportCategory) {
        setReportData(prev => ({
          ...prev,
          category: response.reportCategory,
          description: prompt,
          images: selectedImage ? [...prev.images, selectedImage] : prev.images
        }));
      }

      // Check if user wants to submit a report
      if (prompt.toLowerCase().includes('submit') && (prompt.toLowerCase().includes('report') || reportData.category)) {
        try {
          const reportId = await submitReport();
          response.text = `✅ **SUCCESS!** Your report has been sent to the city officials.\n\n**Your Report Number:** ${reportId}\n**Problem Type:** ${reportData.category}\n**Status:** City officials will review it\n\n**What happens next?**\n• City officials will receive your report\n• They will look into the problem\n• You may get a call or visit from them\n• The problem should be fixed soon\n\nDon\'t worry - your report is now in the system!`;
          response.suggestions = ['Ask about schedules', 'Report another problem', 'Need more help?'];
        } catch (error) {
          response.text = `❌ **I\'m sorry, there was a problem sending your report.**\n\n**Don\'t worry!** You can still report this problem:\n\n• Call the city hotline: (555) 123-WASTE\n• Visit the city office\n• Try reporting again later\n\n**Or tell me what happened and I\'ll try again.**`;
          response.suggestions = ['Try again', 'Call hotline', 'Need help?'];
        }
      }
      
      const assistantMessage = { 
        id: `${Date.now()}-assistant`, 
        role: 'assistant', 
        text: response.text,
        timestamp: new Date(),
        suggestions: response.suggestions || [],
        category: response.category
      };
      setMessages(prev => [...prev, assistantMessage]);
      setTyping(false);
      requestAnimationFrame(scrollToEnd);
      setSending(false);
    }, 800 + Math.random() * 400); // Random delay between 800-1200ms
  }, [input, selectedImage, sending, scrollToEnd, conversationContext]);

  const handleSuggestionPress = useCallback((suggestion) => {
    setInput(suggestion);
  }, []);

  // Animation effects
  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(fabScale, {
          toValue: 0.8,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(fabScale, {
          toValue: 1,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [open, modalOpacity, fabScale]);

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderTypingIndicator = () => (
    <View style={[styles.messageRow, styles.rowStart]}>
      <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
        <View style={styles.typingContainer}>
          <View style={[styles.typingDot, styles.typingDot1]} />
          <View style={[styles.typingDot, styles.typingDot2]} />
          <View style={[styles.typingDot, styles.typingDot3]} />
        </View>
      </View>
    </View>
  );

  const renderSuggestions = (suggestions) => (
    <View style={styles.suggestionsContainer}>
      {suggestions.map((suggestion, index) => (
        <TouchableOpacity
          key={index}
          style={styles.suggestionChip}
          onPress={() => handleSuggestionPress(suggestion)}
          accessibilityRole="button"
          accessibilityLabel={`Quick reply: ${suggestion}`}
        >
          <ThemedText type="defaultSemiBold" style={styles.suggestionText}>
            {suggestion}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <>
      {/* Floating bubble with animation */}
      <View pointerEvents="box-none" style={styles.fabContainer}>
        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
          <TouchableOpacity 
            onPress={() => setOpen(true)} 
            style={styles.fab} 
            accessibilityRole="button" 
            accessibilityLabel="Open waste management assistant"
          >
            <FontAwesome5 name="robot" size={24} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Chat panel as modal overlay */}
      <Modal visible={open} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Animated.View style={[styles.modalRoot, { opacity: modalOpacity }]}>
          {/* Scrim that does not cover the tab bar area */}
          <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
          <KeyboardAvoidingView
            behavior={Platform.select({ ios: 'padding', android: undefined })}
            keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
            style={styles.sheet}
          >
            <ThemedView style={styles.sheetInner}>
              <View style={styles.sheetHeader}>
                <View style={styles.headerLeft}>
                  <FontAwesome5 name="robot" size={20} color="#22c55e" style={styles.headerIcon} />
                  <ThemedText type="title" style={styles.headerTitle}>Waste Assistant</ThemedText>
                </View>
                <Pressable onPress={() => setOpen(false)} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close chat">
                  <FontAwesome5 name="times" size={18} color="#6B7280" />
                </Pressable>
              </View>

              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isUser = item.role === 'user';
                  return (
                    <View>
                      <View style={[styles.messageRow, isUser ? styles.rowEnd : styles.rowStart]}>
                        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                          {item.image && (
                            <View style={styles.imageContainer}>
                              <Image source={{ uri: item.image.uri }} style={styles.messageImage} />
                            </View>
                          )}
                          {item.text && (
                            <ThemedText type="default" style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
                              {item.text}
                            </ThemedText>
                          )}
                          {item.timestamp && (
                            <ThemedText type="caption" style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
                              {formatTime(item.timestamp)}
                            </ThemedText>
                          )}
                        </View>
                      </View>
                      {item.suggestions && item.suggestions.length > 0 && (
                        renderSuggestions(item.suggestions)
                      )}
                    </View>
                  );
                }}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={scrollToEnd}
                onLayout={scrollToEnd}
                ListFooterComponent={typing ? renderTypingIndicator : null}
              />

              <View style={styles.inputBar}>
                {selectedImage && (
                  <View style={styles.selectedImageContainer}>
                    <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
                    <TouchableOpacity onPress={removeImage} style={styles.removeImageBtn}>
                      <FontAwesome5 name="times" size={12} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.inputContainer}>
                  <TouchableOpacity 
                    onPress={showImageOptions} 
                    style={styles.imageBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Add image"
                  >
                    <FontAwesome5 name="camera" size={20} color="#6B7280" />
                  </TouchableOpacity>
                  <TextInput
                    value={input}
                    onChangeText={setInput}
                    placeholder={selectedImage ? "Add a message..." : "Type your question here... (e.g., 'When is my pickup?' or 'Report a problem')"}
                    placeholderTextColor="#9AA0A6"
                    multiline
                    style={styles.input}
                    editable={!sending}
                    accessibilityLabel="Message input"
                    accessibilityHint="Type your waste management question here. For example, ask about pickup schedules or report problems."
                  />
                  <TouchableOpacity 
                    style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]} 
                    onPress={handleSend} 
                    disabled={!canSend}
                    accessibilityRole="button"
                    accessibilityLabel="Send message"
                  >
                    {sending ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <FontAwesome5 name="paper-plane" size={16} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ThemedView>
          </KeyboardAvoidingView>
        </Animated.View>
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
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  sheet: {
    width: '100%',
    marginTop: 21,
  },
  sheetInner: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden'
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA'
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerIcon: {
    marginRight: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)'
  },
  listContent: {
    padding: 16,
    paddingBottom: 12
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row'
  },
  rowStart: { justifyContent: 'flex-start' },
  rowEnd: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative'
  },
  assistantBubble: { 
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4
  },
  userBubble: { 
    backgroundColor: 'rgba(118, 203, 143, 0.6)',
    borderBottomRightRadius: 4
  },
  bubbleText: { 
    lineHeight: 22,
    fontSize: 15
  },
  assistantText: { color: '#1F2937' },
  userText: { color: 'rgba(0, 0, 0, 0.6)' },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.9
  },
  userTimestamp: { color: 'rgba(19, 19, 19, 0.8)' },
  assistantTimestamp: { color: 'rgba(31,41,55,0.6)' },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4
  },
  suggestionChip: {
    backgroundColor: 'rgba(7, 183, 63, 0.6)',
    opacity: 0.8,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(11, 62, 36, 0.15)',
    minHeight: 44
  },
  suggestionText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
    textAlign: 'center'
  },
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 16
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 2
  },
  typingDot1: {
    animationDelay: '0ms'
  },
  typingDot2: {
    animationDelay: '200ms'
  },
  typingDot3: {
    animationDelay: '400ms'
  },
  imageContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden'
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12
  },
  selectedImageContainer: {
    position: 'relative',
    marginBottom: 8,
    alignSelf: 'flex-start'
  },
  selectedImage: {
    width: 80,
    height: 60,
    borderRadius: 8
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  inputBar: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#FAFAFA'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12
  },
  imageBtn: {
    minHeight: 56,
    minWidth: 56,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  input: {
    flex: 1,
    minHeight: 56,
    maxHeight: 120,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    backgroundColor: '#ffffff',
    fontSize: 16,
    lineHeight: 22
  },
  sendBtn: {
    minHeight: 56,
    minWidth: 56,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 }
  },
  sendBtnDisabled: { 
    opacity: 0.5,
    elevation: 0,
    shadowOpacity: 0
  }
});

