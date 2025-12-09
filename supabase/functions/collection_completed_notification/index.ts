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

    const { scheduleId } = await req.json();

    if (!scheduleId) {
      return new Response(
        JSON.stringify({ error: 'Schedule ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get schedule details with resident info (don't require push token)
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select(`
        *,
        residents:resident_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('id', scheduleId);

    if (scheduleError) {
      console.error('Error fetching schedule:', scheduleError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch schedule details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!schedule) {
      console.error('Schedule not found:', scheduleId);
      return new Response(
        JSON.stringify({ error: 'Schedule not found - create a schedule first or use a valid schedule ID' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optionally get push token for the resident
    let pushToken = null;
    if (schedule.residents?.id) {
      const { data: tokenData } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', schedule.residents.id)
        .eq('platform', 'expo')
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors

      pushToken = tokenData?.token;
    }

    // Update schedule status to completed
    const { error: updateError } = await supabase
      .from('schedules')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', scheduleId);

    if (updateError) {
      console.error('Error updating schedule:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update schedule' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send Expo push notification to resident (if push token exists)
    if (pushToken) {
      try {
        const residentName = schedule.residents?.first_name || 'Resident';
        const notificationPayload = {
          to: pushToken,
          title: '🗑️ Collection Completed',
          body: `Hi ${residentName}, your ${schedule.waste_type} waste collection has been completed successfully! ✅`,
          data: {
            type: 'collection_completed',
            schedule_id: scheduleId,
            waste_type: schedule.waste_type,
            completed_at: new Date().toISOString()
          },
          sound: 'default',
          priority: 'default'
        };

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notificationPayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Expo push API error:', response.status, errorData);
          // Don't fail the whole operation if notification fails
          console.log('Collection completed but notification failed to send');
        } else {
          const result = await response.json();
          console.log('Collection completion notification sent successfully:', result);
        }
      } catch (notificationError) {
        console.error('Error sending Expo push notification:', notificationError);
        // Don't fail whole operation for notification errors
        console.log('Collection completed but notification failed to send');
      }
    } else {
      console.log('No Expo push token found for resident - collection marked complete without notification');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Collection marked as completed and notification sent'
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
