// utils/scheduleHelpers.js

/**
 * Convert time string (HH:MM) to minutes since midnight
 * @param {string} hhmm - Time in HH:MM format
 * @returns {number|null} Minutes since midnight or null if invalid
 */
export const toMinutes = (hhmm) => {
  try {
    const [h, m] = String(hhmm).split(':').map((v) => parseInt(v));
    return h * 60 + (m || 0);
  } catch (_) {
    return null;
  }
};

/**
 * Convert minutes since midnight to HH:MM format
 * @param {number} minsTotal - Minutes since midnight
 * @returns {string} Time in HH:MM format
 */
export const toHHMM = (minsTotal) => {
  const h = Math.floor(minsTotal / 60) % 24;
  const m = minsTotal % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Format time string to 12-hour format with AM/PM
 * @param {string} timeString - Time in HH:MM format
 * @returns {string} Formatted time string
 */
export const formatTime = (timeString) => {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch (_error) {
    return timeString;
  }
};

/**
 * Normalize areas input (can be JSON string, comma-separated, or array)
 * @param {string|Array} areasVal - Areas in various formats
 * @returns {Array} Array of area names
 */
export const normalizeAreas = (areasVal) => {
  if (!areasVal) return [];
  if (Array.isArray(areasVal)) return areasVal.filter(Boolean);
  if (typeof areasVal === 'string') {
    const s = areasVal.trim();
    // Try JSON parse first
    if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (_) {}
    }
    // Fallback: comma-separated list
    return s.split(',').map(v => v.trim()).filter(Boolean);
  }
  return [];
};

/**
 * Generate time intervals for areas based on start and end times
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @param {string|Array} areasInput - Areas to schedule
 * @returns {Array} Array of time intervals with area assignments
 */
export const generateTimeIntervals = (startTime, endTime, areasInput) => {
  const areas = normalizeAreas(areasInput);
  if (!startTime || areas.length === 0) return [];
  
  try {
    const startMins = toMinutes(startTime);
    let intervalMinutes = 60;
    if (endTime) {
      const endMins = toMinutes(endTime);
      const totalMinutes = Math.max(0, endMins - startMins);
      intervalMinutes = Math.max(30, Math.min(120, Math.floor(totalMinutes / areas.length) || 60));
    }
    
    const intervals = [];
    let currentMins = startMins;
    
    areas.forEach((area, index) => {
      let intervalEndMins = currentMins + intervalMinutes;
      if (endTime) {
        const endMins = toMinutes(endTime);
        if (intervalEndMins > endMins) intervalEndMins = endMins;
      }
      
      intervals.push({
        area: area,
        startTime: toHHMM(currentMins),
        endTime: toHHMM(intervalEndMins),
        index: index + 1
      });
      
      currentMins = intervalEndMins;
      
      // Stop if we've reached the end time
      if (endTime && currentMins >= toMinutes(endTime)) return;
    });
    
    return intervals;
  } catch (error) {
    console.error('Error generating time intervals:', error);
    return areas.map((area, index) => ({
      area: area,
      startTime: startTime,
      endTime: endTime,
      index: index + 1
    }));
  }
};

/**
 * Find schedule entry by location name
 * @param {string} locationName - Location/area name to find
 * @param {Array} schedule - Schedule array
 * @returns {Object|null} Schedule entry or null
 */
export const findScheduleEntryByLocation = (locationName, schedule) => {
  if (!locationName) return null;
  const name = String(locationName).trim().toLowerCase();
  return (schedule || []).find((s) => String(s.location).trim().toLowerCase() === name) || null;
};

/**
 * Compute next uncollected area from schedule
 * @param {Array} schedule - Full schedule array
 * @param {Set} collected - Set of collected area names
 * @returns {Object|null} Next area to collect or null
 */
export const computeNextUncollected = (schedule, collected) => {
  if (!Array.isArray(schedule) || schedule.length === 0) return null;
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentMins = toMinutes(currentTime);
  
  // Helper function to normalize area names for comparison
  const normalizeAreaName = (name) => String(name || '').trim().toLowerCase();
  const normalizedCollected = new Set();
  if (collected && collected.size > 0) {
    collected.forEach(area => normalizedCollected.add(normalizeAreaName(area)));
  }
  
  let candidate = null;
  for (let i = 0; i < schedule.length; i++) {
    const it = schedule[i];
    if (normalizedCollected.has(normalizeAreaName(it.location))) continue;
    const startM = toMinutes(it.time);
    if (startM == null) continue;
    if (currentMins <= startM) {
      candidate = it;
      break;
    }
    if (!candidate) candidate = it; // fallback to earliest if all started
  }
  return candidate;
};

