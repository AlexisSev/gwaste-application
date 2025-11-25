/* eslint-disable react-hooks/exhaustive-deps */
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCollectorAuth } from '../../hooks/useCollectorAuthSupabase';
import { supabase } from '../../services/supabaseClient';

export default function CollectorProfileScreen() {
  const router = useRouter();
  const { collector, logout, refreshCollector, loading: authLoading } = useCollectorAuth();
  const [collectorData, setCollectorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Edit mode states
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    driver: '',
    contact: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (collector?.id) {
      if (collector.first_name) {
        // Parse crew data if it's a string (JSON)
        let crewData = [];
        if (collector.crew) {
          if (typeof collector.crew === 'string') {
            try {
              crewData = JSON.parse(collector.crew);
            } catch (e) {
              console.error('Error parsing crew JSON:', e);
              crewData = [];
            }
          } else if (Array.isArray(collector.crew)) {
            crewData = collector.crew;
          }
        }
        
        // Map Supabase fields to the UI's expected shape
        setCollectorData({
          firstName: collector.first_name,
          lastName: collector.last_name,
          driver: collector.driver || collector.collector_name,
          vehicleType: collector.vehicle_type,
          phoneNumber: collector.phone_number,
          collectorId: collector.collector_id,
          createdAt: collector.created_at || null,
          crew: crewData,
        });
        // Load profile image if exists
        if (collector.profile_image_base64) {
          setProfileImage(collector.profile_image_base64);
        }
        setLoading(false);
      } else {
        loadCollectorData();
      }
    } else {
      setLoading(false);
    }
  }, [collector?.id]);

  const loadCollectorData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collectors')
        .select('*')
        .eq('id', collector.id)
        .single();
      if (error) throw error;
      if (data) {
        // Parse crew data if it's a string (JSON)
        let crewData = [];
        if (data.crew) {
          if (typeof data.crew === 'string') {
            try {
              crewData = JSON.parse(data.crew);
            } catch (e) {
              console.error('Error parsing crew JSON:', e);
              crewData = [];
            }
          } else if (Array.isArray(data.crew)) {
            crewData = data.crew;
          }
        }
        
        setCollectorData({
          firstName: data.first_name,
          lastName: data.last_name,
          driver: data.driver || data.collector_name,
          vehicleType: data.vehicle_type,
          phoneNumber: data.phone_number,
          collectorId: data.collector_id,
          createdAt: data.created_at || null,
          crew: crewData,
        });
        // Load profile image if exists
        if (data.profile_image_base64) {
          setProfileImage(data.profile_image_base64);
        }
      }
    } catch (error) {
      console.error('Error loading collector data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to change your profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri) => {
    try {
      setUploadingImage(true);

      // Convert image to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = reader.result;
          resolve(base64String);
        };
        reader.onerror = reject;
      });
      
      reader.readAsDataURL(blob);
      const base64Image = await base64Promise;

      // Update collector profile with base64 image
      const { error: updateError } = await supabase
        .from('collectors')
        .update({ profile_image_base64: base64Image })
        .eq('id', collector.id)
        .select();

      if (updateError) throw updateError;

      setProfileImage(base64Image);
      
      // Refresh the collector data in AsyncStorage and context
      if (typeof refreshCollector === 'function') {
        await refreshCollector();
      }
      
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLogout = () => {
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
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              console.error('Error signing out:', error);
            }
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    // Populate edit form with current data from both collector and collectorData
    setEditForm({
      firstName: collectorData?.firstName || collector?.firstName || collector?.first_name || '',
      lastName: collectorData?.lastName || collector?.lastName || collector?.last_name || '',
      driver: collectorData?.driver || collector?.driver || '',
      contact: collectorData?.phoneNumber || collector?.contact || collector?.phone_number || '',
    });
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);

      // Validate required fields
      if (!editForm.firstName?.trim()) {
        Alert.alert('Validation Error', 'First name is required');
        return;
      }

      if (!editForm.driver?.trim()) {
        Alert.alert('Validation Error', 'Driver name is required');
        return;
      }

      // Update database
      const { error } = await supabase
        .from('collectors')
        .update({
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName?.trim() || null,
          driver: editForm.driver.trim(),
          contact: editForm.contact?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', collector.id);

      if (error) throw error;

      // Update local state
      setCollectorData({
        ...collectorData,
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName?.trim() || '',
        driver: editForm.driver.trim(),
        phoneNumber: editForm.contact?.trim() || '',
      });

      // Refresh collector context
      if (typeof refreshCollector === 'function') {
        await refreshCollector();
      }

      setIsEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditModalVisible(false);
    setEditForm({
      firstName: '',
      lastName: '',
      driver: '',
      contact: '',
    });
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!collector) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>No user data available</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.retryButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleEditProfile}
        >
          <Feather name="edit-3" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={profileImage ? { uri: profileImage } : require('../../assets/images/icon.png')} 
              style={styles.profileImage}
            />
            {uploadingImage && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#4CAF50" />
              </View>
            )}
            <TouchableOpacity 
              style={styles.cameraButton}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              <Feather name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.driverName}>
            {collectorData?.driver || 'Not assigned'}
          </Text>
          <View style={styles.roleBadge}>
            <Feather name="truck" size={14} color="#fff" />
            <Text style={styles.roleBadgeText}>Garbage Collector</Text>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Feather name="truck" size={20} color="#4CAF50" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Driver Name</Text>
                <Text style={styles.infoValue}>
                  {collectorData?.driver || 'Not specified'}
                </Text>
              </View>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Feather name="phone" size={20} color="#4CAF50" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Contact Number</Text>
                <Text style={styles.infoValue}>
                  {collectorData?.phoneNumber || collector?.contact || 'Not specified'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Work Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Feather name="users" size={20} color="#4CAF50" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Crew Members</Text>
                {collectorData?.crew && Array.isArray(collectorData.crew) && collectorData.crew.length > 0 ? (
                  <View style={styles.crewContainer}>
                    {collectorData.crew.map((member, index) => {
                      let displayName = 'Crew Member';
                      
                      if (typeof member === 'string') {
                        displayName = member;
                      } else if (member.firstName || member.lastName) {
                        displayName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
                      } else if (member.name) {
                        displayName = member.name;
                      }
                      
                      return (
                        <View key={index} style={styles.crewMember}>
                          <Feather name="user" size={14} color="#4CAF50" />
                          <Text style={styles.crewMemberText}>
                            {displayName}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.infoValue}>No crew assigned</Text>
                )}
              </View>
            </View>

            {/* <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Feather name="briefcase" size={20} color="#4CAF50" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Vehicle Type</Text>
                <Text style={styles.infoValue}>
                  {collectorData?.vehicleType || 'Not specified'}
                </Text>
              </View>
            </View> */}
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Feather name="calendar" size={20} color="#4CAF50" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {collectorData?.createdAt
                    ? new Date(collectorData.createdAt).toLocaleDateString()
                    : 'Unknown'
                  }
                </Text>
              </View>
            </View>

          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
            <Feather name="edit-3" size={20} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/collector/settings')}>
            <Feather name="settings" size={20} color="#4CAF50" />
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
            <Feather name="log-out" size={20} color="#FF4444" />
            <Text style={[styles.actionButtonText, styles.logoutButtonText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleCancelEdit}>
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Profile Image Section */}
              <View style={styles.modalProfileSection}>
                <View style={styles.modalProfileImageContainer}>
                  <Image 
                    source={profileImage ? { uri: profileImage } : require('../../assets/images/icon.png')} 
                    style={styles.modalProfileImage}
                  />
                  {uploadingImage && (
                    <View style={styles.modalUploadingOverlay}>
                      <ActivityIndicator size="large" color="#4CAF50" />
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.modalCameraButton}
                    onPress={pickImage}
                    disabled={uploadingImage}
                  >
                    <Feather name="camera" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalProfileHint}>Tap camera icon to change photo</Text>
              </View>

              {/* First Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.firstName}
                  onChangeText={(text) => setEditForm({ ...editForm, firstName: text })}
                  placeholder="Enter first name"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Last Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.lastName}
                  onChangeText={(text) => setEditForm({ ...editForm, lastName: text })}
                  placeholder="Enter last name"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Driver Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Driver Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.driver}
                  onChangeText={(text) => setEditForm({ ...editForm, driver: text })}
                  placeholder="Enter driver name"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Contact Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.contact}
                  onChangeText={(text) => setEditForm({ ...editForm, contact: text })}
                  placeholder="Enter contact number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={styles.requiredNote}>* Required fields</Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelEdit}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 2,
    right: -3,
    alignSelf: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  driverName: {
    fontSize: 30,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statusActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonText: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  logoutButtonText: {
    color: '#FF4444',
  },
  // Crew Styles
  crewContainer: {
    marginTop: 8,
    gap: 8,
  },
  crewMember: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 8,
  },
  crewMemberText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    padding: 20,
  },
  modalProfileSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalProfileImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  modalProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  modalUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalProfileHint: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f8f9fa',
  },
  requiredNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

