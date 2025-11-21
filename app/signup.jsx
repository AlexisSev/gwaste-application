 
 
/* eslint-disable import/first */
import { Feather } from "@expo/vector-icons";
import { Picker } from '@react-native-picker/picker';
import { useRouter } from "expo-router";
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
import { vw } from "../utils/responsive";
export const options = {
  headerShown: false,
  tabBarStyle: { display: "none" },
};
// testing sa branch ni
import { ThemedText } from "../components/ThemedText";
import InputField from "../components/ui/InputField";
import PrimaryButton from "../components/ui/PrimaryButton";

export default function ResidentSignup() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [purok, setPurok] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const BARANGAYS = [
    "Bungtod",
    "Carbon",
    "Cogon",
    "La Purisima Concepcion",
    "Lourdes",
    "Sambag",
    "San Vicente",
    "Santo Rosario",
    "Anonang Norte",
    "Anonang Sur",
    "Banban",
    "Binabag",
    "Cayang",
    "Dakit",
    "Don Pedro Rodriguez",
    "Gairan",
    "Guadalupe",
    "La Paz",
    "Libertad",
    "Malingin",
    "Marangog",
    "Nailon",
    "Odlot",
    "Pandan",
    "Polambato",
    "Santo Niño",
    "Siocon",
    "Sudlonon",
    "Taytayan",
  ];
  

  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim() || !address.trim() || !purok.trim()) {
      Alert.alert(
        "Missing info",
        "Please fill out first name, last name, address, and purok."
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

    // Proceed to PhoneAuth screen to enter phone and OTP
    router.push({
      pathname: "/PhoneAuth",
      params: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        resident_address: address.trim(),
        purok: purok.trim(),
        password: password.trim(),
      },
    });
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

          <View style={styles.input}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerIcon}>{<Feather name="map-pin" size={20} color="#8BC500" />}</View>
              <Picker
                selectedValue={address}
                onValueChange={(v) => setAddress(v)}
                style={styles.picker}
                mode="dropdown"
              >
                <Picker.Item label="Select Barangay" value="" />
                {BARANGAYS.map((b) => (
                  <Picker.Item key={b} label={b} value={b} />
                ))}
              </Picker>
            </View>
          </View>

          <InputField
            icon={<Feather name="home" size={20} color="#8BC500" />}
            placeholder="Purok"
            value={purok}
            onChangeText={setPurok}
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
          >
            <Text style={styles.buttonText}>Continue</Text>
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
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    minHeight: 48,
  },
  pickerIcon: {
    marginRight: 8,
  },
  picker: {
    flex: 1,
    height: 52,
    paddingVertical: 6,
  },
});
