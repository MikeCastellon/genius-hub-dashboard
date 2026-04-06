import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getMockData(action: string, partName?: string, partNumber?: string) {
  switch (action) {
    case 'search':
      return [
        {
          supplier: 'AutoZone',
          part_name: partName || 'Oxygen Sensor - Upstream',
          part_number: partNumber || 'OS-1234',
          brand: 'Bosch',
          price: 89.99,
          core_charge: 0,
          stock_status: 'in_stock',
          quantity_available: 12,
          distance: '2.3 mi',
          delivery_estimate: 'Same Day',
          logo_url: null,
        },
        {
          supplier: "O'Reilly Auto Parts",
          part_name: partName || 'Oxygen Sensor - Upstream',
          part_number: partNumber || 'OS-5678',
          brand: 'Denso',
          price: 94.50,
          core_charge: 0,
          stock_status: 'in_stock',
          quantity_available: 5,
          distance: '3.1 mi',
          delivery_estimate: 'Same Day',
          logo_url: null,
        },
        {
          supplier: 'NAPA Auto Parts',
          part_name: partName || 'Oxygen Sensor - Upstream',
          part_number: partNumber || 'OS-9012',
          brand: 'NTK',
          price: 78.25,
          core_charge: 0,
          stock_status: 'in_stock',
          quantity_available: 3,
          distance: '4.7 mi',
          delivery_estimate: 'Next Day',
          logo_url: null,
        },
        {
          supplier: 'Advance Auto Parts',
          part_name: partName || 'Oxygen Sensor - Upstream',
          part_number: partNumber || 'OS-3456',
          brand: 'Walker Products',
          price: 65.99,
          core_charge: 0,
          stock_status: 'low_stock',
          quantity_available: 1,
          distance: '5.2 mi',
          delivery_estimate: 'Same Day',
          logo_url: null,
        },
      ]
    case 'suppliers':
      return [
        { id: 'sup_az_001', name: 'AutoZone', address: '1234 Main St', city: 'Springfield', state: 'IL', zip: '62701', phone: '(555) 123-4567', distance: '2.3 mi', hours: 'Mon-Sat 7:30am-9pm, Sun 8am-8pm', commercial_account: true },
        { id: 'sup_or_001', name: "O'Reilly Auto Parts", address: '5678 Oak Ave', city: 'Springfield', state: 'IL', zip: '62702', phone: '(555) 234-5678', distance: '3.1 mi', hours: 'Mon-Sat 7:30am-9pm, Sun 8am-8pm', commercial_account: true },
        { id: 'sup_na_001', name: 'NAPA Auto Parts', address: '9012 Elm Blvd', city: 'Springfield', state: 'IL', zip: '62703', phone: '(555) 345-6789', distance: '4.7 mi', hours: 'Mon-Fri 7am-7pm, Sat 7:30am-5pm', commercial_account: false },
      ]
    case 'order':
      return {
        order_id: 'PT-MOCK-12345',
        status: 'pending',
        supplier: 'AutoZone',
        items: [
          { part_name: partName || 'Oxygen Sensor - Upstream', part_number: partNumber || 'OS-1234', quantity: 1, price: 89.99 },
        ],
        subtotal: 89.99,
        tax: 7.65,
        total: 97.64,
        estimated_delivery: 'Tomorrow',
        tracking_number: null,
        created_at: new Date().toISOString(),
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
    const { action, vin, part_number, part_name, supplier_ids } = await req.json()

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validActions = ['search', 'suppliers', 'order']
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

    const username = Deno.env.get('PARTSTECH_USERNAME')
    const apiKey = Deno.env.get('PARTSTECH_API_KEY')
    let data: unknown

    if (!username || !apiKey) {
      // Return mock data
      data = getMockData(action, part_name, part_number)
    } else {
      // Call real PartsTech API
      const baseUrl = 'https://api.partstech.com/v1'

      let endpoint = ''
      let body: Record<string, unknown> = {}

      switch (action) {
        case 'search':
          endpoint = '/parts/search'
          body = { vin, part_number, part_name, supplier_ids }
          break
        case 'suppliers':
          endpoint = '/suppliers/nearby'
          body = { vin }
          break
        case 'order':
          endpoint = '/orders/create'
          body = { vin, part_number, part_name, supplier_ids }
          break
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'X-Username': username,
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`PartsTech API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      data = result.data ?? result
    }

    // Cache search results
    if (action === 'search' && vin) {
      await supabase.from('repair_lookups').insert({
        vin,
        source: 'partstech',
        lookup_type: 'parts_search',
        api_response: data,
      })
    }

    return new Response(
      JSON.stringify({ data, source: username ? 'api' : 'mock' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
