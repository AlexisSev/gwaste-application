 
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FlashMessage, { showMessage } from "react-native-flash-message";
import { useResidentAuth } from "../../hooks/useResidentAuth";
import { supabase } from "../../services/supabaseClient";

const ReportIssue = ({ navigation }) => {
  const { resident } = useResidentAuth();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState("general");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);

  const issueTypes = [
    { label: "General Issue", value: "general" },
    { label: "Missed Collection", value: "missed_collection" },
    { label: "Damaged Bin", value: "damaged_bin" },
    { label: "Route Problem", value: "route_problem" },
    { label: "Other", value: "other" },
  ];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showMessage({
        message: "Permission Denied",
        description: "Camera roll permissions are required to select images",
        type: "warning",
      });
      return;
    }

    // Limit to maximum 3 images
    if (images.length >= 3) {
      showMessage({
        message: "Image Limit",
        description: "Maximum 3 images allowed",
        type: "warning",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const base64Image = `data:image/jpeg;base64,${asset.base64}`;
      setImages([...images, base64Image]);
      
      showMessage({
        message: "Image Added",
        description: "Image selected successfully",
        type: "success",
      });
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmitReport = async () => {
    if (!subject.trim() || !description.trim()) {
      showMessage({
        message: "Incomplete Form",
        description: "Please fill in subject and description",
        type: "warning",
      });
      return;
    }

    setLoading(true);

    try {
      // Store images as base64 strings in a JSON array
      const imageData = images.length > 0 ? images : null;

      const { error } = await supabase.from("reports").insert([
        {
          resident_id: resident?.id,
          subject: subject.trim(),
          description: description.trim(),
          report_type: issueType,
          status: "pending",
          location: resident?.resident_address || '',
          images_base64: imageData, // Store base64 images directly
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      // Show success alert
      Alert.alert(
        "Report Submitted Successfully! ✓",
        "Your issue has been reported and will be reviewed by our team within 24 hours.",
        [
          {
            text: "OK",
            onPress: () => {
              // Clear form after alert
              setSubject("");
              setDescription("");
              setIssueType("general");
              setImages([]);
              navigation?.goBack();
            }
          }
        ]
      );

      showMessage({
        message: "Report Submitted! ✓",
        description: "Your issue has been reported successfully.",
        type: "success",
        duration: 3000,
      });
    } catch (err) {
      console.error("Report submission error:", err);
      showMessage({
        message: "Submission Failed",
        description: err?.message || "Failed to submit your report. Please try again.",
        type: "danger",
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlashMessage position="top" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#11181C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report an Issue</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Subject Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Subject *</Text>
          <TextInput
            style={styles.input}
            placeholder="E.g. Garbage not collected last week"
            value={subject}
            onChangeText={setSubject}
            editable={!loading}
            placeholderTextColor="#A1A5A7"
          />
        </View>

        {/* Issue Type Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Issue Type *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.typeContainer}
          >
            {issueTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeButton,
                  issueType === type.value && styles.typeButtonActive,
                ]}
                onPress={() => setIssueType(type.value)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    issueType === type.value && styles.typeButtonTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Description Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="E.g. My garbage bin was not collected on Monday morning. I left it out since Friday evening as scheduled."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!loading}
            placeholderTextColor="#A1A5A7"
          />
          <Text style={styles.charCount}>
            {description.length}/500
          </Text>
        </View>

        {/* Image Upload Section */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Add Images (Optional)</Text>
          <Text style={styles.helpText}>
            Upload up to 3 photos to support your issue report
          </Text>
          <TouchableOpacity
            style={[
              styles.imagePickButton,
              loading && styles.disabledButton,
              images.length >= 3 && styles.maxImagesButton
            ]}
            onPress={pickImage}
            disabled={loading || images.length >= 3}
          >
            <Ionicons
              name="camera-outline"
              size={24}
              color={images.length >= 3 ? "#A1A5A7" : "#8BC500"}
            />
            <Text style={[
              styles.imagePickButtonText,
              images.length >= 3 && styles.maxImagesText
            ]}>
              {images.length >= 3 ? "Max Images Reached" : `Add Image (${images.length}/3)`}
            </Text>
          </TouchableOpacity>

          {/* Display Selected Images */}
          {images.length > 0 && (
            <View style={styles.imagesContainer}>
              {images.map((imageUri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image 
                    source={{ uri: imageUri }} 
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                    disabled={loading}
                  >
                    <Ionicons name="close-circle" size={28} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#8BC500" />
          <Text style={styles.infoText}>
            Your report will be reviewed by our team within 24 hours. You&apos;ll be notified of any updates.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmitReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation?.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#11181C",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#11181C",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DFE6D8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#11181C",
    backgroundColor: "#F9FAFB",
  },
  descriptionInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: "#A1A5A7",
    marginTop: 6,
    textAlign: "right",
  },
  helpText: {
    fontSize: 12,
    color: "#A1A5A7",
    marginBottom: 12,
  },
  imagePickButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#8BC500",
    borderRadius: 10,
    borderStyle: "dashed",
    paddingVertical: 16,
    gap: 8,
    backgroundColor: "#F9FAFB",
  },
  disabledButton: {
    opacity: 0.5,
  },
  maxImagesButton: {
    borderColor: "#DFE6D8",
    backgroundColor: "#F5F5F5",
  },
  imagePickButtonText: {
    fontSize: 14,
    color: "#8BC500",
    fontWeight: "600",
  },
  maxImagesText: {
    color: "#A1A5A7",
  },
  imagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 12,
  },
  imageWrapper: {
    position: "relative",
    width: "30%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#E8E8E8",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "#fff",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  typeContainer: {
    marginBottom: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DFE6D8",
    backgroundColor: "#F9FAFB",
    marginRight: 8,
  },
  typeButtonActive: {
    backgroundColor: "#8BC500",
    borderColor: "#8BC500",
  },
  typeButtonText: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "500",
  },
  typeButtonTextActive: {
    color: "#ffffff",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#F0F8E8",
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    color: "#2E7D32",
    flex: 1,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: "#8BC500",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#DFE6D8",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
  },
});

export default ReportIssue;



