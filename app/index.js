import { Redirect } from 'expo-router';
import 'leaflet/dist/leaflet.css';

export default function Index() {
  return <Redirect href="/landing" />;
} 