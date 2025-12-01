/* eslint-disable react-hooks/exhaustive-deps */
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { AlertCircle, CheckCircle, Navigation, Truck } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCollectorAuth } from '../../hooks/useCollectorAuthSupabase';
import { sendIprogSMS } from '../../services/otpService';
import { supabase } from '../../services/supabaseClient';

export default function LandingScreen() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  // Removed unused states: assignedRoutes, areasCollected (not displayed)
  const [todaysSchedule, setTodaysSchedule] = useState([]);
  const [routeNames, setRouteNames] = useState([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [collectedAreas, setCollectedAreas] = useState(new Set());
  const [locationPermission, setLocationPermission] = useState(false);
  const [collectedAreasLoaded, setCollectedAreasLoaded] = useState(false);
  const router = useRouter();
  const { collector, logout } = useCollectorAuth();
  const [recentComplaints] = useState([
    {
      id: 'complaint-1',
      title: 'Overflowing bin',
      location: 'Barangay Poblacion',
      severity: 'medium',
      reportedAgo: 'Reported 2 hrs ago',
    },
    {
      id: 'complaint-2',
      title: 'Missed Pickup',
      location: 'San Isidro',
      severity: 'high',
      reportedAgo: 'Reported 5 hrs ago',
    },
  ]);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      return timeString;
    }
  };

  const generateTimeIntervals = (startTime, endTime, areas) => {
    if (!startTime || !endTime || !areas || areas.length === 0) return [];
    
    try {
      const start = new Date(`2000-01-01 ${startTime}`);
      const end = new Date(`2000-01-01 ${endTime}`);
      const totalMinutes = (end - start) / (1000 * 60);
      
      // Calculate interval based on number of areas (1-1.5 hours per area)
      const intervalMinutes = Math.max(60, Math.min(90, Math.floor(totalMinutes / areas.length)));
      
      const intervals = [];
      let currentTime = new Date(start);
      
      areas.forEach((area, index) => {
        const intervalEnd = new Date(currentTime.getTime() + intervalMinutes * 60000);
        
        // Don't exceed the end time
        if (intervalEnd > end) {
          intervalEnd.setTime(end.getTime());
        }
        
        intervals.push({
          area: area,
          startTime: currentTime.toTimeString().slice(0, 5),
          endTime: intervalEnd.toTimeString().slice(0, 5),
          index: index + 1
        });
        
        currentTime = new Date(intervalEnd);
        
        // Stop if we've reached the end time
        if (currentTime >= end) return;
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

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        return true;
      } else {
        Alert.alert('Permission denied', 'Location permission is required for geofencing.');
        return false;
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation(location.coords);
      return location.coords;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  // Calculate distance between two coordinates (in meters)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Check if collector is within geofence of an area
  const checkGeofence = async (area, areaCoordinates) => {
    if (!currentLocation || !areaCoordinates) return false;
    
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      areaCoordinates.latitude,
      areaCoordinates.longitude
    );
    
    // Geofence radius of 100 meters
    return distance <= 100;
  };

  // Mark area as collected (append to areas_collected text[] for today's record)
  const markAreaAsCollected = async (area, routeNumber, routeId) => {
    try {
      // Validate routeId - ensure it's a valid UUID string
      const validRouteId = routeId && typeof routeId === 'string' && routeId.trim() !== '' ? routeId.trim() : null;
      
      // Debug: Log routeId to verify it's being passed
      console.log('Marking area as collected:', { 
        area, 
        routeNumber, 
        routeId: routeId, 
        validRouteId: validRouteId,
        routeIdType: typeof routeId,
        collectorId: collector?.id
      });
      
      if (!validRouteId) {
        console.warn('⚠️ WARNING: routeId is missing or invalid:', routeId);
      }
      
      // Fetch route type from routes table to use as waste_type
      let routeType = null;
      if (validRouteId) {
        try {
          const { data: routeData, error: routeError } = await supabase
            .from('routes')
            .select('type')
            .eq('id', validRouteId)
            .single();
          
          if (!routeError && routeData?.type) {
            routeType = routeData.type; // e.g., "Dili Malata", "MALATA"
            console.log('📋 Route type fetched:', routeType);
          } else if (routeError) {
            console.warn('⚠️ Could not fetch route type:', routeError);
          }
        } catch (err) {
          console.warn('⚠️ Error fetching route type:', err);
        }
      }
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // 1) Fetch existing row for this collector and date
      // Check for existing collection with same route_id if provided, otherwise just by collector and date
      let existing = null;
      if (validRouteId) {
        const { data: existingWithRoute, error: fetchErr1 } = await supabase
          .from('collections')
          .select('id, areas_collected, route_id')
          .eq('collector_id', collector?.id)
          .eq('collected_date', today)
          .eq('route_id', validRouteId)
          .maybeSingle();
        if (fetchErr1 && fetchErr1.code !== 'PGRST116') throw fetchErr1;
        existing = existingWithRoute;
      }
      
      // If no existing row with route_id, check for any row for this collector and date
      if (!existing) {
        const { data: existingAny, error: fetchErr2 } = await supabase
          .from('collections')
          .select('id, areas_collected, route_id')
          .eq('collector_id', collector?.id)
          .eq('collected_date', today)
          .maybeSingle();
        if (fetchErr2 && fetchErr2.code !== 'PGRST116') throw fetchErr2;
        existing = existingAny;
      }

      if (!existing) {
        // 2) Insert a new row with this area
        const locationString = currentLocation && currentLocation.latitude && currentLocation.longitude
          ? `${currentLocation.latitude},${currentLocation.longitude}`
          : null;
        
        const insertData = {
          collector_id: collector?.id,
          collector_name: collector?.firstName || collector?.driver,
          collected_date: today,
          areas_collected: [area],
          route_id: validRouteId, // Use route_id for triggers (null if not provided)
          collected_at: new Date().toISOString(),
          location: locationString,
          status: 'completed',
          collection_type: 'manual', // Manual collection method
          waste_type: routeType || null // Waste type from routes.type (e.g., "Dili Malata", "MALATA")
        };
        
        console.log('📝 Inserting collection:', {
          route_id: insertData.route_id,
          area: insertData.areas_collected,
          collector_id: insertData.collector_id,
          waste_type: insertData.waste_type,
          collection_type: insertData.collection_type
        });
        
        const { data: insertedData, error: insertErr } = await supabase
          .from('collections')
          .insert(insertData)
          .select('id, route_id, areas_collected, waste_type, collection_type');
        
        if (insertErr) {
          console.error('❌ Error inserting collection:', insertErr);
          console.error('❌ Insert data that failed:', JSON.stringify(insertData, null, 2));
          throw insertErr;
        }
        
        const insertedRow = Array.isArray(insertedData) ? insertedData[0] : insertedData;
        
        console.log('✅ Collection inserted successfully:', {
          id: insertedRow?.id,
          route_id: insertedRow?.route_id,
          areas_collected: insertedRow?.areas_collected,
          waste_type: insertedRow?.waste_type,
          collection_type: insertedRow?.collection_type
        });
        
        // Verify route_id was actually saved
        if (validRouteId && !insertedRow?.route_id) {
          console.error('⚠️ WARNING: route_id was not saved on insert! Expected:', validRouteId, 'Got:', insertedRow?.route_id);
          
          // Retry update after insert
          await new Promise(resolve => setTimeout(resolve, 500));
          const { error: retryInsertErr } = await supabase
            .from('collections')
            .update({ route_id: validRouteId })
            .eq('id', insertedRow?.id);
          
          if (retryInsertErr) {
            console.error('❌ Retry insert update failed:', retryInsertErr);
          } else {
            console.log('✅ Retry insert update sent');
            // Verify again
            await new Promise(resolve => setTimeout(resolve, 500));
            const { data: verifyInsert } = await supabase
              .from('collections')
              .select('route_id')
              .eq('id', insertedRow?.id)
              .single();
            if (verifyInsert) {
              console.log('✅ Insert verification after retry:', verifyInsert);
            }
          }
        } else if (validRouteId && insertedRow?.route_id === validRouteId) {
          console.log('✅ route_id saved correctly on insert:', validRouteId);
        }
      } else {
        // 3) Update existing row, append if not present
        const current = Array.isArray(existing.areas_collected) ? existing.areas_collected : [];
        
        // Normalize area names for comparison (trim and case-insensitive)
        const normalizedArea = String(area || '').trim();
        const normalizedCurrent = current.map(a => String(a || '').trim());
        
        // Check if area already exists (case-insensitive and trimmed)
        const areaExists = normalizedCurrent.some(
          existingArea => existingArea.toLowerCase() === normalizedArea.toLowerCase()
        );
        
        console.log('🔍 Checking if area exists:', {
          rawArea: area,
          normalizedArea: normalizedArea,
          currentAreas: current,
          normalizedCurrent: normalizedCurrent,
          areaExists: areaExists,
          existingId: existing.id,
          existingRouteId: existing.route_id
        });
        
        // Debug: Log the exact area name being passed
        console.log('🔍 Area name analysis:', {
          original: area,
          type: typeof area,
          length: area?.length,
          normalized: normalizedArea,
          normalizedLength: normalizedArea.length,
          charCodes: normalizedArea.split('').map(c => c.charCodeAt(0))
        });
        
        if (!areaExists) {
          // Use the normalized area name (trimmed) - but preserve original if it exists in routes
          // Try to match against routes table to get exact area name
          let exactAreaName = normalizedArea;
          
          if (validRouteId) {
            try {
              const { data: routeData } = await supabase
                .from('routes')
                .select('areas')
                .eq('id', validRouteId)
                .single();
              
              if (routeData?.areas && Array.isArray(routeData.areas)) {
                // Find the exact area name from routes table (case-insensitive match)
                const matchedArea = routeData.areas.find(
                  routeArea => String(routeArea || '').trim().toLowerCase() === normalizedArea.toLowerCase()
                );
                
                if (matchedArea) {
                  exactAreaName = String(matchedArea).trim();
                  console.log('✅ Found exact area name in routes table:', {
                    searched: normalizedArea,
                    found: exactAreaName,
                    allRoutesAreas: routeData.areas
                  });
                } else {
                  console.warn('⚠️ Area not found in routes.areas, using normalized name:', {
                    searched: normalizedArea,
                    routesAreas: routeData.areas
                  });
                }
              }
            } catch (err) {
              console.warn('⚠️ Could not fetch route areas for exact match:', err);
            }
          }
          
          // Use the exact area name from routes table if found, otherwise use normalized
          const updatedAreas = [...current, exactAreaName];
          
          console.log('📝 Final area name to add:', {
            original: area,
            normalized: normalizedArea,
            exactFromRoutes: exactAreaName,
            willAdd: exactAreaName,
            updatedAreas: updatedAreas
          });
          
          console.log('📝 Preparing to update collection:', {
            existing_id: existing.id,
            current_areas: current,
            new_area: normalizedArea,
            updated_areas: updatedAreas,
            route_id: validRouteId,
            waste_type: routeType
          });
          
          // Strategy: Use PostgreSQL array_append via RPC or update with explicit array handling
          // The trigger might be interfering, so we'll try multiple approaches
          
          // Step 1: Update metadata first (route_id, waste_type, collection_type, collected_at)
          // Update collected_at to current time when adding a new area
          if (validRouteId || routeType) {
            const metadataUpdate = {
              route_id: validRouteId || existing.route_id,
              waste_type: routeType || existing.waste_type,
              collection_type: 'manual',
              collected_at: new Date().toISOString() // Update timestamp when adding new area
            };
            
            console.log('📝 Step 1: Updating metadata:', metadataUpdate);
            
            const { error: metadataErr } = await supabase
              .from('collections')
              .update(metadataUpdate)
              .eq('id', existing.id);
            
            if (metadataErr) {
              console.error('❌ Error updating metadata:', metadataErr);
            } else {
              console.log('✅ Metadata updated');
            }
            
            // Wait for triggers
            await new Promise(resolve => setTimeout(resolve, 400));
          } else {
            // Even if no route_id/routeType, still update collected_at and collection_type
            const metadataUpdate = {
              collection_type: 'manual',
              collected_at: new Date().toISOString() // Update timestamp when adding new area
            };
            
            const { error: metadataErr } = await supabase
              .from('collections')
              .update(metadataUpdate)
              .eq('id', existing.id);
            
            if (metadataErr) {
              console.error('❌ Error updating collected_at:', metadataErr);
            } else {
              console.log('✅ collected_at updated');
            }
            
            await new Promise(resolve => setTimeout(resolve, 400));
          }
          
          // Step 2: Use PostgreSQL function to safely append area (bypasses trigger issues)
          console.log('📝 Step 2: Appending area using PostgreSQL function');
          
          try {
            // Call the PostgreSQL function via RPC to safely append the area
            const { error: rpcError } = await supabase.rpc('append_collection_area', {
              p_collection_id: existing.id,
              p_area_name: exactAreaName
            });
            
            if (rpcError) {
              console.warn('⚠️ RPC function not available, falling back to direct update:', rpcError);
              
              // Fallback: Direct update if RPC function doesn't exist
              const { data: currentData } = await supabase
                .from('collections')
                .select('areas_collected')
                .eq('id', existing.id)
                .single();
              
              const currentAreasFromDb = currentData?.areas_collected || [];
              const normalizedCurrentFromDb = currentAreasFromDb.map(a => String(a || '').trim().toLowerCase());
              
              if (!normalizedCurrentFromDb.includes(exactAreaName.toLowerCase())) {
                const finalAreas = [...currentAreasFromDb, exactAreaName];
                
                const { error: areasErr } = await supabase
                  .from('collections')
                  .update({ 
                    areas_collected: finalAreas,
                    collected_at: new Date().toISOString() // Update timestamp when adding new area
                  })
                  .eq('id', existing.id);
                
                if (areasErr) {
                  console.error('❌ Error updating areas_collected:', areasErr);
                  throw areasErr;
                }
              }
            } else {
              console.log('✅ Area appended via RPC function');
            }
            
            // Wait for database to process
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Verify the area was added
            const { data: verifyData } = await supabase
              .from('collections')
              .select('areas_collected')
              .eq('id', existing.id)
              .single();
            
            if (verifyData) {
              const verifyNormalized = (verifyData.areas_collected || []).map(a => String(a || '').trim().toLowerCase());
              const isIncluded = verifyNormalized.includes(exactAreaName.toLowerCase());
              
              if (!isIncluded) {
                console.error('⚠️ Area still not added. Trigger may be interfering.');
                console.error('Current areas in DB:', verifyData.areas_collected);
                
                // Last resort: Try direct update one more time
                await new Promise(resolve => setTimeout(resolve, 1000));
                const { data: retryCurrent } = await supabase
                  .from('collections')
                  .select('areas_collected')
                  .eq('id', existing.id)
                  .single();
                
                if (retryCurrent) {
                  const retryAreas = retryCurrent.areas_collected || [];
                  const retryNormalized = retryAreas.map(a => String(a || '').trim().toLowerCase());
                  
                  if (!retryNormalized.includes(exactAreaName.toLowerCase())) {
                    await supabase
                      .from('collections')
                      .update({ 
                        areas_collected: [...retryAreas, exactAreaName],
                        collected_at: new Date().toISOString() // Update timestamp when adding new area
                      })
                      .eq('id', existing.id);
                  }
                }
              } else {
                console.log('✅ Area successfully added:', exactAreaName);
              }
            }
          } catch (err) {
            console.error('❌ Error in Step 2:', err);
            // Continue anyway - the area might still be added
          }
          
          // Wait a moment for database to process, then verify
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Fetch the updated row to verify everything was saved
          const { data: fetchedRows, error: fetchErr } = await supabase
            .from('collections')
            .select('id, route_id, areas_collected, waste_type, collection_type')
            .eq('id', existing.id);
          
          if (fetchErr) {
            console.warn('⚠️ Could not fetch updated row to verify:', fetchErr);
          } else if (fetchedRows && fetchedRows.length > 0) {
            const fetchedRow = fetchedRows[0];
            console.log('✅ Collection updated successfully:', {
              id: fetchedRow.id,
              route_id: fetchedRow.route_id,
              areas_collected: fetchedRow.areas_collected,
              waste_type: fetchedRow.waste_type,
              collection_type: fetchedRow.collection_type
            });
            
            // Verify the new area was added (case-insensitive and trimmed comparison)
            const normalizedFetched = (fetchedRow.areas_collected || []).map(a => String(a || '').trim().toLowerCase());
            const normalizedAreaCheck = String(area || '').trim().toLowerCase();
            const areaWasAdded = normalizedFetched.includes(normalizedAreaCheck);
            
            if (!areaWasAdded) {
              console.error('⚠️ WARNING: New area was not added!', {
                expected_area: area,
                normalized_expected: normalizedAreaCheck,
                current_areas: fetchedRow.areas_collected,
                normalized_current: normalizedFetched
              });
            } else {
              console.log('✅ New area added successfully:', {
                area: area,
                normalized: normalizedAreaCheck,
                all_areas: fetchedRow.areas_collected
              });
            }
            
            // Verify waste_type was saved
            if (routeType && fetchedRow.waste_type !== routeType) {
              console.error('⚠️ WARNING: waste_type was not saved correctly! Expected:', routeType, 'Got:', fetchedRow.waste_type);
            } else if (routeType && fetchedRow.waste_type === routeType) {
              console.log('✅ waste_type saved correctly:', fetchedRow.waste_type);
            }
            
            // Verify route_id was actually saved
            if (validRouteId && !fetchedRow.route_id) {
              console.error('⚠️ WARNING: route_id was not saved! Expected:', validRouteId, 'Got:', fetchedRow.route_id);
              console.error('⚠️ This might indicate a database trigger or constraint issue');
              
              // Try one more time with a direct update (no select)
              console.log('🔄 Retrying route_id update...');
              const { error: retryErr } = await supabase
                .from('collections')
                .update({ route_id: validRouteId })
                .eq('id', existing.id);
              
              if (retryErr) {
                console.error('❌ Retry failed:', retryErr);
              } else {
                console.log('✅ Retry update sent, waiting for database...');
                // Wait and verify again
                await new Promise(resolve => setTimeout(resolve, 500));
                const { data: finalCheck } = await supabase
                  .from('collections')
                  .select('route_id, waste_type, areas_collected')
                  .eq('id', existing.id);
                if (finalCheck && finalCheck.length > 0) {
                  console.log('✅ Final check after retry:', finalCheck[0]);
                }
              }
            } else if (validRouteId && fetchedRow.route_id === validRouteId) {
              console.log('✅ route_id verified and saved correctly:', validRouteId);
              
              // Double-check by querying database again after a delay
              await new Promise(resolve => setTimeout(resolve, 1000));
              const { data: doubleCheck } = await supabase
                .from('collections')
                .select('route_id, waste_type, areas_collected, collection_type, id')
                .eq('id', existing.id)
                .single();
              
              if (doubleCheck) {
                if (doubleCheck.route_id === validRouteId) {
                  console.log('✅ Double-check confirmed: route_id is saved in database:', doubleCheck.route_id);
                  console.log('✅ Double-check - waste_type:', doubleCheck.waste_type);
                  console.log('✅ Double-check - areas_collected:', doubleCheck.areas_collected);
                  console.log('✅ Double-check - collection_type:', doubleCheck.collection_type);
                  
                  // Verify the new area was added (case-insensitive and trimmed comparison)
                  const normalizedDoubleCheck = (doubleCheck.areas_collected || []).map(a => String(a || '').trim().toLowerCase());
                  const normalizedAreaDoubleCheck = String(area || '').trim().toLowerCase();
                  const areaWasAddedDouble = normalizedDoubleCheck.includes(normalizedAreaDoubleCheck);
                  
                  if (!areaWasAddedDouble) {
                    console.error('⚠️ WARNING: New area was not added in double-check!', {
                      expected_area: area,
                      normalized_expected: normalizedAreaDoubleCheck,
                      current_areas: doubleCheck.areas_collected,
                      normalized_current: normalizedDoubleCheck
                    });
                  } else {
                    console.log('✅ New area confirmed in double-check:', {
                      area: area,
                      normalized: normalizedAreaDoubleCheck,
                      all_areas: doubleCheck.areas_collected
                    });
                  }
                } else {
                  console.error('❌ Double-check FAILED: route_id was cleared! Expected:', validRouteId, 'Got:', doubleCheck.route_id);
                  console.error('❌ This indicates a database trigger or constraint is clearing route_id');
                }
              }
            } else if (validRouteId && fetchedRow.route_id !== validRouteId) {
              console.error('⚠️ WARNING: route_id mismatch! Expected:', validRouteId, 'Got:', fetchedRow.route_id);
            }
          } else {
            console.warn('⚠️ No rows returned from verification query');
          }
        } else {
          // Area already collected, but update route_id and waste_type if they're missing
          if (validRouteId && !existing.route_id) {
            const updateData = {
              route_id: validRouteId
            };
            
            // Also update waste_type if we have route type
            if (routeType) {
              updateData.waste_type = routeType;
            }
            
            const { error: updateErr } = await supabase
              .from('collections')
              .update(updateData)
              .eq('id', existing.id);
            if (updateErr) {
              console.warn('Error updating route_id/waste_type:', updateErr);
            } else {
              console.log('✅ Updated route_id and waste_type for existing collection:', { route_id: validRouteId, waste_type: routeType });
            }
          }
        }
      }

      // Local UI updates
      setCollectedAreas(prev => new Set([...prev, area]));
      setTodaysSchedule(prev => 
        prev.map(item => 
          item.location === area 
            ? { ...item, collected: true, collectedAt: new Date().toISOString() }
            : item
        )
      );

      await notifyResidents(area, 'collected');
      

    } catch (error) {
      console.error('Error marking area as collected:', error);
    }
  };

  // Manual collection button handler
  const handleManualCollection = async (area, routeNumber, routeId) => {
    // Debug: Log what's being passed
    console.log('🔘 Manual collection clicked:', { area, routeNumber, routeId, routeIdType: typeof routeId });
    
    if (!routeId) {
      console.warn('⚠️ WARNING: routeId is missing when marking area as collected!', { area, routeNumber });
    }
    
    Alert.alert(
      'Mark as Collected',
      `Are you sure you want to mark ${area} as collected?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Collected',
          onPress: async () => {
            try {
              await markAreaAsCollected(area, routeNumber, routeId);
              Alert.alert('Success', `${area} has been marked as collected and saved to database!`);
            } catch (error) {
              Alert.alert('Error', `Failed to mark area as collected: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  const handleReportTruckIssue = () => {
    setIsReportModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsReportModalVisible(false);
    setIssueType('');
    setIssueDescription('');
  };

  const handleSubmitIssue = async () => {
    if (!issueType.trim() || !issueDescription.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Here you can add code to submit to your backend/database
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      Alert.alert(
        'Issue Reported',
        'Your truck issue has been reported. Support will contact you shortly.',
        [
          {
            text: 'OK',
            onPress: () => {
              handleCloseModal();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit issue. Please try again.');
      console.error('Error submitting issue:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Notify residents when truck enters/leaves geofence
  const notifyResidents = async (area, status) => {
    try {
      const notifications = [];
      
      console.log(`🔔 Notifying residents for area: "${area}", status: "${status}"`);
      
      // Get residents in the area to notify them (include phone_number for SMS)
      // Match by both purok and resident_address to ensure we find all relevant residents
      const { data: residents, error: residentsError } = await supabase
        .from('residents')
        .select('id, phone_number, purok, resident_address')
        .or(`purok.ilike.%${area}%,resident_address.ilike.%${area}%`);
      
      if (residentsError) {
        console.error('❌ Error fetching residents:', residentsError);
        // Continue to send admin notification even if resident fetch fails
      } else {
        console.log(`📋 Found ${residents?.length || 0} residents for area "${area}"`);
        
        if (residents && residents.length > 0) {
          // Log found residents for debugging
          console.log('📋 Residents found:', residents.map(r => ({
            id: r.id,
            purok: r.purok,
            resident_address: r.resident_address,
            has_phone: !!r.phone_number
          })));
          
          const title = status === 'approaching' 
            ? 'Truck Approaching' 
            : 'Collection Completed';
          
          const message = status === 'approaching' 
            ? `Waste collection truck is approaching ${area}` 
            : `Waste collection completed in ${area}`;

          // Create notifications for all residents in the area
          // Use resident.id as user_id (foreign key references residents.id)
          residents.forEach(resident => {
            if (resident.id) {
              notifications.push({
                user_id: resident.id, // Use id directly as it's the foreign key reference
                title: title,
                message: message,
                area: area,
                is_read: false,
                created_at: new Date().toISOString()
              });
            } else {
              console.warn('⚠️ Skipping resident without id:', resident);
            }
          });
          
          console.log(`📝 Prepared ${notifications.length} notifications to insert`);
          
          // Send SMS notifications to residents when collection is completed
          if (status === 'collected') {
            try {
              // Get all valid phone numbers from residents
              const phoneNumbers = residents
                .map(resident => resident.phone_number)
                .filter(phone => phone && phone.trim() !== '');

              if (phoneNumbers.length > 0) {
                const smsMessage = `Hello! Waste collection has been completed in ${area}. Thank you for your cooperation! - G-Waste App`;
                
                // Send SMS via IPROGSMS
                const smsResult = await sendIprogSMS(smsMessage, phoneNumbers);
                
                if (smsResult.success) {
                  console.log(`✅ SMS notifications sent to ${phoneNumbers.length} residents in ${area}`);
                } else {
                  console.error('❌ Failed to send SMS notifications to residents:', smsResult.error);
                }
              } else {
                console.log(`⚠️ No valid phone numbers found for residents in ${area}`);
              }
            } catch (smsError) {
              console.error('Error sending SMS notifications to residents:', smsError);
              // Don't throw - we still want to continue with in-app notifications
            }
          }
        } else {
          console.log(`⚠️ No residents found for area "${area}". Check if purok or resident_address matches.`);
        }
      }

      // Insert resident notifications using RPC function to bypass RLS
      if (notifications.length > 0) {
        console.log(`💾 Inserting ${notifications.length} notifications into database...`);
        console.log('📋 Sample notification:', notifications[0]);
        
        // Use RPC function to insert notifications (bypasses RLS)
        const insertPromises = notifications.map(notification => 
          supabase.rpc('insert_resident_notification', {
            p_user_id: notification.user_id,
            p_title: notification.title,
            p_message: notification.message,
            p_area: notification.area || null
          })
        );
        
        const results = await Promise.allSettled(insertPromises);
        const successful = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)).length;
        
        if (failed > 0) {
          console.error(`❌ Failed to insert ${failed} out of ${notifications.length} notifications`);
          results.forEach((result, index) => {
            if (result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error)) {
              console.error(`❌ Failed notification ${index + 1}:`, 
                result.status === 'rejected' ? result.reason : result.value.error);
            }
          });
        }
        
        if (successful > 0) {
          console.log(`✅ Successfully inserted ${successful} resident notifications`);
        }
      } else {
        console.log('⚠️ No notifications to insert (no residents found or no valid user_ids)');
      }

      // ALWAYS send admin notification to admin_notifications table
      // This should be sent regardless of whether residents are found
      const adminNotification = {
        title: status === 'approaching' 
          ? 'Truck Approaching Area' 
          : 'Area Collection Completed',
        message: status === 'approaching'
          ? `${collector?.firstName || collector?.driver || 'Collector'} is approaching ${area}`
          : `${collector?.firstName || collector?.driver || 'Collector'} has completed collection in ${area}`,
        read: false,
        created_at: new Date().toISOString()
      };

      const { error: adminError } = await supabase
        .from('admin_notifications')
        .insert([adminNotification]);
      
      if (adminError) {
        console.error('Error inserting admin notification:', adminError);
        // Don't throw - we still want to continue even if admin notification fails
      } else {
        console.log('✅ Admin notification sent successfully');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  // Start location tracking
  const startLocationTracking = async () => {
    if (!locationPermission) {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return;
    }

    // Get initial location
    await getCurrentLocation();

    // Start watching position
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Check every 10 seconds
        distanceInterval: 10, // Check every 10 meters
      },
      async (location) => {
        setCurrentLocation(location.coords);
        
        // Check geofence for each area in today's schedule
        for (const scheduleItem of todaysSchedule) {
          if (!collectedAreas.has(scheduleItem.location)) {
            // For demo purposes, we'll use a mock coordinate
            // In real implementation, you'd get actual coordinates from your database
            const mockCoordinates = {
              latitude: 14.5995 + (Math.random() - 0.5) * 0.01,
              longitude: 120.9842 + (Math.random() - 0.5) * 0.01
            };
            
            const isInGeofence = await checkGeofence(scheduleItem.location, mockCoordinates);
            
            if (isInGeofence) {
              // Notify residents that truck is approaching
              await notifyResidents(scheduleItem.location, 'approaching');
              
              // Mark as collected after a short delay (simulating collection time)
              setTimeout(async () => {
                await markAreaAsCollected(scheduleItem.location, scheduleItem.routeNumber, scheduleItem.routeId);
              }, 30000); // 30 seconds delay
            }
          }
        }
      }
    );

    return subscription;
  };

  // Load previously collected areas for today
  const loadCollectedAreas = async () => {
    try {
      if (!collector?.id) {
        setCollectedAreasLoaded(true);
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('collections')
        .select('areas_collected')
        .eq('collector_id', collector.id)
        .eq('collected_date', today);
      if (error) throw error;

      if (!data || data.length === 0) {
        setCollectedAreas(new Set());
        setCollectedAreasLoaded(true);
        return;
      }
      
      // Aggregate all areas_collected arrays across rows (if multiple)
      const collectedSet = new Set();
      data.forEach(row => {
        const arr = Array.isArray(row.areas_collected) ? row.areas_collected : [];
        arr.forEach(a => { if (a) collectedSet.add(a); });
      });
      
      // Set the collected areas state
      setCollectedAreas(collectedSet);
      
      // Update the schedule items to show collected status
      setTodaysSchedule(prevSchedule => {
        return prevSchedule.map(item => {
          const isCollected = collectedSet.has(item.location);
          
          if (isCollected) {
            return {
              ...item,
              collected: true,
              collectedAt: new Date().toISOString()
            };
          }
          return item;
        });
      });
      
      setCollectedAreasLoaded(true);
      
    } catch (error) {
      console.error('Error loading collected areas:', error);
      setCollectedAreasLoaded(true);
    }
  };

  useEffect(() => {
    const fetchCollectorAndRoutes = async () => {
      if (collector) {
        try {
          setDisplayName(collector.driver || collector.firstName || '');
          const { data: routesData, error } = await supabase
            .from('routes')
            .select('*')
            .eq('driver', collector.driver)
            .eq('status', 'active'); // Only get active routes
          if (error) throw error;
          // assignedRoutes and areasCollected removed as they were unused in UI
          let scheduleList = [];
          let routeNameList = [];
          (routesData || []).forEach(data => {
            if (data.route) {
              routeNameList.push(`Route ${data.route}`);
            }
            if (data.time && data.areas && data.areas.length > 0) {
              // Generate time intervals for each area
              const timeIntervals = generateTimeIntervals(data.time, data.end_time, data.areas);
              
              // Create schedule entries for each time interval
              // Use the original area name from routes.areas array to ensure exact match
              data.areas.forEach((originalArea, areaIndex) => {
                const interval = timeIntervals[areaIndex];
                if (interval) {
                  const scheduleEntry = {
                    time: interval.startTime,
                    endTime: interval.endTime,
                    location: String(originalArea || interval.area || '').trim(), // Use original area name from routes table
                    routeNumber: data.route,
                    routeId: data.id,
                    type: data.type || 'Waste Collection',
                    frequency: data.frequency,
                    dayOff: data.dayOff,
                    areaIndex: interval.index
                  };
                  scheduleList.push(scheduleEntry);
                }
              });
            }
            // collected count omitted without a direct mapping table
          });
          scheduleList.sort((a, b) => new Date(`2000-01-01 ${a.time}`) - new Date(`2000-01-01 ${b.time}`));
          setTodaysSchedule(scheduleList);
          setRouteNames(routeNameList);
        } catch (e) {
          console.error('Error fetching collector data:', e);
          setDisplayName(collector.driver || collector.firstName || '');
          setTodaysSchedule([]);
          setRouteNames([]);
        }
      } else {
        setDisplayName('');
        setTodaysSchedule([]);
        setRouteNames([]);
      }
      setLoading(false);
    };
    fetchCollectorAndRoutes();
  }, [collector]);

  useEffect(() => {
    if (!collector) {
      router.replace('/login');
    } else {
      // Reset collected areas loaded state when collector changes
      setCollectedAreasLoaded(false);
      setCollectedAreas(new Set());
    }
  }, [collector, router]);

  // Load collected areas when schedule is loaded
  useEffect(() => {
    if (collector && todaysSchedule.length > 0 && !collectedAreasLoaded) {
      loadCollectedAreas();
    }
  }, [collector, todaysSchedule, collectedAreasLoaded]);

  // Start location tracking when component mounts
  useEffect(() => {
    if (collector && todaysSchedule.length > 0) {
      startLocationTracking();
    }
  }, [collector, todaysSchedule]);


  const handleLogout = async () => {
    setIsDropdownVisible(false);
    Alert.alert(
      "Logout Confirmation",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  if (!collector) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logo}
          />
        </View>
        <TouchableOpacity
          style={styles.profileContainer}
          onPress={() => setIsDropdownVisible(!isDropdownVisible)}
        >
          <Image
            source={collector?.profile_image ? { uri: collector.profile_image } : require('../../assets/images/icon.png')}
            style={styles.profilePic}
          />
        </TouchableOpacity>
      </View>

      {isDropdownVisible && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              setIsDropdownVisible(false);
              router.push('/collector/profile');
            }}
          >
            <Text style={styles.dropdownText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={() => {
              setIsDropdownVisible(false);
              router.push('/collector/settings');
            }}
          >
            <Text style={styles.dropdownText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
            <Text style={styles.dropdownText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}


      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingSection}>
          {loading ? (
            <ActivityIndicator size="small" color="#8BC500" />
          ) : (
            <Text style={styles.greeting}>
              Good Morning{displayName ? `, ${displayName}` : ''}! 
            </Text>
          )}
          <View style={styles.routeInfo}>
            <AlertCircle size={16} color="#FF4444" />
            <Text style={styles.routeText}>
              {loading
                ? '...'
                : routeNames.length > 0
                  ? routeNames.join(', ')
                  : 'No Route Assigned'}
            </Text>
          </View>
        </View>

        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Action</Text>
          <View style={styles.quickActionGrid}>
            <View style={styles.quickActionCard}>
              <Home size={24} color="#458A3D" />
              <Text style={styles.quickActionNumber}>{loading ? '-' : assignedRoutes}</Text>
              <Text style={styles.quickActionLabel}>Assigned Routes</Text>
            </View>
            <View style={styles.quickActionCard}>
              <MapPin size={24} color="#458A3D" />
              <Text style={styles.quickActionNumber}>{loading ? '-' : areasCollected}</Text>
              <Text style={styles.quickActionLabel}>Areas Collected</Text>
            </View>
          </View>
        </View> */}

        {/* Live Route Status Card */}
        <View style={styles.section}>
          <View style={styles.liveRouteCard}>
            <View style={styles.liveRouteHeader}>
              <Navigation size={20} color="#458A3D" />
              <Text style={styles.liveRouteTitle}>Live Route Status</Text>
            </View>
            <Text style={styles.liveRouteText}>
              Your assigned route has automatically started.
            </Text>
            <Text style={styles.liveRouteText}>
              GPS tracking is active — location updates automatically.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today`s Schedule:</Text>
          <View style={styles.scheduleList}>
            {todaysSchedule.length === 0 ? (
              <Text style={{ color: '#888', padding: 8 }}>No schedule for today.</Text>
            ) : !collectedAreasLoaded ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#458A3D" />
                <Text style={styles.loadingText}>Loading collection status...</Text>
              </View>
            ) : (
              todaysSchedule.map((item, idx) => {
                const isCollected = item.collected || collectedAreas.has(item.location);
                return (
                  <TouchableOpacity
                    style={[
                      styles.scheduleItem,
                      isCollected && styles.scheduleItemCollected
                    ]}
                    key={idx}
                    onPress={() => {
                      if (!isCollected) {
                        console.log('🔘 Card clicked - Schedule item data:', {
                          location: item.location,
                          routeNumber: item.routeNumber,
                          routeId: item.routeId,
                          rawLocation: item.location,
                          locationType: typeof item.location
                        });
                        handleManualCollection(item.location, item.routeNumber, item.routeId);
                      }
                    }}
                    disabled={isCollected}
                    activeOpacity={isCollected ? 1 : 0.7}
                  >
                    <View style={styles.scheduleTimeContainer}>
                      <Text style={[
                        styles.scheduleTime,
                        isCollected && styles.scheduleTimeCollected
                      ]}>
                        {formatTime(item.time)} - {formatTime(item.endTime)}
                      </Text>
                      <Text style={[
                        styles.scheduleRoute,
                        isCollected && styles.scheduleRouteCollected
                      ]}>
                        Route {item.routeNumber}
                      </Text>
                      {item.areaIndex && (
                        <Text style={[
                          styles.areaIndex,
                          isCollected && styles.areaIndexCollected
                        ]}>
                          Area {item.areaIndex}
                        </Text>
                      )}
                    </View>
                    <View style={styles.scheduleLocationContainer}>
                      <View style={styles.locationHeader}>
                        <Text style={[
                          styles.scheduleLocation,
                          isCollected && styles.scheduleLocationCollected
                        ]}>
                          {item.location}
                        </Text>
                        {isCollected && (
                          <View style={styles.collectedIndicator}>
                            <CheckCircle size={20} color="#2E7D32" />
                            <Text style={styles.collectedText}>Collected</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[
                        styles.scheduleType,
                        isCollected && styles.scheduleTypeCollected
                      ]}>
                        {item.type}
                      </Text>
                      {item.frequency && (
                        <Text style={[
                          styles.scheduleFrequency,
                          isCollected && styles.scheduleFrequencyCollected
                        ]}>
                          {item.frequency}
                        </Text>
                      )}
                      {isCollected && item.collectedAt && (
                        <Text style={styles.collectedTime}>
                          Collected at: {new Date(item.collectedAt).toLocaleTimeString()}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.complaintCard}>
            <Text style={styles.complaintTitle}>Recent Complaints</Text>
            {(recentComplaints || []).length > 0 ? (
              recentComplaints.map((item, idx) => (
                <View key={item?.id || idx} style={styles.complaintRow}>
                  <View
                    style={[
                      styles.complaintIndicator,
                      { backgroundColor: item?.severity === 'high' ? '#EF4444' : '#FBBF24' },
                    ]}
                  />
                  <View style={styles.complaintInfo}>
                    <Text style={styles.complaintText}>
                      {item?.title || 'Overflowing bin'} – {item?.location || 'Unknown area'}
                    </Text>
                    <Text style={styles.complaintMeta}>
                      Reported {item?.reportedAgo || 'just now'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyComplaintState}>
                <Text style={styles.emptyComplaintText}>No recent complaints 🎉</Text>
              </View>
            )}
          </View>
        </View>

        {/* Report Truck Issue Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.reportTruckButton}
            onPress={handleReportTruckIssue}
            activeOpacity={0.8}
          >
            <Truck size={20} color="#FFFFFF" />
            <Text style={styles.reportTruckButtonText}>Report Truck Issue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Report Truck Issue Modal */}
      <Modal
        visible={isReportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCloseModal}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Truck Issue</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Issue Type *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Engine problem, Flat tire, Brake issue"
                  value={issueType}
                  onChangeText={setIssueType}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Please provide details about the issue..."
                  value={issueDescription}
                  onChangeText={setIssueDescription}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  placeholderTextColor="#999"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseModal}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmitIssue}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 17,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scrollView: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: {
    paddingBottom: 100,
  },
  logoContainer: {
    height: 40,
  },
  logo: {
    height: 40,
    width: 80,
    resizeMode: 'contain',
  },
  profileContainer: { position: 'relative' },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  greetingSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  routeInfo: { flexDirection: 'row', alignItems: 'center' },
  routeText: { fontSize: 14, color: '#666', marginLeft: 4 },
  section: { paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#458A3D', marginBottom: 12 },
  liveRouteCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  liveRouteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveRouteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  liveRouteText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  reportTruckButton: {
    backgroundColor: '#458A3D',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportTruckButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickActionCard: { width: '48%', backgroundColor: '#E3F2E8', padding: 16, borderRadius: 12, alignItems: 'center' },
  quickActionNumber: { fontSize: 32, fontWeight: 'bold', color: '#458A3D', marginTop: 8 },
  quickActionLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  scheduleList: { gap: 8 },
  scheduleItem: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    padding: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginBottom: 12, 
    alignItems: 'flex-start', 
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  scheduleItemCollected: {
    backgroundColor: '#2E7D32',
    borderColor: '#1B5E20'
  },
  scheduleTimeContainer: { flexDirection: 'column', alignItems: 'flex-start', marginRight: 16, minWidth: 110 },
  scheduleTime: { fontSize: 14, color: '#000000', fontWeight: 'bold', marginBottom: 2 },
  scheduleTimeCollected: { color: '#E8F5E8' },
  scheduleRoute: { fontSize: 12, color: '#000000', marginTop: 2, fontWeight: '500' },
  scheduleRouteCollected: { color: '#C8E6C9' },
  areaIndex: { fontSize: 10, color: '#000000', marginTop: 1, fontStyle: 'italic' },
  areaIndexCollected: { color: '#A5D6A7' },
  scheduleLocationContainer: { flex: 1, alignItems: 'flex-start' },
  locationHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    width: '100%',
    marginBottom: 4
  },
  scheduleLocation: { fontSize: 16, color: '#333', textAlign: 'left', fontWeight: '500', flex: 1 },
  scheduleLocationCollected: { color: '#E8F5E8' },
  collectedIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#E8F5E8', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12,
    marginLeft: 8
  },
  collectedText: { 
    fontSize: 12, 
    color: '#2E7D32', 
    fontWeight: 'bold', 
    marginLeft: 4 
  },
  scheduleType: { fontSize: 14, color: '#000000', marginBottom: 2 },
  scheduleTypeCollected: { color: '#C8E6C9' },
  scheduleFrequency: { fontSize: 12, color: '#000000', fontStyle: 'italic' },
  scheduleFrequencyCollected: { color: '#A5D6A7' },
  collectedTime: { 
    fontSize: 11, 
    color: '#E8F5E8', 
    fontStyle: 'italic', 
    marginTop: 4 
  },
  markCollectedButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  markCollectedButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  collectionButton: { 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: 40, 
    height: 40, 
    backgroundColor: '#E8F5E8', 
    borderRadius: 20,
    marginLeft: 8
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginVertical: 8
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14
  },
  dropdownMenu: { position: 'absolute', top: 60, right: 0, backgroundColor: '#fff', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5, zIndex: 2000, minWidth: 150 },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownText: { fontSize: 16, color: '#333' },
  complaintCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    gap: 16,
  },
  complaintTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  complaintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  complaintIndicator: {
    width: 4,
    borderRadius: 4,
    alignSelf: 'stretch',
  },
  complaintInfo: {
    flex: 1,
  },
  complaintText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  complaintMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  emptyComplaintState: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyComplaintText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 6,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#458A3D',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});