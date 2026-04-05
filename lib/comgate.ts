const COMGATE_MERCHANT_ID = process.env.COMGATE_MERCHANT_ID || ''
const COMGATE_SECRET = process.env.COMGATE_SECRET || ''
const COMGATE_API_URL = 'https://payments.comgate.cz/v1.0'
const TEST_MODE = !COMGATE_MERCHANT_ID || !COMGATE_SECRET || process.env.COMGATE_TEST_MODE === 'true'

export interface CreatePaymentParams {
  priceKc: number
  refId: string
  email: string
  label: string
  initRecurring?: boolean
  country?: string
}

export interface ComgateResponse {
  code: number
  message: string
  transId?: string
  redirect?: string
}

/**
 * Vytvoří jednorázovou platbu nebo iniciační platbu pro recurring
 */
export async function createComgatePayment(params: CreatePaymentParams): Promise<ComgateResponse> {
  if (TEST_MODE) {
    console.log('[ComGate TEST MODE] Creating payment:', params)
    return {
      code: 0,
      message: 'OK',
      transId: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      redirect: `/payment/test-gateway?refId=${params.refId}&amount=${params.priceKc}`,
    }
  }

  const body = new URLSearchParams({
    merchant: COMGATE_MERCHANT_ID,
    secret: COMGATE_SECRET,
    price: String(params.priceKc * 100),
    curr: 'CZK',
    label: params.label,
    refId: params.refId,
    email: params.email,
    country: params.country || 'CZ',
    method: 'ALL',
    prepareOnly: 'true',
  })

  if (params.initRecurring) {
    body.append('initRecurring', 'true')
  }

  try {
    const response = await fetch(`${COMGATE_API_URL}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const text = await response.text()
    const result = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>
    return {
      code: parseInt(result.code),
      message: result.message || '',
      transId: result.transId,
      redirect: result.redirect,
    }
  } catch (error) {
    console.error('ComGate API error:', error)
    return { code: 1, message: 'API communication failed' }
  }
}

/**
 * Strhne recurring platbu (pro Premium měsíční obnovu)
 */
export async function chargeRecurringPayment(params: {
  initTransId: string
  priceKc: number
  refId: string
  label: string
}): Promise<ComgateResponse> {
  if (TEST_MODE) {
    console.log('[ComGate TEST MODE] Recurring charge:', params)
    return {
      code: 0,
      message: 'OK',
      transId: `TEST-REC-${Date.now()}`,
    }
  }

  const body = new URLSearchParams({
    merchant: COMGATE_MERCHANT_ID,
    secret: COMGATE_SECRET,
    price: String(params.priceKc * 100),
    curr: 'CZK',
    label: params.label,
    refId: params.refId,
    method: 'CARD_CZ_CSOB_2',
    initRecurringId: params.initTransId,
  })

  try {
    const response = await fetch(`${COMGATE_API_URL}/recurring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const text = await response.text()
    const result = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>
    return {
      code: parseInt(result.code),
      message: result.message || '',
      transId: result.transId,
    }
  } catch (error) {
    console.error('ComGate recurring error:', error)
    return { code: 1, message: 'API communication failed' }
  }
}

/**
 * Ověří status platby u ComGate
 */
export async function verifyComgatePayment(transId: string): Promise<{ status: string; refId?: string; price?: number }> {
  if (TEST_MODE) {
    return { status: 'PAID', refId: 'test', price: 0 }
  }

  const body = new URLSearchParams({
    merchant: COMGATE_MERCHANT_ID,
    secret: COMGATE_SECRET,
    transId,
  })

  try {
    const response = await fetch(`${COMGATE_API_URL}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const text = await response.text()
    const result = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>
    return {
      status: result.status || 'UNKNOWN',
      refId: result.refId,
      price: result.price ? parseInt(result.price) / 100 : undefined,
    }
  } catch (error) {
    console.error('ComGate verify error:', error)
    return { status: 'ERROR' }
  }
}

export function isTestMode(): boolean {
  return TEST_MODE
}
