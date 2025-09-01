/* eslint-disable import/first */
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
export const options = {
  headerShown: false,
  tabBarStyle: { display: "none" },
};
// testing sa branch ni
import { ThemedText } from "../components/ThemedText";
import InputField from "../components/ui/InputField";
import PrimaryButton from "../components/ui/PrimaryButton";
import { db } from "../firebase";

export default function ResidentSignup() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [purok, setPurok] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !address.trim() ||
      !purok.trim() ||
      !phone.trim()
    ) {
      Alert.alert(
        "Missing info",
        "Please fill out first name, last name, address, purok, and phone."
      );
      return;
    }
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert("Missing info", "Please enter and confirm your password.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const combinedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await addDoc(collection(db, "residents"), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: combinedFullName,
        address: address.trim(),
        purok: purok.trim(),
        phone: phone.trim(),
        password: password.trim(),
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Signup successful. You can now log in.");
      router.replace("/login");
    } catch (err) {
      Alert.alert("Error", err?.message || "Could not complete signup.");
    } finally {
      setLoading(false);
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
            Sign Up
          </ThemedText>

          <InputField
            icon={<Feather name="user" size={20} color="#8BC500" />}
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoCorrect={false}
            style={styles.input}
          />

          <InputField
            icon={<Feather name="user" size={20} color="#8BC500" />}
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            autoCorrect={false}
            style={styles.input}
          />

          <InputField
            icon={<Feather name="map-pin" size={20} color="#8BC500" />}
            placeholder="Address"
            value={address}
            onChangeText={setAddress}
            style={styles.input}
          />

          <InputField
            icon={<Feather name="home" size={20} color="#8BC500" />}
            placeholder="Purok"
            value={purok}
            onChangeText={setPurok}
            style={styles.input}
          />

          <InputField
            icon={<Feather name="phone" size={20} color="#8BC500" />}
            placeholder="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
          />

          <InputField
            icon={<Feather name="lock" size={20} color="#8BC500" />}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            iconRight={
              <Feather 
                name={showPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#8BC500" 
              />
            }
            onIconPress={() => setShowPassword(!showPassword)}
            style={styles.input}
          />

          <InputField
            icon={<Feather name="lock" size={20} color="#8BC500" />}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            iconRight={
              <Feather 
                name={showConfirmPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#8BC500" 
              />
            }
            onIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.input}
          />

          <PrimaryButton
            onPress={handleSignup}
            style={styles.button}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </PrimaryButton>

          <Text style={styles.link}>
            Already have an account?{" "}
            <Text style={styles.linkText} onPress={() => router.replace("/login")}>
              Log in here
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
    width: 200,
    height: 90,
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
  link: {
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  linkText: {
    color: "#87CEEB",
  },
});
