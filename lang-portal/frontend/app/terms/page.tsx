import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Sorami - Japanese Language Learning Platform",
}

export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-4xl">
      <Card className="glass-card border-blue-100/80 dark:border-blue-900/70">
        <CardHeader>
          <CardTitle className="text-3xl">Terms of Service</CardTitle>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
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
          </section>
        </CardContent>
      </Card>
    </main>
  )
}

