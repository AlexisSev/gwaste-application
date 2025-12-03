/* eslint-disable no-unused-vars */
import { Feather } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { ThemedText } from "../components/ThemedText";
import InputField from "../components/ui/InputField";
import PrimaryButton from "../components/ui/PrimaryButton";
import { generateOTP, sendOtpSMS, verifyOtpCode } from "../services/otpService.js";
import { supabase } from "../services/supabaseClient";
import { vw, responsiveFontSize } from "../utils/responsive";

// Helper function to format phone numbers consistently
const formatPhoneNumber = (value = "") => {
  try {
    if (!value || typeof value !== "string") return null;
    const digits = value.replace(/\D/g, "");
    if (!digits) return null;

    let normalized = digits;
    if (normalized.startsWith("0")) normalized = "63" + normalized.substring(1);
    else if (normalized.length === 10) normalized = "63" + normalized; // assume local 10-digit
    else if (!normalized.startsWith("63")) normalized = `63${normalized}`;

    const e164 = `+${normalized}`;
    return /^\+63\d{10}$/.test(e164) ? e164 : null;
  } catch (_err) {
    return null;
  }
};

export const options = {
  headerShown: false,
  tabBarStyle: { display: "none" },
};

export default function PhoneAuth() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { first_name, last_name, resident_address, purok, password } = params;

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (timer === 0) return;
    const id = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  // Send OTP
  const sendOtp = async () => {
    if (!phone.trim()) return Alert.alert("Error", "Enter phone number first");
    
    // Validate phone number format
    const phoneRegex = /^(\+63|63|0)?9\d{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid Philippine mobile number (e.g., +639171234567)"
      );
    }

    setSending(true);

    try {
      // Format phone number for consistent storage and lookup
      const formattedPhone = formatPhoneNumber(phone);
      if (!formattedPhone) {
        Alert.alert("Invalid Phone Number", "Please enter a valid Philippine mobile number");
        return;
      }

      // Check if phone number is already registered
      const { data: existingUser } = await supabase
        .from("residents")
        .select("phone_number")
        .eq("phone_number", formattedPhone)
        .single();

      if (existingUser) {
        Alert.alert(
          "Phone Number Already Registered",
          "This phone number is already registered. Please log in instead."
        );
        return;
      }

      const otpCode = generateOTP();
      const ok = await sendOtpSMS(phone, otpCode);
      if (ok) {
        setTimer(120); // 2 minutes
        Alert.alert("OTP Sent", "Please check your phone for the verification code.");
      }
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to send OTP");
    } finally {
      setSending(false);
    }
  };

  // Verify OTP & insert into residents table
  const verifyOtp = async () => {
    if (!otp.trim()) return Alert.alert("Error", "Please enter OTP");
    setVerifying(true);

    try {
      // Format phone number for consistent storage and lookup
      const formattedPhone = formatPhoneNumber(phone);
      if (!formattedPhone) {
        Alert.alert("Invalid Phone Number", "Please enter a valid Philippine mobile number");
        return;
      }

      const { success, message } = await verifyOtpCode(phone, otp);
      if (!success) return Alert.alert("OTP Error", message);

      // Check if phone number already exists (using formatted phone)
      const { data: existingUser, error: checkError } = await supabase
        .from("residents")
        .select("phone_number")
        .eq("phone_number", formattedPhone)
        .single();

      if (existingUser) {
        Alert.alert(
          "Phone Number Already Registered",
          "This phone number is already registered. Please use a different number or log in."
        );
        return;
      }

      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      const { error: insertError } = await supabase.from("residents").insert([
        {
          first_name,
          last_name,
          resident_address,
          purok,
          phone_number: formattedPhone,
          password: hashedPassword,
        },
      ]);

      if (insertError) {
        // Handle duplicate key error specifically
        if (insertError.code === "23505") {
          Alert.alert(
            "Phone Number Already Exists",
            "This phone number is already registered. Please log in instead."
          );
        } else {
          throw insertError;
        }
        return;
      }

      Alert.alert("Success", "Account Verified & Created!");
      router.replace("/login");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to create account");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <RNImage
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.form}>
          <ThemedText type="title" style={styles.title}>
            Verify Your Phone
          </ThemedText>

          <Text style={styles.subtitle}>
            Enter your phone number to receive a verification code
          </Text>

          <InputField
            icon={<Feather name="phone" size={20} color="#8BC500" />}
            placeholder="+63XXXXXXXXXX"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <PrimaryButton
            onPress={sendOtp}
            disabled={sending || timer > 0}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {sending ? "Sending..." : "Send OTP"}
            </Text>
          </PrimaryButton>

          <InputField
            icon={<Feather name="shield" size={20} color="#8BC500" />}
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          {timer > 0 ? (
            <Text style={styles.timer}>Code expires in {timer}s</Text>
          ) : (
            <TouchableOpacity onPress={sendOtp} disabled={sending}>
              <Text style={styles.resend}>Resend OTP</Text>
            </TouchableOpacity>
          )}

          <PrimaryButton
            onPress={verifyOtp}
            disabled={verifying}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {verifying ? "Verifying..." : "Verify & Create Account"}
            </Text>
          </PrimaryButton>

          <Text style={styles.link}>
            Want to go back?{" "}
            <Text style={styles.linkText} onPress={() => router.back()}>
              Return to sign up
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: Math.min(vw(55), 240),
    height: undefined,
    aspectRatio: 200/90,
    marginBottom: 20,
  },
  form: {
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    marginBottom: 24,
    color: "#888",
    textAlign: "center",
    fontSize: responsiveFontSize(14),
  },
  input: {
    width: "100%",
    marginVertical: 8,
  },
  button: {
    width: "100%",
    marginVertical: 12,
    borderRadius: 12,
    backgroundColor: "#458A3D",
  },
  buttonText: {
    fontSize: responsiveFontSize(18),
    fontWeight: "600",
    color: "#fff",
  },
  timer: {
    color: "#888",
    marginTop: 8,
    marginBottom: 8,
    textAlign: "center",
    fontSize: responsiveFontSize(14),
  },
  resend: {
    color: "#87CEEB",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
    fontSize: responsiveFontSize(14),
    fontWeight: "500",
  },
  link: {
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  linkText: {
    color: "#87CEEB",
  },
});