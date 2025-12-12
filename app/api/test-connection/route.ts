import { NextRequest, NextResponse } from 'next/server'

export async function HEAD(request: NextRequest) {
  return new NextResponse('', { status: 200 })
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Connection test successful'
  })
}
