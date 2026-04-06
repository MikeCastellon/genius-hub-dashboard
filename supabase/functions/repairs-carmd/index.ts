import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CARMD_BASE = 'https://api.carmd.com/v3.0'

function getMockData(action: string, vin?: string, dtc?: string) {
  switch (action) {
    case 'maintenance':
      return [
        { desc: 'Oil Change', due_mileage: 30000, parts: [{ desc: 'Oil Filter', price: 8.99, qty: 1 }, { desc: 'Synthetic Oil 5qt', price: 29.99, qty: 1 }], labor_cost: 35, part_cost: 38.99, total_cost: 73.99 },
        { desc: 'Brake Pad Replacement (Front)', due_mileage: 40000, parts: [{ desc: 'Front Brake Pads', price: 45.99, qty: 1 }], labor_cost: 90, part_cost: 45.99, total_cost: 135.99 },
        { desc: 'Air Filter Replacement', due_mileage: 30000, parts: [{ desc: 'Engine Air Filter', price: 18.99, qty: 1 }], labor_cost: 15, part_cost: 18.99, total_cost: 33.99 },
        { desc: 'Transmission Fluid Change', due_mileage: 60000, parts: [{ desc: 'Transmission Fluid', price: 42.00, qty: 1 }], labor_cost: 85, part_cost: 42.00, total_cost: 127.00 },
        { desc: 'Spark Plug Replacement', due_mileage: 90000, parts: [{ desc: 'Iridium Spark Plugs', price: 12.99, qty: 4 }], labor_cost: 65, part_cost: 51.96, total_cost: 116.96 },
      ]
    case 'repair':
      return {
        desc: 'Replace Oxygen Sensor',
        urgency: 2,
        urgency_desc: 'Repair soon',
        difficulty: 3,
        labor_hours: 1.5,
        parts: [{ desc: 'Oxygen Sensor - Upstream', price: 85.00, qty: 1 }],
        part_cost: 85,
        labor_cost: 120,
        total_cost: 205,
      }
    case 'diag':
      return {
        code: dtc || 'P0420',
        desc: 'Catalyst System Efficiency Below Threshold',
        urgency: 2,
        urgency_desc: 'Repair soon',
      }
    case 'recall':
      return [
        { nhtsa_id: 'NHTSA-2023-001', desc: 'Airbag Inflator Replacement', consequence: 'In the event of a crash, the airbag may not deploy properly', remedy: 'Dealers will replace the airbag inflator free of charge', report_date: '2023-06-15' },
        { nhtsa_id: 'NHTSA-2022-045', desc: 'Fuel Pump Control Module', consequence: 'Engine may stall unexpectedly while driving', remedy: 'Dealers will update the fuel pump control module software', report_date: '2022-11-03' },
      ]
    case 'tsb':
      return [
        { tsb_id: 'TSB-2023-0812', desc: 'Intermittent Hesitation During Acceleration', summary: 'Some vehicles may experience a brief hesitation during acceleration from a stop. Reprogram the PCM with updated calibration.', report_date: '2023-08-12' },
        { tsb_id: 'TSB-2023-0415', desc: 'Rear Suspension Clunk Noise', summary: 'A clunk noise may be heard from the rear suspension when driving over bumps. Replace rear stabilizer bar end links.', report_date: '2023-04-15' },
      ]
    case 'upcoming':
      return [
        { desc: 'Brake Pad Replacement (Rear)', predicted_mileage: 55000, urgency: 'low', estimated_cost: 145.00 },
        { desc: 'Battery Replacement', predicted_mileage: 60000, urgency: 'medium', estimated_cost: 185.00 },
        { desc: 'Coolant Flush', predicted_mileage: 62000, urgency: 'low', estimated_cost: 99.00 },
      ]
    case 'warranty':
      return {
        basic: { months: 36, miles: 36000, expired: true },
        powertrain: { months: 60, miles: 60000, expired: false },
        corrosion: { months: 60, miles: 100000, expired: false },
        roadside: { months: 36, miles: 36000, expired: true },
      }
    default:
      return { error: `Unknown action: ${action}` }
  }
}

const ACTION_ENDPOINTS: Record<string, (vin: string, mileage?: number, dtc?: string) => string> = {
  maintenance: (vin, mileage) => `/maintenance?vin=${vin}${mileage ? `&mileage=${mileage}` : ''}`,
  repair: (vin, mileage) => `/repair?vin=${vin}${mileage ? `&mileage=${mileage}` : ''}`,
  diag: (vin, _m, dtc) => `/diag?vin=${vin}${dtc ? `&dtc=${dtc}` : ''}`,
  recall: (vin) => `/recall?vin=${vin}`,
  tsb: (vin) => `/tsb?vin=${vin}`,
  upcoming: (vin, mileage) => `/upcoming?vin=${vin}${mileage ? `&mileage=${mileage}` : ''}`,
  warranty: (vin) => `/warranty?vin=${vin}`,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, vin, mileage, dtc } = await req.json()

    if (!action || !vin) {
      return new Response(
        JSON.stringify({ error: 'action and vin are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!ACTION_ENDPOINTS[action]) {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
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
    const cacheTable = 'repair_lookups'
    const { data: cached } = await supabase
      .from(cacheTable)
      .select('api_response')
      .eq('vin', vin)
      .eq('source', 'carmd')
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

    const partnerToken = Deno.env.get('CARMD_PARTNER_TOKEN')
    const authKey = Deno.env.get('CARMD_AUTH_KEY')

    let data: unknown

    if (!partnerToken || !authKey) {
      // Return mock data
      data = getMockData(action, vin, dtc)
    } else {
      // Call real CarMD API
      const endpoint = ACTION_ENDPOINTS[action](vin, mileage, dtc)
      const response = await fetch(`${CARMD_BASE}${endpoint}`, {
        headers: {
          'partner-token': partnerToken,
          'authorization': authKey,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`CarMD API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      data = result.data
    }

    // Cache the response
    await supabase.from(cacheTable).insert({
      vin,
      source: 'carmd',
      lookup_type: action,
      api_response: data,
    })

    return new Response(
      JSON.stringify({ data, source: partnerToken ? 'api' : 'mock' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
