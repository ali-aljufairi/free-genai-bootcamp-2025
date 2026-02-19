import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buildPageMetadata } from "@/lib/seo/metadata"

const LAST_UPDATED_DATE = "February 19, 2026"

export const metadata = buildPageMetadata({
    title: "Privacy",
    description: "Read how Sorami collects, uses, and protects your personal information.",
    path: "/privacy",
    index: true,
})

export default function PrivacyPage() {
    return (
        <main className="container mx-auto px-4 py-16 max-w-4xl">
            <Card className="glass-card border-blue-100/80 dark:border-blue-900/70">
                <CardHeader>
                    <CardTitle className="text-3xl">Privacy Policy</CardTitle>
                    <p className="text-sm text-muted-foreground">Last updated: {LAST_UPDATED_DATE}</p>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                    <section className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
                            <p className="text-muted-foreground">
                                Sorami ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Japanese language learning platform.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">2.1 Personal Information</h3>
                                    <p className="text-muted-foreground mb-2">We collect information that you provide directly to us, including:</p>
                                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                                        <li>Account information (email address, username)</li>
                                        <li>Profile information</li>
                                        <li>Payment information (processed through secure third-party payment processors)</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">2.2 Usage Data</h3>
                                    <p className="text-muted-foreground mb-2">We automatically collect certain information when you use our Service:</p>
                                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                                        <li>Study session data and progress</li>
                                        <li>Learning activity and performance metrics</li>
                                        <li>Device information and browser type</li>
                                        <li>IP address and location data</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
                            <p className="text-muted-foreground mb-2">We use the information we collect to:</p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                                <li>Provide, maintain, and improve our Service</li>
                                <li>Process your transactions and manage your account</li>
                                <li>Personalize your learning experience</li>
                                <li>Send you updates, newsletters, and promotional materials (with your consent)</li>
                                <li>Monitor and analyze usage patterns</li>
                                <li>Detect, prevent, and address technical issues</li>
                            </ul>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4">4. Data Storage and Security</h2>
                            <p className="text-muted-foreground">
                                We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4">5. Third-Party Services</h2>
                            <p className="text-muted-foreground mb-2">We use third-party services that may collect information used to identify you:</p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                                <li><strong>Authentication:</strong> Clerk (for user authentication and management)</li>
                                <li><strong>Payments:</strong> Stripe (for processing subscription payments)</li>
                                <li><strong>Analytics:</strong> Services to help us understand how our Service is used</li>
                                <li><strong>AI Services:</strong> Third-party AI providers for language learning features</li>
                            </ul>
                            <p className="text-muted-foreground mt-2">
                                These third parties have their own privacy policies governing the use of your information.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4">6. Data Retention</h2>
                            <p className="text-muted-foreground">
                                We retain your personal information for as long as necessary to provide our Service and fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4">7. Your Rights</h2>
                            <p className="text-muted-foreground mb-2">You have the right to:</p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                                <li>Access and receive a copy of your personal data</li>
                                <li>Rectify inaccurate or incomplete data</li>
                                <li>Request deletion of your personal data</li>
                                <li>Object to processing of your personal data</li>
                                <li>Request restriction of processing</li>
                                <li>Data portability</li>
                                <li>Withdraw consent at any time</li>
                            </ul>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4">8. Cookies and Tracking Technologies</h2>
                            <p className="text-muted-foreground">
                                We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4">9. Children's Privacy</h2>
                            <p className="text-muted-foreground">
                                Our Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4">10. International Data Transfers</h2>
                            <p className="text-muted-foreground">
                                Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ from those in your jurisdiction.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4">11. Changes to This Privacy Policy</h2>
                            <p className="text-muted-foreground">
                                We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-4">12. Contact Us</h2>
                            <p className="text-muted-foreground">
                                If you have any questions about this Privacy Policy, please contact us through our support channels.
                            </p>
                        </div>
                    </section>
                </CardContent>
            </Card>
        </main>
    )
}
