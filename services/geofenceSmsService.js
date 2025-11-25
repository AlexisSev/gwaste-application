// services/geofenceSmsService.js
import { supabase } from "./supabaseClient";

// IPROGSMS Configuration
const IPROGSMS_API_KEY = "e5ac0f9233301dd0dc10448abb5089527cf2cf94"; // Replace with your actual API key

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

    // Send SMS to each resident
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const resident of residents) {
      if (!resident.phone_number) {
        console.log(`⚠️ Skipping ${resident.first_name}: No phone number`);
        continue;
      }

      try {
        const response = await fetch("https://iprogsms.com/api/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apikey: IPROGSMS_API_KEY,
            number: resident.phone_number,
            message: message
          }),
        });

        const result = await response.json();

        if (response.ok && result.status !== "error") {
          successCount++;
          console.log(`✅ SMS sent to ${resident.first_name} (${resident.phone_number})`);
          results.push({ phone: resident.phone_number, success: true, name: resident.first_name });
          
          // Create notification record for this resident
          try {
            await supabase.from("notifications").insert({
              user_id: resident.id,
              title: "Garbage Collection Alert",
              message: `The garbage truck is now in your area (${areaName}). Please prepare your waste for collection.`,
              area: areaName,
              is_read: false
            });
          } catch (notifError) {
            console.error(`⚠️ Failed to log notification for ${resident.first_name}:`, notifError);
          }
        } else {
          failCount++;
          console.error(`❌ Failed to send SMS to ${resident.first_name}:`, result.message);
          results.push({ phone: resident.phone_number, success: false, error: result.message, name: resident.first_name });
        }

        // Small delay to avoid rate limiting (100ms between requests)
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failCount++;
        console.error(`❌ Error sending SMS to ${resident.first_name}:`, error);
        results.push({ phone: resident.phone_number, success: false, error: error.message, name: resident.first_name });
      }
    }

    // Log summary notification for admin tracking (no user_id means it's a system notification)
    try {
      await supabase.from("notifications").insert({
        title: "SMS Notification Summary",
        message: `${successCount} out of ${residents.length} residents in ${areaName} successfully notified via SMS`,
        area: areaName,
        is_read: false
      });
    } catch (logError) {
      console.error("Error logging summary notification:", logError);
    }

    return {
      success: true,
      message: `Notified ${successCount} out of ${residents.length} residents`,
      sentCount: successCount,
      failedCount: failCount,
      results: results
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