import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { buildPageMetadata } from "@/lib/seo/metadata"

const LAST_UPDATED_DATE = "February 19, 2026"

export const metadata = buildPageMetadata({
  title: "Business Info",
  description: "Business disclosures for Sorami under the Specified Commercial Transactions Act.",
  path: "/business-info",
  index: true,
})

export default function BusinessInfoPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <Card className="glass-card border-blue-100/80 dark:border-blue-900/70">
        <CardHeader>
          <CardTitle className="text-3xl">Business Information</CardTitle>
          <p className="text-sm text-muted-foreground">
            特定商取引法に基づく表記 (Specified Commercial Transactions Act)
          </p>
          <p className="text-sm text-muted-foreground mt-2">Last updated: {LAST_UPDATED_DATE}</p>
        </CardHeader>
        <CardContent className="prose dark:prose-invert max-w-none">
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">1. Business Name</h2>
              <p className="text-muted-foreground">
                Sorami (空見)
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">2. Business Operator</h2>
              <p className="text-muted-foreground">
                Ali Aljufairi
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">3. Business Address</h2>
              <p className="text-muted-foreground">
                [Please provide your business address here]
                <br />
                <span className="text-xs italic">Note: This should be updated with your actual business registration address.</span>
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">4. Contact Information</h2>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <strong className="text-foreground">Email:</strong>{" "}
                  <a
                    href="mailto:support@aljufairi.org"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    support@aljufairi.org
                  </a>
                </p>
                <p>
                  <strong className="text-foreground">Website:</strong>{" "}
                  <a
                    href="https://sorami.aljufairi.org"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://sorami.aljufairi.org
                  </a>
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">5. Pricing Information</h2>
              <div className="space-y-3 text-muted-foreground">
                <div>
                  <p className="mb-2">
                    <strong className="text-foreground">Basic Plan:</strong> $10 USD per month
                  </p>
                  <p className="text-sm ml-4">
                    Includes core Japanese learning tools, vocabulary flashcards, kanji practice, grammar quizzes, word builder game, and 10 AI companion sessions per month.
                  </p>
                </div>
                <div>
                  <p className="mb-2">
                    <strong className="text-foreground">Pro Plan:</strong> $25 USD per month
                  </p>
                  <p className="text-sm ml-4">
                    Includes everything in Basic plan, plus unlimited AI companion sessions and feature request priority.
                  </p>
                </div>
                <p className="text-sm mt-4">
                  <strong className="text-foreground">Note:</strong> All prices are in USD. Subscriptions are billed monthly and will automatically renew unless cancelled.
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">6. Payment Methods</h2>
              <p className="text-muted-foreground mb-2">
                We accept the following payment methods:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Credit cards (Visa, Mastercard, American Express)</li>
                <li>Debit cards</li>
                <li>All payments are processed securely through Stripe</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">7. Service Description</h2>
              <p className="text-muted-foreground mb-2">
                Sorami is an AI-powered Japanese language learning platform that provides:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>Interactive vocabulary flashcards and kanji practice</li>
                <li>Grammar quizzes and study sessions</li>
                <li>AI-powered conversation practice with unlimited sessions (Pro plan)</li>
                <li>Progress tracking and analytics</li>
                <li>Word builder game for vocabulary reinforcement</li>
                <li>Spaced repetition system for efficient learning</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">8. Cancellation and Refund Policy</h2>
              <div className="space-y-3 text-muted-foreground">
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Cancellation</h3>
                  <p className="mb-2">
                    You may cancel your subscription at any time through your account settings. Cancellation will take effect at the end of your current billing period. You will continue to have access to Pro features until the end of the paid period.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Refunds</h3>
                  <p>
                    Refunds are not available for partial subscription periods. If you cancel your subscription, you will not receive a refund for the remaining days in your current billing cycle. However, you will retain access to all Pro features until the end of the period you have already paid for.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Chargebacks and Disputes</h3>
                  <p>
                    If you have any concerns about your subscription or billing, please contact us at{" "}
                    <a
                      href="mailto:support@aljufairi.org"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      support@aljufairi.org
                    </a>
                    {" "}before initiating a chargeback. We are committed to resolving any issues promptly.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">9. Terms of Service</h2>
              <p className="text-muted-foreground">
                By using Sorami, you agree to our{" "}
                <Link
                  href="/terms"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Terms of Service
                </Link>
                . Please review the terms carefully before using our service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">10. Privacy Policy</h2>
              <p className="text-muted-foreground">
                Your privacy is important to us. Please review our{" "}
                <Link
                  href="/privacy"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Privacy Policy
                </Link>
                {" "}to understand how we collect, use, and protect your information.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">11. Additional Information</h2>
              <p className="text-muted-foreground">
                Sorami is a subscription-based software service providing Japanese language learning tools and AI-powered features. All services are delivered digitally through our web platform. No physical goods are sold.
              </p>
            </div>

            <div className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-center text-muted-foreground">
                For any questions or concerns regarding this business information, please contact us at{" "}
                <a
                  href="mailto:support@aljufairi.org"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  support@aljufairi.org
                </a>
              </p>
            </div>
          </section>
        </CardContent>
      </Card>
    </main>
  )
}







