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
  } catch (error) {
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
  const name = String(locationName).trim();
  return (schedule || []).find((s) => String(s.location).trim() === name) || null;
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
  let candidate = null;
  for (let i = 0; i < schedule.length; i++) {
    const it = schedule[i];
    if (collected.has(it.location)) continue;
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
  
  // Find current area (if we're within its time range)
  let current = null;
  let next = null;
  
  for (let i = 0; i < schedule.length; i++) {
    const item = schedule[i];
    const isCollected = collectedAreas.has(item.location);
    
    if (!isCollected) {
      const startM = toMinutes(item.time);
      let endM = toMinutes(item.endTime);
      if (endM == null) {
        endM = (startM || 0) + 90; // assume 90 mins window if end missing
      }
      if (!current && startM != null && currentMins >= startM && currentMins <= endM) {
        current = item;
      } else if (!next && startM != null && currentMins < startM) {
        next = item;
        break;
      }
    }
  }
  
  // If no current area found, the next uncollected area becomes next
  if (!current && !next) {
    const uncollectedAreas = schedule.filter(item => !collectedAreas.has(item.location));
    if (uncollectedAreas.length > 0) {
      next = uncollectedAreas[0];
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

