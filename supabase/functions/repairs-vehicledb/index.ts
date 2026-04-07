import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VEHICLEDB_BASE = 'https://api.vehicledatabases.com'

function getMockRepairs() {
  return [
    { repair_name: 'Brake Pad Replacement', labor_low: 80, labor_high: 180, parts_low: 40, parts_high: 100, total_low: 120, total_high: 280 },
    { repair_name: 'Oil Change', labor_low: 25, labor_high: 60, parts_low: 30, parts_high: 70, total_low: 55, total_high: 130 },
    { repair_name: 'Alternator Replacement', labor_low: 150, labor_high: 300, parts_low: 200, parts_high: 400, total_low: 350, total_high: 700 },
    { repair_name: 'Spark Plug Replacement', labor_low: 50, labor_high: 120, parts_low: 20, parts_high: 80, total_low: 70, total_high: 200 },
    { repair_name: 'Timing Belt Replacement', labor_low: 300, labor_high: 600, parts_low: 100, parts_high: 250, total_low: 400, total_high: 850 },
  ]
}

function getMockRepairEstimates() {
  return [
    { repair_name: 'Oxygen Sensor Replacement', labor_low: 80, labor_high: 150, parts_low: 50, parts_high: 120, total_low: 130, total_high: 270, national_average: 195 },
    { repair_name: 'Catalytic Converter Replacement', labor_low: 100, labor_high: 250, parts_low: 400, parts_high: 1200, total_low: 500, total_high: 1450, national_average: 950 },
    { repair_name: 'Mass Airflow Sensor', labor_low: 40, labor_high: 80, parts_low: 80, parts_high: 200, total_low: 120, total_high: 280, national_average: 190 },
    { repair_name: 'Ignition Coil Replacement', labor_low: 50, labor_high: 120, parts_low: 30, parts_high: 90, total_low: 80, total_high: 210, national_average: 150 },
  ]
}

function getMockRecalls() {
  return [
    { nhtsa_id: 'NHTSA-2023-001', description: 'Airbag Inflator Replacement', consequence: 'In the event of a crash, the airbag may not deploy properly', corrective_action: 'Dealers will replace the airbag inflator free of charge', report_date: '2023-06-15' },
    { nhtsa_id: 'NHTSA-2022-045', description: 'Fuel Pump Control Module', consequence: 'Engine may stall unexpectedly while driving', corrective_action: 'Dealers will update the fuel pump control module software', report_date: '2022-11-03' },
  ]
}

function getMockWarranty() {
  return {
    basic: { description: 'Bumper-to-Bumper', months: 36, miles: 36000, expired: true },
    powertrain: { description: 'Powertrain Coverage', months: 60, miles: 60000, expired: false },
    corrosion: { description: 'Corrosion Perforation', months: 60, miles: 100000, expired: false },
    emissions: { description: 'Federal Emissions', months: 96, miles: 80000, expired: false },
  }
}

function getMockMaintenance() {
  return [
    { description: 'Oil & Filter Change', due_mileage: 5000, is_oem: true, cycle_mileage: 5000, part_cost: 30, labor_cost: 25, total_cost: 55 },
    { description: 'Tire Rotation', due_mileage: 7500, is_oem: true, cycle_mileage: 7500, part_cost: 0, labor_cost: 30, total_cost: 30 },
    { description: 'Brake Fluid Flush', due_mileage: 30000, is_oem: true, cycle_mileage: 30000, part_cost: 15, labor_cost: 60, total_cost: 75 },
    { description: 'Transmission Fluid Change', due_mileage: 60000, is_oem: true, cycle_mileage: 60000, part_cost: 40, labor_cost: 80, total_cost: 120 },
    { description: 'Coolant Flush', due_mileage: 50000, is_oem: true, cycle_mileage: 50000, part_cost: 20, labor_cost: 50, total_cost: 70 },
    { description: 'Spark Plug Replacement', due_mileage: 60000, is_oem: true, cycle_mileage: 60000, part_cost: 40, labor_cost: 80, total_cost: 120 },
    { description: 'Air Filter Replacement', due_mileage: 15000, is_oem: true, cycle_mileage: 15000, part_cost: 15, labor_cost: 15, total_cost: 30 },
    { description: 'Cabin Air Filter', due_mileage: 15000, is_oem: false, cycle_mileage: 15000, part_cost: 20, labor_cost: 10, total_cost: 30 },
  ]
}

function getMockTSBs() {
  return [
    { tsb_number: 'TSB-0116-15', date: '2015-08-12', category: 'Engine', subject: 'Engine Oil Consumption', description: 'Some vehicles may exhibit higher than normal engine oil consumption. This bulletin provides inspection and repair procedures.', corrective_action: 'Perform piston ring replacement per service procedure if oil consumption exceeds 1 qt per 1,200 miles.' },
    { tsb_number: 'TSB-0087-14', date: '2014-11-03', category: 'Electrical', subject: 'Navigation System Software Update', description: 'Navigation system may display incorrect route guidance or experience intermittent freezing.', corrective_action: 'Update navigation system software to latest version. Recalibrate GPS module after update.' },
    { tsb_number: 'TSB-0203-16', date: '2016-02-18', category: 'Suspension', subject: 'Front Strut Mount Noise', description: 'A clunking or popping noise from the front suspension when turning at low speeds or going over bumps.', corrective_action: 'Replace front strut mount bearings with updated part. Torque to specification and perform alignment.' },
  ]
}

