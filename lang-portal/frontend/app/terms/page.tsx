import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buildPageMetadata } from "@/lib/seo/metadata"

const LAST_UPDATED_DATE = "February 19, 2026"

export const metadata = buildPageMetadata({
  title: "Terms of Service",
  description: "Review the terms and conditions for using Sorami.",
  path: "/terms",
  index: true,
})

export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <Card className="glass-card border-blue-100/80 dark:border-blue-900/70">
        <CardHeader>
          <CardTitle className="text-3xl">Terms of Service</CardTitle>
          <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED_DATE}</p>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using Sorami ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
              <p className="text-muted-foreground mb-2">
                Permission is granted to temporarily use Sorami for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained on Sorami</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">4. Subscription and Payment</h2>
              <p className="text-muted-foreground mb-2">
                Sorami offers both free trial and paid subscription plans. By subscribing to any paid plan, you agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Pay all fees associated with your subscription</li>
                <li>Automatic renewal of your subscription unless cancelled</li>
                <li>No refunds for partial subscription periods</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">5. Content and Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content, features, and functionality of Sorami are owned by Sorami and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">6. User Content</h2>
              <p className="text-muted-foreground">
                You retain ownership of any content you submit to Sorami. By submitting content, you grant Sorami a worldwide, non-exclusive, royalty-free license to use, reproduce, and distribute your content for the purpose of providing and improving the Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">7. Prohibited Uses</h2>
              <p className="text-muted-foreground mb-2">
                You may not use Sorami:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>In any way that violates any applicable law or regulation</li>
                <li>To transmit any malicious code or viruses</li>
                <li>To attempt to gain unauthorized access to the Service</li>
                <li>To interfere with or disrupt the Service</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">8. Disclaimer</h2>
              <p className="text-muted-foreground">
                The materials on Sorami are provided on an 'as is' basis. Sorami makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">9. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                In no event shall Sorami or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Sorami.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">10. Changes to Terms</h2>
              <p className="text-muted-foreground">
                Sorami may revise these terms of service at any time without notice. By using this Service, you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">11. Contact Information</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms of Service, please contact us through our support channels.
              </p>
            </div>

            <div id="commercial-transactions-act">
              <h2 className="text-2xl font-bold mb-4">12. Specified Commercial Transactions Act (特定商取引法)</h2>
              <p className="text-muted-foreground mb-4">
                In accordance with Japan's Specified Commercial Transactions Act, the following information is provided:
              </p>
              <div className="space-y-3 text-muted-foreground">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Business Information</h3>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Business Name:</strong> Sorami</li>
                    <li><strong>Representative:</strong> Ali Aljufairi</li>
                    <li><strong>Contact Email:</strong> support@aljufairi.org</li>
                    <li><strong>Contact Phone:</strong> 07069849009</li>
                    <li><strong>Business Address:</strong> Available upon request. Please contact us at support@aljufairi.org and we will provide our business address promptly.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Payment Methods</h3>
                  <p className="mb-2">We accept the following payment methods:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Credit card payments processed through Clerk billing with Stripe integration</li>
                    <li>Subscription-based service plans</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Refund and Cancellation Policy</h3>
                  <p className="mb-2">
                    As stated in Section 4 of these Terms of Service, we do not provide refunds for partial subscription periods.
                    Subscriptions automatically renew unless cancelled. You may cancel your subscription at any time through your account settings.
                  </p>
                  <p className="mb-2">
                    <strong>Cancellation:</strong> If you cancel your subscription, it will remain active and you will retain full access
                    to all subscription features until the end of your current contract period (billing cycle). Cancellation will take
                    effect at the end of your current billing period, and your subscription will not renew automatically.
                  </p>
                  <p className="text-sm italic">
                    Note: We do not offer a cooling-off period. Once a subscription is activated, it will remain active until the
                    end of the paid contract period, even if cancelled.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Complaint Handling</h3>
                  <p>
                    For any complaints, inquiries, or disputes regarding transactions, please contact us at support@aljufairi.org.
                    We will respond to your inquiry promptly and work to resolve any issues in accordance with applicable laws and regulations.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </CardContent>
      </Card>
    </main>
  )
}
