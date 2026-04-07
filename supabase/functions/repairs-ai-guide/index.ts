import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MOCK_GUIDE = {
  steps: [
    {
      number: 1,
      title: 'Gather Tools and Parts',
      description: 'You will need a socket wrench set, jack stands, safety glasses, and the replacement part. Ensure the engine is cool before starting.',
      warnings: ['Always work on a cool engine'],
    },
    {
      number: 2,
      title: 'Locate the Component',
      description: 'Using your vehicle\'s repair manual or the diagram above, locate the component that needs replacement. On most vehicles, it will be found near the exhaust manifold.',
    },
    {
      number: 3,
      title: 'Remove the Old Part',
      description: 'Disconnect the electrical connector first, then use the appropriate socket to remove the mounting bolt(s). Carefully extract the old part.',
    },
    {
      number: 4,
      title: 'Install the New Part',
      description: 'Apply anti-seize compound to the threads if specified. Thread the new part in by hand first to avoid cross-threading, then torque to specification.',
    },
    {
      number: 5,
      title: 'Test and Verify',
      description: 'Reconnect the electrical connector. Start the engine and check for leaks or warning lights. Use an OBD-II scanner to clear any stored codes.',
      warnings: ['Monitor for check engine light for the next 50 miles'],
    },
  ],
}

function buildSystemPrompt(): string {
  return `You are an expert automotive repair technician and technical writer.
Generate a detailed, step-by-step repair guide based on the vehicle information and repair description provided.

Your response MUST be valid JSON with this exact structure:
{
  "steps": [
    {
      "number": 1,
      "title": "Step title",
      "description": "Detailed step description with specific instructions",
      "warnings": ["Optional array of safety warnings for this step"]
    }
  ]
}

Guidelines:
- Include 4-8 steps depending on complexity
- Be specific about tools, torque specs, and part numbers when possible
- Always include safety warnings where relevant (hot surfaces, electrical disconnect, jack stand usage, etc.)
- Reference the specific vehicle make/model when giving location instructions
- Include a final verification/testing step
- Write for a competent DIY mechanic, not a complete beginner`
}

function buildUserPrompt(description: string, dtcCode?: string, vehicleInfo?: string): string {
  let prompt = `Generate a repair guide for the following:\n\nRepair: ${description}`
  if (dtcCode) {
    prompt += `\nDiagnostic Code: ${dtcCode}`
  }
  if (vehicleInfo) {
    prompt += `\nVehicle: ${vehicleInfo}`
  }
  return prompt
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { vehicle_id, repair_lookup_id, dtc_code, description, media_urls } = await req.json()

    if (!description) {
      return new Response(
        JSON.stringify({ error: 'description is required' }),
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

    // Fetch vehicle info if vehicle_id provided
    let vehicleInfo: string | undefined
    if (vehicle_id) {
      const { data: vehicle } = await supabase
        .from('vehicle_intakes')
        .select('year, make, model, vin')
        .eq('id', vehicle_id)
        .maybeSingle()

      if (vehicle) {
        vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model} (VIN: ${vehicle.vin})`
      }
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    let guideData: typeof MOCK_GUIDE

    if (!anthropicKey) {
      // Return mock data
      guideData = MOCK_GUIDE
    } else {
      // Build message content
      const content: Array<{ type: string; [key: string]: unknown }> = []

      // Add any media/image URLs as image content blocks
      if (media_urls && Array.isArray(media_urls) && media_urls.length > 0) {
        for (const url of media_urls) {
          content.push({
            type: 'image',
            source: {
              type: 'url',
              url,
            },
          })
        }
      }

      // Add the text prompt
      content.push({
        type: 'text',
        text: buildUserPrompt(description, dtc_code, vehicleInfo),
      })

      // Call Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: buildSystemPrompt(),
          messages: [
            {
              role: 'user',
              content,
            },
          ],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Anthropic API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      const textContent = result.content?.find((c: { type: string }) => c.type === 'text')
      if (!textContent?.text) {
        throw new Error('No text response from Claude API')
      }

      // Parse the JSON from Claude's response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from Claude response')
      }

      guideData = JSON.parse(jsonMatch[0])
    }

    // Save to repair_guides table
    const { data: savedGuide, error: saveError } = await supabase
      .from('repair_guides')
      .insert({
        vehicle_id: vehicle_id || null,
        repair_lookup_id: repair_lookup_id || null,
        dtc_code: dtc_code || null,
        description,
        steps: guideData.steps,
        ai_generated: true,
        source: anthropicKey ? 'claude' : 'mock',
      })
      .select()
      .maybeSingle()

    if (saveError) {
      console.error('Failed to save guide:', saveError)
    }

    return new Response(
      JSON.stringify({
        data: guideData,
        guide_id: savedGuide?.id || null,
        source: anthropicKey ? 'ai' : 'mock',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
