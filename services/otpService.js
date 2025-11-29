import { Alert } from "react-native";
import { supabase } from "./supabaseClient";

/**
 * IPROG API configuration
 * NOTE: Keep tokens secure (prefer env vars for production).
 */
const IPROG_API_TOKEN = "e5ac0f9233301dd0dc10448abb5089527cf2cf94";
const IPROG_BASE_URL = "https://sms.iprogtech.com/api/v1/sms_messages/send_bulk";
const IPROG_OTP_URL = "https://www.iprogsms.com/api/v1/sms_messages";

const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Helpers
 */
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

const parseResponseSafe = async (res) => {
  const contentType = res.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return res.json();
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (_err) {
    return text;
  }
};

const getAllPhoneNumbers = async () => {
  try {
    /**
     * Customize this query to match your schema.
     * Example assumes `profiles` table with `phone` column.
     */
    const { data, error } = await supabase
      .from("residents")
      .select("phone_number")
      .not("phone_number", "is", null);

    if (error || !data) {
      return [];
    }

    return data.map((row) => row.phone_number).filter(Boolean);
  } catch (_err) {
    return [];
  }
};

/**
 * Optional logging helpers (no-op if tables are unavailable)
 * Adjust to match your Supabase schema if/when you create logging tables.
 */
const logSmsNotification = async () => Promise.resolve();
const logOtpNotification = async () => Promise.resolve();

/**
 * Generate 6-digit OTP
 */
export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Send bulk SMS via IPROG
 */
export const sendIprogSMS = async (message, phoneNumbers = [], batchSize = 100) => {
  try {
    if (!phoneNumbers.length) phoneNumbers = await getAllPhoneNumbers();

    const formatted = phoneNumbers
      .map((p) => formatPhoneNumber(String(p)))
      .filter(Boolean);

    if (!formatted.length) throw new Error("No valid phone numbers after formatting");

    // IPROG expects numbers as 63XXXXXXXXX (no +), comma separated
    const cleanedList = formatted.map((p) => p.replace("+", ""));

    const batches = [];
    for (let i = 0; i < cleanedList.length; i += batchSize) {
      batches.push(cleanedList.slice(i, i + batchSize));
    }

    const batchResults = [];
    for (const batch of batches) {
      const numbersCSV = batch.join(",");
      const payload = {
        api_token: IPROG_API_TOKEN,
        phone_number: numbersCSV,
        message,
        sms_provider: 0,
      };

      try {
        const res = await fetch(IPROG_BASE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await parseResponseSafe(res);
        const ok =
          res.ok ||
          (typeof data === "object" &&
            data &&
            (data.status === 200 || String(data.status) === "200"));
        const status = ok ? "sent" : "failed";

        const perNumberResults = batch.map((n) => ({
          phone: `+${n}`,
          status,
          provider_response: data || null,
        }));

        await logSmsNotification({
          recipients: perNumberResults.map((r) => r.phone),
          message,
          status,
          response: data,
          method: "iprog",
        });

        batchResults.push({ batch: perNumberResults, success: ok, rawResponse: data });
      } catch (err) {
        const perNumberResults = batch.map((n) => ({
          phone: `+${n}`,
          status: "failed",
          provider_response: null,
          error: String(err),
        }));

        await logSmsNotification({
          recipients: perNumberResults.map((r) => r.phone),
          message,
          status: "failed",
          error: String(err),
          method: "iprog",
        });

        batchResults.push({ batch: perNumberResults, success: false, error: String(err) });
      }
    }

    const totalRecipients = cleanedList.length;
    const sentCount = batchResults.reduce(
      (acc, r) => acc + (r.success ? r.batch.length : 0),
      0,
    );

    Alert.alert("SMS Result", `Sent (approx): ${sentCount} / ${totalRecipients} recipients`);
    return { success: sentCount > 0, results: batchResults, method: "iprog" };
  } catch (error) {
    Alert.alert("SMS Error", error.message || String(error));
    return { success: false, error: error.message || String(error) };
  }
};

/**
 * Convenience wrapper to notify users (always IPROG for now)
 */
export const notifyUsers = async (message, phoneNumbers = []) => {
  try {
    return await sendIprogSMS(message, phoneNumbers);
  } catch (err) {
    return { success: false, error: String(err) };
  }
};

/**
 * Send OTP via IPROG
 */
export const sendOTPSMS = async (phoneNumber, otp = null) => {
  try {
    if (!phoneNumber || typeof phoneNumber !== "string") {
      throw new Error("Invalid phone number");
    }

    const formatted = formatPhoneNumber(phoneNumber);
    if (!formatted) {
      throw new Error(`Phone number format invalid: ${phoneNumber}`);
    }

    const otpCode = otp || generateOTP();
    const message = `Your G-Waste App verification code is: ${otpCode}. This code expires in 2 minutes.`;
    const cleanedNumber = formatted.replace("+", "");

    const payload = {
      api_token: IPROG_API_TOKEN,
      phone_number: cleanedNumber,
      message,
      sms_provider: 0,
    };

    const res = await fetch(IPROG_OTP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await parseResponseSafe(res);
    const ok =
      res.ok ||
      (typeof data === "object" &&
        data &&
        (data.status === 200 || String(data.status) === "200"));

    await logOtpNotification({
      phone: formatted,
      otp: otpCode,
      message,
      status: ok ? "sent" : "failed",
      response: data,
      method: "iprog",
    });


    if (!ok) {
      const reason =
        (typeof data === "object" && (data?.message || data?.status || JSON.stringify(data))) ||
        (typeof data === "string" ? data : "Failed to send OTP");
      throw new Error(
        typeof reason === "string"
          ? reason
          : "Failed to send OTP (see console for IPROG response).",
      );
    }

    const { error: insertError } = await supabase.from("otp_codes").insert([
      {
        phone_number: formatted,
        otp_code: otpCode,
        expires_at: new Date(Date.now() + OTP_EXPIRY_MS),
        used: false,
      },
    ]);

    if (insertError) {
      throw new Error("Failed to store OTP code");
    }

    return {
      success: true,
      otp: otpCode,
      phone: formatted,
      response: data,
      method: "iprog",
    };
  } catch (error) {
    Alert.alert("OTP Error", error.message || "Failed to send OTP");
    return {
      success: false,
      error: error.message || String(error),
    };
  }
};

/**
 * Backwards-compatible helper (uses new OTP sender)
 */
export const sendOtpSMS = async (phone, otp) => {
  const result = await sendOTPSMS(phone, otp);
  return result.success;
};

/**
 * Verify OTP against Supabase log
 */
export const verifyOTP = async (phoneNumber, enteredOTP) => {
  try {
    if (!phoneNumber || !enteredOTP) {
      throw new Error("Phone number and OTP required");
    }

    const formatted = formatPhoneNumber(phoneNumber);
    if (!formatted) {
      throw new Error("Invalid phone number format");
    }

    const { data, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone_number", formatted)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: "OTP not found" };
    }

    const now = Date.now();
    const expiresAt = new Date(data.expires_at).getTime();
    if (data.otp_code !== enteredOTP.trim()) {
      return { success: false, error: "OTP incorrect" };
    }
    if (expiresAt < now) {
      return { success: false, error: "OTP expired" };
    }

    await supabase.from("otp_codes").update({ used: true }).eq("id", data.id);

    return {
      success: true,
      phone: formatted,
      message: "OTP verified successfully",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
};

/**
 * Backwards-compatible helper (uses new verifier)
 */
export const verifyOtpCode = (phone, otp) => verifyOTP(phone, otp);
