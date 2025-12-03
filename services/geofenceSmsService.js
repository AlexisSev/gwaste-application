// services/geofenceSmsService.js
import { sendIprogSMS } from "./otpService";
import { supabase } from "./supabaseClient";

// Helper function to format phone number (same as otpService.js)
const formatPhoneNumber = (value = "") => {
  try {
    if (!value || typeof value !== "string") return null;
    const digits = value.replace(/\D/g, "");
    if (!digits) return null;

    let normalized = digits;
    if (normalized.startsWith("0")) normalized = "63" + normalized.substring(1);
    else if (normalized.length === 10) normalized = "63" + normalized;
    else if (!normalized.startsWith("63")) normalized = `63${normalized}`;

    const e164 = `+${normalized}`;
    return /^\+63\d{10}$/.test(e164) ? e164 : null;
  } catch (_err) {
    return null;
  }
};

/**
 * Send SMS notification to residents in a specific area
 * @param {string} areaName - The area/barangay name
 * @param {string} collectorName - Name of the collector/driver
 * @returns {Promise<Object>} Result of the notification
 */
export const notifyResidentsInArea = async (areaName, collectorName = "Garbage Collector") => {
  try {
    console.log(`📢 Notifying residents in ${areaName}...`);

    // Get all residents in the specified area
    const { data: residents, error: fetchError } = await supabase
      .from("residents")
      .select("id, phone_number, first_name, resident_address")
      .eq("resident_address", areaName);

    if (fetchError) {
      console.error("Error fetching residents:", fetchError);
      throw fetchError;
    }

    if (!residents || residents.length === 0) {
      console.log(`No residents found in ${areaName}`);
      return { success: true, message: "No residents to notify", sentCount: 0 };
    }

    console.log(`📱 Found ${residents.length} residents in ${areaName}`);

    // Prepare SMS message
    const message = `Hello! The garbage truck is now in your area (${areaName}). Please prepare your waste for collection. Thank you!`;

    // First, create in-app notifications for ALL residents (no SMS cost)
    for (const resident of residents) {
      if (resident.id) {
        try {
          await supabase.from("notifications").insert({
            user_id: resident.id,
            title: "Garbage Collection Alert",
            message: `The garbage truck is now in your area (${areaName}). Please prepare your waste for collection.`,
            area: areaName,
            is_read: false
          });
          console.log(`📬 In-app notification created for ${resident.first_name || 'Resident'}`);
        } catch (notifError) {
          console.error(`⚠️ Failed to log notification for ${resident.first_name}:`, notifError);
        }
      }
    }
    
    console.log(`✅ Created in-app notifications for all ${residents.length} residents`);

    // Collect all valid phone numbers from residents
    const phoneNumbers = [];
    for (const resident of residents) {
      if (!resident.phone_number) {
        console.log(`⚠️ Skipping ${resident.first_name}: No phone number`);
        continue;
      }

      const formatted = formatPhoneNumber(resident.phone_number);
      if (!formatted) {
        console.error(`⚠️ Invalid phone number format for ${resident.first_name}: ${resident.phone_number}`);
        continue;
      }

      phoneNumbers.push(resident.phone_number); // Keep original format, sendIprogSMS will format it
    }

    let smsSuccess = false;
    let smsError = null;

    // Send 1 bulk SMS to all residents using the existing sendIprogSMS function (uses only 1 credit)
    if (phoneNumbers.length > 0) {
      console.log(`📱 Sending 1 bulk SMS to ${phoneNumbers.length} residents in ${areaName}...`);
      
      try {
        // Use the existing bulk SMS function from otpService.js
        // This ensures consistency and eliminates code duplication
        const smsResult = await sendIprogSMS(message, phoneNumbers, phoneNumbers.length); // Set batchSize to all numbers to send in 1 batch
        
        if (smsResult.success) {
          smsSuccess = true;
          console.log(`✅ Bulk SMS sent successfully to ${phoneNumbers.length} residents in ${areaName} (used 1 credit)`);
        } else {
          smsError = smsResult.error || 'Failed to send SMS';
          console.error(`❌ Failed to send bulk SMS:`, smsError);
        }
      } catch (error) {
        console.error(`❌ Error sending bulk SMS:`, error);
        smsError = error.message || String(error);
      }
    } else {
      console.log(`⚠️ No valid phone numbers found for residents in ${areaName}`);
    }

    // Log summary notification for admin tracking
    try {
      const summaryMessage = smsSuccess 
        ? `Bulk SMS sent to ${phoneNumbers.length} residents in ${areaName} (used 1 credit). All ${residents.length} residents received in-app notifications.`
        : `Failed to send bulk SMS to residents in ${areaName}. All ${residents.length} residents received in-app notifications.`;
      
      await supabase.from("notifications").insert({
        title: "SMS Notification Summary",
        message: summaryMessage,
        area: areaName,
        is_read: false
      });
    } catch (logError) {
      console.error("Error logging summary notification:", logError);
    }

    return {
      success: smsSuccess,
      message: smsSuccess 
        ? `Bulk SMS sent to ${phoneNumbers.length} residents in ${areaName} (used 1 credit). All ${residents.length} residents received in-app notifications.`
        : `Failed to send SMS: ${smsError || 'Unknown error'}. All ${residents.length} residents received in-app notifications.`,
      sentCount: smsSuccess ? phoneNumbers.length : 0,
      failedCount: smsSuccess ? 0 : phoneNumbers.length,
      results: phoneNumbers.map(phone => ({
        phone: `+${phone}`,
        success: smsSuccess,
        error: smsSuccess ? null : smsError
      }))
    };
  } catch (error) {
    console.error("Error in notifyResidentsInArea:", error);
    return {
      success: false,
      message: error.message || "Failed to send notifications",
      sentCount: 0,
      failedCount: 0
    };
  }
};