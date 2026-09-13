import { NextResponse } from 'next/server'
import { getCurrentUser, unauthorized } from '@/lib/session'
import { getUserStats } from '@/services/stats.service'

export async function GET() {
    const user = await getCurrentUser()
    if (!user) return unauthorized()
    const stats = await getUserStats(user.sub)
    return NextResponse.json({ stats })
}
