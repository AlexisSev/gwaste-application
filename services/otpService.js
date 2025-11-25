import { supabase } from "./supabaseClient";
import { Alert } from "react-native";

// IPROG API
const IPROG_API_TOKEN = "e5ac0f9233301dd0dc10448abb5089527cf2cf94";
const IPROG_BASE_URL = "https://sms.iprogtech.com/api/v1/sms_messages/send_bulk";

// Generate 6-digit OTP
export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send OTP via IPROG
export const sendOtpSMS = async (phone, otp) => {
  try {
    if (!phone) throw new Error("Phone number is required");

    // Remove "+" if present for IPROG
    const cleaned = phone.replace("+", "");
    const message = `Your G-Waste App OTP is: ${otp}. It expires in 10 minutes.`;

    const res = await fetch(IPROG_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_token: IPROG_API_TOKEN,
        phone_number: cleaned,
        message,
        sms_provider: 0,
      }),
    });

    const data = await res.json();
    const ok = res.ok || (data && (data.status === 200 || data.status === "200"));

    if (!ok) throw new Error(data?.message || "Failed to send OTP");

    // Save OTP in Supabase table with expiry (optional)
    await supabase.from("otp_codes").insert([
      {
        phone_number: phone,
        otp_code: otp,
        expires_at: new Date(new Date().getTime() + 10 * 60 * 1000), // 10 min
      },
    ]);

    return true;
  } catch (err) {
    console.error("sendOtpSMS error:", err);
    Alert.alert("OTP Error", err.message);
    return false;
  }
};

// Verify OTP
export const verifyOtpCode = async (phone, enteredOtp) => {
  const { data, error } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("phone_number", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return { success: false, message: "OTP not found" };

  const now = new Date();
  if (data.otp_code !== enteredOtp) return { success: false, message: "OTP incorrect" };
  if (new Date(data.expires_at) < now) return { success: false, message: "OTP expired" };

  // Optional: mark as used
  await supabase.from("otp_codes").update({ used: true }).eq("id", data.id);

  return { success: true };
};
