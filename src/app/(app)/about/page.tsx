
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Mail, BookOpenCheck, Shield } from "lucide-react";

export default function AboutUsPage() {
  try {
    return (
      <div className="container mx-auto py-8 px-4 md:px-0">
        <div className="space-y-12">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary">About CampusKart</CardTitle>
              <CardDescription className="text-lg text-muted-foreground pt-1">
                Your on-campus marketplace, built by students, for students.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground/90">
              <p>
                CampusKart is an exclusive online marketplace designed for the students of MLRIT. Our platform facilitates the buying and selling of a wide range of items—from academic essentials like books, electronics, and lab equipment, to everyday student needs.
              </p>
              <p>
                We aim to foster a vibrant campus community bymaking it easy and safe for students to trade goods, find great deals, and declutter. By connecting students directly, CampusKart promotes sustainability and resourcefulness within our college.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold text-accent flex items-center">
                <Mail className="mr-3 h-6 w-6" /> Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-foreground/90">
              <p>
                Encountering issues or have suggestions? We'd love to hear from you!
              </p>
              <p>
                You can reach Team - Code Crafters at: <a href="mailto:Codecraftersmlr@gmail.com" className="text-primary hover:underline font-semibold">Codecraftersmlr@gmail.com</a>.
              </p>
            </CardContent>
          </Card>

          <Card id="privacy" className="shadow-lg scroll-mt-20">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold flex items-center">
                 <Shield className="mr-3 h-6 w-6 text-muted-foreground" /> Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground/80">
                Your privacy is critically important to us. This Privacy Policy outlines how CampusKart ("we", "us", "our") collects, uses, and protects your information when you use our platform.
              </p>
              
              <ol className="list-decimal list-inside space-y-3">
                <li>
                  <strong>Information We Collect:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li><strong>Personal Identification Information:</strong> Name, MLRIT email address, year, and branch, provided during registration.</li>
                    <li><strong>User-Generated Content:</strong> Information you provide in listings (titles, descriptions, images, prices), and messages you send in chats.</li>
                    <li><strong>Usage Data:</strong> We may collect non-personal information about how you interact with our service, such as pages visited and features used, to improve our platform.</li>
                  </ul>
                </li>
                <li>
                  <strong>How We Use Your Information:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                      <li>To create and manage your account and facilitate your use of the platform.</li>
                      <li>To enable communication between buyers and sellers.</li>
                      <li>To display your listings to other users.</li>
                      <li>To personalize your experience and improve our services.</li>
                      <li>To communicate with you regarding your account or service updates.</li>
                  </ul>
                </li>
                <li>
                  <strong>Data Sharing and Disclosure:</strong> We do not sell, trade, or rent your personal identification information to third parties. Your information (name, email) may be visible to other users you interact with, particularly in chat, to facilitate transactions. We may disclose information if required by law or in response to valid requests by public authorities.
                </li>
                <li>
                  <strong>Data Security:</strong> We implement a variety of security measures to maintain the safety of your personal information. However, no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee its absolute security.
                </li>
                <li>
                  <strong>User Rights:</strong> You have the right to access, update, or delete your personal information. You can manage your profile information from the 'Account Settings' tab on your profile page. For account deletion requests, please contact us directly.
                </li>
                <li>
                  <strong>Compliance with Law:</strong> This privacy policy is framed in compliance with the Information Technology Act, 2000, and its amendments, including the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and other applicable laws of India. We will cooperate with government and law enforcement officials to enforce and comply with the law.
                </li>
                <li>
                  <strong>Changes to This Policy:</strong> We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
                </li>
                 <li>
                  <strong>Contact Us:</strong> If you have any questions about this Privacy Policy, please contact us at <a href="mailto:Codecraftersmlr@gmail.com" className="text-primary hover:underline">Codecraftersmlr@gmail.com</a>.
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card id="terms" className="shadow-lg scroll-mt-20">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold flex items-center">
                 <BookOpenCheck className="mr-3 h-6 w-6 text-muted-foreground" /> Terms & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground/80">
                Welcome to CampusKart! By accessing or using our platform, you agree to comply with and be bound by the following terms and conditions of use. Please review them carefully. If you do not agree to these terms, you should not use this site.
              </p>
              
              <ol className="list-decimal list-inside space-y-3">
                <li>
                  <strong>Eligibility:</strong> This platform is exclusively for current students and faculty of MLRIT. Users must register with a valid <code>@mlrit.ac.in</code> email address. Verification of student status may be required.
                </li>
                <li>
                  <strong>User Conduct:</strong> Users are expected to conduct themselves honestly, respectfully, and in accordance with MLRIT's code of conduct. Misleading listings, spam, harassment, offensive content, or any illegal activities are strictly prohibited.
                </li>
                <li>
                  <strong>Listings:</strong> Sellers are solely responsible for the accuracy, legality, and quality of their listings. Items listed must be owned by the seller and appropriate for a student marketplace. CampusKart reserves the right to remove any listing deemed inappropriate or in violation of these terms without notice.
                </li>
                <li>
                  <strong>Transactions & Safety:</strong> All transactions are solely between the buyer and the seller. CampusKart is not a party to any transaction and is not responsible for any disputes, issues with items, payments, or fulfillment. We strongly recommend meeting in safe, public places on campus for exchanges and inspecting items thoroughly before purchase.
                </li>
                <li>
                  <strong>Prohibited Items:</strong> Listing illegal items, hazardous materials, counterfeit goods, services (unless explicitly permitted), or any items that violate college policy is strictly forbidden.
                </li>
                <li>
                  <strong>Privacy:</strong> Your privacy is important to us. We collect and use your data (name, email, year, branch, listings, chat messages) to provide and improve CampusKart. By using the platform, you consent to this. We do not sell your personal data to third parties. (A more detailed Privacy Policy can be added separately).
                </li>
                <li>
                  <strong>Disclaimer of Warranties:</strong> CampusKart provides this platform 'as is' and 'as available' without any warranties, express or implied. We do not guarantee the accuracy, completeness, or reliability of any content or listings.
                </li>
                <li>
                  <strong>Limitation of Liability:</strong> CampusKart and its developers (Team - Code Crafters) will not be liable for any direct, indirect, incidental, special, or consequential damages arising from the use or inability to use this platform.
                </li>
                <li>
                  <strong>Intellectual Property:</strong> The CampusKart name, logo, and platform design are the property of its developers. Users may not use these without permission. User-generated content remains the property of the user, but by posting, you grant CampusKart a license to display it.
                </li>
                <li>
                  <strong>Changes to Terms:</strong> We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Continued use of the platform after changes constitutes acceptance of the new terms.
                </li>
                <li>
                  <strong>Governing Law:</strong> These terms shall be governed by the laws of India, without regard to its conflict of law provisions.
                </li>
                <li>
                  <strong>Contact:</strong> For any questions regarding these terms, please contact us at <a href="mailto:Codecraftersmlr@gmail.com" className="text-primary hover:underline">Codecraftersmlr@gmail.com</a> or refer to the 'Contact Us' section above.
                </li>
              </ol>
              <Separator className="my-6" />
              <p className="text-xs text-center">
                These Terms & Conditions are a general template and may need to be reviewed by a legal professional for your specific needs and jurisdiction.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error rendering AboutUsPage:", error);
    // Fallback UI
    return (
      <div className="container mx-auto py-8 px-4 md:px-0">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-destructive">Oops! Something went wrong.</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/90">We encountered an error trying to load this page. Please try again later or contact support if the issue persists.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
