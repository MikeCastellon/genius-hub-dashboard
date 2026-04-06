import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getMockData(action: string, repairName?: string) {
  switch (action) {
    case 'repair_pricing':
      return {
        repair_name: repairName || 'Oxygen Sensor Replacement',
        labor_low: 80,
        labor_high: 150,
        parts_low: 50,
        parts_high: 120,
        total_low: 130,
        total_high: 270,
        national_average: 195,
        your_area_average: 210,
      }
    case 'oem_parts':
      return [
        { name: 'Oxygen Sensor - Upstream', part_number: 'OEM-234-5678', price: 112.99, manufacturer: 'OEM', availability: 'In Stock', fitment_notes: 'Bank 1, Sensor 1' },
        { name: 'Oxygen Sensor - Downstream', part_number: 'OEM-234-5679', price: 98.50, manufacturer: 'OEM', availability: 'In Stock', fitment_notes: 'Bank 1, Sensor 2' },
        { name: 'Oxygen Sensor Gasket', part_number: 'OEM-890-1234', price: 4.99, manufacturer: 'OEM', availability: 'In Stock', fitment_notes: 'Required for installation' },
        { name: 'Catalytic Converter Gasket', part_number: 'OEM-890-1240', price: 8.50, manufacturer: 'OEM', availability: 'Ships in 2 days', fitment_notes: 'Recommended replacement during O2 sensor service' },
      ]
    case 'maintenance':
      return [
        { service: 'Oil Change', interval_miles: 5000, interval_months: 6, estimated_cost: 75, priority: 'high' },
        { service: 'Tire Rotation', interval_miles: 7500, interval_months: 9, estimated_cost: 35, priority: 'medium' },
        { service: 'Brake Inspection', interval_miles: 15000, interval_months: 18, estimated_cost: 0, priority: 'high' },
        { service: 'Cabin Air Filter', interval_miles: 15000, interval_months: 18, estimated_cost: 30, priority: 'low' },
        { service: 'Coolant Flush', interval_miles: 30000, interval_months: 36, estimated_cost: 99, priority: 'medium' },
      ]
    case 'warranty':
      return {
        basic: { description: 'Bumper-to-Bumper', months: 36, miles: 36000, start_date: '2021-03-15', expired: true },
        powertrain: { description: 'Powertrain Coverage', months: 60, miles: 60000, start_date: '2021-03-15', expired: false },
        corrosion: { description: 'Corrosion Perforation', months: 60, miles: 100000, start_date: '2021-03-15', expired: false },
        emissions: { description: 'Federal Emissions', months: 96, miles: 80000, start_date: '2021-03-15', expired: false },
        ev_battery: null,
      }
    default:
      return { error: `Unknown action: ${action}` }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, vin, repair_name } = await req.json()

    if (!action || !vin) {
      return new Response(
        JSON.stringify({ error: 'action and vin are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validActions = ['repair_pricing', 'oem_parts', 'maintenance', 'warranty']
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}. Valid actions: ${validActions.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client from request auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Check cache first
    const { data: cached } = await supabase
      .from('repair_lookups')
      .select('api_response')
      .eq('vin', vin)
      .eq('source', 'vehicledb')
      .eq('lookup_type', action)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached?.api_response) {
      return new Response(
        JSON.stringify({ data: cached.api_response, source: 'cache' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('VEHICLEDB_API_KEY')
    let data: unknown

    if (!apiKey) {
      // Return mock data
      data = getMockData(action, repair_name)
    } else {
      // Call real VehicleDB API
      const baseUrl = 'https://api.vehicledb.io/v1'
      const params = new URLSearchParams({ vin })
      if (repair_name) params.set('repair_name', repair_name)

      const response = await fetch(`${baseUrl}/${action}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`VehicleDB API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      data = result.data ?? result
    }

    // Cache the response
    await supabase.from('repair_lookups').insert({
      vin,
      source: 'vehicledb',
      lookup_type: action,
      api_response: data,
    })

    return new Response(
      JSON.stringify({ data, source: apiKey ? 'api' : 'mock' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
