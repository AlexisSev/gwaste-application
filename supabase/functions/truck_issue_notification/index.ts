import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { truckId, reportedBy, collectorName, location, description, issueType = 'maintenance', latitude, longitude } = await req.json();

    if (!location || !description) {
      return new Response(
        JSON.stringify({ error: 'Location and description are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a new truck issue report in database
    const { data: issue, error: issueError } = await supabase
      .from('truck_issues')
      .insert({
        collector_id: reportedBy,
        collector_name: collectorName,
        issue_type: issueType,
        description: description,
        location: location,
        latitude: latitude,
        longitude: longitude,
        status: 'reported',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (issueError) {
      console.error('Error creating truck issue:', issueError);
      return new Response(
        JSON.stringify({ error: 'Failed to report truck issue' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all residents' Expo push tokens from push_tokens table
    const { data: tokenRecords, error: residentsError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('platform', 'expo')
      .not('user_id', 'is', null); // Make sure we have valid users

    if (residentsError) {
      console.error('Error fetching residents:', residentsError);
    }

    // Send Expo push notifications to all residents
    if (tokenRecords && tokenRecords.length > 0) {
      const pushTokens = tokenRecords
        .map(record => record.token)
        .filter(token => token);

      if (pushTokens.length > 0) {
        try {
        // Send to all residents via Expo API (supports array of messages)
        const notificationPayloads = pushTokens.map(token => ({
          to: token,
          title: '🚛 Truck Issue Alert',
          body: `🚨 Collection delay: Truck issue at ${location}. Your schedule may be affected.`,
          data: {
            type: 'truck_issue',
            issue_id: issue.id,
            truck_id: truckId,
            location: location,
            description: description,
            issue_type: issueType,
            reported_at: issue.created_at
          },
          sound: 'default',
          priority: 'high'
        }));

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notificationPayloads)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Expo push API error:', response.status, errorData);
        } else {
          const result = await response.json();
          console.log(`Truck issue notification sent to ${pushTokens.length} residents:`, result);
        }
        } catch (notificationError) {
          console.error('Error sending Expo push notifications:', notificationError);
        }
      } else {
        console.log('No valid Expo push tokens found for residents');
      }
    } else {
      console.log('No residents found to notify');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Truck issue reported and notifications sent',
        issue_id: issue.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
