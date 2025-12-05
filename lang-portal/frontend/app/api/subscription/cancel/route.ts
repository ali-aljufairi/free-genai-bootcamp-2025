import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { subscriptionItemId, endNow = false } = body

        if (!subscriptionItemId) {
            return NextResponse.json(
                { error: 'Missing subscriptionItemId' },
                { status: 400 }
            )
        }

        // Use Clerk's backend SDK to cancel the subscription
        const client = await clerkClient()
        const response = await client.billing.cancelSubscriptionItem(subscriptionItemId, {
            endNow: endNow
        })

        return NextResponse.json({
            success: true,
            message: endNow 
                ? 'Subscription canceled immediately' 
                : 'Subscription will be canceled at the end of the billing period',
            data: response
        })
    } catch (error) {
        console.error('Error canceling subscription:', error)
        return NextResponse.json(
            { 
                error: 'Failed to cancel subscription',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}