function getMockOwnerManual() {
  return {
    year: '2015',
    make: 'Lexus',
    model: 'GS',
    path: 'https://vhr.nyc3.cdn.digitaloceanspaces.com/owners-manual/lexus/2015_lexus_gs.pdf',
  }
}

function getMockData(action: string) {
  switch (action) {
    case 'repairs': return getMockRepairs()
    case 'repair_estimates': return getMockRepairEstimates()
    case 'recalls': return getMockRecalls()
    case 'warranty': return getMockWarranty()
    case 'maintenance': return getMockMaintenance()
    case 'tsb': return getMockTSBs()
    case 'owner_manual': return getMockOwnerManual()
    default: return { error: `Unknown action: ${action}` }
  }
}

// Map action to VehicleDatabases API endpoint
function getEndpoint(action: string, params: { vin?: string; year?: string; make?: string; model?: string }): string {
  const { vin, year, make, model } = params
  switch (action) {
    case 'repairs':
      return `/repairs/${vin}`
    case 'repair_estimates':
      return `/repair-estimates/${vin}`
    case 'recalls':
      return `/vehicle-recalls/${vin}`
    case 'warranty':
      return `/vehicle-warranty/${encodeURIComponent(year!)}/${encodeURIComponent(make!)}/${encodeURIComponent(model!)}`
    case 'maintenance':
      return `/vehicle-maintenance/${vin}`
    case 'tsb':
      return `/tsb/${vin}`
    case 'owner_manual':
      return `/owner-manual/${vin}`
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

const VALID_ACTIONS = ['repairs', 'repair_estimates', 'recalls', 'warranty', 'maintenance', 'tsb', 'owner_manual', 'download_manual']

// Cache durations per action (in ms)
const CACHE_DURATION: Record<string, number> = {
  repairs: 7 * 24 * 60 * 60 * 1000,          // 7 days
  repair_estimates: 7 * 24 * 60 * 60 * 1000,  // 7 days
  recalls: 24 * 60 * 60 * 1000,               // 1 day
  warranty: 30 * 24 * 60 * 60 * 1000,         // 30 days
  maintenance: 30 * 24 * 60 * 60 * 1000,      // 30 days
  tsb: 30 * 24 * 60 * 60 * 1000,              // 30 days
  owner_manual: 90 * 24 * 60 * 60 * 1000,     // 90 days
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, vin, year, make, model } = await req.json()

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!VALID_ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}. Valid: ${VALID_ACTIONS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // download_manual: proxy the PDF through the edge function
    if (action === 'download_manual') {
      if (!vin) {
        return new Response(
          JSON.stringify({ error: 'download_manual requires vin' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const apiKey = Deno.env.get('VEHICLEDB_API_KEY')
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // First get the manual URL from the API
      const manualRes = await fetch(`${VEHICLEDB_BASE}/owner-manual/${vin}`, {
        headers: { 'x-AuthKey': apiKey },
      })
      if (!manualRes.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to look up manual' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const manualJson = await manualRes.json()
      const pdfUrl = manualJson?.data?.path ?? manualJson?.path
      if (!pdfUrl) {
        return new Response(
          JSON.stringify({ error: 'No manual available for this VIN' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch the actual PDF and stream it back
      const pdfRes = await fetch(pdfUrl)
      if (!pdfRes.ok) {
        return new Response(
          JSON.stringify({ error: `PDF host returned ${pdfRes.status}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const pdfBytes = await pdfRes.arrayBuffer()
      const filename = pdfUrl.split('/').pop() || 'owners_manual.pdf'
      return new Response(pdfBytes, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    // Warranty requires year/make/model; everything else requires vin
    if (action === 'warranty') {
      if (!year || !make || !model) {
        return new Response(
          JSON.stringify({ error: 'warranty action requires year, make, and model' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (!vin) {
      return new Response(
        JSON.stringify({ error: `${action} action requires vin` }),
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

    // Check cache
    const cacheKey = vin || `${year}-${make}-${model}`
    const cacheDuration = CACHE_DURATION[action] ?? 24 * 60 * 60 * 1000
    const { data: cached } = await supabase
      .from('vehicledb_cache')
      .select('api_response')
      .eq('cache_key', cacheKey)
      .eq('lookup_type', action)
      .gte('created_at', new Date(Date.now() - cacheDuration).toISOString())
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
      // Return mock data when no API key configured
      data = getMockData(action)
    } else {
      // Call real VehicleDatabases API
      const endpoint = getEndpoint(action, { vin, year, make, model })
      const response = await fetch(`${VEHICLEDB_BASE}${endpoint}`, {
        headers: {
          'x-AuthKey': apiKey,
        },
      })

      if (!response.ok) {
        throw new Error(`VehicleDatabases API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      data = result.data ?? result
    }

    // Cache the response
    await supabase.from('vehicledb_cache').insert({
      cache_key: cacheKey,
      source: 'vehicledatabases',
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
