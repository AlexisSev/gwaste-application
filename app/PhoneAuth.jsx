/* eslint-disable no-unused-vars */
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { ThemedText } from "../components/ThemedText";
import InputField from "../components/ui/InputField";
import PrimaryButton from "../components/ui/PrimaryButton";
import { supabase } from "../services/supabaseClient";
import { vw } from "../utils/responsive";

export const options = {
  headerShown: false,
  tabBarStyle: { display: "none" },
};

export default function PhoneAuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const normalizePhone = (t) => {
    if (!t) return "";
    const s = String(t).replace(/[\s\-()]/g, "");
    if (/^09\d{9}$/.test(s)) return `+63${s.slice(1)}`;
    if (/^\+63\d{10}$/.test(s)) return s;
    if (/^63\d{10}$/.test(s)) return `+${s}`;
    if (/^\+\d{10,15}$/.test(s)) return s;
    return s;
  };

  const sendOTP = async () => {
    const formatted = normalizePhone(phone.trim());
    if (!/^\+\d{10,15}$/.test(formatted)) {
      Alert.alert("Invalid phone", "Use format +63XXXXXXXXXX or 09XXXXXXXXX");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatted,
        options: { channel: "sms" },
      });
      if (error) throw error;
      setOtpSent(true);
      Alert.alert("Success", "OTP sent to your phone.");
    } catch (err) {
      Alert.alert("Error", err?.message || "Failed to send OTP");
    } finally {
      setSending(false);
    }
  };

  const verifyOTP = async () => {
    const formatted = normalizePhone(phone.trim());
    if (!code.trim()) {
      Alert.alert("Missing code", "Please enter the OTP code.");
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: code.trim(),
        type: "sms",
      });
      if (error) throw error;
      // On success, create resident with params and phone
      const payload = {
        first_name: String(params.first_name || "").trim(),
        last_name: String(params.last_name || "").trim(),
        resident_address: String(params.resident_address || "").trim(),
        purok: String(params.purok || "").trim(),
        phone_number: formatted,
        password: String(params.password || "").trim(),
      };

      const missing = Object.entries(payload)
        .filter(([_, v]) => !String(v))
        .map(([k]) => k);
      if (missing.length) {
        Alert.alert("Missing data", "Some signup details are missing. Please go back and try again.");
        return;
      }

      const { error: insertError } = await supabase.from("residents").insert(payload);
      if (insertError) throw insertError;

      Alert.alert("Verified", "Phone verified and account created. Please log in.");
      router.replace("/login");
    } catch (err) {
      Alert.alert("Verification failed", err?.message || "Invalid or expired code");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView
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
            Verify Phone
          </ThemedText>

          {!otpSent ? (
            <>
              <InputField
                icon={<Feather name="phone" size={20} color="#8BC500" />}
                placeholder="(+63) 9XXXXXXXXX"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={styles.input}
              />
              <PrimaryButton onPress={sendOTP} style={styles.button}>
                <Text style={styles.buttonText}>{sending ? "Sending..." : "Send OTP"}</Text>
              </PrimaryButton>
            </>
          ) : (
            <>
              <InputField
                icon={<Feather name="key" size={20} color="#8BC500" />}
                placeholder="Enter OTP"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                style={styles.input}
              />
              <PrimaryButton onPress={verifyOTP} style={styles.button}>
                <Text style={styles.buttonText}>{verifying ? "Verifying..." : "Verify OTP"}</Text>
              </PrimaryButton>
            </>
          )}
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
    aspectRatio: 200 / 90,
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
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
});