/**
 * Update current and next areas based on schedule and time
 * @param {Array} schedule - Full schedule array
 * @param {Set} collectedAreas - Set of collected area names
 * @returns {Object} Object with current and next areas
 */
export const updateCurrentAndNextAreas = (schedule, collectedAreas) => {
  if (!schedule || schedule.length === 0) {
    return { current: null, next: null };
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentMins = toMinutes(currentTime);
  
  // Helper function to normalize area names for comparison (case-insensitive, trimmed)
  const normalizeAreaName = (name) => {
    return String(name || '').trim().toLowerCase();
  };
  
  // Create a normalized set of collected areas for comparison
  const normalizedCollected = new Set();
  if (collectedAreas && collectedAreas.size > 0) {
    collectedAreas.forEach(area => {
      normalizedCollected.add(normalizeAreaName(area));
    });
  }
  
  // Filter out collected areas (case-insensitive comparison)
  const uncollectedSchedule = schedule.filter(item => {
    const normalizedLocation = normalizeAreaName(item.location);
    return !normalizedCollected.has(normalizedLocation);
  });
  
  if (uncollectedSchedule.length === 0) {
    return { current: null, next: null };
  }
  
  let current = null;
  let next = null;
  
  // Strategy 1: Find current area based on time window (if we're within its scheduled time)
  for (let i = 0; i < uncollectedSchedule.length; i++) {
    const item = uncollectedSchedule[i];
    const startM = toMinutes(item.time);
    let endM = toMinutes(item.endTime);
    if (endM == null) {
      endM = (startM || 0) + 90; // assume 90 mins window if end missing
    }
    
    if (startM != null && currentMins >= startM && currentMins <= endM) {
      current = item;
      // Next area is the one after current
      if (i + 1 < uncollectedSchedule.length) {
        next = uncollectedSchedule[i + 1];
      }
      break;
    }
  }
  
  // Strategy 2: If no current area found by time window, determine based on schedule order
  // This handles cases where driver completes areas early, late, or is between time windows
  if (!current) {
    // Find areas that have started (current time >= start time)
    const startedAreas = uncollectedSchedule.filter(item => {
      const startM = toMinutes(item.time);
      return startM != null && currentMins >= startM;
    });
    
    // Find areas that haven't started yet (future areas)
    const futureAreas = uncollectedSchedule.filter(item => {
      const startM = toMinutes(item.time);
      return startM != null && currentMins < startM;
    });
    
    if (startedAreas.length > 0) {
      // We have areas that should have started - use the first one as current (catch-up mode)
      current = startedAreas[0];
      // Next is either the next started area or first future area
      if (startedAreas.length > 1) {
        next = startedAreas[1];
      } else if (futureAreas.length > 0) {
        next = futureAreas[0];
      } else if (uncollectedSchedule.length > 1) {
        // Fallback: next uncollected in schedule order
        const currentIndex = uncollectedSchedule.findIndex(item => item.location === current.location);
        if (currentIndex >= 0 && currentIndex + 1 < uncollectedSchedule.length) {
          next = uncollectedSchedule[currentIndex + 1];
        }
      }
    } else if (futureAreas.length > 0) {
      // No areas have started yet - first future area is next
      next = futureAreas[0];
    } else if (uncollectedSchedule.length > 0) {
      // Fallback: use first uncollected area as current (shouldn't happen normally)
      current = uncollectedSchedule[0];
      if (uncollectedSchedule.length > 1) {
        next = uncollectedSchedule[1];
      }
    }
  }
  
  return { current, next };
};

/**
 * Build schedule list from routes data
 * @param {Array} rows - Route data rows from database
 * @returns {Array} Formatted schedule list
 */
export const buildSchedule = (rows) => {
  const scheduleList = [];
  (rows || []).forEach((data) => {
    const areasArr = normalizeAreas(data?.areas);
    const startTime = data?.time || data?.startTime || data?.start_time || null;
    const endTime = data?.endTime || data?.end_time || null;
    const routeNum = data?.route || data?.route_number || data?.routeNo || null;
    if (startTime && areasArr.length > 0) {
      const timeIntervals = generateTimeIntervals(startTime, endTime, areasArr);
      timeIntervals.forEach((interval) => {
        scheduleList.push({
          time: interval.startTime,
          endTime: interval.endTime,
          location: interval.area,
          routeNumber: routeNum,
          type: data?.type || 'Waste Collection',
          frequency: data?.frequency,
          dayOff: data?.dayOff || data?.day_off,
          areaIndex: interval.index,
        });
      });
    }
  });
  scheduleList.sort((a, b) => new Date(`2000-01-01 ${a.time}`) - new Date(`2000-01-01 ${b.time}`));
  return scheduleList;
};

